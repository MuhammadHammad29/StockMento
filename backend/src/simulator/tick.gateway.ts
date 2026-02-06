import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { ConfigService } from '@nestjs/config';
import { verify } from 'jsonwebtoken';
import type { Server, Socket } from 'socket.io';
import type Redis from 'ioredis';
import { RedisService } from './redis.service';
import type { Tick } from './tick.service';
import { TickService } from './tick.service';
import { SimulatorService } from './simulator.service';
import { IntradayCandleService } from './intraday-candle.service';
import type { JwtPayload } from '../auth/auth.types';

@WebSocketGateway({
  cors: {
    origin:
      process.env.CORS_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) ||
      '*',
  },
})
@Injectable()
export class TickGateway
  implements OnModuleInit, OnModuleDestroy, OnGatewayConnection
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TickGateway.name);
  private readonly tickChannel =
    process.env.REDIS_PUBSUB_CHANNEL ?? 'psx:ticks:stream';
  private readonly statsChannel =
    process.env.REDIS_STATS_CHANNEL ?? 'psx:stats:stream';

  private subscriber: Redis | null = null;
  private subscriptions: string[] = [];
  private readonly statusCache = new Map<string, string>();
  private readonly statusKey = 'sim:market:status';

  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
    private readonly simulatorService: SimulatorService,
    private readonly tickService: TickService,
    private readonly intradayCandleService: IntradayCandleService,
  ) {}

  handleConnection(client: Socket) {
    const token = this.extractSocketToken(client);
    if (!token) {
      client.disconnect(true);
      return;
    }

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    if (!accessSecret) {
      this.logger.error('JWT_ACCESS_SECRET is not configured for gateway auth');
      client.disconnect(true);
      return;
    }

    try {
      const payload = verify(token, accessSecret) as JwtPayload;
      if (!payload?.sub || payload.role !== 'student') {
        client.disconnect(true);
        return;
      }
      client.join(`user:${payload.sub}`);
    } catch {
      client.disconnect(true);
    }
  }

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
        const rawStatus =
          typeof (parsed as { st?: string }).st === 'string'
            ? (parsed as { st?: string }).st
            : undefined;
        const status = rawStatus ? rawStatus.trim().toUpperCase() : undefined;
        if (status) {
          const symbolKey = parsed.symbol.toUpperCase();
          const previous = this.statusCache.get(symbolKey);
          if (previous !== status) {
            this.statusCache.set(symbolKey, status);
            void this.redisService
              .getClient()
              .hset(this.statusKey, symbolKey, status);
          }
          if (status !== 'OPN' && previous !== status) {
            void this.simulatorService
              .cancelOpenOrdersForSymbol(symbolKey, `market_status:${status}`)
              .then((events) => {
                for (const event of events) {
                  this.server
                    ?.to(`user:${event.userId}`)
                    .emit('orderCancelled', event);
                }
              })
              .catch((error) =>
                this.logger.debug(
                  `Failed to cancel open orders for ${symbolKey}: ${
                    (error as Error).message
                  }`,
                ),
              );
          }
        }
        const normalized = this.tickService.normalizeTick(parsed);
        if (Number.isFinite(normalized.price) && normalized.price > 0) {
          void this.simulatorService
            .processPendingOrdersForSymbol(
              normalized.symbol,
              normalized.price,
              new Date(normalized.timestamp_ms),
            )
            .then((fills) => {
              for (const fill of fills) {
                this.server?.to(`user:${fill.userId}`).emit('orderFilled', {
                  orderId: fill.orderId,
                  tradeId: fill.tradeId,
                  symbol: fill.symbol,
                  price: fill.price,
                  time: fill.time,
                });
              }
            })
            .catch((error) =>
              this.logger.debug(
                `Failed processing pending orders for ${normalized.symbol}: ${
                  (error as Error).message
                }`,
              ),
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

  private extractSocketToken(client: Socket): string | null {
    const authToken =
      typeof client.handshake.auth?.token === 'string'
        ? client.handshake.auth.token
        : null;
    if (authToken) {
      return authToken.replace(/^Bearer\s+/i, '').trim();
    }

    const headerAuth =
      typeof client.handshake.headers.authorization === 'string'
        ? client.handshake.headers.authorization
        : null;
    if (headerAuth) {
      return headerAuth.replace(/^Bearer\s+/i, '').trim();
    }

    return null;
  }
}
