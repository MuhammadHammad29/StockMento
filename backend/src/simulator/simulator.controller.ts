import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
} from 'class-validator';
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

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  buyVolume?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  sellVolume?: number;
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
  placeOrder(
    @CurrentUser() user: JwtPayload,
    @Body() dto: PlaceOrderDto,
  ) {
    return this.simulatorService.placeOrder(user, {
      ...dto,
      orderType: dto.orderType as any,
    });
  }
}
