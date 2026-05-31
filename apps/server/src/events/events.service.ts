import { Injectable, Logger } from '@nestjs/common';
import { EventType } from '@q2w/shared';
import { PrismaService } from '../prisma/prisma.service';
import { EventBatchDto } from './dto';

/** event_type → DailyShopStat 计数列 */
const STAT_COLUMN: Partial<Record<EventType, string>> = {
  [EventType.SCAN]: 'scans',
  [EventType.AD_COMPLETE]: 'adCompletes',
  [EventType.CONNECT_CLICK]: 'connectClicks',
  [EventType.CONNECT_SUCCESS]: 'connectSuccess',
  [EventType.CONNECT_FAIL]: 'connectFail',
};

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** sid → shopId 内存缓存（sid 不变，安全缓存） */
  private sidCache = new Map<string, string>();

  private async resolveShopId(sid: string): Promise<string | null> {
    const cached = this.sidCache.get(sid);
    if (cached) return cached;
    const row = await this.prisma.shop.findUnique({
      where: { sid },
      select: { id: true },
    });
    if (!row) return null;
    this.sidCache.set(sid, row.id);
    return row.id;
  }

  async ingest(dto: EventBatchDto): Promise<number> {
    let accepted = 0;
    for (const e of dto.events) {
      const shopId = await this.resolveShopId(e.sid);
      if (!shopId) {
        this.logger.warn(`drop event: unknown sid=${e.sid}`);
        continue;
      }
      const createdAt = e.clientTs ? new Date(e.clientTs) : new Date();
      await this.prisma.event.create({
        data: {
          type: e.type,
          shopId,
          actorOpenid: e.actorOpenid,
          visitorId: e.visitorId,
          sessionId: e.sessionId,
          meta: (e.meta as any) ?? undefined,
          createdAt,
        },
      });
      // 实时累加日汇总（让后台无需等 cron 即可看到数据）
      const col = STAT_COLUMN[e.type];
      if (col) {
        const date = dayKey(createdAt);
        await this.prisma.dailyShopStat.upsert({
          where: { shopId_date: { shopId, date } },
          create: { shopId, date, [col]: 1 } as any,
          update: { [col]: { increment: 1 } } as any,
        });
      }
      accepted += 1;
    }
    return accepted;
  }
}
