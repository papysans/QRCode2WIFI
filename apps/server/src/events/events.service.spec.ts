import { EventType } from '@q2w/shared';
import { EventsService } from './events.service';
import { EventBatchDto } from './dto';

function makeEvent(overrides: Partial<any> = {}) {
  return {
    type: EventType.SCAN,
    sid: 'Ab8K29',
    visitorId: 'v1',
    sessionId: 'sess1',
    ...overrides,
  };
}

describe('EventsService', () => {
  let prisma: any;
  let service: EventsService;

  beforeEach(() => {
    prisma = {
      shop: { findUnique: jest.fn() },
      event: { create: jest.fn().mockResolvedValue({}) },
      dailyShopStat: { upsert: jest.fn().mockResolvedValue({}) },
    };
    service = new EventsService(prisma);
    // 静音 logger.warn
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => undefined);
  });

  it('未知 sid 的事件被丢弃且不计数', async () => {
    prisma.shop.findUnique.mockResolvedValue(null);
    const dto: EventBatchDto = {
      events: [makeEvent({ sid: 'unknown' })],
    };

    const accepted = await service.ingest(dto);
    expect(accepted).toBe(0);
    expect(prisma.event.create).not.toHaveBeenCalled();
    expect(prisma.dailyShopStat.upsert).not.toHaveBeenCalled();
  });

  it('已知 sid 的事件写入 Event 并按 type 递增正确列', async () => {
    prisma.shop.findUnique.mockResolvedValue({ id: 'shop-1' });
    const dto: EventBatchDto = {
      events: [
        makeEvent({ type: EventType.SCAN, clientTs: '2026-05-31T10:00:00.000Z' }),
        makeEvent({
          type: EventType.CONNECT_SUCCESS,
          clientTs: '2026-05-31T10:00:00.000Z',
        }),
      ],
    };

    const accepted = await service.ingest(dto);
    expect(accepted).toBe(2);
    expect(prisma.event.create).toHaveBeenCalledTimes(2);

    // scan → scans 列
    const scanUpsert = prisma.dailyShopStat.upsert.mock.calls[0][0];
    expect(scanUpsert.where).toEqual({
      shopId_date: { shopId: 'shop-1', date: '2026-05-31' },
    });
    expect(scanUpsert.create).toEqual({
      shopId: 'shop-1',
      date: '2026-05-31',
      scans: 1,
    });
    expect(scanUpsert.update).toEqual({ scans: { increment: 1 } });

    // connect_success → connectSuccess 列
    const csUpsert = prisma.dailyShopStat.upsert.mock.calls[1][0];
    expect(csUpsert.create).toEqual({
      shopId: 'shop-1',
      date: '2026-05-31',
      connectSuccess: 1,
    });
    expect(csUpsert.update).toEqual({ connectSuccess: { increment: 1 } });
  });

  it('无统计列映射的事件（ad_start）写入 Event 但不 upsert', async () => {
    prisma.shop.findUnique.mockResolvedValue({ id: 'shop-1' });
    const dto: EventBatchDto = {
      events: [makeEvent({ type: EventType.AD_START })],
    };

    const accepted = await service.ingest(dto);
    expect(accepted).toBe(1);
    expect(prisma.event.create).toHaveBeenCalledTimes(1);
    expect(prisma.dailyShopStat.upsert).not.toHaveBeenCalled();
  });

  it('sid→shopId 缓存命中：同 sid 第二次不再查库', async () => {
    prisma.shop.findUnique.mockResolvedValue({ id: 'shop-1' });
    const dto: EventBatchDto = {
      events: [
        makeEvent({ type: EventType.SCAN }),
        makeEvent({ type: EventType.CONNECT_CLICK }),
      ],
    };

    await service.ingest(dto);
    expect(prisma.shop.findUnique).toHaveBeenCalledTimes(1);
  });
});
