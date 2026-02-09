import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { KlineService } from './kline.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('simulator/klines')
export class KlineController {
  constructor(private readonly klineService: KlineService) {}

  @Get()
  async list(
    @Query('symbol') symbol = 'ATRL',
    @Query('timeframe') timeframe = '1d',
  ) {
    if (timeframe !== '1d') {
      throw new Error('Only 1d timeframe is supported for klines.');
    }
    const klines = await this.klineService.getDailyKlines(symbol);
    return klines.map((k) => ({
      symbol,
      timeframe: '1d',
      timestamp: k.timestamp,
      open: Number(k.open),
      high: Number(k.high),
      low: Number(k.low),
      close: Number(k.close),
      volume: Number(k.volume ?? 0),
    }));
  }
}
