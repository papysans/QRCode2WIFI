import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventType } from '@q2w/shared';
import { PrismaService } from '../prisma/prisma.service';

const TYPE_TO_COL: Record<string, keyof Counters> = {
  [EventType.SCAN]: 'scans',
  [EventType.AD_COMPLETE]: 'adCompletes',
  [EventType.CONNECT_CLICK]: 'connectClicks',
  [EventType.CONNECT_SUCCESS]: 'connectSuccess',
  [EventType.CONNECT_FAIL]: 'connectFail',
};

interface Counters {
  scans: number;
  adCompletes: number;
  connectClicks: number;
  connectSuccess: number;
  connectFail: number;
}

function emptyCounters(): Counters {
  return {
    scans: 0,
    adCompletes: 0,
    connectClicks: 0,
    connectSuccess: 0,
    connectFail: 0,
  };
}

@Injectable()
export class StatsService {
  private readonly logger = new Logger(StatsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 每 10 分钟用 Event 重算近 2 天的 DailyShopStat，纠正实时累加的漂移 */
  @Cron(CronExpression.EVERY_10_MINUTES)
  async reconcile(): Promise<void> {
    const since = new Date(Date.now() - 2 * 86400000);
    const events = await this.prisma.event.findMany({
      where: { createdAt: { gte: since } },
      select: { shopId: true, type: true, createdAt: true },
    });
    const bucket = new Map<string, Counters>(); // key: shopId|date
    for (const e of events) {
      const col = TYPE_TO_COL[e.type];
      if (!col) continue;
      const date = e.createdAt.toISOString().slice(0, 10);
      const key = `${e.shopId}|${date}`;
      const c = bucket.get(key) ?? emptyCounters();
      c[col] += 1;
      bucket.set(key, c);
    }
    for (const [key, c] of bucket) {
      const [shopId, date] = key.split('|');
      await this.prisma.dailyShopStat.upsert({
        where: { shopId_date: { shopId, date } },
        create: { shopId, date, ...c },
        update: { ...c },
      });
    }
    this.logger.log(`reconciled ${bucket.size} shop-day buckets`);
  }
}
