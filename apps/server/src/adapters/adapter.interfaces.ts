/** 广告完成结果 */
export interface AdResult {
  completed: boolean;
  /** 解锁连接所需凭据 */
  adToken: string;
}

/** 激励视频广告提供方 */
export interface AdProvider {
  /** 校验前端上报的广告完成凭据是否有效 */
  verifyAdToken(adToken: string): Promise<AdResult>;
}

/** WiFi 连接结果 */
export interface ConnectResult {
  ok: boolean;
  errorCode?: string;
}

/** WiFi 连接器（服务端侧主要用于记录/校验，真实连接在小程序客户端） */
export interface WifiConnector {
  /** 服务端模拟/校验连接（Mock 用于测试链路） */
  simulateConnect(ssid: string): Promise<ConnectResult>;
}

/** 小程序码生成结果 */
export interface QrCodeResult {
  imageUrl: string;
  path: string;
}

/** 小程序码提供方 */
export interface QrCodeProvider {
  generate(sid: string): Promise<QrCodeResult>;
}

export const AD_PROVIDER = Symbol('AD_PROVIDER');
export const WIFI_CONNECTOR = Symbol('WIFI_CONNECTOR');
export const QRCODE_PROVIDER = Symbol('QRCODE_PROVIDER');
