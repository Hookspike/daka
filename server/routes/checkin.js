const express = require('express');
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');
const { isInCheckinWindow, getTodayStr, getNowTimeStr } = require('../utils/scheduler');

const router = express.Router();

/**
 * 获取今日打卡状态
 */
router.get('/today', authMiddleware, (req, res) => {
  try {
    const today = getTodayStr();
    const record = db.prepare(
      'SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?'
    ).get(req.userId, today);

    if (!record) {
      return res.json({
        success: true,
        data: {
          morning: { checked: false, time: null, late: false },
          evening: { checked: false, time: null, late: false }
        }
      });
    }

    res.json({
      success: true,
      data: {
        morning: {
          checked: record.morning_status === 1,
          time: record.morning_time,
          late: record.morning_late === 1
        },
        evening: {
          checked: record.evening_status === 1,
          time: record.evening_time,
          late: record.evening_late === 1
        }
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 执行打卡
 */
router.post('/checkin', authMiddleware, (req, res) => {
  try {
    const { type } = req.body; // 'morning' | 'evening'
    if (!type || (type !== 'morning' && type !== 'evening')) {
      return res.status(400).json({ success: false, message: '打卡类型错误' });
    }

    if (!isInCheckinWindow(type)) {
      const timeRange = type === 'morning' ? '06:00 - 09:30' : '18:00 - 21:30';
      return res.status(403).json({
        success: false,
        message: `当前不在${type === 'morning' ? '早晨' : '晚间'}打卡时间段内（${timeRange}）`
      });
    }

    const today = getTodayStr();
    const nowTime = getNowTimeStr();
    const now = new Date();
    const hour = now.getHours();
    const min = now.getMinutes();

    let late = false;
    if (type === 'morning') {
      if (hour > 7 || (hour === 7 && min > 0)) late = true;
    } else {
      if (hour > 19 || (hour === 19 && min > 0)) late = true;
    }

    // 获取或创建今日记录
    let record = db.prepare(
      'SELECT * FROM checkins WHERE user_id = ? AND checkin_date = ?'
    ).get(req.userId, today);

    if (!record) {
      const insert = db.prepare(
        'INSERT INTO checkins (user_id, checkin_date) VALUES (?, ?)'
      );
      const result = insert.run(req.userId, today);
      record = { id: result.lastInsertRowid };
    }

    // 检查是否已打卡
    const alreadyKey = type === 'morning' ? 'morning_status' : 'evening_status';
    if (record[alreadyKey] === 1) {
      return res.status(409).json({
        success: false,
        message: `今日${type === 'morning' ? '早晨' : '晚间'}已打卡，无需重复`
      });
    }

    // 更新打卡状态
    const timeKey = type === 'morning' ? 'morning_time' : 'evening_time';
    const lateKey = type === 'morning' ? 'morning_late' : 'evening_late';
    const statusKey = type === 'morning' ? 'morning_status' : 'evening_status';

    db.prepare(
      `UPDATE checkins SET ${timeKey} = ?, ${lateKey} = ?, ${statusKey} = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    ).run(nowTime, late ? 1 : 0, record.id);

    res.json({
      success: true,
      message: `${type === 'morning' ? '早晨' : '晚间'}打卡成功！${late ? '（迟到）' : ''}`,
      data: { type, time: nowTime, late }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 获取打卡历史（最近30天）
 */
router.get('/history', authMiddleware, (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const records = db.prepare(
      `SELECT checkin_date, morning_time, evening_time, morning_status, evening_status, morning_late, evening_late
       FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC LIMIT ?`
    ).all(req.userId, days);

    res.json({ success: true, data: records });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 获取统计信息
 */
router.get('/stats', authMiddleware, (req, res) => {
  try {
    const totalDays = db.prepare(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND (morning_status = 1 OR evening_status = 1)'
    ).get(req.userId).count;

    const fullDays = db.prepare(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND morning_status = 1 AND evening_status = 1'
    ).get(req.userId).count;

    const morningCount = db.prepare(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND morning_status = 1'
    ).get(req.userId).count;

    const eveningCount = db.prepare(
      'SELECT COUNT(*) as count FROM checkins WHERE user_id = ? AND evening_status = 1'
    ).get(req.userId).count;

    const streakRows = db.prepare(
      'SELECT checkin_date, morning_status, evening_status FROM checkins WHERE user_id = ? ORDER BY checkin_date DESC'
    ).all(req.userId);

    // 计算连续打卡天数
    let streak = 0;
    let prevDate = null;
    for (const row of streakRows) {
      const date = new Date(row.checkin_date);
      if (row.morning_status === 1 && row.evening_status === 1) {
        if (!prevDate || (prevDate - date) / 86400000 === 1) {
          streak++;
          prevDate = date;
        } else {
          break;
        }
      } else {
        break;
      }
    }

    res.json({
      success: true,
      data: { totalDays, fullDays, morningCount, eveningCount, streak }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * 更新微信推送设置
 */
router.post('/settings', authMiddleware, (req, res) => {
  try {
    const { wechat_notify_type, wechat_key } = req.body;
    db.prepare(
      'UPDATE users SET wechat_notify_type = ?, wechat_key = ? WHERE id = ?'
    ).run(wechat_notify_type || 'none', wechat_key || null, req.userId);
    res.json({ success: true, message: '设置已更新' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
