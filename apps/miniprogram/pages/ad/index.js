const { track, EventType } = require('../../utils/track');
const adapters = require('../../utils/adapters');

Page({
  data: { sid: '', sessionId: '', seconds: 5, playing: true },
  onLoad(q) {
    this.setData({ sid: q.sid, sessionId: q.sessionId });
    track(EventType.AD_START, q.sid, q.sessionId);
    this.start();
  },
  start() {
    // 倒计时展示（Mock 广告 5 秒）
    this.timer = setInterval(() => {
      const s = this.data.seconds - 1;
      this.setData({ seconds: s });
      if (s <= 0) clearInterval(this.timer);
    }, 1000);

    adapters.playRewardedAd().then((res) => {
      clearInterval(this.timer);
      if (res.completed) {
        track(EventType.AD_COMPLETE, this.data.sid, this.data.sessionId);
        wx.redirectTo({
          url: `/pages/wifi/index?sid=${this.data.sid}&sessionId=${this.data.sessionId}&adToken=${res.adToken}`,
        });
      } else {
        track(EventType.AD_SKIP, this.data.sid, this.data.sessionId);
        this.setData({ playing: false });
      }
    });
  },
  onUnload() {
    if (this.timer) clearInterval(this.timer);
  },
  back() {
    wx.navigateBack();
  },
});
