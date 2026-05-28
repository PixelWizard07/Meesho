const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { getMockDashboardData } = require('../services/meesho');
const { MeeshoLiveAPI } = require('../services/meeshoAuth');

const router = express.Router();

function normalise(p, account) {
  return {
    product_id:   p.product_id  || p.id || String(p.catalog_id || ''),
    name:         p.name        || p.product_name || p.catalog_name || 'Product',
    category:     p.category    || p.category_name || 'General',
    price:        Number(p.price|| p.mrp || 0),
    inventory:    Number(p.inventory || p.quantity || p.stock_count || 0),
    sales:        Number(p.sales|| p.total_sold || 0),
    rating:       Number(p.rating|| p.avg_rating || 0).toFixed(1),
    status:       p.is_active === false ? 'inactive' : 'active',
    account_id:   account.id,
    account_name: account.account_name,
    store_name:   account.store_name,
  };
}

async function fetchProductsForAccount(account) {
  if (account.session_token && account.login_status === 'connected') {
    const api = new MeeshoLiveAPI(account.session_token, account.session_cookies);
    const res = await api.getProducts({ limit: 100 });
    if (res.success) {
      const raw = res.data?.data || res.data?.products || res.data || [];
      return { products: raw.map(p => normalise(p, account)), live: true };
    }
    if (res.expired) {
      db.prepare(`UPDATE meesho_accounts SET login_status = 'expired' WHERE id = ?`).run(account.id);
    }
  }

  const cached = db.prepare(
    'SELECT product_data FROM cached_products WHERE account_id = ?'
  ).all(account.id).map(r => JSON.parse(r.product_data));

  if (cached.length) return { products: cached.map(p => normalise(p, account)), live: false };

  const mock = getMockDashboardData(account.id);
  return { products: mock.products.map(p => ({ ...p, account_id: account.id, account_name: account.account_name, store_name: account.store_name })), live: false };
}

// GET /api/products/all
router.get('/all', authenticateToken, async (req, res) => {
  const { account_id, category, status, page = 1, limit = 20, search } = req.query;

  const query = account_id
    ? "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active' AND id = ?"
    : "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'";
  const args = account_id ? [req.user.id, account_id] : [req.user.id];
  const accounts = db.prepare(query).all(...args);

  let all = [];
  for (const account of accounts) {
    const { products } = await fetchProductsForAccount(account);
    all.push(...products);
  }

  if (category) all = all.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  if (status && status !== 'all') all = all.filter(p => p.status === status);
  if (search) {
    const q = search.toLowerCase();
    all = all.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  const total = all.length;
  const start = (Number(page) - 1) * Number(limit);
  res.json({ products: all.slice(start, start + Number(limit)), total, page: Number(page), limit: Number(limit) });
});

// PUT /api/products/:productId/inventory
router.put('/:productId/inventory', authenticateToken, async (req, res) => {
  const { account_id, quantity } = req.body;
  if (!account_id || quantity === undefined) return res.status(400).json({ error: 'account_id and quantity required' });

  const account = db.prepare(
    'SELECT * FROM meesho_accounts WHERE id = ? AND panel_user_id = ?'
  ).get(account_id, req.user.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });

  let live = false;
  if (account.session_token && account.login_status === 'connected') {
    const api = new MeeshoLiveAPI(account.session_token, account.session_cookies);
    const result = await api.updateInventory(req.params.productId, quantity);
    if (result.success) live = true;
  }

  // Update cached inventory
  db.prepare(`
    UPDATE cached_products
    SET product_data = json_set(product_data, '$.inventory', ?)
    WHERE account_id = ? AND product_id = ?
  `).run(quantity, account_id, req.params.productId);

  db.prepare(`
    INSERT INTO activity_logs (panel_user_id, account_id, action, details)
    VALUES (?, ?, 'inventory_updated', ?)
  `).run(req.user.id, account_id, JSON.stringify({ product_id: req.params.productId, quantity }));

  res.json({ message: `Inventory updated to ${quantity}`, live });
});

// GET /api/products/categories
router.get('/categories', authenticateToken, async (req, res) => {
  const accounts = db.prepare(
    "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'"
  ).all(req.user.id);

  const map = {};
  for (const account of accounts) {
    const { products } = await fetchProductsForAccount(account);
    products.forEach(p => {
      if (!map[p.category]) map[p.category] = { count: 0, revenue: 0 };
      map[p.category].count   += 1;
      map[p.category].revenue += p.price * p.sales;
    });
  }

  res.json(Object.entries(map).map(([name, s]) => ({ name, ...s })));
});

module.exports = router;
