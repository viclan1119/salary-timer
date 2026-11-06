const store = require('../../utils/store');
const salary = require('../../utils/salary');

Page({
  data: {
    config: null,
    totalText: '0.00',
    rateText: '',
    presetNames: []
  },

  onLoad() {
    this.init();
  },
  onShow() {
    this.init();
  },

  init() {
    const config = store.getConfig();
    const total = salary.getTotalAmount(config);
    const rate = salary.getRatePerSecond(config);
    this.setData({
      config,
      totalText: salary.formatMoney(total),
      rateText: rate > 0
        ? `折算时薪 ¥${salary.getRatePerHour(config).toFixed(2)}/hr`
        : '',
      presetNames: salary.MODULE_PRESETS.map(p => p.name)
    });
  },

  // 仅写入存储 + 更新派生数据（避免整页重绘导致输入框光标跳动）
  save() {
    store.setConfig(this.data.config);
    this.updateDerived();
  },

  updateDerived() {
    const config = this.data.config;
    const total = salary.getTotalAmount(config);
    const rate = salary.getRatePerSecond(config);
    this.setData({
      totalText: salary.formatMoney(total),
      rateText: rate > 0
        ? `折算时薪 ¥${salary.getRatePerHour(config).toFixed(2)}/hr`
        : ''
    });
  },

  // 切换薪资模式
  onModeChange(e) {
    const mode = e.currentTarget.dataset.mode;
    if (!mode || mode === this.data.config.mode) return;
    this.setData({ 'config.mode': mode });
    this.save();
  },

  // 月薪：每月工作天数
  onWorkDaysInput(e) {
    this.setData({ 'config.monthly.workDaysPerMonth': Number(e.detail.value) || 0 });
    this.save();
  },

  // 月薪/日薪：每日工作小时
  onDailyHoursInput(e) {
    const mode = this.data.config.mode;
    if (mode === 'daily') {
      this.setData({ 'config.daily.dailyWorkHours': Number(e.detail.value) || 0 });
    } else {
      this.setData({ 'config.monthly.dailyWorkHours': Number(e.detail.value) || 0 });
    }
    this.save();
  },

  // 模块名称
  onModuleNameInput(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ [`config.modules[${idx}].name`]: e.detail.value });
    this.save();
  },

  // 模块金额
  onModuleAmountInput(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ [`config.modules[${idx}].amount`]: Number(e.detail.value) || 0 });
    this.save();
  },

  addModule(e) {
    const name = e.currentTarget.dataset.name || '其他';
    const modules = this.data.config.modules || [];
    modules.push({ id: salary.genId(), name, amount: 0 });
    this.setData({ 'config.modules': modules });
    this.save();
  },

  removeModule(e) {
    const idx = e.currentTarget.dataset.idx;
    const modules = this.data.config.modules || [];
    modules.splice(idx, 1);
    this.setData({ 'config.modules': modules });
    this.save();
  },

  // 日收入目标
  onGoalInput(e) {
    this.setData({ 'config.goal': Number(e.detail.value) || 0 });
    this.save();
  },

  // 请求订阅消息授权（必须由用户点击触发）
  onEnableNotify() {
    const app = getApp();
    const tplId = app.globalData.SUBSCRIBE_TEMPLATE_ID;
    if (!tplId) {
      wx.showModal({
        title: '尚未配置模板ID',
        content: '后台推送需在微信公众平台申请「订阅消息」模板，并把模板ID填入 app.js 的 globalData.SUBSCRIBE_TEMPLATE_ID。前台到目标时仍会自动弹窗提醒。',
        showCancel: false
      });
      return;
    }
    wx.requestSubscribeMessage({
      tmplIds: [tplId],
      success: (res) => {
        if (res[tplId] === 'accept') {
          this.setData({ 'config.notifyEnabled': true });
          this.save();
          wx.showToast({ title: '提醒已开启', icon: 'success' });
        } else {
          wx.showToast({ title: '未授权，无法后台推送', icon: 'none' });
        }
      },
      fail: () => wx.showToast({ title: '订阅失败', icon: 'none' })
    });
  }
});
