const https = require('https');
const http = require('http');

const BASE_URL = 'sct.ftqq.com';

function sendNotification(sendkey, title, content) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ title, content });

    const options = {
      hostname: BASE_URL,
      path: `/${sendkey}.send`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 10000
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.code === 0) {
            resolve(result);
          } else {
            reject(new Error(`Server酱返回错误: ${result.message || body}`));
          }
        } catch {
          reject(new Error(`解析响应失败: ${body}`));
        }
      });
    });

    req.on('error', (e) => reject(new Error(`请求失败: ${e.message}`)));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('请求超时'));
    });

    req.write(postData);
    req.end();
  });
}

function sendMorningReminder1(sendkey) {
  const title = '⏰ 早晨打卡提醒（第一次）';
  const content = `## ☀️ 早上好！新的一天开始啦！\n\n` +
    `现在是 **6:05**，请完成第一次早晨打卡！\n\n` +
    `> 🌅 一日之计在于晨，早起打卡开启美好一天！\n\n` +
    `[👉 点击打卡](${process.env.SERVER_BASE_URL || 'http://localhost:3000'})`;
  return sendNotification(sendkey, title, content);
}

function sendMorningReminder2(sendkey) {
  const title = '⏰ 早晨打卡提醒（第二次）';
  const content = `## ☀️ 上午好！\n\n` +
    `现在是 **9:30**，请完成第二次早晨打卡！\n\n` +
    `> 💪 保持好节奏，工作效率更高！\n\n` +
    `[👉 点击打卡](${process.env.SERVER_BASE_URL || 'http://localhost:3000'})`;
  return sendNotification(sendkey, title, content);
}

function sendEveningReminder1(sendkey) {
  const title = '⏰ 晚间打卡提醒（第一次）';
  const content = `## 🌆 傍晚好！\n\n` +
    `现在是 **18:05**，请完成第一次晚间打卡！\n\n` +
    `> 🌇 结束一天的忙碌，总结今日收获！\n\n` +
    `[👉 点击打卡](${process.env.SERVER_BASE_URL || 'http://localhost:3000'})`;
  return sendNotification(sendkey, title, content);
}

function sendEveningReminder2(sendkey) {
  const title = '⏰ 晚间打卡提醒（第二次）';
  const content = `## 🌙 晚安时间！\n\n` +
    `现在是 **21:20**，请完成最后一次晚间打卡！\n\n` +
    `> 📝 复盘今日，规划明天，晚安好梦！\n\n` +
    `[👉 点击打卡](${process.env.SERVER_BASE_URL || 'http://localhost:3000'})`;
  return sendNotification(sendkey, title, content);
}

const SLOT_REMINDERS = {
  morning1: sendMorningReminder1,
  morning2: sendMorningReminder2,
  evening1: sendEveningReminder1,
  evening2: sendEveningReminder2
};

const SLOT_LABELS = {
  morning1: '早晨第一次',
  morning2: '早晨第二次',
  evening1: '晚间第一次',
  evening2: '晚间第二次'
};

function sendSlotReminder(sendkey, slot) {
  const fn = SLOT_REMINDERS[slot];
  if (fn) return fn(sendkey);
  return Promise.reject(new Error(`未知时段: ${slot}`));
}

module.exports = {
  sendNotification,
  sendMorningReminder1,
  sendMorningReminder2,
  sendEveningReminder1,
  sendEveningReminder2,
  sendSlotReminder,
  SLOT_LABELS
};
