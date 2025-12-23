import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { TickService } from './tick.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('simulator/ticks')
export class TickController {
  constructor(private readonly tickService: TickService) {}

  @Get()
  list(@Query('symbol') symbol = 'ATRL', @Query('limit') limit?: string) {
    const parsedLimit = limit ? Number(limit) : undefined;
    return this.tickService.getRecentTicks(symbol, parsedLimit ?? 200);
  }
}
