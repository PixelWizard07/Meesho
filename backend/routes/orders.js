const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { getMockDashboardData } = require('../services/meesho');

const router = express.Router();

function getAccountOrError(accountId, userId, res) {
  const account = db.prepare(
    'SELECT * FROM meesho_accounts WHERE id = ? AND panel_user_id = ?'
  ).get(accountId, userId);
  if (!account) { res.status(404).json({ error: 'Account not found' }); return null; }
  return account;
}

// Get orders for a specific account
router.get('/account/:accountId', authenticateToken, (req, res) => {
  const account = getAccountOrError(req.params.accountId, req.user.id, res);
  if (!account) return;

  const { status, page = 1, limit = 20 } = req.query;
  const data = getMockDashboardData(account.id);

  let orders = data.orders;
  if (status && status !== 'all') {
    orders = orders.filter(o => o.status.toLowerCase() === status.toLowerCase());
  }

  const total = orders.length;
  const start = (page - 1) * limit;
  const paged = orders.slice(start, start + Number(limit));

  res.json({ orders: paged, total, page: Number(page), limit: Number(limit) });
});

// Get all orders across all accounts
router.get('/all', authenticateToken, (req, res) => {
  const { status, page = 1, limit = 20, account_id } = req.query;

  let accountsQuery = "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'";
  const params = [req.user.id];

  if (account_id) {
    accountsQuery += ' AND id = ?';
    params.push(account_id);
  }

  const accounts = db.prepare(accountsQuery).all(...params);
  let allOrders = [];

  for (const account of accounts) {
    const data = getMockDashboardData(account.id);
    const orders = data.orders.map(o => ({
      ...o,
      account_id: account.id,
      account_name: account.account_name,
      store_name: account.store_name,
    }));
    allOrders.push(...orders);
  }

  if (status && status !== 'all') {
    allOrders = allOrders.filter(o => o.status.toLowerCase() === status.toLowerCase());
  }

  allOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

  const total = allOrders.length;
  const start = (Number(page) - 1) * Number(limit);
  const paged = allOrders.slice(start, start + Number(limit));

  res.json({ orders: paged, total, page: Number(page), limit: Number(limit) });
});

// Update order status
router.post('/:orderId/status', authenticateToken, (req, res) => {
  const { account_id, status, reason } = req.body;

  const account = getAccountOrError(account_id, req.user.id, res);
  if (!account) return;

  db.prepare(`
    INSERT INTO activity_logs (panel_user_id, account_id, action, details)
    VALUES (?, ?, 'order_status_updated', ?)
  `).run(req.user.id, account_id, JSON.stringify({ order_id: req.params.orderId, status, reason }));

  res.json({ message: `Order ${req.params.orderId} status updated to ${status}` });
});

// Get order stats by account
router.get('/stats', authenticateToken, (req, res) => {
  const accounts = db.prepare(
    "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'"
  ).all(req.user.id);

  const stats = accounts.map(account => {
    const data = getMockDashboardData(account.id);
    const statusCounts = data.orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});
    return {
      account_id: account.id,
      account_name: account.account_name,
      store_name: account.store_name,
      status_counts: statusCounts,
      total: data.orders.length,
    };
  });

  res.json(stats);
});

module.exports = router;
