const Database = require('better-sqlite3');
const path     = require('path');
const bcrypt   = require('bcryptjs');
const fs       = require('fs');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'meesho_panel.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS panel_users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role          TEXT DEFAULT 'admin',
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login    DATETIME
  );

  CREATE TABLE IF NOT EXISTS meesho_accounts (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_user_id   INTEGER NOT NULL,
    account_name    TEXT NOT NULL,
    meesho_email    TEXT NOT NULL,
    store_name      TEXT,
    supplier_id     TEXT,
    phone           TEXT,

    -- AES-encrypted credentials
    enc_email       TEXT,
    enc_password    TEXT,

    -- Session
    session_token   TEXT,
    session_cookies TEXT,
    session_expiry  DATETIME,
    login_status    TEXT DEFAULT 'disconnected',

    status          TEXT DEFAULT 'active',
    last_synced     DATETIME,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (panel_user_id) REFERENCES panel_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cached_orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id  INTEGER NOT NULL,
    order_id    TEXT NOT NULL,
    order_data  TEXT NOT NULL,
    status      TEXT,
    order_date  DATETIME,
    synced_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, order_id),
    FOREIGN KEY (account_id) REFERENCES meesho_accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cached_returns (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id  INTEGER NOT NULL,
    return_id   TEXT NOT NULL,
    return_data TEXT NOT NULL,
    status      TEXT,
    synced_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, return_id),
    FOREIGN KEY (account_id) REFERENCES meesho_accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cached_products (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id   INTEGER NOT NULL,
    product_id   TEXT NOT NULL,
    product_data TEXT NOT NULL,
    status       TEXT,
    category     TEXT,
    synced_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, product_id),
    FOREIGN KEY (account_id) REFERENCES meesho_accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_user_id INTEGER,
    account_id    INTEGER,
    action        TEXT NOT NULL,
    details       TEXT,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_user_id INTEGER NOT NULL,
    account_id    INTEGER,
    type          TEXT NOT NULL,
    title         TEXT NOT NULL,
    message       TEXT NOT NULL,
    is_read       INTEGER DEFAULT 0,
    created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (panel_user_id) REFERENCES panel_users(id) ON DELETE CASCADE
  );
`);

// Seed default admin
if (!db.prepare('SELECT id FROM panel_users WHERE username = ?').get('admin')) {
  db.prepare(`INSERT INTO panel_users (username,email,password_hash,role) VALUES (?,?,?,?)`)
    .run('admin', 'admin@meeshopanel.com', bcrypt.hashSync('admin123', 10), 'admin');
}

module.exports = db;
