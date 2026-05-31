const api = require('../../utils/api');
const { track, EventType } = require('../../utils/track');
const adapters = require('../../utils/adapters');

Page({
  data: {
    sid: '',
    sessionId: '',
    adToken: '',
    ssid: '',
    password: '',
    unlocked: false,
    connected: false,
    showPassword: false,
    failed: false,
  },
  onLoad(q) {
    this.setData({ sid: q.sid, sessionId: q.sessionId, adToken: q.adToken });
    this.unlock();
  },
  // 广告完成后向后端换取 WiFi 凭据
  async unlock() {
    try {
      const r = await api.post(
        `/connect/${this.data.sid}/unlock`,
        { sessionId: this.data.sessionId, adToken: this.data.adToken },
        false,
      );
      this.setData({ unlocked: true, ssid: r.wifiSsid, password: r.wifiPassword });
    } catch (e) {
      wx.showToast({ title: '解锁失败，请重看广告', icon: 'none' });
    }
  },
  async connect() {
    track(EventType.CONNECT_CLICK, this.data.sid, this.data.sessionId);
    const res = await adapters.connectWifi(this.data.ssid, this.data.password);
    if (res.ok) {
      track(EventType.CONNECT_SUCCESS, this.data.sid, this.data.sessionId);
      this.setData({ connected: true });
      wx.showToast({ title: '已连接' });
    } else {
      track(EventType.CONNECT_FAIL, this.data.sid, this.data.sessionId, {
        errorCode: res.errorCode,
      });
      this.setData({ failed: true });
      wx.showToast({ title: '连接失败，可用密码手动连', icon: 'none' });
    }
  },
  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },
  copyPassword() {
    wx.setClipboardData({ data: this.data.password });
  },
});
