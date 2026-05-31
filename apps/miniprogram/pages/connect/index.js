const api = require('../../utils/api');
const { track, EventType } = require('../../utils/track');

function parseSid(options) {
  // 真实扫码：options.scene = 'sid=Ab8K29'（需 decode）；开发：options.sid
  if (options.sid) return options.sid;
  if (options.scene) {
    const scene = decodeURIComponent(options.scene);
    const m = scene.match(/sid=([^&]+)/);
    if (m) return m[1];
    return scene;
  }
  return '';
}

Page({
  data: { sid: '', sessionId: '', shop: null, error: '' },
  onLoad(options) {
    const sid = parseSid(options);
    const sessionId = 's_' + Date.now() + Math.random().toString(36).slice(2, 6);
    this.setData({ sid, sessionId });
    this.load();
  },
  async load() {
    try {
      const shop = await api.get(`/connect/${this.data.sid}`, false);
      if (shop.status !== 'active') {
        this.setData({ error: '该店铺已下架' });
        return;
      }
      this.setData({ shop });
      track(EventType.SCAN, this.data.sid, this.data.sessionId);
    } catch (e) {
      this.setData({ error: '二维码无效或店铺不存在' });
    }
  },
  watchAd() {
    wx.navigateTo({
      url: `/pages/ad/index?sid=${this.data.sid}&sessionId=${this.data.sessionId}`,
    });
  },
  openLink(e) {
    const url = e.currentTarget.dataset.url;
    if (url) wx.setClipboardData({ data: url, success: () => wx.showToast({ title: '链接已复制' }) });
  },
});
