import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginResponse } from '@q2w/shared';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Mock 模式：code 即视为 openid（前端可传 'mock-openid-xxx'）。
   * wechat 模式：此处应调用 code2session 换取真实 openid（资质就绪后实现）。
   */
  private async resolveOpenid(code: string): Promise<string> {
    if (process.env.ADAPTER_MODE === 'wechat') {
      // TODO: 调用微信 code2session
      throw new Error('wechat code2session not implemented');
    }
    return code.startsWith('mock-') ? code : `mock-${code}`;
  }

  async login(code: string): Promise<LoginResponse> {
    const openid = await this.resolveOpenid(code);
    await this.prisma.user.upsert({
      where: { openid },
      create: { openid },
      update: {},
    });
    const token = await this.jwt.signAsync({ sub: openid });
    return { token, openid };
  }
}
