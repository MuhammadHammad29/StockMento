import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import {
  Prisma,
  SimOrderStatus,
  SimOrderType,
  SimOrderTriggerStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { JwtPayload } from '../auth/auth.types';
import { TickService } from './tick.service';

const dec = (value: Prisma.Decimal.Value) => new Prisma.Decimal(value);

const toNumber = (value: Prisma.Decimal | number | null | undefined) =>
  value ? Number(value) : 0;

const DEFAULT_INITIAL_CASH =
  Number.parseFloat(process.env.SIM_INITIAL_CASH ?? '100000') || 100000;
const LEADERBOARD_DEFAULT_LIMIT = 50;
const LEADERBOARD_MAX_LIMIT = 200;
const LEADERBOARD_CRON = process.env.SIM_LEADERBOARD_CRON ?? '50 16 * * 1-5';
const LEADERBOARD_TIMEZONE =
  process.env.SIM_LEADERBOARD_TIMEZONE ?? 'Asia/Karachi';

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
    stopLimitPrice?: number | null;
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

export type DailyLeaderboardResponse = {
  asOfDate: string;
  totalParticipants: number;
  rows: Array<{
    rank: number;
    totalEquity: number;
    simAccountId: string;
    userId: string;
    displayName: string;
  }>;
  me: {
    rank: number;
    totalEquity: number;
    simAccountId: string;
  } | null;
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
    const existing = await this.prisma.simStock.findFirst({
      where: { symbol },
    });
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
        // Holdings view should show only active/open positions.
        where: {
          simAccountId: account.id,
          quantity: { gt: 0 },
        },
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
    const latestTicks =
      symbols.length > 0 ? await this.tickService.getLatestTicks(symbols) : {};

    const holdingsResponse = holdings.map((h) => {
      const livePrice = latestTicks[h.stock.symbol]?.price ?? null;
      const value = livePrice != null ? livePrice * toNumber(h.quantity) : null;
      const pnl =
        value != null
          ? value - toNumber(h.quantity) * toNumber(h.avgCostPrice)
          : null;
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
        stopLimitPrice: o.stopLimitPrice ? toNumber(o.stopLimitPrice) : null,
        status: o.status,
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  private toLeaderboardDateString(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: LEADERBOARD_TIMEZONE,
    }).format(date);
  }

  private parseLeaderboardDate(date?: string): string {
    const fallback = this.toLeaderboardDateString(new Date());
    if (!date) return fallback;
    const trimmed = date.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      throw new BadRequestException('date must be in YYYY-MM-DD format');
    }
    return trimmed;
  }

  private toDateOnlyUtc(dateString: string): Date {
    return new Date(`${dateString}T00:00:00.000Z`);
  }

  private normalizeLeaderboardLimit(limit?: number): number {
    if (!Number.isFinite(limit ?? NaN)) return LEADERBOARD_DEFAULT_LIMIT;
    return Math.max(1, Math.min(LEADERBOARD_MAX_LIMIT, Number(limit)));
  }

  private normalizeLeaderboardOffset(offset?: number): number {
    if (!Number.isFinite(offset ?? NaN)) return 0;
    return Math.max(0, Math.floor(Number(offset)));
  }

  private buildDisplayName(account: {
    user: {
      email: string;
      profile: { firstName: string; lastName: string } | null;
    };
  }): string {
    const firstName = account.user.profile?.firstName?.trim() ?? '';
    const lastName = account.user.profile?.lastName?.trim() ?? '';
    const full = `${firstName} ${lastName}`.trim();
    return full || account.user.email;
  }

  private async computeDailyLeaderboardRows() {
    const accounts = await this.prisma.simAccount.findMany({
      where: { status: 'active' },
      select: {
        id: true,
        userId: true,
        cashAvailable: true,
        user: {
          select: {
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    if (!accounts.length) return [];

    const accountIds = accounts.map((account) => account.id);
    const holdings = await this.prisma.simHolding.findMany({
      where: {
        simAccountId: { in: accountIds },
        quantity: { gt: dec(0) },
      },
      select: {
        simAccountId: true,
        quantity: true,
        avgCostPrice: true,
        stock: {
          select: {
            symbol: true,
          },
        },
      },
    });

    const symbols = Array.from(
      new Set(holdings.map((holding) => holding.stock.symbol)),
    );
    const latestTicks =
      symbols.length > 0 ? await this.tickService.getLatestTicks(symbols) : {};

    const holdingsByAccount = new Map<string, number>();
    for (const holding of holdings) {
      const tickPrice = latestTicks[holding.stock.symbol]?.price;
      const markPrice =
        Number.isFinite(tickPrice) && tickPrice && tickPrice > 0
          ? tickPrice
          : toNumber(holding.avgCostPrice);
      const positionValue = toNumber(holding.quantity) * markPrice;
      holdingsByAccount.set(
        holding.simAccountId,
        (holdingsByAccount.get(holding.simAccountId) ?? 0) + positionValue,
      );
    }

    const rows = accounts.map((account) => ({
      simAccountId: account.id,
      userId: account.userId,
      totalEquity:
        toNumber(account.cashAvailable) +
        (holdingsByAccount.get(account.id) ?? 0),
      displayName: this.buildDisplayName(account),
      rank: 0,
    }));

    rows.sort(
      (a, b) =>
        b.totalEquity - a.totalEquity ||
        a.simAccountId.localeCompare(b.simAccountId),
    );

    let rank = 0;
    let position = 0;
    let lastEquity: number | null = null;
    for (const row of rows) {
      position += 1;
      if (
        lastEquity === null ||
        Math.abs(row.totalEquity - lastEquity) > 1e-6
      ) {
        rank = position;
        lastEquity = row.totalEquity;
      }
      row.rank = rank;
    }

    return rows;
  }

  async rebuildDailyLeaderboard(options?: { date?: string; force?: boolean }) {
    const asOfDateString = this.parseLeaderboardDate(options?.date);

    const rows = await this.computeDailyLeaderboardRows();
    const asOfDate = this.toDateOnlyUtc(asOfDateString);

    await this.prisma.$transaction(async (tx) => {
      await tx.simLeaderboardDaily.deleteMany({
        where: { asOfDate },
      });

      if (!rows.length) return;

      await tx.simLeaderboardDaily.createMany({
        data: rows.map((row) => ({
          asOfDate,
          simAccountId: row.simAccountId,
          totalEquity: dec(row.totalEquity),
          rank: row.rank,
        })),
      });
    });

    this.logger.log(
      `Daily leaderboard rebuilt for ${asOfDateString} (${rows.length} rows)`,
    );

    return {
      asOfDate: asOfDateString,
      skipped: false,
      count: rows.length,
    };
  }

  @Cron(LEADERBOARD_CRON, { timeZone: LEADERBOARD_TIMEZONE })
  async rebuildDailyLeaderboardOnSchedule() {
    try {
      const result = await this.rebuildDailyLeaderboard({ force: false });
      if (result.skipped) {
        this.logger.log(`Leaderboard rebuild skipped for ${result.asOfDate}`);
      }
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Scheduled leaderboard rebuild failed: ${err.message}`,
        err.stack,
      );
    }
  }

  async getDailyLeaderboard(
    user: JwtPayload,
    params?: { date?: string; limit?: number; offset?: number },
  ): Promise<DailyLeaderboardResponse> {
    const limit = this.normalizeLeaderboardLimit(params?.limit);
    const offset = this.normalizeLeaderboardOffset(params?.offset);
    const requestedDate = params?.date?.trim();

    let asOfDateString: string;
    let asOfDate: Date;

    if (requestedDate) {
      asOfDateString = this.parseLeaderboardDate(requestedDate);
      asOfDate = this.toDateOnlyUtc(asOfDateString);
    } else {
      const latestSnapshot = await this.prisma.simLeaderboardDaily.findFirst({
        orderBy: { asOfDate: 'desc' },
        select: { asOfDate: true },
      });

      if (latestSnapshot?.asOfDate) {
        asOfDate = latestSnapshot.asOfDate;
        asOfDateString = latestSnapshot.asOfDate.toISOString().slice(0, 10);
      } else {
        asOfDateString = this.parseLeaderboardDate();
        asOfDate = this.toDateOnlyUtc(asOfDateString);
      }
    }

    const [totalParticipants, entries, me] = await Promise.all([
      this.prisma.simLeaderboardDaily.count({
        where: { asOfDate },
      }),
      this.prisma.simLeaderboardDaily.findMany({
        where: { asOfDate },
        include: {
          account: {
            select: {
              userId: true,
              user: {
                select: {
                  email: true,
                  profile: {
                    select: {
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: [{ rank: 'asc' }, { totalEquity: 'desc' }],
        skip: offset,
        take: limit,
      }),
      this.prisma.simLeaderboardDaily.findFirst({
        where: {
          asOfDate,
          account: {
            is: {
              userId: user.sub,
            },
          },
        },
        select: {
          rank: true,
          totalEquity: true,
          simAccountId: true,
        },
      }),
    ]);

    return {
      asOfDate: asOfDateString,
      totalParticipants,
      rows: entries.map((entry) => ({
        rank: entry.rank,
        totalEquity: toNumber(entry.totalEquity),
        simAccountId: entry.simAccountId,
        userId: entry.account.userId,
        displayName: this.buildDisplayName(entry.account),
      })),
      me: me
        ? {
            rank: me.rank,
            totalEquity: toNumber(me.totalEquity),
            simAccountId: me.simAccountId,
          }
        : null,
    };
  }

  private shouldTrigger(
    side: string,
    currentPrice: number,
    triggerPrice?: number | null,
  ) {
    if (!triggerPrice || triggerPrice <= 0) return false;
    if (side !== 'buy' && side !== 'sell') return false;
    return side === 'buy'
      ? currentPrice >= triggerPrice - 1e-6
      : currentPrice <= triggerPrice + 1e-6;
  }

  private getReservedCash(meta: Prisma.JsonValue | null | undefined): number {
    if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return 0;
    const raw = (meta as Record<string, unknown>).reservedCash;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : 0;
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
      throw new BadRequestException(
        'Limit price is required for limit orders.',
      );
    }

    if (params.orderType === SimOrderType.stop_limit) {
      if (!normalizedTrigger || normalizedTrigger <= 0) {
        throw new BadRequestException(
          'Trigger price is required for stop-limit orders.',
        );
      }
      if (!normalizedStopLimit || normalizedStopLimit <= 0) {
        throw new BadRequestException(
          'Stop limit price is required for stop-limit orders.',
        );
      }
    }

    const account = await this.ensureSimAccount(user);
    this.assertActive(account);
    const stock = await this.ensureStock(params.symbol);

    const holding = await this.prisma.simHolding.findUnique({
      where: {
        simAccountId_stockId: { simAccountId: account.id, stockId: stock.id },
      },
    });

    const orderQty = params.quantity;
    const heldQty = toNumber(holding?.quantity);
    const cashAvailable = toNumber(account.cashAvailable);
    const cashLocked = toNumber(account.cashLocked);
    const spendableCash = cashAvailable - cashLocked;

    if (params.side === 'sell') {
      const openSellOrders = await this.prisma.simOrder.findMany({
        where: {
          simAccountId: account.id,
          stockId: stock.id,
          side: 'sell',
          status: { in: [SimOrderStatus.new, SimOrderStatus.partially_filled] },
        },
        select: {
          quantity: true,
          filledQty: true,
        },
      });

      const reservedSellQty = openSellOrders.reduce((sum, openOrder) => {
        const remainingQty =
          toNumber(openOrder.quantity) - toNumber(openOrder.filledQty);
        return sum + Math.max(remainingQty, 0);
      }, 0);

      const availableToSell = heldQty - reservedSellQty;
      if (availableToSell < orderQty - 1e-6) {
        throw new BadRequestException(
          'Insufficient free holdings to sell that quantity.',
        );
      }
    }

    const cashCheckPrice =
      params.orderType === SimOrderType.market
        ? params.currentPrice
        : (params.stopLimitPrice ?? params.limitPrice ?? params.currentPrice);

    if (params.side === 'buy') {
      if (
        cashCheckPrice &&
        cashCheckPrice > 0 &&
        spendableCash + 1e-6 < cashCheckPrice * orderQty
      ) {
        throw new BadRequestException('Insufficient cash to place this order.');
      }
    }

    const now = new Date();
    const { orderType } = params;

    let executionPrice =
      orderType === SimOrderType.market
        ? (params.currentPrice ?? null)
        : (params.limitPrice ?? null);

    if (orderType === SimOrderType.market) {
      const latestTick = await this.tickService.getLatestTick(params.symbol);
      executionPrice = latestTick?.price ?? null;
      if (!executionPrice || executionPrice <= 0) {
        throw new BadRequestException(
          'Unable to fetch live price for market order',
        );
      }
      if (
        params.side === 'buy' &&
        spendableCash + 1e-6 < executionPrice * orderQty
      ) {
        throw new BadRequestException('Insufficient cash to place this order.');
      }
    }

    const reservedBuyCash =
      params.side === 'buy' &&
      orderType !== SimOrderType.market &&
      cashCheckPrice &&
      cashCheckPrice > 0
        ? cashCheckPrice * orderQty
        : 0;

    const orderData: Prisma.SimOrderCreateInput = {
      account: { connect: { id: account.id } },
      stock: { connect: { id: stock.id } },
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
      meta:
        reservedBuyCash > 0
          ? ({
              reservedCash: reservedBuyCash,
              reservedAt: now.toISOString(),
            } as Prisma.InputJsonObject)
          : undefined,
    };

    const order =
      reservedBuyCash > 0
        ? await this.prisma.$transaction(async (tx) => {
            const liveAccount = await tx.simAccount.findUnique({
              where: { id: account.id },
              select: {
                cashAvailable: true,
                cashLocked: true,
              },
            });
            if (!liveAccount) {
              throw new BadRequestException('Simulator account not found.');
            }

            const liveSpendable =
              toNumber(liveAccount.cashAvailable) -
              toNumber(liveAccount.cashLocked);
            if (liveSpendable + 1e-6 < reservedBuyCash) {
              throw new BadRequestException(
                'Insufficient cash to place this order.',
              );
            }

            const created = await tx.simOrder.create({
              data: orderData,
              include: { stock: true },
            });

            await tx.simAccount.update({
              where: { id: account.id },
              data: {
                cashLocked: dec(
                  toNumber(liveAccount.cashLocked) + reservedBuyCash,
                ),
                updatedAt: new Date(),
              },
            });

            return created;
          })
        : await this.prisma.simOrder.create({
            data: orderData,
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
    const reservedCash =
      order.side === 'buy' ? this.getReservedCash(order.meta) : 0;

    await this.prisma.$transaction(async (tx) => {
      await tx.simOrder.update({
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

      if (reservedCash > 0) {
        const liveAccount = await tx.simAccount.findUnique({
          where: { id: account.id },
          select: { cashLocked: true },
        });
        if (liveAccount) {
          await tx.simAccount.update({
            where: { id: account.id },
            data: {
              cashLocked: dec(
                Math.max(toNumber(liveAccount.cashLocked) - reservedCash, 0),
              ),
              updatedAt: new Date(),
            },
          });
        }
      }
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
        simAccountId: true,
        side: true,
        meta: true,
        account: {
          select: {
            userId: true,
          },
        },
      },
    });
    if (!openOrders.length) return [];

    await this.prisma.$transaction(async (tx) => {
      for (const order of openOrders) {
        const baseMeta =
          order.meta &&
          typeof order.meta === 'object' &&
          !Array.isArray(order.meta)
            ? (order.meta as Record<string, unknown>)
            : {};
        await tx.simOrder.update({
          where: { id: order.id },
          data: {
            status: SimOrderStatus.cancelled,
            triggerStatus: SimOrderTriggerStatus.cancelled,
            updatedAt: now,
            meta: {
              ...baseMeta,
              cancelledAt: now.toISOString(),
              reason,
            } as Prisma.InputJsonObject,
          },
        });

        if (order.side === 'buy') {
          const reservedCash = this.getReservedCash(order.meta);
          if (reservedCash > 0) {
            const liveAccount = await tx.simAccount.findUnique({
              where: { id: order.simAccountId },
              select: { cashLocked: true },
            });
            if (liveAccount) {
              await tx.simAccount.update({
                where: { id: order.simAccountId },
                data: {
                  cashLocked: dec(
                    Math.max(
                      toNumber(liveAccount.cashLocked) - reservedCash,
                      0,
                    ),
                  ),
                  updatedAt: now,
                },
              });
            }
          }
        }
      }
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
        const trigger = order.triggerPrice
          ? toNumber(order.triggerPrice)
          : null;
        if (!this.shouldTrigger(order.side, price, trigger)) {
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
    const reservedCash =
      order.side === 'buy' ? this.getReservedCash(order.meta) : 0;

    if (order.side === 'buy' && toNumber(account.cashAvailable) + 1e-6 < cost) {
      await this.prisma.$transaction(async (tx) => {
        await tx.simOrder.update({
          where: { id: order.id },
          data: { status: 'rejected', updatedAt: new Date() },
        });

        if (reservedCash > 0) {
          const liveAccount = await tx.simAccount.findUnique({
            where: { id: account.id },
            select: { cashLocked: true },
          });
          if (liveAccount) {
            await tx.simAccount.update({
              where: { id: account.id },
              data: {
                cashLocked: dec(
                  Math.max(toNumber(liveAccount.cashLocked) - reservedCash, 0),
                ),
                updatedAt: new Date(),
              },
            });
          }
        }
      });
      return null;
    }

    let tradeId = '';
    await this.prisma.$transaction(async (tx) => {
      const currentAccount = await tx.simAccount.findUnique({
        where: { id: account.id },
      });
      if (!currentAccount) {
        throw new BadRequestException('Simulator account not found.');
      }

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
          where: {
            simAccountId_stockId: {
              simAccountId: account.id,
              stockId: stock.id,
            },
          },
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
        const newCostBasis = oldQty * toNumber(holding.avgCostPrice) + cost;
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
            cashAvailable: dec(toNumber(currentAccount.cashAvailable) - cost),
            cashLocked: dec(
              Math.max(toNumber(currentAccount.cashLocked) - reservedCash, 0),
            ),
            equityLast: dec(toNumber(currentAccount.equityLast) - cost),
            updatedAt: new Date(),
          },
        });
      } else {
        const holding = await tx.simHolding.findUnique({
          where: {
            simAccountId_stockId: {
              simAccountId: account.id,
              stockId: stock.id,
            },
          },
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
            cashAvailable: dec(toNumber(currentAccount.cashAvailable) + cost),
            equityLast: dec(toNumber(currentAccount.equityLast) + cost),
            realizedPnlTotal: dec(
              toNumber(currentAccount.realizedPnlTotal) + realizedDelta,
            ),
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
