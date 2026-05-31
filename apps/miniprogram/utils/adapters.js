// 客户端可切换适配层：广告 + WiFi 连接
// MODE=mock 时不依赖真实微信广告/WiFi 资质，便于联调
const MODE = 'mock'; // 'mock' | 'wechat'

// 播放激励视频广告，resolve({completed, adToken})
function playRewardedAd() {
  if (MODE === 'mock') {
    // Mock：模拟 5 秒广告
    return new Promise((resolve) => {
      setTimeout(() => resolve({ completed: true, adToken: 'mock-completed' }), 5000);
    });
  }
  // 真实微信激励视频（资质就绪后启用）
  return new Promise((resolve) => {
    const ad = wx.createRewardedVideoAd({ adUnitId: 'YOUR_AD_UNIT_ID' });
    ad.onClose((res) => {
      const completed = res && res.isEnded;
      resolve({ completed, adToken: completed ? 'wechat-completed' : '' });
    });
    ad.show().catch(() => ad.load().then(() => ad.show()));
  });
}

// 连接 WiFi，resolve({ok, errorCode})
function connectWifi(ssid, password) {
  if (MODE === 'mock') {
    return Promise.resolve({ ok: true });
  }
  return new Promise((resolve) => {
    wx.connectWifi({
      SSID: ssid,
      password,
      success: () => resolve({ ok: true }),
      fail: (e) => resolve({ ok: false, errorCode: String(e.errCode || e.errMsg) }),
    });
  });
}

module.exports = { playRewardedAd, connectWifi, MODE };
