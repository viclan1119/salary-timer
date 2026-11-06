/**
 * 本地存储封装
 * 使用 wx.setStorageSync / wx.getStorageSync 持久化配置与工作状态。
 */
const { DEFAULT_CONFIG, getRatePerSecond } = require('./salary');

const KEY_CONFIG = 'salary_config';
const KEY_STATE = 'work_state';

// 生成 yyyy-mm-dd 形式的日期 key
function todayKey(d) {
  d = d || new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 读取配置，缺失字段用默认值补齐
function getConfig() {
  const c = wx.getStorageSync(KEY_CONFIG);
  if (c && c.mode) {
    const base = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    return Object.assign(base, c);
  }
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG));
}

function setConfig(config) {
  wx.setStorageSync(KEY_CONFIG, config);
}

/**
 * 读取工作状态，并处理跨天重置。
 * 状态结构：
 * {
 *   status: 'working' | 'stopped',
 *   startTime: number,          // 当前会话开始时间戳(ms)
 *   todayWorkedSeconds: number, // 今日已累计工作秒数（不含进行中会话）
 *   todayDate: 'yyyy-mm-dd',
 *   history: [{ date, seconds, earned }],
 *   goalNotifiedDate: ''        // 当天已弹过到目标提醒的日期
 * }
 */
function getState() {
  let s = wx.getStorageSync(KEY_STATE) || {};
  const today = todayKey();

  if (!s.todayDate) {
    s = {
      status: 'stopped',
      startTime: 0,
      todayWorkedSeconds: 0,
      todayDate: today,
      history: [],
      goalNotifiedDate: ''
    };
  }

  // 跨天：把昨天结算进历史
  if (s.todayDate !== today) {
    const config = getConfig();
    const earned = (Number(s.todayWorkedSeconds) || 0) * getRatePerSecond(config);
    s.history = s.history || [];
    const entry = {
      date: s.todayDate,
      seconds: Math.round(Number(s.todayWorkedSeconds) || 0),
      earned: Number(earned.toFixed(2))
    };
    const idx = s.history.findIndex(h => h.date === s.todayDate);
    if (idx >= 0) s.history[idx] = entry;
    else s.history.unshift(entry);

    s.todayDate = today;
    s.todayWorkedSeconds = 0;
    s.status = 'stopped';
    s.startTime = 0;
    s.goalNotifiedDate = '';
  }

  s.history = s.history || [];
  return s;
}

function setState(state) {
  wx.setStorageSync(KEY_STATE, state);
}

module.exports = { getConfig, setConfig, getState, setState, todayKey };
