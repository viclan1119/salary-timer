const store = require('../../utils/store');
const salary = require('../../utils/salary');

Page({
  data: {
    earned: '0.00',
    ratePerSecondText: '',
    ratePerHourText: '',
    totalAmount: 0,
    modeLabel: '月薪',
    working: false,
    workedSeconds: 0,
    workedText: '0秒',
    goal: 0,
    goalProgress: 0,      // 0~100
    goalReached: false,
    modulesEarned: [],    // [{ name, amount }]
    hasConfig: false
  },

  timer: null,

  onLoad() {
    this.refresh();
  },
  onShow() {
    this.refresh();
    this.startTimer();
  },
  onHide() {
    this.stopTimer();
  },
  onUnload() {
    this.stopTimer();
  },

  startTimer() {
    this.stopTimer();
    this.timer = setInterval(() => this.tick(), 1000);
  },
  stopTimer() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },

  // 全量刷新（含模块明细、目标等）
  refresh() {
    const config = store.getConfig();
    const state = store.getState();
    const now = Date.now();

    const total = salary.getTotalAmount(config);
    const rate = salary.getRatePerSecond(config);
    const rateHour = salary.getRatePerHour(config);
    const worked = salary.getWorkedSecondsToday(state, now);
    const earned = worked * rate;
    const hasConfig = total > 0 && rate > 0;

    // 各模块今日已赚金额，按比例分摊
    const modulesEarned = (config.modules || []).map(m => ({
      name: m.name || '未命名',
      amount: salary.formatMoney(
        (Number(m.amount) || 0) / Math.max(total, 0.0001) * earned
      )
    }));

    const goal = Number(config.goal) || 0;
    const progress = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;
    const goalReached = goal > 0 && earned >= goal;

    this.setData({
      earned: salary.formatMoney(earned),
      ratePerSecondText: rate > 0 ? rate.toFixed(4) : '',
      ratePerHourText: rate > 0 ? rateHour.toFixed(2) : '',
      totalAmount: total,
      modeLabel: salary.MODE_LABEL[config.mode] || '',
      working: state.status === 'working',
      workedSeconds: Math.round(worked),
      workedText: salary.formatDuration(worked),
      goal,
      goalProgress: Math.round(progress * 10) / 10,
      goalReached,
      modulesEarned,
      hasConfig
    });

    this.checkGoalNotify(state, config, earned, now);
  },

  // 每秒轻量更新（只更新变动中的数字，避免整页重绘）
  tick() {
    const config = store.getConfig();
    const state = store.getState();
    const now = Date.now();

    const worked = salary.getWorkedSecondsToday(state, now);
    const earned = worked * salary.getRatePerSecond(config);
    const goal = Number(config.goal) || 0;
    const progress = goal > 0 ? Math.min(100, (earned / goal) * 100) : 0;
    const goalReached = goal > 0 && earned >= goal;

    this.setData({
      earned: salary.formatMoney(earned),
      workedSeconds: Math.round(worked),
      workedText: salary.formatDuration(worked),
      goalProgress: Math.round(progress * 10) / 10,
      goalReached
    });

    this.checkGoalNotify(state, config, earned, now);
  },

  // 到达目标时的提醒（前台弹窗，每天仅一次）
  checkGoalNotify(state, config, earned) {
    const goal = Number(config.goal) || 0;
    if (goal <= 0 || earned < goal) return;
    if (state.goalNotifiedDate === store.todayKey()) return;

    state.goalNotifiedDate = store.todayKey();
    store.setState(state);

    wx.showModal({
      title: '🎉 达成今日目标',
      content: `已累计赚到 ¥${salary.formatMoney(earned)}，达到你设定的目标 ¥${salary.formatMoney(goal)}！`,
      showCancel: false,
      confirmText: '太棒了'
    });
  },

  onStartWork() {
    const config = store.getConfig();
    if (!(salary.getTotalAmount(config) > 0 && salary.getRatePerSecond(config) > 0)) {
      wx.showToast({ title: '请先到「设置」填写薪资', icon: 'none' });
      return;
    }
    const state = store.getState();
    state.status = 'working';
    state.startTime = Date.now();
    store.setState(state);
    this.refresh();
    wx.showToast({ title: '开始上班 🚀', icon: 'none' });
  },

  onStopWork() {
    const state = store.getState();
    if (state.status === 'working' && state.startTime) {
      const now = Date.now();
      state.todayWorkedSeconds =
        (Number(state.todayWorkedSeconds) || 0) +
        Math.max(0, (now - state.startTime) / 1000);
      state.startTime = 0;
      state.status = 'stopped';
      store.setState(state);
    }
    this.refresh();
    wx.showToast({ title: '已下班，今日金额已结算', icon: 'none' });
  },

  goSettings() {
    wx.switchTab({ url: '/pages/settings/settings' });
  }
});
