import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';
import type { Tick } from './tick.service';

export type IntradayCandle = {
  symbol: string;
  minute: number;
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
};

type ActiveCandle = {
  date: string;
  minute: number;
  candle: IntradayCandle;
};

@Injectable()
export class IntradayCandleService {
  private readonly logger = new Logger(IntradayCandleService.name);
  private readonly redisPrefix =
    process.env.SIM_INTRADAY_REDIS_PREFIX ?? 'psx:intraday';

  private readonly active = new Map<string, ActiveCandle>();

  constructor(private readonly redisService: RedisService) {}

  private buildRedisKey(symbol: string, date: string) {
    return `${this.redisPrefix}:${symbol}:${date}`;
  }

  private formatDate(timestampMs: number) {
    return new Date(timestampMs).toISOString().slice(0, 10);
  }

  private ensurePositive(value: unknown) {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : undefined;
  }

  async recordTick(tick: Tick): Promise<IntradayCandle | null> {
    const price = this.ensurePositive(tick.price);
    if (!price) return null;

    const timestampMs = Number(
      tick.timestamp_ms ??
        (tick as { timestamp?: number }).timestamp ??
        Date.now(),
    );
    if (!Number.isFinite(timestampMs)) return null;

    const minute = Math.floor(timestampMs / 60000) * 60000;
    const time = Math.floor(minute / 1000);
    const dateKey = this.formatDate(timestampMs);
    const symbol = tick.symbol?.toUpperCase();
    if (!symbol) return null;

    const mapKey = symbol;
    const volumeDelta = this.ensurePositive(tick.volume ?? tick.trades);

    let entry = this.active.get(mapKey);
    if (!entry || entry.date !== dateKey || entry.minute !== minute) {
      const candle: IntradayCandle = {
        symbol,
        minute,
        time,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: volumeDelta,
      };
      entry = { date: dateKey, minute, candle };
      this.active.set(mapKey, entry);
    } else {
      entry.candle.high = Math.max(entry.candle.high, price);
      entry.candle.low = Math.min(entry.candle.low, price);
      entry.candle.close = price;
      if (volumeDelta) {
        entry.candle.volume = (entry.candle.volume ?? 0) + volumeDelta;
      }
    }

    try {
      const client = this.redisService.getClient();
      const redisKey = this.buildRedisKey(symbol, dateKey);
      await client.hset(
        redisKey,
        minute.toString(),
        JSON.stringify(entry.candle),
      );
      const ttlSeconds =
        Number(process.env.SIM_INTRADAY_TTL_SECS ?? '') || 60 * 60 * 24 * 3;
      await client.expire(redisKey, ttlSeconds);
    } catch (error) {
      this.logger.warn(
        `Failed writing intraday candle for ${symbol} ${minute}`,
        error as Error,
      );
    }

    return entry.candle;
  }

  async getCandles(symbol: string, date?: string) {
    const targetDate = date ?? this.formatDate(Date.now());
    const redisKey = this.buildRedisKey(symbol.toUpperCase(), targetDate);
    const raw = await this.redisService.getClient().hgetall(redisKey);
    const candles: IntradayCandle[] = Object.entries(raw)
      .map(([minute, json]) => {
        try {
          const parsed = JSON.parse(json) as IntradayCandle;
          return {
            ...parsed,
            minute: Number(minute),
            time: Math.floor(Number(minute) / 1000),
          };
        } catch {
          return null;
        }
      })
      .filter((c): c is IntradayCandle => Boolean(c));
    return candles.sort((a, b) => a.minute - b.minute);
  }
}
