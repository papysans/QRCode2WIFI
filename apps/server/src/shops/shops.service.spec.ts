import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShopsService } from './shops.service';
import { decryptSecret, encryptSecret } from '../common/crypto.util';
import { QrCodeProvider } from '../adapters/adapter.interfaces';

function makeRow(overrides: Partial<any> = {}) {
  const now = new Date('2026-05-31T00:00:00.000Z');
  return {
    id: 's1',
    sid: 'Ab8K29',
    ownerOpenid: 'owner-1',
    name: 'XX咖啡',
    wifiSsid: 'XX_Coffee_Free',
    wifiPassword: encryptSecret('coffee2024'),
    logoUrl: null,
    reviewLink: null,
    groupBuyLink: null,
    phone: null,
    status: 'active',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('ShopsService', () => {
  const prisma = {
    shop: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    dailyShopStat: { aggregate: jest.fn() },
  } as any;
  const qr: QrCodeProvider = { generate: jest.fn() };
  const service = new ShopsService(prisma, qr);

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('sid 冲突时重试直到唯一，密码加密存储，owner 为传入 openid', async () => {
      // 第一次 findUnique 命中已存在（触发重试），第二次返回 null（sid 可用）
      prisma.shop.findUnique
        .mockResolvedValueOnce(makeRow())
        .mockResolvedValueOnce(null);
      prisma.shop.create.mockImplementation(async ({ data }: any) =>
        makeRow({
          ...data,
          id: 's1',
          createdAt: new Date('2026-05-31T00:00:00.000Z'),
          updatedAt: new Date('2026-05-31T00:00:00.000Z'),
        }),
      );

      const result = await service.create('owner-1', {
        name: 'XX咖啡',
        wifiSsid: 'XX_Coffee_Free',
        wifiPassword: 'coffee2024',
      });

      // 重试：findUnique 被调用两次
      expect(prisma.shop.findUnique).toHaveBeenCalledTimes(2);

      // owner 为传入 openid
      const createArg = prisma.shop.create.mock.calls[0][0].data;
      expect(createArg.ownerOpenid).toBe('owner-1');

      // 传给 prisma 的密码是密文：不等于明文，且 decrypt 可还原
      expect(createArg.wifiPassword).not.toBe('coffee2024');
      expect(decryptSecret(createArg.wifiPassword)).toBe('coffee2024');

      // 返回 model 含明文密码
      expect(result.wifiPassword).toBe('coffee2024');
      expect(result.ownerOpenid).toBe('owner-1');
    });
  });

  describe('owner 权限校验', () => {
    it('非 owner 调 getDetail 抛 Forbidden', async () => {
      prisma.shop.findUnique.mockResolvedValue(makeRow({ ownerOpenid: 'owner-1' }));
      await expect(service.getDetail('s1', 'intruder')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('非 owner 调 update 抛 Forbidden', async () => {
      prisma.shop.findUnique.mockResolvedValue(makeRow({ ownerOpenid: 'owner-1' }));
      await expect(
        service.update('s1', 'intruder', { name: 'new' }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('非 owner 调 getStats 抛 Forbidden', async () => {
      prisma.shop.findUnique.mockResolvedValue(makeRow({ ownerOpenid: 'owner-1' }));
      await expect(service.getStats('s1', 'intruder')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('不存在的店铺抛 NotFound', async () => {
      prisma.shop.findUnique.mockResolvedValue(null);
      await expect(service.getDetail('nope', 'owner-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('聚合 DailyShopStat 的 _sum 映射正确', async () => {
      prisma.shop.findUnique.mockResolvedValue(makeRow({ ownerOpenid: 'owner-1' }));
      prisma.dailyShopStat.aggregate.mockResolvedValue({
        _sum: {
          scans: 100,
          adCompletes: 80,
          connectClicks: 70,
          connectSuccess: 60,
          connectFail: 5,
        },
      });

      const stats = await service.getStats('s1', 'owner-1');
      expect(stats).toEqual({
        shopId: 's1',
        scans: 100,
        adCompletes: 80,
        connectClicks: 70,
        connectSuccess: 60,
        connectFail: 5,
      });
    });

    it('_sum 为 null 时各项归零', async () => {
      prisma.shop.findUnique.mockResolvedValue(makeRow({ ownerOpenid: 'owner-1' }));
      prisma.dailyShopStat.aggregate.mockResolvedValue({
        _sum: {
          scans: null,
          adCompletes: null,
          connectClicks: null,
          connectSuccess: null,
          connectFail: null,
        },
      });

      const stats = await service.getStats('s1', 'owner-1');
      expect(stats).toEqual({
        shopId: 's1',
        scans: 0,
        adCompletes: 0,
        connectClicks: 0,
        connectSuccess: 0,
        connectFail: 0,
      });
    });
  });

  describe('generateQrCode', () => {
    it('校验 owner 后用注入的 QRCODE_PROVIDER 生成', async () => {
      prisma.shop.findUnique.mockResolvedValue(
        makeRow({ ownerOpenid: 'owner-1', sid: 'Ab8K29' }),
      );
      (qr.generate as jest.Mock).mockResolvedValue({
        imageUrl: 'data:image/svg+xml;base64,xxx',
        path: '/connect?sid=Ab8K29',
      });

      const res = await service.generateQrCode('s1', 'owner-1');
      expect(qr.generate).toHaveBeenCalledWith('Ab8K29');
      expect(res.path).toBe('/connect?sid=Ab8K29');
    });
  });
});
