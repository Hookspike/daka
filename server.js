const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const db = require('./database');
const scheduler = require('./scheduler');
const notifier = require('./notifier');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

function parseJSON(body) {
  try {
    return JSON.parse(body);
  } catch {
    return null;
  }
}

function sendJSON(res, statusCode, data) {
  const json = JSON.stringify(data);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(json);
}

function sendError(res, statusCode, message) {
  sendJSON(res, statusCode, { error: message });
}

function collectBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => resolve(body));
  });
}

function serveStaticFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        sendError(res, 404, '文件未找到');
      } else {
        sendError(res, 500, '服务器错误');
      }
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });
    res.end(data);
  });
}

async function handleAPIRoute(req, res, parsedUrl) {
  const method = req.method;
  const pathname = parsedUrl.pathname;

  if (pathname === '/api/register' && method === 'POST') {
    const body = await collectBody(req);
    const data = parseJSON(body);
    if (!data || !data.sendkey) {
      return sendError(res, 400, '请提供 Server酱 SendKey');
    }
    if (typeof data.sendkey !== 'string' || data.sendkey.trim().length < 5) {
      return sendError(res, 400, 'SendKey 格式不正确');
    }
    const user = db.addUser(data.sendkey.trim());
    return sendJSON(res, 200, {
      success: true,
      message: '注册成功！',
      user: {
        id: user.id,
        sendkey: user.sendkey,
        settings: user.settings
      }
    });
  }

  if (pathname === '/api/checkin' && method === 'POST') {
    const body = await collectBody(req);
    const data = parseJSON(body);
    if (!data || !data.userId || !data.slot) {
      return sendError(res, 400, '请提供 userId 和 slot');
    }
    const validSlots = ['morning1', 'morning2', 'evening1', 'evening2'];
    if (!validSlots.includes(data.slot)) {
      return sendError(res, 400, `无效的时段，可选: ${validSlots.join(', ')}`);
    }
    const user = db.getUserById(data.userId);
    if (!user) {
      return sendError(res, 404, '用户未找到');
    }
    const record = db.recordCheckin(data.userId, data.slot);
    return sendJSON(res, 200, {
      success: true,
      message: `打卡成功！${notifier.SLOT_LABELS[data.slot]}`,
      record
    });
  }

  if (pathname === '/api/status' && method === 'GET') {
    const userId = parsedUrl.query.userId;
    if (!userId) {
      return sendError(res, 400, '请提供 userId');
    }
    const user = db.getUserById(userId);
    if (!user) {
      return sendError(res, 404, '用户未找到');
    }
    const todayCheckin = db.getTodayCheckin(userId);
    return sendJSON(res, 200, {
      user: {
        id: user.id,
        settings: user.settings
      },
      today: todayCheckin || {
        morning1: null,
        morning2: null,
        evening1: null,
        evening2: null
      }
    });
  }

  if (pathname === '/api/records' && method === 'GET') {
    const userId = parsedUrl.query.userId;
    const days = parseInt(parsedUrl.query.days) || 30;
    if (!userId) {
      return sendError(res, 400, '请提供 userId');
    }
    const records = db.getCheckinRecords(userId, days);
    return sendJSON(res, 200, { records });
  }

  if (pathname === '/api/stats' && method === 'GET') {
    const stats = db.getTodayStats();
    return sendJSON(res, 200, stats);
  }

  if (pathname === '/api/settings' && method === 'PUT') {
    const body = await collectBody(req);
    const data = parseJSON(body);
    if (!data || !data.userId || !data.settings) {
      return sendError(res, 400, '请提供 userId 和 settings');
    }
    const settings = db.updateUserSettings(data.userId, data.settings);
    if (!settings) {
      return sendError(res, 404, '用户未找到');
    }
    return sendJSON(res, 200, { success: true, settings });
  }

  sendError(res, 404, 'API 未找到');
}

function handleCORS(req, res) {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  });
  res.end();
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  if (req.method === 'OPTIONS') {
    return handleCORS(req, res);
  }

  if (pathname.startsWith('/api/')) {
    return handleAPIRoute(req, res, parsedUrl);
  }

  if (pathname === '/' || pathname === '') {
    return serveStaticFile(res, path.join(PUBLIC_DIR, 'index.html'));
  }

  const filePath = path.join(PUBLIC_DIR, pathname);
  if (filePath.startsWith(PUBLIC_DIR)) {
    return serveStaticFile(res, filePath);
  }

  serveStaticFile(res, path.join(PUBLIC_DIR, 'index.html'));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`=================================`);
  console.log(`  打卡提醒系统已启动`);
  console.log(`  服务地址: http://localhost:${PORT}`);
  console.log(`  提醒时间: 6:05, 9:30, 18:05, 21:20`);
  console.log(`  Server酱: sct.ftqq.com`);
  console.log(`=================================`);
});

scheduler.start();
