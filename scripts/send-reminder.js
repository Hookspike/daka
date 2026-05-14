const https = require('https');

const SENDKEY = process.env.SENDKEY;
const SLOT_INPUT = (process.env.SLOT || '').trim().toLowerCase();

const SLOT_TIMES = [
  { slot: 'morning1', hour: 6, min: 5, label: '🌅 早晨打卡 (6:05)', title: '☀️ 早安！清晨打卡提醒' },
  { slot: 'morning2', hour: 9, min: 30, label: '☀️ 上午打卡 (9:30)', title: '💪 上午好！第二次打卡提醒' },
  { slot: 'evening1', hour: 18, min: 5, label: '🌆 傍晚打卡 (18:05)', title: '🌇 傍晚好！晚间打卡提醒' },
  { slot: 'evening2', hour: 21, min: 20, label: '🌙 晚间打卡 (21:20)', title: '🌙 晚安！今日最后一次打卡提醒' }
];

function getBeijingNow() {
  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + 8 * 3600000);
}

function detectSlot() {
  if (SLOT_INPUT) {
    const found = SLOT_TIMES.find(s => s.slot === SLOT_INPUT);
    if (found) return found;
    console.warn(`未知的 slot: ${SLOT_INPUT}，将自动检测`);
  }

  const now = getBeijingNow();
  const h = now.getHours();
  const m = now.getMinutes();

  let closestSlot = null;
  let minDiff = Infinity;
  
  for (const st of SLOT_TIMES) {
    const targetMinutes = st.hour * 60 + st.min;
    const currentMinutes = h * 60 + m;
    let diff = Math.abs(currentMinutes - targetMinutes);
    
    if (diff < minDiff) {
      minDiff = diff;
      closestSlot = st;
    }
  }

  console.log(`当前北京时间: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`);
  console.log(`📅 最近的提醒时段: ${closestSlot.label} (差值: ${minDiff}分钟)`);
  
  return closestSlot;
}

function buildContent(slotInfo) {
  const tips = {
    morning1: '🌅 一日之计在于晨，新的一天开始啦！\n\n早起打卡，开启元气满满的一天！',
    morning2: '☀️ 上午时光正好，保持好状态！\n\n别忘了喝水、活动一下筋骨哦～',
    evening1: '🌆 忙碌的一天即将结束，\n\n回顾一下今天的收获吧！',
    evening2: '🌙 夜深了，复盘今日点滴，\n\n规划明日计划，晚安好梦！'
  };

  return `## ${slotInfo.label}\n\n` +
    `${tips[slotInfo.slot] || '坚持打卡，养成好习惯！'}\n\n` +
    `> 💡 每天提醒时间：6:05 → 9:30 → 18:05 → 21:20\n\n` +
    `[📝 查看打卡详情](https://${process.env.GITHUB_REPOSITORY_OWNER || 'your-username'}.github.io/${process.env.GITHUB_REPOSITORY && process.env.GITHUB_REPOSITORY.split('/')[1] || 'daka'}/)`;
}

function sendNotification(sendkey, title, content) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ title, content });
    const options = {
      hostname: 'sct.ftqq.com',
      path: `/${sendkey}.send`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 15000
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
            reject(new Error(result.message || body));
          }
        } catch {
          reject(new Error(`解析响应失败: ${body.slice(0, 200)}`));
        }
      });
    });

    req.on('error', e => reject(new Error(e.message)));
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')); });
    req.write(postData);
    req.end();
  });
}

async function main() {
  if (!SENDKEY) {
    console.error('❌ 错误: 未设置 SENDKEY');
    console.error('请在 GitHub 仓库 Settings → Secrets and variables → Actions 中添加 SENDKEY');
    process.exit(1);
  }

  console.log('🔔 打卡提醒系统 (GitHub Actions)');
  console.log(`⏰ 当前时间: ${getBeijingNow().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`);

  const slotInfo = detectSlot();
  if (!slotInfo) {
    console.log('✅ 当前不在提醒时段，无需发送');
    return;
  }

  console.log(`📨 准备发送: ${slotInfo.label}`);
  const content = buildContent(slotInfo);

  try {
    const result = await sendNotification(SENDKEY, slotInfo.title, content);
    console.log(`✅ 微信提醒发送成功! dataId=${result.data || 'N/A'}`);
  } catch (err) {
    console.error(`❌ 发送失败: ${err.message}`);
    process.exit(1);
  }
}

main();
