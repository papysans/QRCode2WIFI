const api = require('../../utils/api');

Page({
  data: { id: '', qr: null, shop: null },
  onLoad(q) {
    this.setData({ id: q.id });
    this.gen();
  },
  async gen() {
    try {
      await api.ensureLogin();
      const shop = await api.get(`/shops/${this.data.id}`);
      const qr = await api.post(`/shops/${this.data.id}/qrcode`, {});
      this.setData({ shop, qr });
    } catch (e) {
      wx.showToast({ title: '生成失败', icon: 'none' });
    }
  },
  copyLink() {
    wx.setClipboardData({ data: this.data.qr.path });
  },
});
