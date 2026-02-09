import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { IntradayCandleService } from './intraday-candle.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('simulator/candles')
export class IntradayCandleController {
  constructor(private readonly candleService: IntradayCandleService) {}

  @Get('intraday')
  async list(@Query('symbol') symbol = 'ATRL', @Query('date') date?: string) {
    return this.candleService.getCandles(symbol, date);
  }
}
