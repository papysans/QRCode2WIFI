/**
 * 埋点事件定义 —— 小程序上报、后端入库、后台展示三端唯一来源。
 * 改这里，三端类型同步。
 */

export enum EventType {
  /** 顾客扫码进入门店页（漏斗第 1 步） */
  SCAN = 'scan',
  /** 激励视频开始播放 */
  AD_START = 'ad_start',
  /** 广告完成回调成功（漏斗第 2 步） */
  AD_COMPLETE = 'ad_complete',
  /** 广告跳过 / 未完成退出（流失） */
  AD_SKIP = 'ad_skip',
  /** 点击连接按钮（漏斗第 3 步） */
  CONNECT_CLICK = 'connect_click',
  /** 连接成功（漏斗第 4 步） */
  CONNECT_SUCCESS = 'connect_success',
  /** 连接调用失败（连接失败率来源） */
  CONNECT_FAIL = 'connect_fail',
}

/** 漏斗顺序：scan → ad_complete → connect_click → connect_success */
export const FUNNEL_STEPS: EventType[] = [
  EventType.SCAN,
  EventType.AD_COMPLETE,
  EventType.CONNECT_CLICK,
  EventType.CONNECT_SUCCESS,
];

/** 单条埋点事件上报体 */
export interface EventPayload {
  type: EventType;
  /** 目标店铺 sid（顾客侧用 sid，后端解析为 shopId） */
  sid: string;
  /** 当前用户 openid（顾客可能未授权，可空） */
  actorOpenid?: string;
  /** 匿名访客标识（未登录顾客的去重依据） */
  visitorId: string;
  /** 一次连接会话 id，串联同一顾客的 scan→connect 链路 */
  sessionId: string;
  /** 附加信息：广告时长、失败错误码等 */
  meta?: Record<string, unknown>;
  /** 客户端事件发生时间（ISO，可选；后端以入库时间兜底） */
  clientTs?: string;
}

/** 批量上报请求体 */
export interface EventBatchRequest {
  events: EventPayload[];
}

export interface EventBatchResponse {
  accepted: number;
}
