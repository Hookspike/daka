const SLOT_CONFIG = [
  { key: 'morning1', label: '早晨打卡', time: '6:05', icon: '🌅' },
  { key: 'morning2', label: '上午打卡', time: '9:30', icon: '☀️' },
  { key: 'evening1', label: '傍晚打卡', time: '18:05', icon: '🌆' },
  { key: 'evening2', label: '晚间打卡', time: '21:20', icon: '🌙' }
];

function getToday() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function getAllRecords() {
  try {
    return JSON.parse(localStorage.getItem('daka_records') || '{}');
  } catch { return {}; }
}

function saveAllRecords(records) {
  localStorage.setItem('daka_records', JSON.stringify(records));
}

function getTodayRecord() {
  const records = getAllRecords();
  return records[getToday()] || {};
}

function setSlotDone(slotKey) {
  const records = getAllRecords();
  const today = getToday();
  if (!records[today]) records[today] = {};
  records[today][slotKey] = new Date().toISOString();
  saveAllRecords(records);
}

function getRecentDays(days = 14) {
  const records = getAllRecords();
  const result = [];
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    result.push({ date: key, slots: records[key] || {} });
  }
  return result;
}

function calcStreak() {
  const records = getAllRecords();
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const daySlots = records[key];
    if (daySlots && Object.keys(daySlots).length > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}

function showMessage(text, type = 'success') {
  const el = document.getElementById('message');
  el.textContent = text;
  el.className = `message ${type}`;
  el.style.display = 'block';
  setTimeout(() => { el.style.display = 'none'; }, 3000);
}

function renderSchedule() {
  const container = document.getElementById('slotGrid');
  container.innerHTML = SLOT_CONFIG.map(s => `
    <div class="schedule-item" style="text-align:center;padding:16px 10px;border:2px solid #e8e8e8;border-radius:14px;background:#fafafa;">
      <div style="font-size:28px;margin-bottom:6px;">${s.icon}</div>
      <div style="font-size:13px;font-weight:500;color:#666;">${s.label}</div>
      <div style="font-size:12px;color:#aaa;">${s.time}</div>
    </div>
  `).join('');
}

function renderManualSlots() {
  const container = document.getElementById('manualSlots');
  const todayRecord = getTodayRecord();

  container.innerHTML = SLOT_CONFIG.map(s => {
    const done = !!todayRecord[s.key];
    return `
      <div class="slot-btn ${done ? 'checked' : ''}" data-slot="${s.key}" ${done ? '' : 'style="cursor:pointer;"'}>
        <span class="icon">${s.icon}</span>
        <span class="label">${s.label}</span>
        <span class="time">${done ? '✅ 已完成' : s.time}</span>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.slot-btn:not(.checked)').forEach(btn => {
    btn.addEventListener('click', () => {
      const slot = btn.dataset.slot;
      setSlotDone(slot);
      showMessage(`✅ ${SLOT_CONFIG.find(s => s.key === slot).label} 打卡成功！`);
      renderManualSlots();
      renderRecords();
      updateStreak();
    });
  });
}

function renderRecords() {
  const container = document.getElementById('recordsList');
  const days = getRecentDays(14);

  if (days.every(d => Object.keys(d.slots).length === 0)) {
    container.innerHTML = '<div style="text-align:center;color:#999;padding:20px;font-size:13px;">📭 暂无打卡记录，点击上方按钮开始打卡吧</div>';
    return;
  }

  container.innerHTML = days.map(day => {
    const count = Object.keys(day.slots).length;
    const total = SLOT_CONFIG.length;
    const slotsHtml = SLOT_CONFIG.map(s =>
      `<span class="slot-dot ${day.slots[s.key] ? 'done' : ''}"></span>`
    ).join('');
    const isToday = day.date === getToday();
    return `
      <div class="record-item ${isToday ? 'today' : ''}" style="${isToday ? 'font-weight:600;' : ''}">
        <span class="date">${isToday ? '今日' : day.date.slice(5)}</span>
        <span class="slots">${slotsHtml}</span>
        <span style="font-size:11px;color:#999;">${count}/${total}</span>
      </div>
    `;
  }).join('');
}

function updateStreak() {
  const streak = calcStreak();
  const el = document.getElementById('weekStreak');
  const todayRecord = getTodayRecord();
  const todayCount = Object.keys(todayRecord).length;
  if (todayCount > 0 && streak === 1) {
    el.textContent = `今日已打卡 ${todayCount} 次`;
  } else {
    el.textContent = `连续 ${streak} 天`;
  }
  el.style.background = streak >= 7 ? '#43e97b' : streak >= 3 ? '#667eea' : '#999';
}

function renderDateTime() {
  const now = new Date();
  const opts = { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' };
  const dateEl = document.querySelector('header p');
  if (dateEl) {
    dateEl.textContent = `${now.toLocaleDateString('zh-CN', opts)} · 坚持打卡，养成好习惯`;
  }
}

function init() {
  renderDateTime();
  renderSchedule();
  renderManualSlots();
  renderRecords();
  updateStreak();

  setInterval(() => {
    renderManualSlots();
    updateStreak();
  }, 30000);
}

document.addEventListener('DOMContentLoaded', init);
