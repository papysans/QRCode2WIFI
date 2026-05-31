/** 店铺状态 */
export enum ShopStatus {
  ACTIVE = 'active',
  /** 已下架，顾客扫码看到友好提示 */
  INACTIVE = 'inactive',
}

/** 店铺完整模型（owner 视角） */
export interface Shop {
  id: string;
  /** 二维码携带的短码，解析为 shop */
  sid: string;
  ownerOpenid: string;
  name: string;
  wifiSsid: string;
  /** 顾客公开视图永不包含此字段 */
  wifiPassword?: string;
  logoUrl?: string;
  reviewLink?: string;
  groupBuyLink?: string;
  phone?: string;
  status: ShopStatus;
  createdAt: string;
  updatedAt: string;
}

/** 顾客扫码后看到的公开店铺视图（无密码） */
export interface PublicShopView {
  sid: string;
  name: string;
  wifiSsid: string;
  logoUrl?: string;
  reviewLink?: string;
  groupBuyLink?: string;
  status: ShopStatus;
}

/** 单店基础数据（小程序数据页 / 后台单店） */
export interface ShopStat {
  shopId: string;
  scans: number;
  adCompletes: number;
  connectClicks: number;
  connectSuccess: number;
  connectFail: number;
}
