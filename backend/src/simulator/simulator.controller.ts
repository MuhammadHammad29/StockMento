import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
  Delete,
  Param,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsIn,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  Matches,
  Max,
  Min,
  IsPositive,
  IsString,
} from 'class-validator';
import { SimOrderType } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../auth/auth.types';
import { SimulatorService } from './simulator.service';
import { TickService } from './tick.service';

class PlaceOrderDto {
  @IsString()
  @IsNotEmpty()
  symbol!: string;

  @IsEnum(['buy', 'sell'])
  side!: 'buy' | 'sell';

  @IsIn(['market', 'limit', 'stop_limit'])
  orderType!: 'market' | 'limit' | 'stop_limit';

  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  triggerPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  stopLimitPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  currentPrice?: number;
}

class LeaderboardQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('student')
@Controller('simulator')
export class SimulatorController {
  constructor(
    private readonly simulatorService: SimulatorService,
    private readonly tickService: TickService,
  ) {}

  @Get('account')
  accountStatus(@CurrentUser() user: JwtPayload) {
    return this.simulatorService.getAccountStatus(user);
  }

  @Get('portfolio')
  portfolio(@CurrentUser() user: JwtPayload) {
    return this.simulatorService.getPortfolio(user);
  }

  @Get('leaderboard')
  leaderboard(
    @CurrentUser() user: JwtPayload,
    @Query() query: LeaderboardQueryDto,
  ) {
    return this.simulatorService.getDailyLeaderboard(user, query);
  }

  @Get()
  info() {
    return {
      message: 'Stock simulator',
      features: [
        'Live ticks via Redis + WebSocket gateway',
        'Market/limit order entry with portfolio updates',
        'Holdings, open orders, and recent trades snapshot',
      ],
    };
  }

  @Get('start_simulator')
  async start(
    @CurrentUser() user: JwtPayload,
    @Query('symbol') symbol = 'ATRL',
    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 15000;
    const [portfolio, ticks] = await Promise.all([
      this.simulatorService.getPortfolio(user),
      this.tickService.getRecentTicks(symbol, parsedLimit),
    ]);
    return { portfolio, ticks, symbol };
  }

  @Get('tickers')
  async tickers(
    @Query('symbols') symbols?: string,
    @Query('fallback')
    fallback = 'ATRL,AVN,DGKC,EFERT,ENGROH,FABL,FCCL,FFL,GAL,GHNI,HCAR,HUBC,LUCK,MARI,MEBL,MLCF,MTL,NETSOL,OCTOPUS,OGDC,PAEL,PIOC,PPL,PRL,PSO,SAZEW,SEARL,SNGP,SYS,TOMCL',
  ) {
    const list = (symbols || fallback)
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean);
    const data = await this.tickService.getLatestTicks(list);
    return data;
  }

  @Post('orders')
  placeOrder(@CurrentUser() user: JwtPayload, @Body() dto: PlaceOrderDto) {
    const orderTypeMap: Record<PlaceOrderDto['orderType'], SimOrderType> = {
      market: SimOrderType.market,
      limit: SimOrderType.limit,
      stop_limit: SimOrderType.stop_limit,
    };
    return this.simulatorService.placeOrder(user, {
      ...dto,
      orderType: orderTypeMap[dto.orderType],
    });
  }

  @Delete('orders/:orderId')
  cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
  ) {
    return this.simulatorService.cancelOrder(user, orderId);
  }
}
