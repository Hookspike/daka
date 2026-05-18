require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const authRoutes = require('./routes/auth');
const checkinRoutes = require('./routes/checkin');
const { startScheduler } = require('./utils/scheduler');
const { initPromise } = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3001;

// 确保数据目录存在
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// 中间件
app.use(cors());
app.use(express.json());

// 请求日志
app.use((req, res, next) => {
  const now = new Date().toISOString();
  console.log(`[${now}] ${req.method} ${req.path}`);
  next();
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/checkin', checkinRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ success: true, message: '服务运行正常', time: new Date().toISOString() });
});

// 静态文件（生产环境）
const clientBuildPath = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientBuildPath)) {
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: '服务器内部错误' });
});

// 等待数据库初始化完成后启动服务
(async () => {
  try {
    await initPromise;
    console.log('[DB] 数据库初始化完成');

    // 启动定时任务
    startScheduler();

    app.listen(PORT, () => {
      console.log(`=====================================`);
      console.log(`  打卡系统后端已启动`);
      console.log(`  端口: ${PORT}`);
      console.log(`  API地址: http://localhost:${PORT}/api`);
      console.log(`=====================================`);
    });
  } catch (err) {
    console.error('[DB] 数据库初始化失败:', err.message);
    process.exit(1);
  }
})();
