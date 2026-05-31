// 后端请求封装 + 登录
const app = getApp();

function base() {
  return getApp().globalData.apiBase;
}

function request(path, method, data, auth) {
  return new Promise((resolve, reject) => {
    const header = { 'content-type': 'application/json' };
    if (auth) {
      header.Authorization = `Bearer ${getApp().globalData.token}`;
    }
    wx.request({
      url: base() + path,
      method,
      data,
      header,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res.data);
        else reject(res.data);
      },
      fail: reject,
    });
  });
}

// 登录：Mock 模式下用 wx.login 的 code 即可换 openid
function login() {
  return new Promise((resolve, reject) => {
    wx.login({
      success: async ({ code }) => {
        try {
          const r = await request('/auth/login', 'POST', { code }, false);
          const g = getApp().globalData;
          g.token = r.token;
          g.openid = r.openid;
          wx.setStorageSync('token', r.token);
          wx.setStorageSync('openid', r.openid);
          resolve(r);
        } catch (e) {
          reject(e);
        }
      },
      fail: reject,
    });
  });
}

async function ensureLogin() {
  if (!getApp().globalData.token) await login();
}

module.exports = {
  login,
  ensureLogin,
  get: (p, auth = true) => request(p, 'GET', undefined, auth),
  post: (p, data, auth = true) => request(p, 'POST', data, auth),
  patch: (p, data, auth = true) => request(p, 'PATCH', data, auth),
};
