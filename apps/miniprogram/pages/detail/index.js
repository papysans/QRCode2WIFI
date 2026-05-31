const api = require('../../utils/api');

Page({
  data: { id: '', shop: null, editing: false, form: {} },
  onLoad(q) {
    this.setData({ id: q.id });
  },
  onShow() {
    this.load();
  },
  async load() {
    try {
      await api.ensureLogin();
      const shop = await api.get(`/shops/${this.data.id}`);
      this.setData({ shop, form: { ...shop } });
    } catch (e) {
      wx.showToast({ title: '无权限或不存在', icon: 'none' });
    }
  },
  toggleEdit() {
    this.setData({ editing: !this.data.editing });
  },
  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },
  async saveEdit() {
    try {
      const { name, wifiSsid, wifiPassword } = this.data.form;
      const shop = await api.patch(`/shops/${this.data.id}`, {
        name,
        wifiSsid,
        wifiPassword,
      });
      this.setData({ shop, editing: false });
      wx.showToast({ title: '已保存' });
    } catch (e) {
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  },
  goQrcode() {
    wx.navigateTo({ url: `/pages/qrcode/index?id=${this.data.id}` });
  },
  goStats() {
    wx.navigateTo({ url: `/pages/stats/index?id=${this.data.id}` });
  },
  async chooseLogo() {
    try {
      const { tempFiles } = await wx.chooseMedia({ count: 1, mediaType: ['image'] });
      const filePath = tempFiles[0].tempFilePath;
      wx.uploadFile({
        url: getApp().globalData.apiBase + `/shops/${this.data.id}/logo`,
        filePath,
        name: 'file',
        header: { Authorization: `Bearer ${getApp().globalData.token}` },
        success: () => {
          wx.showToast({ title: 'Logo 已上传' });
          this.load();
        },
        fail: () => wx.showToast({ title: '上传失败', icon: 'none' }),
      });
    } catch (e) {}
  },
});
