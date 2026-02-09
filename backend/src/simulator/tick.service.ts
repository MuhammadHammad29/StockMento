import { Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { RedisService } from './redis.service';

export type Tick = {
  timestamp_ms: number;
  iso_time: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  trades: number;
  value: number;
  bid?: number;
  ask?: number;
  bidVol?: number;
  askVol?: number;
  [key: string]: unknown;
};

@Injectable()
export class TickService {
  private readonly keyTemplate =
    process.env.REDIS_KEY_TEMPLATE ?? 'psx:ticks:{symbol}';
  private readonly retentionMinutes =
    Number.parseInt(process.env.TICK_RETENTION_MINUTES ?? '', 10) || 1440;
  private readonly retentionMs = this.retentionMinutes * 60 * 1000;
  private readonly maxSamples =
    Number.parseInt(process.env.TICK_MAX_SAMPLES ?? '', 10) || 15000;

  constructor(private readonly redisService: RedisService) {}

  private get client(): Redis {
    return this.redisService.getClient();
  }

  private formatKey(symbol: string, market = 'REG') {
    return this.keyTemplate
      .replace('{symbol}', symbol)
      .replace('{market}', market);
  }

  private async readLatestRaw(key: string) {
    const type = await this.client.type(key);
    if (type === 'zset') {
      const raw = await this.client.zrevrange(key, 0, 0);
      return raw[0];
    }
    if (type === 'list') {
      const raw = await this.client.lrange(key, -1, -1);
      return raw[0];
    }
    return null;
  }

  normalizeTick(tick: Tick): Tick {
    const rawTs = Number(
      tick.timestamp_ms ?? (tick as { timestamp?: number }).timestamp ?? 0,
    );
    const timestampMs =
      Number.isFinite(rawTs) && rawTs < 10_000_000_000
        ? rawTs * 1000
        : Number.isFinite(rawTs)
          ? rawTs
          : Date.now();

    const toNumber = (value: unknown) => {
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    };

    const changePercentRaw = toNumber(tick.changePercent) ?? 0;

    return {
      ...tick,
      price: toNumber(tick.price) ?? 0,
      change: toNumber(tick.change) ?? 0,
      changePercent: changePercentRaw * 100,
      volume: toNumber(tick.volume) ?? 0,
      trades: toNumber(tick.trades) ?? 0,
      value: toNumber(tick.value) ?? 0,
      bid: tick.bid != null ? (toNumber(tick.bid) ?? tick.bid) : undefined,
      ask: tick.ask != null ? (toNumber(tick.ask) ?? tick.ask) : undefined,
      bidVol:
        tick.bidVol != null
          ? (toNumber(tick.bidVol) ?? tick.bidVol)
          : undefined,
      askVol:
        tick.askVol != null
          ? (toNumber(tick.askVol) ?? tick.askVol)
          : undefined,
      timestamp_ms: timestampMs,
      iso_time: new Date(timestampMs).toISOString(),
    };
  }

  async getRecentTicks(symbol: string, limit = 200): Promise<Tick[]> {
    const key = this.formatKey(symbol);
    const now = Date.now();
    const cutoff = now - this.retentionMs;
    const fetchCount = Math.max(limit, this.maxSamples);
    const type = await this.client.type(key);
    let raw: string[] = [];

    if (type === 'zset') {
      raw = await this.client.zrange(key, -fetchCount, -1);
    } else if (type === 'list') {
      raw = await this.client.lrange(key, -fetchCount, -1);
    } else {
      return [];
    }

    const parsed = raw
      .map((item) => {
        try {
          const tick = JSON.parse(item) as Tick;
          return this.normalizeTick(tick);
        } catch {
          return null;
        }
      })
      .filter((item): item is Tick => Boolean(item))
      .filter((item) => {
        const ts = Number(item.timestamp_ms ?? 0);
        return Number.isFinite(ts) && ts >= cutoff;
      })
      .sort((a, b) => (a.timestamp_ms ?? 0) - (b.timestamp_ms ?? 0));

    return parsed.slice(-Math.min(limit, parsed.length));
  }

  async getLatestTick(symbol: string): Promise<Tick | null> {
    const key = this.formatKey(symbol);
    const raw = await this.readLatestRaw(key);
    if (!raw) return null;
    try {
      const tick = JSON.parse(raw) as Tick;
      return this.normalizeTick(tick);
    } catch {
      return null;
    }
  }

  async getLatestTicks(
    symbols: string[],
  ): Promise<Record<string, Tick | null>> {
    const results: Record<string, Tick | null> = {};
    for (const symbol of symbols) {
      results[symbol] = await this.getLatestTick(symbol);
    }
    return results;
  }
}
