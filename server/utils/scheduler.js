const cron = require('node-cron');
const db = require('../config/db');
const { sendWechatNotify, logNotify } = require('../services/wechat');

const MORNING_START = 6;
const MORNING_END = 9;
const MORNING_END_MIN = 30;
const EVENING_START = 18;
const EVENING_END = 21;
const EVENING_END_MIN = 30;

/**
 * 获取当前日期字符串 YYYY-MM-DD
 */
function getTodayStr() {
  return new Date().toISOString().split('T')[0];
}

/**
 * 获取当前时间字符串 HH:MM:SS
 */
function getNowTimeStr() {
  const now = new Date();
  return now.toTimeString().split(' ')[0];
}

/**
 * 检查是否在打卡时间段内
 */
function isInCheckinWindow(type) {
  const now = new Date();
  const hour = now.getHours();
  const min = now.getMinutes();
  if (type === 'morning') {
    return (hour > MORNING_START || (hour === MORNING_START && min >= 0)) &&
           (hour < MORNING_END || (hour === MORNING_END && min <= MORNING_END_MIN));
  }
  if (type === 'evening') {
    return (hour > EVENING_START || (hour === EVENING_START && min >= 0)) &&
           (hour < EVENING_END || (hour === EVENING_END && min <= EVENING_END_MIN));
  }
  return false;
}

/**
 * 批量发送打卡提醒
 */
async function sendReminders(type) {
  const today = getTodayStr();
  const timeStr = getNowTimeStr();

  const users = db.prepare('SELECT * FROM users WHERE wechat_notify_type != ? AND wechat_key IS NOT NULL').all('none');

  for (const user of users) {
    const record = db.prepare(
      'SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?'
    ).get(user.id, today);

    const alreadyChecked = type === 'morning'
      ? record?.morning_status === 1
      : record?.evening_status === 1;

    if (alreadyChecked) continue;

    const title = type === 'morning' ? '早安打卡提醒' : '晚间打卡提醒';
    const content = type === 'morning'
      ? `早上好！现在是 ${timeStr}，请在 9:30 前完成今日早晨打卡。`
      : `晚上好！现在是 ${timeStr}，请在 21:30 前完成今日晚间打卡。`;

    try {
      const result = await sendWechatNotify(user, title, content, type);
      logNotify(user.id, type, timeStr, result.success, result.data);
    } catch (err) {
      console.error(`推送失败 [user=${user.id}]:`, err.message);
      logNotify(user.id, type, timeStr, false, { error: err.message });
    }
  }
}

/**
 * 启动定时任务
 */
function startScheduler() {
  // 早晨 6:00 提醒
  cron.schedule('0 6 * * *', () => {
    console.log('[Scheduler] 发送早晨打卡提醒');
    sendReminders('morning');
  }, { timezone: 'Asia/Shanghai' });

  // 早晨 9:00 再次提醒
  cron.schedule('0 9 * * *', () => {
    console.log('[Scheduler] 发送早晨二次提醒');
    sendReminders('morning');
  }, { timezone: 'Asia/Shanghai' });

  // 傍晚 18:00 提醒
  cron.schedule('0 18 * * *', () => {
    console.log('[Scheduler] 发送晚间打卡提醒');
    sendReminders('evening');
  }, { timezone: 'Asia/Shanghai' });

  // 晚间 21:00 再次提醒
  cron.schedule('0 21 * * *', () => {
    console.log('[Scheduler] 发送晚间二次提醒');
    sendReminders('evening');
  }, { timezone: 'Asia/Shanghai' });

  console.log('[Scheduler] 定时任务已启动');
}

module.exports = { startScheduler, isInCheckinWindow, getTodayStr, getNowTimeStr };
