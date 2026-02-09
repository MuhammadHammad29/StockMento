import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private readonly logger = new Logger(RedisService.name);

  constructor(private readonly configService: ConfigService) {}

  private get redisUrl() {
    return (
      this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379/0'
    );
  }

  getClient(): Redis {
    if (!this.client) {
      this.client = new Redis(this.redisUrl, {
        maxRetriesPerRequest: null,
      });
    }
    return this.client;
  }

  getSubscriber(): Redis {
    if (!this.subscriber) {
      this.subscriber = this.getClient().duplicate();
    }
    return this.subscriber;
  }

  private async safeQuit(conn: Redis | null, label: string) {
    if (!conn) return;
    const status = conn.status;
    if (status === 'close' || status === 'end') {
      this.logger.debug(`Redis ${label} already closed.`);
      return;
    }
    try {
      await conn.quit();
    } catch (error) {
      const err = error as Error;
      if (err.message?.toLowerCase().includes('connection is closed')) {
        this.logger.debug(
          `Redis ${label} connection closed before quit, ignoring`,
        );
      } else {
        this.logger.error(`Failed to close Redis ${label}`, err);
      }
    }
  }

  async onModuleDestroy() {
    await this.safeQuit(this.subscriber, 'subscriber');
    this.subscriber = null;
    await this.safeQuit(this.client, 'client');
    this.client = null;
  }
}
