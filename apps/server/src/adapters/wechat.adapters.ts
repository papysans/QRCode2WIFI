import { Injectable, Logger } from '@nestjs/common';
import {
  AdProvider,
  AdResult,
  ConnectResult,
  QrCodeProvider,
  QrCodeResult,
  WifiConnector,
} from './adapter.interfaces';

/**
 * 真实微信实现占位。资质就绪后填充：
 * - AdProvider: 校验激励视频服务端回调签名
 * - QrCodeProvider: 调用 wxacode.getUnlimited（scene 携带 sid）
 * 当前抛出未实现，确保 ADAPTER_MODE=wechat 时不会静默走错。
 */
@Injectable()
export class WechatAdProvider implements AdProvider {
  private readonly logger = new Logger(WechatAdProvider.name);
  async verifyAdToken(_adToken: string): Promise<AdResult> {
    this.logger.warn('WechatAdProvider 未实现，需在资质就绪后接入');
    throw new Error('WechatAdProvider not implemented');
  }
}

@Injectable()
export class WechatWifiConnector implements WifiConnector {
  async simulateConnect(_ssid: string): Promise<ConnectResult> {
    // 真实连接发生在小程序客户端 wx.connectWifi；服务端仅返回成功，由客户端上报真实结果
    return { ok: true };
  }
}

@Injectable()
export class WechatQrCodeProvider implements QrCodeProvider {
  private readonly logger = new Logger(WechatQrCodeProvider.name);
  async generate(_sid: string): Promise<QrCodeResult> {
    this.logger.warn('WechatQrCodeProvider 未实现，需接入 wxacode.getUnlimited');
    throw new Error('WechatQrCodeProvider not implemented');
  }
}
