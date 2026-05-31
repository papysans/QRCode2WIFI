import { Injectable, Logger } from '@nestjs/common';

/**
 * 微信 access_token 缓存服务。
 *
 * access_token 是 app 级（非用户级）全局凭据，几乎所有服务端 OpenAPI（如
 * wxacode.getUnlimited）都需要它。它有每日调用配额且多实例并发刷新会互相失效，
 * 因此必须集中缓存 + 并发去重。
 *
 * 本实现使用进程内内存缓存（单实例足够）；多实例部署时应改为 Redis 共享缓存 +
 * 分布式锁（见 research/wechat-integration.md §2），此处用 TODO 标出。
 *
 * 端点采用官方推荐的 stable_token（force_refresh=false）：多调用方拿到同一 token，
 * 不会互相失效，旧 token 自然到期前仍有效。
 */

const STABLE_TOKEN_URL = 'https://api.weixin.qq.com/cgi-bin/stable_token';
/** 提前刷新窗口：到期前 5 分钟即视为需要刷新，避免边界过期 */
const REFRESH_SKEW_MS = 5 * 60 * 1000;

interface StableTokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

@Injectable()
export class WechatTokenService {
  private readonly logger = new Logger(WechatTokenService.name);

  /**
   * 网络/时间种子点：默认走全局 fetch / Date.now。
   * 不通过构造函数注入（否则 Nest DI 会试图解析 Object 类型参数而启动失败）；
   * 单测中 `new WechatTokenService()` 后覆写这两个 protected 属性即可。
   */
  protected fetchFn: typeof fetch = (...args) => fetch(...args);
  protected now: () => number = () => Date.now();

  private cachedToken: string | null = null;
  /** 缓存 token 的过期时间戳（已扣除提前刷新窗口） */
  private expiresAt = 0;
  /** 并发去重：刷新进行中时复用同一 Promise */
  private inflight: Promise<string> | null = null;

  /** 获取有效 access_token：命中缓存直接返回，否则刷新（并发去重） */
  async getAccessToken(): Promise<string> {
    if (this.cachedToken && this.now() < this.expiresAt) {
      return this.cachedToken;
    }
    if (this.inflight) {
      return this.inflight;
    }
    this.inflight = this.refresh().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  private async refresh(): Promise<string> {
    const appid = process.env.WX_APPID;
    const secret = process.env.WX_SECRET;
    if (!appid || !secret) {
      throw new Error('缺少 WX_APPID / WX_SECRET，无法获取 access_token');
    }

    const res = await this.fetchFn(STABLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credential',
        appid,
        secret,
        force_refresh: false,
      }),
    });

    const data = (await res.json()) as StableTokenResponse;
    if (!data.access_token || !data.expires_in) {
      throw new Error(
        `获取 access_token 失败: errcode=${data.errcode} errmsg=${data.errmsg}`,
      );
    }

    this.cachedToken = data.access_token;
    this.expiresAt = this.now() + data.expires_in * 1000 - REFRESH_SKEW_MS;
    return this.cachedToken;
  }

  /** 强制清空缓存（如遇 40001/42001 token 失效时调用，下次自动刷新） */
  invalidate(): void {
    this.cachedToken = null;
    this.expiresAt = 0;
  }

  /** 附带 access_token 的 GET 帮助方法（token 拼到 query string，符合微信约定） */
  async wechatApiGet(path: string, query: Record<string, string> = {}): Promise<Response> {
    const token = await this.getAccessToken();
    const url = this.buildUrl(path, { ...query, access_token: token });
    return this.fetchFn(url, { method: 'GET' });
  }

  /** 附带 access_token 的 POST 帮助方法（token 在 query，body 为 JSON） */
  async wechatApiPost(
    path: string,
    body: unknown,
    query: Record<string, string> = {},
  ): Promise<Response> {
    const token = await this.getAccessToken();
    const url = this.buildUrl(path, { ...query, access_token: token });
    return this.fetchFn(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private buildUrl(path: string, query: Record<string, string>): string {
    const base = path.startsWith('http')
      ? path
      : `https://api.weixin.qq.com${path.startsWith('/') ? path : `/${path}`}`;
    const qs = new URLSearchParams(query).toString();
    return qs ? `${base}?${qs}` : base;
  }
}
