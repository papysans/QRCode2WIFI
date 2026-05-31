import { PublicShopView, Shop, ShopStat } from './models';

/* ---------- 小程序鉴权 ---------- */
export interface LoginRequest {
  /** wx.login 拿到的 code（Mock 模式下直接传伪 openid） */
  code: string;
}
export interface LoginResponse {
  token: string;
  openid: string;
}

/* ---------- 店铺 CRUD ---------- */
export interface CreateShopRequest {
  name: string;
  wifiSsid: string;
  wifiPassword: string;
  reviewLink?: string;
  groupBuyLink?: string;
  phone?: string;
}
export type UpdateShopRequest = Partial<CreateShopRequest>;

export interface QrCodeResponse {
  /** 小程序码图片（dataURL 或 url） */
  imageUrl: string;
  /** 扫码落地路径 */
  path: string;
}

export interface LogoUploadResponse {
  logoUrl: string;
}

/* ---------- 顾客连接链路 ---------- */
export interface UnlockRequest {
  sessionId: string;
  /** 广告完成凭据（Mock 模式可为 'mock-completed'） */
  adToken: string;
}
export interface UnlockResponse {
  /** 解锁后下发的 WiFi 凭据 */
  wifiSsid: string;
  wifiPassword: string;
}

export type { PublicShopView, Shop, ShopStat };

/* ---------- 运营后台 ---------- */
export interface DateRangeQuery {
  /** YYYY-MM-DD */
  from: string;
  to: string;
}

export interface OverviewResponse {
  totalShops: number;
  newShops: number;
  totalScans: number;
  totalConnects: number;
  /** 全局 scan→connect_success 转化率 */
  conversionRate: number;
  estimatedRevenue: number;
}

export interface FunnelStep {
  step: string;
  count: number;
  /** 相对上一步的留存率 0~1 */
  rate: number;
}
export interface FunnelResponse {
  steps: FunnelStep[];
}

export interface RevenueResponse {
  adCompletes: number;
  /** 可配置 eCPM（元/千次完成） */
  ecpm: number;
  estimatedRevenue: number;
  daily: { date: string; adCompletes: number; revenue: number }[];
}

export interface ShopRankingItem {
  shopId: string;
  name: string;
  scans: number;
  connectSuccess: number;
}
export interface ShopRankingResponse {
  items: ShopRankingItem[];
}

export interface TrendPoint {
  date: string;
  scans: number;
  adCompletes: number;
  connectSuccess: number;
  newShops: number;
}
export interface TrendResponse {
  points: TrendPoint[];
}

export interface AnomalyItem {
  shopId: string;
  name: string;
  /** 连接失败率 0~1 */
  connectFailRate: number;
  connectFail: number;
  connectClicks: number;
}
export interface AnomalyResponse {
  items: AnomalyItem[];
  /** 近 5 分钟实时扫码数 */
  realtimeScans: number;
}
