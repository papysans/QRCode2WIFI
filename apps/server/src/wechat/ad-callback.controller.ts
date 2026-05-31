import { Controller, Get, Logger, Query } from '@nestjs/common';
import { createHash } from 'crypto';
import { AdCompletionStore } from './ad-completion.store';

/**
 * 微信激励视频「服务器回调发放奖励」接收端。
 *
 * 用户真正看完激励视频后，微信服务端会 GET 请求本接口（server-to-server，客户端无法伪造）。
 * 我们验签通过后，把 trans_id 记为已完成，供 WechatAdProvider.verifyAdToken 查询。
 *
 * 前置条件：小程序需为「流量主」并在 MP 后台为该广告位开启「服务器回调」、配置回调 URL
 * 与回调密钥（WX_AD_CALLBACK_TOKEN）。详见 research/wechat-integration.md §4。
 *
 * 公开接口（无需登录），路径 /wechat/ad-callback。
 */

interface AdCallbackQuery {
  user_openid?: string;
  sign?: string;
  trans_id?: string;
  reward?: string;
  extra?: string;
  nonce?: string;
  timestamp?: string;
}

@Controller('wechat')
export class AdCallbackController {
  private readonly logger = new Logger(AdCallbackController.name);

  constructor(private readonly store: AdCompletionStore) {}

  @Get('ad-callback')
  handleCallback(@Query() query: AdCallbackQuery): { errcode: number; errmsg: string } {
    const { trans_id: transId, sign } = query;

    if (!transId) {
      this.logger.warn('激励视频回调缺少 trans_id');
      // TODO-VERIFY: 确认参数缺失时微信期望的响应体（是否需返回非 0 触发重试）
      return { errcode: 40097, errmsg: 'missing trans_id' };
    }

    if (!this.verifySign(query)) {
      this.logger.warn(`激励视频回调验签失败 trans_id=${transId}`);
      // TODO-VERIFY: 确认验签失败时微信期望的响应体
      return { errcode: 40001, errmsg: 'invalid sign' };
    }

    this.store.markCompleted(transId);

    // TODO-VERIFY: 微信要求的成功响应体。历史上为 {"errcode":0,"errmsg":"ok"} 或字符串 "success"，
    // 上线前必须对照官方文档核准，否则微信会重试回调。
    return { errcode: 0, errmsg: 'ok' };
  }

  /**
   * 回调验签。
   *
   * TODO-VERIFY: 签名算法与参与签名的字段集/排序必须照官方文档「激励视频广告服务器回调」逐字核对，
   * 不要猜测。下方为一种常见形态（参数按 key 字典序拼接 + 回调密钥后做 SHA1/HMAC），
   * 仅作脚手架占位；上线前务必替换为官方规定的算法。
   * 见 research/wechat-integration.md §4 与 MUST-VERIFY #4。
   */
  private verifySign(query: AdCallbackQuery): boolean {
    const token = process.env.WX_AD_CALLBACK_TOKEN;
    if (!token) {
      this.logger.error('未配置 WX_AD_CALLBACK_TOKEN，无法验签');
      return false;
    }
    const provided = query.sign;
    if (!provided) return false;

    // TODO-VERIFY: 下列字段集与拼接方式为占位实现，必须以官方文档为准。
    const params = { ...query } as Record<string, string | undefined>;
    delete params.sign;
    const sorted = Object.keys(params)
      .filter((k) => params[k] !== undefined && params[k] !== '')
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');
    const expected = createHash('sha1')
      .update(`${sorted}&key=${token}`)
      .digest('hex');

    return this.timingSafeEqual(provided, expected);
  }

  /** 常量时间比较，避免时序侧信道 */
  private timingSafeEqual(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) {
      diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return diff === 0;
  }
}
