const https = require('https');
const http = require('http');
const db = require('../config/db');

/**
 * 发送微信推送通知
 * @param {Object} user - 用户对象
 * @param {string} title - 消息标题
 * @param {string} content - 消息内容
 * @param {string} type - 提醒类型 morning/evening
 */
function sendWechatNotify(user, title, content, type = 'remind') {
  return new Promise((resolve, reject) => {
    if (!user.wechat_key || user.wechat_notify_type === 'none') {
      resolve({ success: false, message: '用户未配置微信推送' });
      return;
    }

    const notifyType = user.wechat_notify_type;
    let url, postData, headers = {};

    if (notifyType === 'serverchan') {
      // Server酱 (sct.ftqq.com)
      url = `https://sctapi.ftqq.com/${user.wechat_key}.send`;
      postData = JSON.stringify({ title, desp: content });
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
    } else if (notifyType === 'wxpusher') {
      // WxPusher
      url = 'https://wxpusher.zjiecode.com/api/send/message';
      postData = JSON.stringify({
        appToken: user.wechat_key.split(':')[0],
        content: `${title}\n${content}`,
        contentType: 1,
        uids: [user.wechat_key.split(':')[1]]
      });
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
    } else if (notifyType === 'webhook') {
      // 通用 Webhook
      url = user.wechat_key;
      postData = JSON.stringify({ title, content, type, username: user.username });
      headers = {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      };
    } else {
      resolve({ success: false, message: '未知的推送类型' });
      return;
    }

    const client = url.startsWith('https:') ? https : http;
    const reqUrl = new URL(url);

    const options = {
      hostname: reqUrl.hostname,
      port: reqUrl.port || (url.startsWith('https:') ? 443 : 80),
      path: reqUrl.pathname + reqUrl.search,
      method: 'POST',
      headers
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ success: result.code === 200 || result.errno === 0 || result.success === true, data: result });
        } catch {
          resolve({ success: res.statusCode === 200, data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.write(postData);
    req.end();
  });
}

/**
 * 记录通知日志
 */
function logNotify(userId, type, time, success, response) {
  const stmt = db.prepare(
    'INSERT INTO notify_logs (user_id, notify_type, notify_time, success, response) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(userId, type, time, success ? 1 : 0, JSON.stringify(response));
}

module.exports = { sendWechatNotify, logNotify };
