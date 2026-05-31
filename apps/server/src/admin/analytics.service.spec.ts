import { EventType } from '@q2w/shared';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let prisma: any;
  let service: AnalyticsService;

  beforeEach(() => {
    prisma = {
      setting: { findUnique: jest.fn() },
      dailyShopStat: {
        aggregate: jest.fn(),
        groupBy: jest.fn(),
      },
      shop: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      event: { count: jest.fn() },
    };
    service = new AnalyticsService(prisma);
  });

  function mockSumStats(sum: Partial<Record<string, number>>) {
    prisma.dailyShopStat.aggregate.mockResolvedValue({
      _sum: {
        scans: null,
        adCompletes: null,
        connectClicks: null,
        connectSuccess: null,
        connectFail: null,
        ...sum,
      },
    });
  }

  describe('funnel', () => {
    it('4 步 count 与 rate 正确（留存率=本步/上一步，首步=1）', async () => {
      mockSumStats({
        scans: 100,
        adCompletes: 80,
        connectClicks: 40,
        connectSuccess: 20,
      });

      const res = await service.funnel('2026-05-01', '2026-05-07');
      expect(res.steps).toEqual([
        { step: EventType.SCAN, count: 100, rate: 1 },
        { step: EventType.AD_COMPLETE, count: 80, rate: 0.8 },
        { step: EventType.CONNECT_CLICK, count: 40, rate: 0.5 },
        { step: EventType.CONNECT_SUCCESS, count: 20, rate: 0.5 },
      ]);
    });

    it('上一步为 0 时 rate 为 0（避免除零）', async () => {
      mockSumStats({
        scans: 0,
        adCompletes: 0,
        connectClicks: 0,
        connectSuccess: 0,
      });

      const res = await service.funnel('2026-05-01', '2026-05-07');
      // 首步 count=0：prev=cur.count=0 → rate=0
      expect(res.steps[0]).toEqual({ step: EventType.SCAN, count: 0, rate: 0 });
      expect(res.steps[1].rate).toBe(0);
    });
  });

  describe('revenue', () => {
    it('daily 映射 + estimatedRevenue = adCompletes*ecpm/1000，ecpm 优先取 Setting', async () => {
      prisma.setting.findUnique.mockResolvedValue({ key: 'ecpm', value: '50' });
      prisma.dailyShopStat.groupBy.mockResolvedValue([
        { date: '2026-05-01', _sum: { adCompletes: 100 } },
        { date: '2026-05-02', _sum: { adCompletes: 200 } },
      ]);

      const res = await service.revenue('2026-05-01', '2026-05-02');
      expect(res.ecpm).toBe(50);
      expect(res.adCompletes).toBe(300);
      expect(res.estimatedRevenue).toBeCloseTo((300 * 50) / 1000);
      expect(res.daily).toEqual([
        { date: '2026-05-01', adCompletes: 100, revenue: (100 * 50) / 1000 },
        { date: '2026-05-02', adCompletes: 200, revenue: (200 * 50) / 1000 },
      ]);
    });

    it('无 Setting 时回退到 env DEFAULT_ECPM', async () => {
      const prev = process.env.DEFAULT_ECPM;
      process.env.DEFAULT_ECPM = '12';
      prisma.setting.findUnique.mockResolvedValue(null);
      prisma.dailyShopStat.groupBy.mockResolvedValue([
        { date: '2026-05-01', _sum: { adCompletes: 10 } },
      ]);

      const res = await service.revenue('2026-05-01', '2026-05-01');
      expect(res.ecpm).toBe(12);
      expect(res.estimatedRevenue).toBeCloseTo((10 * 12) / 1000);

      if (prev === undefined) delete process.env.DEFAULT_ECPM;
      else process.env.DEFAULT_ECPM = prev;
    });
  });

  describe('overview', () => {
    it('conversionRate = connectSuccess/scans', async () => {
      mockSumStats({ scans: 200, connectSuccess: 50, adCompletes: 80 });
      prisma.shop.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);
      prisma.setting.findUnique.mockResolvedValue({ key: 'ecpm', value: '30' });

      const res = await service.overview('2026-05-01', '2026-05-07');
      expect(res.totalShops).toBe(10);
      expect(res.newShops).toBe(3);
      expect(res.totalScans).toBe(200);
      expect(res.totalConnects).toBe(50);
      expect(res.conversionRate).toBeCloseTo(50 / 200);
      expect(res.estimatedRevenue).toBeCloseTo((80 * 30) / 1000);
    });

    it('scans 为 0 时 conversionRate 为 0', async () => {
      mockSumStats({ scans: 0, connectSuccess: 0, adCompletes: 0 });
      prisma.shop.count.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      prisma.setting.findUnique.mockResolvedValue(null);

      const res = await service.overview('2026-05-01', '2026-05-07');
      expect(res.conversionRate).toBe(0);
    });
  });
});
