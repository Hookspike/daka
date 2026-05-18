# 每日打卡系统

支持早晨 06:00-09:30 和晚间 18:00-21:30 两次打卡，可配置微信消息提醒。

## 技术栈

- **前端**：React + Vite + Tailwind CSS
- **后端**：Node.js + Express + better-sqlite3
- **定时任务**：node-cron（自动发送微信提醒）

## 功能

1. 用户注册 / 登录（JWT 认证）
2. 早晨打卡（06:00 - 09:30）
3. 晚间打卡（18:00 - 21:30）
4. 打卡历史与统计（连续天数、全天完成次数）
5. 微信推送提醒（支持 Server酱 / WxPusher / 自定义 Webhook）

## 快速开始

```bash
# 安装依赖
npm run install:all

# 开发模式（同时启动前后端）
npm run dev

# 生产构建
npm run build

# 启动后端（生产）
npm start
```

前端默认在 `http://localhost:5173`，后端 API 在 `http://localhost:3001`。

## 微信提醒配置

登录后进入「设置」页面，选择推送方式并填写对应密钥：

- **Server酱**：填入 SendKey（如 `SCTxxxxx`）
- **WxPusher**：填入 `appToken:UID` 格式
- **自定义 Webhook**：填入任意 HTTP POST 地址

系统将在每天 **6:00 / 9:00** 和 **18:00 / 21:00** 自动向未打卡用户发送提醒。

## 部署

构建前端后，Express 会自动托管 `client/dist` 静态文件，只需运行：

```bash
cd server && npm start
```

## 目录结构

```
daka/
├── client/          # React 前端
├── server/          # Express 后端
│   ├── config/      # 数据库配置
│   ├── routes/      # API 路由
│   ├── services/    # 微信推送服务
│   └── utils/       # 定时任务调度
├── data/            # SQLite 数据库（自动创建）
└── package.json
```
