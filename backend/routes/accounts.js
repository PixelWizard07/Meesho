const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { getMockDashboardData } = require('../services/meesho');

const router = express.Router();

// List all accounts for the panel user
router.get('/', authenticateToken, (req, res) => {
  const accounts = db.prepare(`
    SELECT id, account_name, supplier_id, email, phone, store_name, status, last_synced, created_at
    FROM meesho_accounts
    WHERE panel_user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(accounts);
});

// Add a Meesho account
router.post('/', authenticateToken, (req, res) => {
  const { account_name, email, phone, api_token, store_name, supplier_id } = req.body;

  if (!account_name || !email) {
    return res.status(400).json({ error: 'Account name and email are required' });
  }

  try {
    const result = db.prepare(`
      INSERT INTO meesho_accounts (panel_user_id, account_name, supplier_id, email, phone, api_token, store_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `).run(req.user.id, account_name, supplier_id || null, email, phone || null, api_token || null, store_name || account_name);

    db.prepare(`
      INSERT INTO activity_logs (panel_user_id, account_id, action, details)
      VALUES (?, ?, 'account_added', ?)
    `).run(req.user.id, result.lastInsertRowid, `Added Meesho account: ${account_name}`);

    const account = db.prepare('SELECT id, account_name, supplier_id, email, phone, store_name, status, created_at FROM meesho_accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(account);
  } catch (err) {
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// Get aggregated dashboard across all accounts
router.get('/aggregate/dashboard', authenticateToken, (req, res) => {
  const accounts = db.prepare(`
    SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'
  `).all(req.user.id);

  if (accounts.length === 0) {
    return res.json({
      total_accounts: 0,
      total_orders: 0,
      pending_orders: 0,
      total_revenue: 0,
      active_products: 0,
      accounts: [],
    });
  }

  let totalOrders = 0, pendingOrders = 0, totalRevenue = 0, activeProducts = 0;
  const accountSummaries = [];

  for (const account of accounts) {
    const data = getMockDashboardData(account.id);
    totalOrders += data.stats.total_orders;
    pendingOrders += data.stats.pending_orders;
    totalRevenue += data.stats.total_revenue;
    activeProducts += data.stats.active_products;
    accountSummaries.push({
      id: account.id,
      account_name: account.account_name,
      store_name: account.store_name,
      status: account.status,
      last_synced: account.last_synced,
      stats: data.stats,
    });
  }

  res.json({
    total_accounts: accounts.length,
    total_orders: totalOrders,
    pending_orders: pendingOrders,
    total_revenue: totalRevenue,
    active_products: activeProducts,
    accounts: accountSummaries,
  });
});

// Get a single account
router.get('/:id', authenticateToken, (req, res) => {
  const account = db.prepare(`
    SELECT id, account_name, supplier_id, email, phone, store_name, status, last_synced, created_at
    FROM meesho_accounts
    WHERE id = ? AND panel_user_id = ?
  `).get(req.params.id, req.user.id);

  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
});

// Update account
router.put('/:id', authenticateToken, (req, res) => {
  const { account_name, phone, api_token, store_name, status } = req.body;

  const account = db.prepare('SELECT id FROM meesho_accounts WHERE id = ? AND panel_user_id = ?').get(req.params.id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  db.prepare(`
    UPDATE meesho_accounts
    SET account_name = COALESCE(?, account_name),
        phone = COALESCE(?, phone),
        api_token = COALESCE(?, api_token),
        store_name = COALESCE(?, store_name),
        status = COALESCE(?, status)
    WHERE id = ? AND panel_user_id = ?
  `).run(account_name, phone, api_token, store_name, status, req.params.id, req.user.id);

  res.json({ message: 'Account updated successfully' });
});

// Delete account
router.delete('/:id', authenticateToken, (req, res) => {
  const account = db.prepare('SELECT id, account_name FROM meesho_accounts WHERE id = ? AND panel_user_id = ?').get(req.params.id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  db.prepare('DELETE FROM meesho_accounts WHERE id = ?').run(req.params.id);

  db.prepare(`
    INSERT INTO activity_logs (panel_user_id, action, details)
    VALUES (?, 'account_deleted', ?)
  `).run(req.user.id, `Deleted account: ${account.account_name}`);

  res.json({ message: 'Account deleted successfully' });
});

// Get dashboard summary for a specific account
router.get('/:id/dashboard', authenticateToken, (req, res) => {
  const account = db.prepare(`
    SELECT * FROM meesho_accounts WHERE id = ? AND panel_user_id = ?
  `).get(req.params.id, req.user.id);

  if (!account) return res.status(404).json({ error: 'Account not found' });

  // Use mock data (replace with real API call if token is available)
  const data = getMockDashboardData(account.id);

  db.prepare('UPDATE meesho_accounts SET last_synced = CURRENT_TIMESTAMP WHERE id = ?').run(account.id);

  res.json({ account_id: account.id, account_name: account.account_name, ...data });
});

module.exports = router;
