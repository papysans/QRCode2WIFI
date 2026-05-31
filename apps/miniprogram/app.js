// 全局：配置后端地址、登录态
App({
  globalData: {
    // 本地联调：用微信开发者工具「不校验合法域名」
    apiBase: 'http://localhost:3000/api',
    token: '',
    openid: '',
  },
  onLaunch() {
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
      this.globalData.openid = wx.getStorageSync('openid') || '';
    }
  },
});
