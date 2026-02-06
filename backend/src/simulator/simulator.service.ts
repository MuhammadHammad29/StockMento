import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  Prisma,
  SimOrderStatus,
  SimOrderType,
  SimOrderTriggerStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.types';
import { TickService } from './tick.service';

type Numeric = number | string | Prisma.Decimal;

const dec = (value: Numeric) => new Prisma.Decimal(value as any);

const toNumber = (value: Prisma.Decimal | number | null | undefined) =>
  value ? Number(value) : 0;

const DEFAULT_INITIAL_CASH =
  Number.parseFloat(process.env.SIM_INITIAL_CASH ?? '100000') || 100000;

export type PortfolioSnapshotResponse = {
  accountId: string;
  cashAvailable: number;
  cashLocked: number;
  equityLast: number;
  holdingsValue: number;
  unrealizedPnlLast: number;
  realizedPnlTotal: number;
  totalEquity: number;
  holdings: Array<{
    symbol: string;
    name: string;
    quantity: number;
    avgCostPrice: number;
    livePrice: number | null;
    value: number | null;
    pnl: number | null;
    realizedPnl: number | null;
  }>;
  openOrders: Array<{
    id: string;
    symbol: string;
    side: string;
    orderType: string;
    quantity: number;
    filledQty: number;
    limitPrice?: number | null;
    triggerPrice?: number | null;
    status: string;
    createdAt: string;
  }>;
};

export type OrderExecutionResponse = {
  orderId: string;
  tradeId: string;
  price: number;
  time: string;
  symbol: string;
};

type UserOrderFillEvent = OrderExecutionResponse & {
  userId: string;
};

export type OrderCancelledEvent = {
  orderId: string;
  symbol: string;
  userId: string;
  reason: string;
  time: string;
};

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tickService: TickService,
  ) {}

  async getAccountStatus(user: JwtPayload) {
    const account = await this.prisma.simAccount.findFirst({
      where: { userId: user.sub },
      select: {
        id: true,
        status: true,
        activatedAt: true,
      },
    });

    if (!account) {
      return {
        hasAccount: false,
      };
    }

    return {
      hasAccount: true,
      status: account.status,
      activatedAt: account.activatedAt?.toISOString() ?? null,
    };
  }

  private async ensureSimAccount(user: JwtPayload) {
    const existing = await this.prisma.simAccount.findFirst({
      where: { userId: user.sub },
    });
    if (existing) return existing;

    return this.prisma.simAccount.create({
      data: {
        userId: user.sub,
        baseCcy: 'PKR',
        cashAvailable: dec(DEFAULT_INITIAL_CASH),
        cashLocked: dec(0),
        equityLast: dec(DEFAULT_INITIAL_CASH),
        status: 'active',
        activatedAt: new Date(),
      },
    });
  }

  private async ensureStock(symbol: string) {
    const existing = await this.prisma.simStock.findFirst({ where: { symbol } });
    if (existing) return existing;
    return this.prisma.simStock.create({
      data: { symbol, name: symbol, isActive: true },
    });
  }

  private assertActive(account: { status: string }) {
    if (account.status !== 'active') {
      throw new BadRequestException('Simulator account is not active.');
    }
  }

  async getPortfolio(user: JwtPayload): Promise<PortfolioSnapshotResponse> {
    const account = await this.ensureSimAccount(user);
    this.assertActive(account);

    const [holdings, orders] = await Promise.all([
      this.prisma.simHolding.findMany({
        where: { simAccountId: account.id },
        include: { stock: true },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.simOrder.findMany({
        where: {
          simAccountId: account.id,
          status: { in: ['new', 'partially_filled'] },
        },
        include: { stock: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const symbols = holdings.map((h) => h.stock.symbol);
    const latestTicks = symbols.length > 0
      ? await this.tickService.getLatestTicks(symbols)
      : {};

    const holdingsResponse = holdings.map((h) => {
      const livePrice = latestTicks[h.stock.symbol]?.price ?? null;
      const value =
        livePrice != null ? livePrice * toNumber(h.quantity) : null;
      const pnl =
        value != null ? value - toNumber(h.quantity) * toNumber(h.avgCostPrice) : null;
      return {
        symbol: h.stock.symbol,
        name: h.stock.name,
        quantity: toNumber(h.quantity),
        avgCostPrice: toNumber(h.avgCostPrice),
        livePrice,
        value,
        pnl,
        realizedPnl: h.realizedPnl ? toNumber(h.realizedPnl) : null,
      };
    });

    const holdingsValue = holdingsResponse.reduce(
      (sum, h) => sum + (h.value ?? 0),
      0,
    );
    const unrealizedPnlLast = holdingsResponse.reduce(
      (sum, h) => sum + (h.pnl ?? 0),
      0,
    );
    const realizedPnlTotal = toNumber(account.realizedPnlTotal);
    const totalEquity = toNumber(account.cashAvailable) + holdingsValue;

    await this.prisma.simAccount.update({
      where: { id: account.id },
      data: {
        equityLast: dec(totalEquity),
        unrealizedPnlLast: dec(unrealizedPnlLast),
        updatedAt: new Date(),
      },
    });

    return {
      accountId: account.id,
      cashAvailable: toNumber(account.cashAvailable),
      cashLocked: toNumber(account.cashLocked),
      equityLast: totalEquity,
      holdingsValue,
      unrealizedPnlLast,
      realizedPnlTotal,
      totalEquity,
      holdings: holdingsResponse,
      openOrders: orders.map((o) => ({
        id: o.id,
        symbol: o.stock.symbol,
        side: o.side,
        orderType: o.orderType,
        quantity: toNumber(o.quantity),
        filledQty: toNumber(o.filledQty),
        limitPrice: o.limitPrice ? toNumber(o.limitPrice) : null,
        triggerPrice: o.triggerPrice ? toNumber(o.triggerPrice) : null,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  private shouldTrigger(
    side: 'buy' | 'sell',
    currentPrice: number,
    triggerPrice?: number | null,
  ) {
    if (!triggerPrice || triggerPrice <= 0) return false;
    return side === 'buy'
      ? currentPrice >= triggerPrice - 1e-6
      : currentPrice <= triggerPrice + 1e-6;
  }

  async placeOrder(
    user: JwtPayload,
    params: {
      symbol: string;
      side: 'buy' | 'sell';
      orderType: SimOrderType;
      quantity: number;
      limitPrice?: number;
      triggerPrice?: number;
      stopLimitPrice?: number;
      currentPrice?: number;
    },
  ) {
    if (!params.symbol) throw new BadRequestException('Symbol is required');

    const normalizeOptional = (value?: number | null) => {
      if (value === null || value === undefined) return undefined;
      const num = Number(value);
      return Number.isFinite(num) ? num : undefined;
    };

    const normalizedQty = Number(params.quantity);
    if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
      throw new BadRequestException('Quantity must be positive');
    }
    params.quantity = normalizedQty;

    const normalizedLimit = normalizeOptional(params.limitPrice);
    const normalizedTrigger = normalizeOptional(params.triggerPrice);
    const normalizedStopLimit = normalizeOptional(params.stopLimitPrice);
    const normalizedCurrent = normalizeOptional(params.currentPrice);

    params.limitPrice = normalizedLimit;
    params.triggerPrice = normalizedTrigger;
    params.stopLimitPrice = normalizedStopLimit;
    params.currentPrice = normalizedCurrent;

    if (
      params.orderType === SimOrderType.limit &&
      (!normalizedLimit || normalizedLimit <= 0)
    ) {
      throw new BadRequestException('Limit price is required for limit orders.');
    }

    if (params.orderType === SimOrderType.stop_limit) {
      if (!normalizedTrigger || normalizedTrigger <= 0) {
        throw new BadRequestException('Trigger price is required for stop-limit orders.');
      }
      if (!normalizedStopLimit || normalizedStopLimit <= 0) {
        throw new BadRequestException('Stop limit price is required for stop-limit orders.');
      }
    }

    const account = await this.ensureSimAccount(user);
    this.assertActive(account);
    const stock = await this.ensureStock(params.symbol);

    const holding = await this.prisma.simHolding.findUnique({
      where: { simAccountId_stockId: { simAccountId: account.id, stockId: stock.id } },
    });

    const orderQty = params.quantity;
    const heldQty = toNumber(holding?.quantity);
    const cashAvailable = toNumber(account.cashAvailable);

    if (params.side === 'sell' && heldQty < orderQty - 1e-6) {
      throw new BadRequestException('Insufficient holdings to sell that quantity.');
    }

    const cashCheckPrice =
      params.orderType === SimOrderType.market
        ? params.currentPrice
        : params.stopLimitPrice ?? params.limitPrice ?? params.currentPrice;

    if (params.side === 'buy') {
      if (
        cashCheckPrice &&
        cashCheckPrice > 0 &&
        cashAvailable + 1e-6 < cashCheckPrice * orderQty
      ) {
        throw new BadRequestException('Insufficient cash to place this order.');
      }
    }

    const now = new Date();
    const { orderType } = params;

    let executionPrice =
      orderType === SimOrderType.market
        ? params.currentPrice ?? null
        : params.limitPrice ?? null;

    if (orderType === SimOrderType.market) {
      const latestTick = await this.tickService.getLatestTick(params.symbol);
      executionPrice = latestTick?.price ?? null;
      if (!executionPrice || executionPrice <= 0) {
        throw new BadRequestException('Unable to fetch live price for market order');
      }
    }

    const order = await this.prisma.simOrder.create({
      data: {
        simAccountId: account.id,
        stockId: stock.id,
        side: params.side,
        orderType,
        quantity: dec(params.quantity),
        filledQty: dec(0),
        status: SimOrderStatus.new,
        limitPrice: params.limitPrice ? dec(params.limitPrice) : undefined,
        triggerPrice: params.triggerPrice ? dec(params.triggerPrice) : undefined,
        stopLimitPrice: params.stopLimitPrice
          ? dec(params.stopLimitPrice)
          : undefined,
        triggerStatus:
          orderType === SimOrderType.stop_limit
            ? SimOrderTriggerStatus.pending
            : undefined,
        createdAt: now,
        updatedAt: now,
      },
      include: { stock: true },
    });

    let execution: UserOrderFillEvent | null = null;

    if (orderType === SimOrderType.market) {
      execution = await this.executeOrder(order, executionPrice!, now);
    } else if (
      orderType === SimOrderType.stop_limit &&
      params.currentPrice &&
      this.shouldTrigger(params.side, params.currentPrice, params.triggerPrice)
    ) {
      execution = await this.executeOrder(
        order,
        params.stopLimitPrice ?? params.currentPrice,
        now,
      );
    }

    const portfolio = await this.getPortfolio(user);
    return {
      portfolio,
      execution: execution ? this.toExecutionResponse(execution) : null,
    };
  }

  async cancelOrder(user: JwtPayload, orderId: string) {
    if (!orderId) {
      throw new BadRequestException('Order id is required');
    }

    const account = await this.ensureSimAccount(user);
    this.assertActive(account);

    const order = await this.prisma.simOrder.findFirst({
      where: { id: orderId, simAccountId: account.id },
    });

    if (!order) {
      throw new BadRequestException('Order not found');
    }

    const cancellableStatuses: SimOrderStatus[] = [
      SimOrderStatus.new,
      SimOrderStatus.partially_filled,
    ];

    if (!cancellableStatuses.includes(order.status)) {
      throw new BadRequestException('Only open orders can be cancelled');
    }

    const baseMeta =
      order.meta && typeof order.meta === 'object' && !Array.isArray(order.meta)
        ? (order.meta as Record<string, unknown>)
        : {};

    await this.prisma.simOrder.update({
      where: { id: order.id },
      data: {
        status: SimOrderStatus.cancelled,
        triggerStatus: SimOrderTriggerStatus.cancelled,
        updatedAt: new Date(),
        meta: {
          ...baseMeta,
          cancelledAt: new Date().toISOString(),
        },
      },
    });

    return this.getPortfolio(user);
  }

  async cancelOpenOrdersForSymbol(
    symbol: string,
    reason = 'market_halt',
  ): Promise<OrderCancelledEvent[]> {
    if (!symbol) return [];
    const stock = await this.prisma.simStock.findFirst({
      where: { symbol: symbol.toUpperCase() },
      select: { id: true },
    });
    if (!stock) return [];

    const now = new Date();
    const openOrders = await this.prisma.simOrder.findMany({
      where: {
        stockId: stock.id,
        status: { in: [SimOrderStatus.new, SimOrderStatus.partially_filled] },
      },
      select: {
        id: true,
        account: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (!openOrders.length) return [];

    await this.prisma.simOrder.updateMany({
      where: {
        id: { in: openOrders.map((order) => order.id) },
      },
      data: {
        status: SimOrderStatus.cancelled,
        triggerStatus: SimOrderTriggerStatus.cancelled,
        updatedAt: now,
        meta: {
          cancelledAt: now.toISOString(),
          reason,
        } as Prisma.InputJsonObject,
      },
    });

    return openOrders.map((order) => ({
      orderId: order.id,
      symbol: symbol.toUpperCase(),
      userId: order.account.userId,
      reason,
      time: now.toISOString(),
    }));
  }

  async processPendingOrdersForSymbol(
    symbol: string,
    price: number,
    executionTime: Date,
  ): Promise<UserOrderFillEvent[]> {
    const fillEvents: UserOrderFillEvent[] = [];
    if (!Number.isFinite(price) || price <= 0) return fillEvents;
    const stock = await this.prisma.simStock.findFirst({
      where: { symbol },
      select: { id: true },
    });
    if (!stock) return fillEvents;

    const orders = await this.prisma.simOrder.findMany({
      where: { stockId: stock.id, status: { in: ['new', 'partially_filled'] } },
    });

    for (const order of orders) {
      if (
        order.orderType === SimOrderType.stop_limit &&
        order.triggerStatus === SimOrderTriggerStatus.pending
      ) {
        const trigger = order.triggerPrice ? toNumber(order.triggerPrice) : null;
        if (!this.shouldTrigger(order.side as any, price, trigger)) {
          continue;
        }
        await this.prisma.simOrder.update({
          where: { id: order.id },
          data: {
            triggerStatus: SimOrderTriggerStatus.triggered,
            triggeredAt: executionTime,
            updatedAt: new Date(),
          },
        });
      }

      if (
        order.orderType === SimOrderType.limit ||
        order.orderType === SimOrderType.stop_limit
      ) {
        const limitSource =
          order.orderType === SimOrderType.stop_limit && order.stopLimitPrice
            ? order.stopLimitPrice
            : order.limitPrice;
        const limit = limitSource ? toNumber(limitSource) : null;
        if (limit == null) continue;
        if (order.side === 'buy' && price > limit + 1e-6) continue;
        if (order.side === 'sell' && price < limit - 1e-6) continue;
      }
      const fill = await this.executeOrder(order, price, executionTime);
      if (fill) {
        fillEvents.push(fill);
      }
    }
    return fillEvents;
  }

  private async executeOrder(
    order: Prisma.SimOrderGetPayload<true>,
    price: number,
    executionTime: Date,
  ): Promise<UserOrderFillEvent | null> {
    const account = await this.prisma.simAccount.findUnique({
      where: { id: order.simAccountId },
    });
    const stock = await this.prisma.simStock.findUnique({
      where: { id: order.stockId },
    });
    if (!account || !stock) return null;

    const quantity = toNumber(order.quantity);
    const cost = price * quantity;

    if (order.side === 'buy' && toNumber(account.cashAvailable) + 1e-6 < cost) {
      await this.prisma.simOrder.update({
        where: { id: order.id },
        data: { status: 'rejected', updatedAt: new Date() },
      });
      return null;
    }

    let tradeId = '';
    await this.prisma.$transaction(async (tx) => {
      const trade = await tx.simTrade.create({
        data: {
          orderId: order.id,
          simAccountId: account.id,
          stockId: stock.id,
          tradeTime: executionTime,
          price: dec(price),
          quantity: dec(quantity),
          cashEffect: dec(order.side === 'buy' ? -cost : cost),
        },
      });

      if (order.side === 'buy') {
        const holding = await tx.simHolding.upsert({
          where: { simAccountId_stockId: { simAccountId: account.id, stockId: stock.id } },
          update: {},
          create: {
            simAccountId: account.id,
            stockId: stock.id,
            quantity: dec(0),
            avgCostPrice: dec(0),
            realizedPnl: dec(0),
          },
        });

        const oldQty = toNumber(holding.quantity);
        const newQty = oldQty + quantity;
        const newCostBasis =
          oldQty * toNumber(holding.avgCostPrice) + cost;
        await tx.simHolding.update({
          where: { id: holding.id },
          data: {
            quantity: dec(newQty),
            avgCostPrice: dec(newQty > 0 ? newCostBasis / newQty : 0),
            updatedAt: new Date(),
          },
        });

        await tx.simAccount.update({
          where: { id: account.id },
          data: {
            cashAvailable: dec(toNumber(account.cashAvailable) - cost),
            equityLast: dec(toNumber(account.equityLast) - cost),
            updatedAt: new Date(),
          },
        });
      } else {
        const holding = await tx.simHolding.findUnique({
          where: { simAccountId_stockId: { simAccountId: account.id, stockId: stock.id } },
        });
        const heldQty = toNumber(holding?.quantity);
        if (!holding || heldQty < quantity - 1e-6) {
          throw new BadRequestException('Insufficient holdings to sell.');
        }
        const avgCost = toNumber(holding.avgCostPrice);
        const realizedDelta = (price - avgCost) * quantity;
        const nextRealized = toNumber(holding.realizedPnl) + realizedDelta;
        const remaining = heldQty - quantity;
        await tx.simHolding.update({
          where: { id: holding.id },
          data: {
            quantity: dec(remaining),
            avgCostPrice: dec(remaining > 0 ? avgCost : 0),
            realizedPnl: dec(nextRealized),
            updatedAt: new Date(),
          },
        });
        await tx.simAccount.update({
          where: { id: account.id },
          data: {
            cashAvailable: dec(toNumber(account.cashAvailable) + cost),
            equityLast: dec(toNumber(account.equityLast) + cost),
            realizedPnlTotal: dec(toNumber(account.realizedPnlTotal) + realizedDelta),
            updatedAt: new Date(),
          },
        });
      }

      await tx.simOrder.update({
        where: { id: order.id },
        data: {
          filledQty: order.quantity,
          status: SimOrderStatus.filled,
          updatedAt: new Date(),
          meta: { lastTradeId: trade.id },
        },
      });
      tradeId = trade.id;
    });

    return {
      orderId: order.id,
      tradeId,
      price,
      time: executionTime.toISOString(),
      symbol: stock.symbol,
      userId: account.userId,
    };
  }

  private toExecutionResponse(
    fillEvent: UserOrderFillEvent,
  ): OrderExecutionResponse {
    return {
      orderId: fillEvent.orderId,
      tradeId: fillEvent.tradeId,
      price: fillEvent.price,
      time: fillEvent.time,
      symbol: fillEvent.symbol,
    };
  }
}
