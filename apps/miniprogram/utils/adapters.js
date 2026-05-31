// 客户端可切换适配层：广告 + WiFi 连接
// MODE=mock 时不依赖真实微信广告/WiFi 资质，便于联调
const MODE = 'mock'; // 'mock' | 'wechat'

// TODO: 填入 adUnitId（微信 MP 后台「流量主 → 广告位」创建激励视频广告位后获取）
const AD_UNIT_ID = '';

// 激励视频广告实例需按 adUnitId 复用（单例），避免重复创建
let rewardedAd = null;

// 播放激励视频广告，resolve({completed, adToken})
function playRewardedAd() {
  if (MODE === 'mock') {
    // Mock：模拟 5 秒广告
    return new Promise((resolve) => {
      setTimeout(() => resolve({ completed: true, adToken: 'mock-completed' }), 5000);
    });
  }
  // 真实微信激励视频
  return new Promise((resolve) => {
    if (!AD_UNIT_ID) {
      console.error('[adapters] 未配置 AD_UNIT_ID，无法播放激励视频');
      resolve({ completed: false, adToken: '' });
      return;
    }
    if (!rewardedAd) {
      rewardedAd = wx.createRewardedVideoAd({ adUnitId: AD_UNIT_ID });
    }
    // onClose 每次 show 都会触发；注册前先移除旧回调避免叠加
    const onClose = (res) => {
      rewardedAd.offClose(onClose);
      // res.isEnded === true 表示看完（客户端判定，可被伪造）
      const completed = !!(res && res.isEnded);
      // 注意：isEnded 仅用于 UI 乐观放行。真实解锁应依赖服务端回调记录的 trans_id：
      //   1) 用 rewardedAd.setServerSideVerifyOptions({ adUnitId, customData }) 透传自定义数据；
      //   2) 微信看完后回调后端 /wechat/ad-callback，后端记录 trans_id 为已完成；
      //   3) 客户端用该 trans_id 作为 adToken 调 unlock，由后端 verifyAdToken 校验。
      // 当前未配置服务端回调时，沿用 adToken 流程占位（真实环境务必改为依赖服务端回调）。
      resolve({ completed, adToken: completed ? 'wechat-completed' : '' });
    };
    rewardedAd.onClose(onClose);
    // show 可能因无广告填充而 reject，需 load 后重试；仍失败则判为未完成
    rewardedAd.show().catch(() =>
      rewardedAd
        .load()
        .then(() => rewardedAd.show())
        .catch(() => {
          rewardedAd.offClose(onClose);
          resolve({ completed: false, adToken: '' });
        }),
    );
  });
}

// 连接 WiFi，resolve({ok, errorCode})
function connectWifi(ssid, password) {
  if (MODE === 'mock') {
    return Promise.resolve({ ok: true });
  }
  // 真实微信连接：
  //  - 必须先 wx.startWifi 初始化 WiFi 模块，否则 connectWifi 报 12000（未初始化）。
  //  - iOS 11+ / Android 6.0+ 才支持；Android 扫描需定位权限。
  //  - iOS 对隐藏网络/部分场景需要 BSSID；5GHz 网络兼容性较差，优先 2.4GHz SSID。
  //  - 新版基础库可能要求先 wx.requirePrivacyAuthorize 并在隐私协议声明（按基础库版本核实）。
  //  - 失败原因多样（12002 密码错误 / 12007 用户拒绝 / 12001 系统不支持 等），
  //    上层须展示密码兜底 UI 供手动连接（见 connect 页）。
  return new Promise((resolve) => {
    wx.startWifi({
      success: () => {
        wx.connectWifi({
          SSID: ssid,
          password,
          // maunal: false, // 如需 iOS 兼容可按文档传 BSSID/partialInfo 等参数
          success: () => resolve({ ok: true }),
          fail: (e) =>
            resolve({ ok: false, errorCode: String(e.errCode || e.errMsg) }),
        });
      },
      fail: (e) =>
        resolve({ ok: false, errorCode: String(e.errCode || e.errMsg) }),
    });
  });
}

module.exports = { playRewardedAd, connectWifi, MODE };
