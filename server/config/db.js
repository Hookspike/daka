const initSqlJs = require('sql.js/dist/sql-wasm.js').default;
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', '..', 'data', 'daka.db');

let SQL, db;
const initPromise = (async () => {
  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const filebuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(filebuffer);
  } else {
    db = new SQL.Database();
  }

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nickname TEXT,
      wechat_notify_type TEXT DEFAULT 'none',
      wechat_key TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL,
      morning_time TEXT,
      evening_time TEXT,
      morning_status INTEGER DEFAULT 0,
      evening_status INTEGER DEFAULT 0,
      morning_late INTEGER DEFAULT 0,
      evening_late INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      UNIQUE(user_id, checkin_date)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS notify_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      notify_type TEXT NOT NULL,
      notify_time TEXT NOT NULL,
      success INTEGER DEFAULT 0,
      response TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDb();
})();

function saveDb() {
  if (!db) return;
  const data = db.export();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  fs.writeFileSync(dbPath, Buffer.from(data));
}

function getLastInsertRowid() {
  const stmt = db.prepare('SELECT last_insert_rowid() as id');
  stmt.step();
  const result = stmt.getAsObject();
  stmt.free();
  return Number(result.id);
}

function prepare(sql) {
  if (!db) throw new Error('Database not initialized yet');
  const stmt = db.prepare(sql);

  return {
    run(...params) {
      stmt.run(params);
      const lastId = getLastInsertRowid();
      saveDb();
      return { lastInsertRowid: lastId, changes: 1 };
    },
    get(...params) {
      stmt.bind(params);
      const hasRow = stmt.step();
      if (!hasRow) {
        stmt.free();
        return undefined;
      }
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    },
    all(...params) {
      stmt.bind(params);
      const rows = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject());
      }
      stmt.free();
      return rows;
    }
  };
}

function pragma() {
  // no-op for sql.js
}

module.exports = { initPromise, prepare, pragma };
