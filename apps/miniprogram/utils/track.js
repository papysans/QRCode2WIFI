// 埋点上报（与后端 @q2w/shared EventType 对齐）
const api = require('./api');

const EventType = {
  SCAN: 'scan',
  AD_START: 'ad_start',
  AD_COMPLETE: 'ad_complete',
  AD_SKIP: 'ad_skip',
  CONNECT_CLICK: 'connect_click',
  CONNECT_SUCCESS: 'connect_success',
  CONNECT_FAIL: 'connect_fail',
};

function visitorId() {
  let v = wx.getStorageSync('visitorId');
  if (!v) {
    v = 'v_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    wx.setStorageSync('visitorId', v);
  }
  return v;
}

// 上报单个事件（公开接口，无需登录）
function track(type, sid, sessionId, meta) {
  const payload = {
    events: [
      {
        type,
        sid,
        actorOpenid: getApp().globalData.openid || undefined,
        visitorId: visitorId(),
        sessionId,
        meta,
        clientTs: new Date().toISOString(),
      },
    ],
  };
  // 失败不阻塞主流程
  api.post('/events', payload, false).catch(() => {});
}

module.exports = { track, EventType, visitorId };
