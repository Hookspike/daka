const db = require('./database');
const notifier = require('./notifier');

const CHECK_INTERVAL = 30 * 1000;
const SLOT_TIMES = {
  morning1: { h: 6, m: 5 },
  morning2: { h: 9, m: 30 },
  evening1: { h: 18, m: 5 },
  evening2: { h: 21, m: 20 }
};

const sentLog = new Set();

function getCurrentSlot() {
  const now = new Date();
  const h = now.getHours();
  const m = now.getMinutes();

  for (const [slot, time] of Object.entries(SLOT_TIMES)) {
    if (h === time.h && m === time.m) {
      return slot;
    }
  }
  return null;
}

function getTodayKey() {
  return db.getTodayStr();
}

function shouldSend(slot) {
  const today = getTodayKey();
  const key = `${today}_${slot}`;
  if (sentLog.has(key)) return false;

  const now = new Date();
  const time = SLOT_TIMES[slot];
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), time.h, time.m, 0);
  const diff = Math.abs(now - target);

  if (diff > 60000) return false;

  sentLog.add(key);
  return true;
}

async function processReminders() {
  const slot = getCurrentSlot();
  if (!slot) return;

  if (!shouldSend(slot)) return;

  console.log(`[${new Date().toLocaleString()}] 开始处理 ${slot} 提醒...`);

  const users = db.getAllUsers();
  if (users.length === 0) {
    console.log(`[${new Date().toLocaleString()}] 暂无已注册用户`);
    return;
  }

  const settingKey = `${slot}_enabled`;
  let success = 0;
  let failed = 0;

  for (const user of users) {
    if (user.settings && user.settings[settingKey] === false) {
      console.log(`[${new Date().toLocaleString()}] 用户 ${user.id} 已关闭 ${slot} 提醒，跳过`);
      continue;
    }

    try {
      await notifier.sendSlotReminder(user.sendkey, slot);
      console.log(`[${new Date().toLocaleString()}] 已向用户 ${user.id} 发送 ${slot} 提醒`);
      success++;
    } catch (err) {
      console.error(`[${new Date().toLocaleString()}] 向用户 ${user.id} 发送 ${slot} 提醒失败:`, err.message);
      failed++;
    }
  }

  console.log(`[${new Date().toLocaleString()}] ${slot} 提醒完成: 成功 ${success}, 失败 ${failed}`);
}

function cleanupSentLog() {
  const today = getTodayKey();
  for (const key of sentLog) {
    if (!key.startsWith(today)) {
      sentLog.delete(key);
    }
  }
}

function start() {
  console.log(`[${new Date().toLocaleString()}] 定时任务调度器已启动`);
  console.log(`提醒时间: 6:05, 9:30, 18:05, 21:20`);

  cleanupSentLog();

  setInterval(() => {
    processReminders().catch(err => {
      console.error(`[${new Date().toLocaleString()}] 处理提醒时出错:`, err.message);
    });
  }, CHECK_INTERVAL);

  setInterval(cleanupSentLog, 3600000);
}

module.exports = { start };
