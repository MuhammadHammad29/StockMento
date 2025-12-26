import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SimulatorController } from './simulator.controller';
import { TickController } from './tick.controller';
import { SimulatorService } from './simulator.service';
import { TickService } from './tick.service';
import { KlineService } from './kline.service';
import { KlineController } from './kline.controller';
import { TickGateway } from './tick.gateway';
import { RedisService } from './redis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { IntradayCandleService } from './intraday-candle.service';
import { IntradayCandleController } from './intraday-candle.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [
    SimulatorController,
    TickController,
    KlineController,
    IntradayCandleController,
  ],
  providers: [
    SimulatorService,
    TickService,
    KlineService,
    TickGateway,
    RedisService,
    IntradayCandleService,
    {
      provide: 'REDIS_OPTIONS',
      useValue: {},
    },
  ],
  exports: [TickGateway],
})
export class SimulatorModule {}
