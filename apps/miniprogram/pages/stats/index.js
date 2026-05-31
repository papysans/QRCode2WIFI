const api = require('../../utils/api');

Page({
  data: { id: '', stat: null },
  onLoad(q) {
    this.setData({ id: q.id });
  },
  onShow() {
    this.load();
  },
  async load() {
    try {
      await api.ensureLogin();
      const stat = await api.get(`/shops/${this.data.id}/stats`);
      this.setData({ stat });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },
});
