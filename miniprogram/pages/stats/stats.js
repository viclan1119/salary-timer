const store = require('../../utils/store');
const salary = require('../../utils/salary');

Page({
  data: {
    todayEarned: '0.00',
    todayWorkedText: '0秒',
    totalEarned: '0.00',
    history: [],      // [{ date, workedText, earned }]
    hasHistory: false
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const config = store.getConfig();
    const state = store.getState();
    const now = Date.now();

    const worked = salary.getWorkedSecondsToday(state, now);
    const earned = worked * salary.getRatePerSecond(config);

    const history = (state.history || []).map(h => ({
      date: h.date,
      workedText: salary.formatDuration(h.seconds),
      earned: salary.formatMoney(h.earned)
    }));

    let total = earned;
    history.forEach(h => {
      total += Number(h.earned);
    });

    this.setData({
      todayEarned: salary.formatMoney(earned),
      todayWorkedText: salary.formatDuration(worked),
      totalEarned: salary.formatMoney(total),
      history,
      hasHistory: history.length > 0
    });
  }
});
