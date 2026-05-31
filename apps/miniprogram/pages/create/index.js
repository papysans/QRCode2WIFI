const api = require('../../utils/api');

Page({
  data: {
    form: { name: '', wifiSsid: '', wifiPassword: '', reviewLink: '', phone: '' },
    saving: false,
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },
  async save() {
    const f = this.data.form;
    if (!f.name || !f.wifiSsid || !f.wifiPassword) {
      wx.showToast({ title: '请填写店名/WiFi/密码', icon: 'none' });
      return;
    }
    this.setData({ saving: true });
    try {
      await api.ensureLogin();
      const shop = await api.post('/shops', f);
      wx.redirectTo({ url: `/pages/qrcode/index?id=${shop.id}` });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  },
});
