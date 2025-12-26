import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import type { Server } from 'socket.io';
import type Redis from 'ioredis';
import { RedisService } from './redis.service';
import type { Tick } from './tick.service';
import { TickService } from './tick.service';
import { SimulatorService } from './simulator.service';
import { IntradayCandleService } from './intraday-candle.service';

@WebSocketGateway({
  cors: {
    origin:
      process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ||
      '*',
  },
})
@Injectable()
export class TickGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TickGateway.name);
  private readonly tickChannel =
    process.env.REDIS_PUBSUB_CHANNEL ?? 'psx:ticks:stream';
  private readonly statsChannel =
    process.env.REDIS_STATS_CHANNEL ?? 'psx:stats:stream';

  private subscriber: Redis | null = null;
  private subscriptions: string[] = [];

  constructor(
    private readonly redisService: RedisService,
    private readonly simulatorService: SimulatorService,
    private readonly tickService: TickService,
    private readonly intradayCandleService: IntradayCandleService,
  ) {}

  async onModuleInit() {
    this.subscriber = this.redisService.getSubscriber();
    this.subscriber.on('pmessage', (_pattern, channel, message) => {
      this.handleMessage(channel, message);
    });
    this.subscriber.on('message', (channel, message) => {
      this.handleMessage(channel, message);
    });

    await this.subscribe(this.tickChannel);
    if (this.statsChannel && this.statsChannel !== this.tickChannel) {
      await this.subscribe(this.statsChannel);
    }
  }

  async onModuleDestroy() {
    if (!this.subscriber) return;
    const status = this.subscriber.status;
    if (status === 'close' || status === 'end' || status === 'wait' || status === 'reconnecting') {
      this.logger.debug('Redis subscriber already closed, skipping unsubscribe');
      return;
    }
    for (const channel of this.subscriptions) {
      try {
        if (channel.includes('*')) {
          await this.subscriber.punsubscribe(channel);
        } else {
          await this.subscriber.unsubscribe(channel);
        }
      } catch (error) {
        const err = error as Error;
        if (err.message?.toLowerCase().includes('connection is closed')) {
          this.logger.debug(
            `Redis connection closed while unsubscribing ${channel}, ignoring`,
          );
          break;
        }
        this.logger.error(
          `Failed unsubscribing Redis channel ${channel}`,
          err,
        );
      }
    }
  }

  private async subscribe(channel: string | undefined) {
    if (!channel || !this.subscriber) return;
    if (channel.includes('*')) {
      await this.subscriber.psubscribe(channel);
      this.logger.log(`Subscribed to Redis pattern ${channel}`);
    } else {
      await this.subscriber.subscribe(channel);
      this.logger.log(`Subscribed to Redis channel ${channel}`);
    }
    this.subscriptions.push(channel);
  }

  private handleMessage(channel: string, message: string) {
    try {
      const parsed = JSON.parse(message) as Tick & { kind?: string };
      if (parsed?.kind === 'market_stats') {
        this.server?.emit('marketStats', parsed);
        return;
      }

      if (parsed?.symbol) {
        const normalized = this.tickService.normalizeTick(parsed);
        if (Number.isFinite(normalized.price) && normalized.price > 0) {
          void this.simulatorService.processPendingOrdersForSymbol(
            normalized.symbol,
            normalized.price,
            new Date(normalized.timestamp_ms),
          );
          void this.intradayCandleService
            .recordTick(normalized)
            .then((candle) => {
              if (candle) {
                this.server?.emit('intradayCandle', candle);
              }
            })
            .catch((error) =>
              this.logger.debug(
                `Failed to record intraday candle for ${normalized.symbol}: ${
                  (error as Error).message
                }`,
              ),
            );
        }
        this.server?.emit('tick', normalized);
        return;
      }

      this.server?.emit('tick', parsed);
    } catch (error) {
      this.logger.warn(`Failed to parse Redis message from ${channel}: ${(error as Error).message}`);
    }
  }
}
