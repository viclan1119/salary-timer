/**
 * 工资计算核心
 * 支持三种模式：monthly(月薪) / daily(日薪) / hourly(时薪)
 * 所有金额单位均为「元」，时间单位统一用「秒」。
 */

const DEFAULT_CONFIG = {
  mode: 'monthly',            // monthly | daily | hourly
  monthly: {
    workDaysPerMonth: 22,     // 每月工作天数
    dailyWorkHours: 8         // 每日工作小时
  },
  daily: {
    dailyWorkHours: 8
  },
  hourly: {
    // 无额外参数
  },
  modules: [],                // [{ id, name, amount }] 金额单位跟随当前模式
  goal: 0,                    // 日收入目标（元），0 表示不设置
  notifyEnabled: false        // 是否已授权订阅消息
};

const MODE_LABEL = {
  monthly: '月薪',
  daily: '日薪',
  hourly: '时薪'
};

// 常用薪资模块预设
const MODULE_PRESETS = [
  { name: '到手工资' },
  { name: '公积金' },
  { name: '社保' },
  { name: '奖金' },
  { name: '其他' }
];

function sumModules(config) {
  if (!config || !config.modules || !config.modules.length) return 0;
  return config.modules.reduce((s, m) => s + (Number(m.amount) || 0), 0);
}

// 当前模式下的总金额（元）
function getTotalAmount(config) {
  return sumModules(config);
}

// 每秒收入（元/秒）
function getRatePerSecond(config) {
  const total = getTotalAmount(config);
  if (!total || total <= 0) return 0;

  if (config.mode === 'monthly') {
    const days = Number(config.monthly.workDaysPerMonth) || 22;
    const hours = Number(config.monthly.dailyWorkHours) || 8;
    return total / (days * hours * 3600);
  }
  if (config.mode === 'daily') {
    const hours = Number(config.daily.dailyWorkHours) || 8;
    return total / (hours * 3600);
  }
  // hourly
  return total / 3600;
}

// 每小时收入（元）
function getRatePerHour(config) {
  return getRatePerSecond(config) * 3600;
}

// 今日已工作的秒数（含进行中的会话）
function getWorkedSecondsToday(state, now) {
  now = now || Date.now();
  let sec = Number(state.todayWorkedSeconds) || 0;
  if (state.status === 'working' && state.startTime) {
    sec += Math.max(0, (now - state.startTime) / 1000);
  }
  return sec;
}

// 今日已赚金额（元）
function getTodayEarned(config, state, now) {
  return getWorkedSecondsToday(state, now) * getRatePerSecond(config);
}

// 今日目标完成进度（0~1）
function getGoalProgress(config, state, now) {
  const goal = Number(config.goal) || 0;
  if (goal <= 0) return 0;
  return Math.min(1, getTodayEarned(config, state, now) / goal);
}

// 金额格式化：保留两位小数
function formatMoney(n) {
  return (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);
}

// 秒 -> 显示文本，如 "2小时35分06秒"
function formatDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}小时${m}分${sec}秒`;
  if (m > 0) return `${m}分${sec}秒`;
  return `${sec}秒`;
}

// 生成唯一 id
function genId() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

module.exports = {
  DEFAULT_CONFIG,
  MODE_LABEL,
  MODULE_PRESETS,
  sumModules,
  getTotalAmount,
  getRatePerSecond,
  getRatePerHour,
  getWorkedSecondsToday,
  getTodayEarned,
  getGoalProgress,
  formatMoney,
  formatDuration,
  genId
};
