import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { customAlphabet } from 'nanoid';
import { Shop, ShopStat, ShopStatus } from '@q2w/shared';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret } from '../common/crypto.util';
import {
  QRCODE_PROVIDER,
  QrCodeProvider,
} from '../adapters/adapter.interfaces';
import { CreateShopDto, UpdateShopDto } from './dto';

// sid：6 位大小写字母+数字，如 Ab8K29
const genSid = customAlphabet(
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz123456789',
  6,
);

@Injectable()
export class ShopsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(QRCODE_PROVIDER) private readonly qr: QrCodeProvider,
  ) {}

  private toModel(row: any, includePassword = false): Shop {
    return {
      id: row.id,
      sid: row.sid,
      ownerOpenid: row.ownerOpenid,
      name: row.name,
      wifiSsid: row.wifiSsid,
      wifiPassword: includePassword
        ? decryptSecret(row.wifiPassword)
        : undefined,
      logoUrl: row.logoUrl ?? undefined,
      reviewLink: row.reviewLink ?? undefined,
      groupBuyLink: row.groupBuyLink ?? undefined,
      phone: row.phone ?? undefined,
      status: row.status as ShopStatus,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  async listMine(openid: string): Promise<Shop[]> {
    const rows = await this.prisma.shop.findMany({
      where: { ownerOpenid: openid },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.toModel(r));
  }

  private async getOwned(id: string, openid: string) {
    const row = await this.prisma.shop.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('shop not found');
    if (row.ownerOpenid !== openid) {
      throw new ForbiddenException('not the shop owner');
    }
    return row;
  }

  async getDetail(id: string, openid: string): Promise<Shop> {
    const row = await this.getOwned(id, openid);
    return this.toModel(row, true);
  }

  async create(openid: string, dto: CreateShopDto): Promise<Shop> {
    // 保证 sid 唯一
    let sid = genSid();
    while (await this.prisma.shop.findUnique({ where: { sid } })) {
      sid = genSid();
    }
    const row = await this.prisma.shop.create({
      data: {
        sid,
        ownerOpenid: openid,
        name: dto.name,
        wifiSsid: dto.wifiSsid,
        wifiPassword: encryptSecret(dto.wifiPassword),
        reviewLink: dto.reviewLink,
        groupBuyLink: dto.groupBuyLink,
        phone: dto.phone,
      },
    });
    return this.toModel(row, true);
  }

  async update(
    id: string,
    openid: string,
    dto: UpdateShopDto,
  ): Promise<Shop> {
    await this.getOwned(id, openid);
    const data: any = { ...dto };
    if (dto.wifiPassword !== undefined) {
      data.wifiPassword = encryptSecret(dto.wifiPassword);
    }
    const row = await this.prisma.shop.update({ where: { id }, data });
    return this.toModel(row, true);
  }

  async setLogo(id: string, openid: string, logoUrl: string): Promise<Shop> {
    await this.getOwned(id, openid);
    const row = await this.prisma.shop.update({
      where: { id },
      data: { logoUrl },
    });
    return this.toModel(row, true);
  }

  async generateQrCode(id: string, openid: string) {
    const row = await this.getOwned(id, openid);
    return this.qr.generate(row.sid);
  }

  /** 单店累计数据（owner 视角，聚合自 DailyShopStat） */
  async getStats(id: string, openid: string): Promise<ShopStat> {
    await this.getOwned(id, openid);
    const agg = await this.prisma.dailyShopStat.aggregate({
      where: { shopId: id },
      _sum: {
        scans: true,
        adCompletes: true,
        connectClicks: true,
        connectSuccess: true,
        connectFail: true,
      },
    });
    return {
      shopId: id,
      scans: agg._sum.scans ?? 0,
      adCompletes: agg._sum.adCompletes ?? 0,
      connectClicks: agg._sum.connectClicks ?? 0,
      connectSuccess: agg._sum.connectSuccess ?? 0,
      connectFail: agg._sum.connectFail ?? 0,
    };
  }
}
