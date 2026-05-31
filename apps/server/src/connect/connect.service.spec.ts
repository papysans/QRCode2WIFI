import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ConnectService } from './connect.service';
import { encryptSecret } from '../common/crypto.util';
import { AdProvider } from '../adapters/adapter.interfaces';

function makeShop(overrides: Partial<any> = {}) {
  return {
    id: 's1',
    sid: 'Ab8K29',
    name: 'XX咖啡',
    wifiSsid: 'XX_Coffee_Free',
    wifiPassword: encryptSecret('coffee2024'),
    logoUrl: null,
    reviewLink: null,
    groupBuyLink: null,
    status: 'active',
    ...overrides,
  };
}

describe('ConnectService', () => {
  const shop = makeShop();
  const prisma = {
    shop: { findUnique: jest.fn() },
  } as any;
  const ad: AdProvider = {
    verifyAdToken: jest.fn(),
  };
  const service = new ConnectService(prisma, ad);

  beforeEach(() => jest.clearAllMocks());

  it('公开视图不包含密码', async () => {
    prisma.shop.findUnique.mockResolvedValue(shop);
    const view = await service.getPublic('Ab8K29');
    expect((view as any).wifiPassword).toBeUndefined();
    expect(view.wifiSsid).toBe('XX_Coffee_Free');
  });

  it('无效 sid 抛 NotFound', async () => {
    prisma.shop.findUnique.mockResolvedValue(null);
    await expect(service.getPublic('nope')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('广告未完成不下发密码', async () => {
    prisma.shop.findUnique.mockResolvedValue(shop);
    (ad.verifyAdToken as jest.Mock).mockResolvedValue({
      completed: false,
      adToken: 'x',
    });
    await expect(
      service.unlock('Ab8K29', { sessionId: 's', adToken: 'x' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('广告完成后下发明文密码', async () => {
    prisma.shop.findUnique.mockResolvedValue(shop);
    (ad.verifyAdToken as jest.Mock).mockResolvedValue({
      completed: true,
      adToken: 'mock-completed',
    });
    const res = await service.unlock('Ab8K29', {
      sessionId: 's',
      adToken: 'mock-completed',
    });
    expect(res.wifiPassword).toBe('coffee2024');
    expect(res.wifiSsid).toBe('XX_Coffee_Free');
  });

  it('店铺下架时拒绝解锁', async () => {
    prisma.shop.findUnique.mockResolvedValue(makeShop({ status: 'inactive' }));
    await expect(
      service.unlock('Ab8K29', { sessionId: 's', adToken: 'mock-completed' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
