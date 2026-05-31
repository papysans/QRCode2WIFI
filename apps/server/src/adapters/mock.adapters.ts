import { Injectable } from '@nestjs/common';
import {
  AdProvider,
  AdResult,
  ConnectResult,
  QrCodeProvider,
  QrCodeResult,
  WifiConnector,
} from './adapter.interfaces';

/** 开发期 Mock：任何 'mock-completed' 凭据视为广告完成 */
@Injectable()
export class MockAdProvider implements AdProvider {
  async verifyAdToken(adToken: string): Promise<AdResult> {
    const completed = adToken === 'mock-completed';
    return { completed, adToken };
  }
}

/** 开发期 Mock：默认连接成功 */
@Injectable()
export class MockWifiConnector implements WifiConnector {
  async simulateConnect(_ssid: string): Promise<ConnectResult> {
    return { ok: true };
  }
}

/** 开发期 Mock：返回占位 SVG dataURL 作为二维码 */
@Injectable()
export class MockQrCodeProvider implements QrCodeProvider {
  async generate(sid: string): Promise<QrCodeResult> {
    const path = `/connect?sid=${sid}`;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#fff"/><text x="100" y="100" font-size="14" text-anchor="middle" fill="#1f2a2e">QR:${sid}</text></svg>`;
    const imageUrl = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
    return { imageUrl, path };
  }
}
