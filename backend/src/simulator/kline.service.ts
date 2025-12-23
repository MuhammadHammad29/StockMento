import { Injectable, Logger } from '@nestjs/common';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';

type KlineRecord = {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
  symbol?: string;
  timeframe?: string;
};

type KlineResponse = {
  success?: boolean;
  data?: KlineRecord[];
  error?: string;
};

class RateLimiter {
  private tokens: number;
  private readonly capacity: number;
  private queue: Array<() => void> = [];

  constructor(capacity = 30) {
    this.capacity = capacity;
    this.tokens = capacity;
    setInterval(() => this.refill(), 1000);
  }

  private refill() {
    this.tokens = this.capacity;
    this.drain();
  }

  private drain() {
    while (this.tokens > 0 && this.queue.length > 0) {
      this.tokens -= 1;
      const next = this.queue.shift();
      next?.();
    }
  }

  async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = () => {
        fn().then(resolve).catch(reject);
      };
      if (this.tokens > 0) {
        this.tokens -= 1;
        run();
      } else {
        this.queue.push(run);
      }
    });
  }
}

@Injectable()
export class KlineService {
  private readonly logger = new Logger(KlineService.name);
  private readonly baseUrl = process.env.KLINE_API_BASE ?? 'https://psxterminal.com';
  private readonly dataDir =
    process.env.KLINE_DATA_DIR ?? path.resolve(process.cwd(), 'src', 'simulator', 'klines');
  private readonly limiter = new RateLimiter(30);

  private getSymbolPath(symbol: string) {
    return path.join(this.dataDir, symbol.toUpperCase());
  }

  private getFilePath(symbol: string) {
    return path.join(this.getSymbolPath(symbol), '1d.json');
  }

  private async ensureDir(symbol: string) {
    const dir = this.getSymbolPath(symbol);
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true });
    }
  }

  private isWeekend(date: Date) {
    const day = date.getUTCDay();
    return day === 0 || day === 6;
  }

  private dateKey(ms: number) {
    return new Date(ms).toISOString().slice(0, 10);
  }

  private async fetchRange(symbol: string, startMs: number, endMs: number): Promise<KlineRecord[]> {
    const url = `${this.baseUrl}/api/klines/${symbol}/1d`;
    const records: KlineRecord[] = [];
    let currentEnd = endMs;
    const intervalMs = 24 * 60 * 60 * 1000;

    while (currentEnd >= startMs) {
      // Paginate backwards using "end" param similar to upstream script.
      const params = new URLSearchParams({ end: String(currentEnd), limit: '100' });
      const payload = await this.limiter.schedule(async () => {
        const fetchFn: any = (global as any).fetch;
        if (!fetchFn) {
          throw new Error('Fetch API not available in runtime');
        }
        const res = await fetchFn(`${url}?${params.toString()}`, { method: 'GET' });
        const json = (await res.json()) as KlineResponse;
        if (!res.ok || json.success === false) {
          const message = json.error || res.statusText;
          throw new Error(`Kline fetch failed: ${message}`);
        }
        return json;
      });

      const batch = (payload.data ?? []).filter((r) => r?.timestamp && Number.isFinite(Number(r.timestamp)));
      if (!batch.length) break;

      batch.forEach((r) => {
        const ts = Number(r.timestamp);
        if (ts >= startMs && ts <= endMs) {
          records.push({ ...r, timestamp: ts });
        }
      });

      const batchMin = Math.min(...batch.map((r) => Number(r.timestamp)));
      if (batchMin <= startMs) break;
      currentEnd = batchMin - intervalMs;
    }

    // Deduplicate and sort
    const byDate = new Map<string, KlineRecord>();
    for (const rec of records) {
      byDate.set(this.dateKey(rec.timestamp), rec);
    }
    return Array.from(byDate.values()).sort((a, b) => a.timestamp - b.timestamp);
  }

  private async readExisting(symbol: string): Promise<KlineRecord[]> {
    const file = this.getFilePath(symbol);
    if (!existsSync(file)) return [];
    try {
      const raw = await readFile(file, 'utf8');
      const parsed = JSON.parse(raw) as KlineRecord[];
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      this.logger.warn(`Failed to read klines cache for ${symbol}: ${(err as Error).message}`);
      return [];
    }
  }

  private async writeAll(symbol: string, data: KlineRecord[]) {
    await this.ensureDir(symbol);
    const file = this.getFilePath(symbol);
    await writeFile(file, JSON.stringify(data, null, 2), 'utf8');
  }

  async getDailyKlines(symbol: string) {
    const existing = await this.readExisting(symbol);
    const today = new Date();
    const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    start.setUTCDate(start.getUTCDate() - 180);

    const existingMap = new Map(existing.map((k) => [this.dateKey(k.timestamp), k]));
    const missingDates: string[] = [];
    for (
      let d = new Date(start.getTime());
      d <= today;
      d = new Date(d.getTime() + 24 * 60 * 60 * 1000)
    ) {
      if (this.isWeekend(d)) continue;
      const key = d.toISOString().slice(0, 10);
      if (!existingMap.has(key)) {
        missingDates.push(key);
      }
    }

    if (missingDates.length) {
      const startMs = Date.parse(missingDates[0]);
      const endMs = Date.parse(missingDates[missingDates.length - 1]) + 24 * 60 * 60 * 1000 - 1;
      try {
        const fetched = await this.fetchRange(symbol, startMs, endMs);
        for (const rec of fetched) {
          const key = this.dateKey(rec.timestamp);
          if (this.isWeekend(new Date(rec.timestamp))) continue;
          existingMap.set(key, rec);
        }
        const merged = Array.from(existingMap.values()).sort((a, b) => a.timestamp - b.timestamp);
        await this.writeAll(symbol, merged);
        return merged;
      } catch (err) {
        this.logger.warn(`Failed to fetch missing klines for ${symbol}: ${(err as Error).message}`);
      }
    }

    return Array.from(existingMap.values()).sort((a, b) => a.timestamp - b.timestamp);
  }
}
