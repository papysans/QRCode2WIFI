import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PublicShopView,
  ShopStatus,
  UnlockResponse,
} from '@q2w/shared';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret } from '../common/crypto.util';
import { AD_PROVIDER, AdProvider } from '../adapters/adapter.interfaces';
import { UnlockDto } from './dto';

@Injectable()
export class ConnectService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(AD_PROVIDER) private readonly ad: AdProvider,
  ) {}

  /** 顾客公开视图：永不返回密码 */
  async getPublic(sid: string): Promise<PublicShopView> {
    const row = await this.prisma.shop.findUnique({ where: { sid } });
    if (!row) throw new NotFoundException('店铺不存在或二维码无效');
    return {
      sid: row.sid,
      name: row.name,
      wifiSsid: row.wifiSsid,
      logoUrl: row.logoUrl ?? undefined,
      reviewLink: row.reviewLink ?? undefined,
      groupBuyLink: row.groupBuyLink ?? undefined,
      status: row.status as ShopStatus,
    };
  }

  /** 广告完成后解锁：校验广告凭据 → 下发 WiFi 密码 */
  async unlock(sid: string, dto: UnlockDto): Promise<UnlockResponse> {
    const row = await this.prisma.shop.findUnique({ where: { sid } });
    if (!row) throw new NotFoundException('店铺不存在');
    if (row.status !== 'active') {
      throw new ForbiddenException('店铺已下架');
    }
    const result = await this.ad.verifyAdToken(dto.adToken);
    if (!result.completed) {
      throw new ForbiddenException('广告未完成，无法连接');
    }
    return {
      wifiSsid: row.wifiSsid,
      wifiPassword: decryptSecret(row.wifiPassword),
    };
  }
}
