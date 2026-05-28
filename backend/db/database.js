const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '../data/meesho_panel.db');
const fs = require('fs');

if (!fs.existsSync(path.join(__dirname, '../data'))) {
  fs.mkdirSync(path.join(__dirname, '../data'), { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS panel_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'admin',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  );

  CREATE TABLE IF NOT EXISTS meesho_accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_user_id INTEGER NOT NULL,
    account_name TEXT NOT NULL,
    supplier_id TEXT,
    email TEXT NOT NULL,
    phone TEXT,
    api_token TEXT,
    refresh_token TEXT,
    token_expiry DATETIME,
    store_name TEXT,
    status TEXT DEFAULT 'active',
    last_synced DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (panel_user_id) REFERENCES panel_users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cached_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    order_id TEXT NOT NULL,
    order_data TEXT NOT NULL,
    status TEXT,
    order_date DATETIME,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, order_id),
    FOREIGN KEY (account_id) REFERENCES meesho_accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS cached_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER NOT NULL,
    product_id TEXT NOT NULL,
    product_data TEXT NOT NULL,
    status TEXT,
    category TEXT,
    synced_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(account_id, product_id),
    FOREIGN KEY (account_id) REFERENCES meesho_accounts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_user_id INTEGER,
    account_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    panel_user_id INTEGER NOT NULL,
    account_id INTEGER,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (panel_user_id) REFERENCES panel_users(id) ON DELETE CASCADE
  );
`);

// Seed default admin user if none exists
const existing = db.prepare('SELECT id FROM panel_users WHERE username = ?').get('admin');
if (!existing) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO panel_users (username, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `).run('admin', 'admin@meeshopanel.com', hash, 'admin');
}

module.exports = db;
