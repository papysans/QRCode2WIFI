import { Injectable, Logger } from '@nestjs/common';
import {
  AdProvider,
  AdResult,
  ConnectResult,
  QrCodeProvider,
  QrCodeResult,
  WifiConnector,
} from './adapter.interfaces';
import { WechatTokenService } from '../wechat/wechat-token.service';
import { AdCompletionStore } from '../wechat/ad-completion.store';

/**
 * 真实微信实现。资质就绪后只需配置 WX_APPID / WX_SECRET / AD_UNIT_ID /
 * WX_AD_CALLBACK_TOKEN 等环境变量并将 ADAPTER_MODE=wechat 即可联调。
 * 结构已就位；上线前请对照 research/wechat-integration.md 的 MUST-VERIFY 项核准
 * （尤其激励视频回调签名算法、各错误码与配额）。
 */

/**
 * 激励视频广告校验（防伪）。
 *
 * 不信任客户端自报的完成状态。真正的完成由微信服务端回调写入 AdCompletionStore，
 * 此处把客户端上报的 adToken 当作 trans_id，校验其在 store 中是否存在且未消费，
 * 校验通过即消费（防重放）。
 *
 * 注意：客户端能否拿到 trans_id 取决于微信广告位「服务器回调」配置；若拿不到，
 * 需要在小程序侧用 ad.setServerSideVerifyOptions 透传 customData，并在回调里把
 * customData 与 trans_id 关联后由客户端轮询解锁。见 research §4。
 */
@Injectable()
export class WechatAdProvider implements AdProvider {
  private readonly logger = new Logger(WechatAdProvider.name);

  constructor(private readonly completions: AdCompletionStore) {}

  async verifyAdToken(adToken: string): Promise<AdResult> {
    if (!adToken) {
      return { completed: false, adToken };
    }
    // adToken 即微信回调的 trans_id；消费成功表示存在有效且未重放的完成记录
    const completed = this.completions.consume(adToken);
    if (!completed) {
      this.logger.warn(`激励视频凭据校验未通过 trans_id=${adToken}`);
    }
    return { completed, adToken };
  }
}

@Injectable()
export class WechatWifiConnector implements WifiConnector {
  async simulateConnect(_ssid: string): Promise<ConnectResult> {
    // 真实连接发生在小程序客户端 wx.connectWifi；服务端仅返回成功，由客户端上报真实结果
    return { ok: true };
  }
}

/**
 * 小程序码生成：调用 wxacode.getUnlimited。
 * scene 携带 sid（需 ≤32 字符且字符集受限）；page 为已发布目标页（无前导斜杠、无 query）。
 */
@Injectable()
export class WechatQrCodeProvider implements QrCodeProvider {
  private readonly logger = new Logger(WechatQrCodeProvider.name);

  constructor(private readonly token: WechatTokenService) {}

  async generate(sid: string): Promise<QrCodeResult> {
    const page = process.env.WX_CONNECT_PAGE || 'pages/connect/index';
    const envVersion = process.env.WX_ENV_VERSION || 'release';

    if (sid.length > 32) {
      // scene 最长 32 字符；sid 过长需在上游改用短 id（见 research §3）
      throw new Error(`scene(sid) 超过 32 字符限制: ${sid}`);
    }

    const res = await this.token.wechatApiPost('/wxa/getwxacodeunlimited', {
      scene: sid,
      page, // 无前导斜杠
      check_path: envVersion === 'release',
      env_version: envVersion,
    });

    // 成功时响应体是二进制图片；失败时是 JSON {errcode,errmsg}，必须区分
    const contentType = res.headers.get('content-type') || '';
    const buf = Buffer.from(await res.arrayBuffer());

    if (contentType.includes('application/json') || this.looksLikeJsonError(buf)) {
      const text = buf.toString('utf8');
      throw new Error(`生成小程序码失败: ${text}`);
    }

    const mime = contentType.includes('jpeg') ? 'image/jpeg' : 'image/png';
    const imageUrl = `data:${mime};base64,${buf.toString('base64')}`;
    // path 用于展示/跳转，带前导斜杠与 query（与 getUnlimited 的 page 区分）
    const path = `/${page}?sid=${sid}`;
    return { imageUrl, path };
  }

  /** 嗅探：响应是否为 JSON 错误体（以 '{' 开头且含 errcode） */
  private looksLikeJsonError(buf: Buffer): boolean {
    const head = buf.subarray(0, 1).toString('utf8');
    if (head !== '{') return false;
    try {
      const obj = JSON.parse(buf.toString('utf8')) as { errcode?: number };
      return obj.errcode !== undefined && obj.errcode !== 0;
    } catch {
      return false;
    }
  }
}
