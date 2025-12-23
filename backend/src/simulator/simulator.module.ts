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

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [SimulatorController, TickController, KlineController],
  providers: [
    SimulatorService,
    TickService,
    KlineService,
    TickGateway,
    RedisService,
    {
      provide: 'REDIS_OPTIONS',
      useValue: {},
    },
  ],
  exports: [TickGateway],
})
export class SimulatorModule {}
