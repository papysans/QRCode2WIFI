const api = require('../../utils/api');

Page({
  data: { shops: [], loading: true },
  onShow() {
    this.load();
  },
  async load() {
    try {
      await api.ensureLogin();
      const shops = await api.get('/shops');
      this.setData({ shops, loading: false });
    } catch (e) {
      this.setData({ loading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
  goCreate() {
    wx.navigateTo({ url: '/pages/create/index' });
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/index?id=${id}` });
  },
});
