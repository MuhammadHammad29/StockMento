import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;

  constructor(private readonly configService: ConfigService) {}

  private get redisUrl() {
    return this.configService.get<string>('REDIS_URL') ?? 'redis://localhost:6379/0';
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

  async onModuleDestroy() {
    if (this.subscriber) {
      await this.subscriber.quit();
      this.subscriber = null;
    }
    if (this.client) {
      await this.client.quit();
      this.client = null;
    }
  }
}
