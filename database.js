const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const CHECKINS_FILE = path.join(DATA_DIR, 'checkins.json');

function init() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
  if (!fs.existsSync(CHECKINS_FILE)) {
    fs.writeFileSync(CHECKINS_FILE, JSON.stringify([], null, 2));
  }
}

function readJSON(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function getUsers() {
  return readJSON(USERS_FILE);
}

function saveUsers(users) {
  writeJSON(USERS_FILE, users);
}

function getCheckins() {
  return readJSON(CHECKINS_FILE);
}

function saveCheckins(checkins) {
  writeJSON(CHECKINS_FILE, checkins);
}

function addUser(sendkey) {
  const users = getUsers();
  const existing = users.find(u => u.sendkey === sendkey);
  if (existing) {
    return existing;
  }
  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    sendkey,
    created_at: new Date().toISOString(),
    settings: {
      morning1_enabled: true,
      morning2_enabled: true,
      evening1_enabled: true,
      evening2_enabled: true
    }
  };
  users.push(user);
  saveUsers(users);
  return user;
}

function getUserById(userId) {
  const users = getUsers();
  return users.find(u => u.id === userId) || null;
}

function getUserBySendkey(sendkey) {
  const users = getUsers();
  return users.find(u => u.sendkey === sendkey) || null;
}

function getTodayStr() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function getTodayCheckin(userId) {
  const checkins = getCheckins();
  const today = getTodayStr();
  return checkins.find(c => c.userId === userId && c.date === today) || null;
}

function getCheckinRecords(userId, days = 30) {
  const checkins = getCheckins();
  return checkins
    .filter(c => c.userId === userId)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, days);
}

function recordCheckin(userId, slot) {
  const checkins = getCheckins();
  const today = getTodayStr();
  let record = checkins.find(c => c.userId === userId && c.date === today);

  if (!record) {
    record = {
      userId,
      date: today,
      morning1: null,
      morning2: null,
      evening1: null,
      evening2: null,
      created_at: new Date().toISOString()
    };
    checkins.push(record);
  }

  record[slot] = new Date().toISOString();
  saveCheckins(checkins);
  return record;
}

function getUserSettings(userId) {
  const user = getUserById(userId);
  return user ? user.settings : null;
}

function updateUserSettings(userId, newSettings) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx === -1) return null;
  users[idx].settings = { ...users[idx].settings, ...newSettings };
  saveUsers(users);
  return users[idx].settings;
}

function getAllUsers() {
  return getUsers();
}

function getTodayStats() {
  const checkins = getCheckins();
  const today = getTodayStr();
  const todayRecords = checkins.filter(c => c.date === today);
  const total = getUsers().length;
  const morning1 = todayRecords.filter(c => c.morning1 !== null).length;
  const morning2 = todayRecords.filter(c => c.morning2 !== null).length;
  const evening1 = todayRecords.filter(c => c.evening1 !== null).length;
  const evening2 = todayRecords.filter(c => c.evening2 !== null).length;

  return { total, morning1, morning2, evening1, evening2 };
}

init();

module.exports = {
  addUser,
  getUserById,
  getUserBySendkey,
  getTodayCheckin,
  getCheckinRecords,
  recordCheckin,
  getUserSettings,
  updateUserSettings,
  getAllUsers,
  getTodayStats,
  getTodayStr
};
