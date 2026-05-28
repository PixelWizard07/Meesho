const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { getMockDashboardData } = require('../services/meesho');

const router = express.Router();

// Get products across all or specific account
router.get('/all', authenticateToken, (req, res) => {
  const { account_id, category, status, page = 1, limit = 20, search } = req.query;

  let accountsQuery = "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'";
  const params = [req.user.id];

  if (account_id) {
    accountsQuery += ' AND id = ?';
    params.push(account_id);
  }

  const accounts = db.prepare(accountsQuery).all(...params);
  let allProducts = [];

  for (const account of accounts) {
    const data = getMockDashboardData(account.id);
    const products = data.products.map(p => ({
      ...p,
      account_id: account.id,
      account_name: account.account_name,
      store_name: account.store_name,
    }));
    allProducts.push(...products);
  }

  if (category) {
    allProducts = allProducts.filter(p => p.category.toLowerCase().includes(category.toLowerCase()));
  }
  if (status && status !== 'all') {
    allProducts = allProducts.filter(p => p.status === status);
  }
  if (search) {
    const q = search.toLowerCase();
    allProducts = allProducts.filter(p => p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }

  const total = allProducts.length;
  const start = (Number(page) - 1) * Number(limit);
  const paged = allProducts.slice(start, start + Number(limit));

  res.json({ products: paged, total, page: Number(page), limit: Number(limit) });
});

// Update product inventory
router.put('/:productId/inventory', authenticateToken, (req, res) => {
  const { account_id, quantity } = req.body;

  const account = db.prepare(
    'SELECT * FROM meesho_accounts WHERE id = ? AND panel_user_id = ?'
  ).get(account_id, req.user.id);

  if (!account) return res.status(404).json({ error: 'Account not found' });

  db.prepare(`
    INSERT INTO activity_logs (panel_user_id, account_id, action, details)
    VALUES (?, ?, 'inventory_updated', ?)
  `).run(req.user.id, account_id, JSON.stringify({ product_id: req.params.productId, quantity }));

  res.json({ message: `Inventory updated for product ${req.params.productId}` });
});

// Get product categories summary
router.get('/categories', authenticateToken, (req, res) => {
  const accounts = db.prepare(
    "SELECT * FROM meesho_accounts WHERE panel_user_id = ? AND status = 'active'"
  ).all(req.user.id);

  const categoryMap = {};
  for (const account of accounts) {
    const data = getMockDashboardData(account.id);
    data.products.forEach(p => {
      if (!categoryMap[p.category]) {
        categoryMap[p.category] = { count: 0, revenue: 0 };
      }
      categoryMap[p.category].count += 1;
      categoryMap[p.category].revenue += p.price * p.sales;
    });
  }

  const categories = Object.entries(categoryMap).map(([name, stats]) => ({ name, ...stats }));
  res.json(categories);
});

module.exports = router;
