const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'database.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS ordenes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    preference_id TEXT,
    payment_id TEXT,
    estado TEXT DEFAULT 'pending',
    comprador_nombre TEXT,
    comprador_email TEXT,
    comprador_tel TEXT,
    items TEXT,
    total REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    brand TEXT NOT NULL,
    price REAL NOT NULL DEFAULT 0,
    image TEXT,
    description TEXT,
    featured INTEGER DEFAULT 0,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS admin_tokens (
    token TEXT PRIMARY KEY,
    expires_at INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS login_attempts (
    ip TEXT PRIMARY KEY,
    count INTEGER DEFAULT 0,
    blocked_until INTEGER DEFAULT 0,
    last_attempt INTEGER DEFAULT 0
  );
`);

module.exports = db;
