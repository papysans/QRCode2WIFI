import { Injectable } from '@nestjs/common';
import {
  AnomalyResponse,
  EventType,
  FunnelResponse,
  OverviewResponse,
  RevenueResponse,
  ShopRankingResponse,
  TrendResponse,
} from '@q2w/shared';
import { PrismaService } from '../prisma/prisma.service';

interface Range {
  from: string;
  to: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  /** 默认近 7 天 */
  private normalizeRange(from?: string, to?: string): Range {
    const today = new Date();
    const toDate = to ?? today.toISOString().slice(0, 10);
    const fromDate =
      from ??
      new Date(today.getTime() - 6 * 86400000).toISOString().slice(0, 10);
    return { from: fromDate, to: toDate };
  }

  private async ecpm(): Promise<number> {
    const s = await this.prisma.setting.findUnique({ where: { key: 'ecpm' } });
    return s ? Number(s.value) : Number(process.env.DEFAULT_ECPM || '30');
  }

  private async sumStats(range: Range) {
    const agg = await this.prisma.dailyShopStat.aggregate({
      where: { date: { gte: range.from, lte: range.to } },
      _sum: {
        scans: true,
        adCompletes: true,
        connectClicks: true,
        connectSuccess: true,
        connectFail: true,
      },
    });
    return {
      scans: agg._sum.scans ?? 0,
      adCompletes: agg._sum.adCompletes ?? 0,
      connectClicks: agg._sum.connectClicks ?? 0,
      connectSuccess: agg._sum.connectSuccess ?? 0,
      connectFail: agg._sum.connectFail ?? 0,
    };
  }

  async overview(from?: string, to?: string): Promise<OverviewResponse> {
    const range = this.normalizeRange(from, to);
    const stats = await this.sumStats(range);
    const totalShops = await this.prisma.shop.count();
    const newShops = await this.prisma.shop.count({
      where: {
        createdAt: {
          gte: new Date(range.from),
          lte: new Date(`${range.to}T23:59:59.999Z`),
        },
      },
    });
    const ecpm = await this.ecpm();
    return {
      totalShops,
      newShops,
      totalScans: stats.scans,
      totalConnects: stats.connectSuccess,
      conversionRate: stats.scans ? stats.connectSuccess / stats.scans : 0,
      estimatedRevenue: (stats.adCompletes * ecpm) / 1000,
    };
  }

  async funnel(from?: string, to?: string): Promise<FunnelResponse> {
    const range = this.normalizeRange(from, to);
    const s = await this.sumStats(range);
    const ordered = [
      { step: EventType.SCAN, count: s.scans },
      { step: EventType.AD_COMPLETE, count: s.adCompletes },
      { step: EventType.CONNECT_CLICK, count: s.connectClicks },
      { step: EventType.CONNECT_SUCCESS, count: s.connectSuccess },
    ];
    const steps = ordered.map((cur, i) => {
      const prev = i === 0 ? cur.count : ordered[i - 1].count;
      return {
        step: cur.step,
        count: cur.count,
        rate: prev ? cur.count / prev : 0,
      };
    });
    return { steps };
  }

  async revenue(from?: string, to?: string): Promise<RevenueResponse> {
    const range = this.normalizeRange(from, to);
    const ecpm = await this.ecpm();
    const rows = await this.prisma.dailyShopStat.groupBy({
      by: ['date'],
      where: { date: { gte: range.from, lte: range.to } },
      _sum: { adCompletes: true },
      orderBy: { date: 'asc' },
    });
    const daily = rows.map((r) => {
      const adCompletes = r._sum.adCompletes ?? 0;
      return {
        date: r.date,
        adCompletes,
        revenue: (adCompletes * ecpm) / 1000,
      };
    });
    const adCompletes = daily.reduce((a, b) => a + b.adCompletes, 0);
    return {
      adCompletes,
      ecpm,
      estimatedRevenue: (adCompletes * ecpm) / 1000,
      daily,
    };
  }

  async ranking(
    from?: string,
    to?: string,
    limit = 20,
  ): Promise<ShopRankingResponse> {
    const range = this.normalizeRange(from, to);
    const rows = await this.prisma.dailyShopStat.groupBy({
      by: ['shopId'],
      where: { date: { gte: range.from, lte: range.to } },
      _sum: { scans: true, connectSuccess: true },
      orderBy: { _sum: { scans: 'desc' } },
      take: limit,
    });
    const shops = await this.prisma.shop.findMany({
      where: { id: { in: rows.map((r) => r.shopId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(shops.map((s) => [s.id, s.name]));
    return {
      items: rows.map((r) => ({
        shopId: r.shopId,
        name: nameMap.get(r.shopId) ?? '(未知店铺)',
        scans: r._sum.scans ?? 0,
        connectSuccess: r._sum.connectSuccess ?? 0,
      })),
    };
  }

  async trends(from?: string, to?: string): Promise<TrendResponse> {
    const range = this.normalizeRange(from, to);
    const rows = await this.prisma.dailyShopStat.groupBy({
      by: ['date'],
      where: { date: { gte: range.from, lte: range.to } },
      _sum: { scans: true, adCompletes: true, connectSuccess: true },
      orderBy: { date: 'asc' },
    });
    // 各日新增店铺
    const newShopRows = await this.prisma.shop.findMany({
      where: {
        createdAt: {
          gte: new Date(range.from),
          lte: new Date(`${range.to}T23:59:59.999Z`),
        },
      },
      select: { createdAt: true },
    });
    const newShopByDay = new Map<string, number>();
    for (const r of newShopRows) {
      const d = r.createdAt.toISOString().slice(0, 10);
      newShopByDay.set(d, (newShopByDay.get(d) ?? 0) + 1);
    }
    return {
      points: rows.map((r) => ({
        date: r.date,
        scans: r._sum.scans ?? 0,
        adCompletes: r._sum.adCompletes ?? 0,
        connectSuccess: r._sum.connectSuccess ?? 0,
        newShops: newShopByDay.get(r.date) ?? 0,
      })),
    };
  }

  async anomalies(from?: string, to?: string): Promise<AnomalyResponse> {
    const range = this.normalizeRange(from, to);
    const rows = await this.prisma.dailyShopStat.groupBy({
      by: ['shopId'],
      where: { date: { gte: range.from, lte: range.to } },
      _sum: { connectFail: true, connectClicks: true },
    });
    const shops = await this.prisma.shop.findMany({
      where: { id: { in: rows.map((r) => r.shopId) } },
      select: { id: true, name: true },
    });
    const nameMap = new Map(shops.map((s) => [s.id, s.name]));
    const items = rows
      .map((r) => {
        const connectFail = r._sum.connectFail ?? 0;
        const connectClicks = r._sum.connectClicks ?? 0;
        return {
          shopId: r.shopId,
          name: nameMap.get(r.shopId) ?? '(未知店铺)',
          connectFail,
          connectClicks,
          connectFailRate: connectClicks ? connectFail / connectClicks : 0,
        };
      })
      .filter((i) => i.connectFail > 0)
      .sort((a, b) => b.connectFailRate - a.connectFailRate);

    // 近 5 分钟实时扫码
    const realtimeScans = await this.prisma.event.count({
      where: {
        type: EventType.SCAN,
        createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
      },
    });
    return { items, realtimeScans };
  }
}
