const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { getMockDashboardData } = require('../services/meesho');
const { MeeshoLiveAPI } = require('../services/meeshoAuth');

const router = express.Router();

function formatStatus(raw) {
  if (!raw) return 'Pending';
  const map = {
    ORDER_PLACED: 'Pending', ACCEPTED: 'Accepted', DISPATCHED: 'Dispatched',
    DELIVERED: 'Delivered', CANCELLED: 'Cancelled', RETURNED: 'Cancelled',
    pending: 'Pending', accepted: 'Accepted', dispatched: 'Dispatched',
    delivered: 'Delivered', cancelled: 'Cancelled',
  };
  return map[raw] || raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function normalise(o, account) {
  return {
    order_id:      o.order_id     || o.id || String(o.sub_order_id || ''),
    product_name:  o.product_name || o.catalog_name || o.name || 'Product',
    customer_name: o.customer_name|| o.receiver_name || 'Customer',
    customer_city: o.customer_city|| o.city || '',
    amount:        Number(o.price || o.amount || o.order_amount || 0),
    status:        formatStatus(o.status || o.sub_status),
    order_date:    o.order_date   || o.created_at || new Date().toISOString(),
    quantity:      o.quantity     || 1,
    account_id:    account.id,
    account_name:  account.account_name,
    store_name:    account.store_name,
  };
}

async function fetchOrdersForAccount(account, params = {}) {
  if (account.session_token && account.login_status === 'connected') {
    const api = new MeeshoLiveAPI(account.session_token, account.session_cookies);
    const res = await api.getOrders(params);
    if (res.success) {
      const raw = res.data?.data || res.data?.orders || res.data || [];
      return { orders: raw.map(o => normalise(o, account)), live: true };
    }
    if (res.expired) {
      db.prepare(`UPDATE meesho_accounts SET login_status = 'expired' WHERE id = ?`).run(account.id);
    }
  }

  // Fallback: cached DB rows
  const cached = db.prepare(
    'SELECT order_data FROM cached_orders WHERE account_id = ? ORDER BY order_date DESC'
  ).all(account.id).map(r => JSON.parse(r.order_data));

  if (cached.length) {
    return { orders: cached.map(o => normalise(o, account)), live: false };
  }

  // Last resort: demo data
  const mock = getMockDashboardData(account.id);
  return { orders: mock.orders.map(o => ({ ...o, account_id: account.id, account_name: account.account_name, store_name: account.store_name })), live: false };
}

// GET /api/orders/all  – across all accounts (or filtered by account_id)
router.get('/all', authenticateToken, async (req, res) => {
  const { status, page = 1, limit = 20, account_id, search } = req.query;

  const query = account_id
    ? "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active' AND id = ?"
    : "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'";
  const args = account_id ? [req.user.id, account_id] : [req.user.id];
  const accounts = db.prepare(query).all(...args);

  let allOrders = [];
  for (const account of accounts) {
    const { orders } = await fetchOrdersForAccount(account);
    allOrders.push(...orders);
  }

  if (status && status !== 'all') {
    allOrders = allOrders.filter(o => o.status.toLowerCase() === status.toLowerCase());
  }
  if (search) {
    const q = search.toLowerCase();
    allOrders = allOrders.filter(o =>
      o.order_id.toLowerCase().includes(q) ||
      o.product_name.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q)
    );
  }

  allOrders.sort((a, b) => new Date(b.order_date) - new Date(a.order_date));

  const total = allOrders.length;
  const start = (Number(page) - 1) * Number(limit);
  res.json({ orders: allOrders.slice(start, start + Number(limit)), total, page: Number(page), limit: Number(limit) });
});

// GET /api/orders/account/:accountId
router.get('/account/:accountId', authenticateToken, async (req, res) => {
  const account = db.prepare(
    'SELECT * FROM meesho_accounts WHERE id = ? AND panel_user_id = ?'
  ).get(req.params.accountId, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  const { status, page = 1, limit = 20 } = req.query;
  const { orders, live } = await fetchOrdersForAccount(account);

  let filtered = orders;
  if (status && status !== 'all') filtered = filtered.filter(o => o.status.toLowerCase() === status.toLowerCase());

  const total = filtered.length;
  const start = (Number(page) - 1) * Number(limit);
  res.json({ orders: filtered.slice(start, start + Number(limit)), total, page: Number(page), limit: Number(limit), live });
});

// POST /api/orders/:orderId/status  – accept / cancel / dispatch
router.post('/:orderId/status', authenticateToken, async (req, res) => {
  const { account_id, status } = req.body;
  if (!account_id || !status) return res.status(400).json({ error: 'account_id and status required' });

  const account = db.prepare(
    'SELECT * FROM meesho_accounts WHERE id = ? AND panel_user_id = ?'
  ).get(account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  let message = `Order ${req.params.orderId} marked as ${status}`;
  let live = false;

  if (account.session_token && account.login_status === 'connected') {
    const api = new MeeshoLiveAPI(account.session_token, account.session_cookies);
    const result = await api.updateOrderStatus(req.params.orderId, status);
    if (result.success) {
      live = true;
    } else {
      message += ' (local only – live update failed)';
    }
  }

  // Update cached status regardless
  db.prepare(`
    UPDATE cached_orders
    SET order_data = json_set(order_data, '$.status', ?)
    WHERE account_id = ? AND order_id = ?
  `).run(status, account_id, req.params.orderId);

  db.prepare(`
    INSERT INTO activity_logs (panel_user_id, account_id, action, details)
    VALUES (?, ?, 'order_status_updated', ?)
  `).run(req.user.id, account_id, JSON.stringify({ order_id: req.params.orderId, status }));

  res.json({ message, live });
});

// GET /api/orders/stats
router.get('/stats', authenticateToken, async (req, res) => {
  const accounts = db.prepare(
    "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'"
  ).all(req.user.id);

  const stats = [];
  for (const account of accounts) {
    const { orders } = await fetchOrdersForAccount(account);
    const counts = orders.reduce((acc, o) => {
      acc[o.status] = (acc[o.status] || 0) + 1;
      return acc;
    }, {});
    stats.push({ account_id: account.id, account_name: account.account_name, store_name: account.store_name, status_counts: counts, total: orders.length });
  }
  res.json(stats);
});

module.exports = router;
