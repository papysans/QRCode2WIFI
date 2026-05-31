import { Injectable, UnauthorizedException } from '@nestjs/common';
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
   * wechat 模式：调用 sns/jscode2session 用 js_code 换取真实 openid。
   */
  private async resolveOpenid(code: string): Promise<string> {
    if (process.env.ADAPTER_MODE === 'wechat') {
      return this.code2session(code);
    }
    return code.startsWith('mock-') ? code : `mock-${code}`;
  }

  /**
   * 调用微信 code2session 换取 openid。
   * GET https://api.weixin.qq.com/sns/jscode2session
   *   ?appid=&secret=&js_code=&grant_type=authorization_code
   * 该接口用 appid+secret 直接鉴权，不需要 access_token。
   * session_key 为敏感数据，仅服务端使用，绝不下发客户端。
   */
  private async code2session(jsCode: string): Promise<string> {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    if (!appid || !secret) {
      throw new Error('缺少 WX_APPID / WX_SECRET，无法调用 code2session');
    }

    const params = new URLSearchParams({
      appid,
      secret,
      js_code: jsCode,
      grant_type: 'authorization_code',
    });
    const res = await fetch(
      `https://api.weixin.qq.com/sns/jscode2session?${params.toString()}`,
      { method: 'GET' },
    );
    // 微信即使逻辑失败也返回 HTTP 200 + errcode 体，必须检查 body
    const data = (await res.json()) as {
      openid?: string;
      errcode?: number;
      errmsg?: string;
    };
    if (!data.openid) {
      throw new UnauthorizedException(
        `微信登录失败: errcode=${data.errcode} errmsg=${data.errmsg}`,
      );
    }
    return data.openid;
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
