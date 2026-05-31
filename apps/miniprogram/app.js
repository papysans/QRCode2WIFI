// 全局：配置后端地址、登录态
App({
  globalData: {
    // 本地联调：用微信开发者工具「不校验合法域名」。
    // 生产环境必须改为 HTTPS 域名（已在 MP 后台「服务器域名」白名单、且已 ICP 备案），
    // 例如 'https://api.example.com/api'；微信正式环境会强制校验合法域名。
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
