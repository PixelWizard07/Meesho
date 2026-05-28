const express = require('express');
const db = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { getMockDashboardData } = require('../services/meesho');
const { requestOTP, verifyOTP, loginWithPassword, MeeshoLiveAPI } = require('../services/meeshoAuth');
const { encrypt, decrypt } = require('../services/encrypt');

const router = express.Router();

// ── helpers ──────────────────────────────────────────────────────────────────

function safeAccount(row) {
  // Never expose encrypted credentials or raw session tokens to the client
  const { enc_phone, enc_password, session_token, session_cookies, ...safe } = row;
  safe.has_credentials = !!row.enc_phone;
  safe.has_session     = !!row.session_token;
  return safe;
}

function requireAccount(id, userId, res) {
  const a = db.prepare(
    'SELECT * FROM meesho_accounts WHERE id = ? AND panel_user_id = ?'
  ).get(id, userId);
  if (!a) { res.status(404).json({ error: 'Account not found' }); return null; }
  return a;
}

function getLiveAPI(account) {
  if (!account.session_token) return null;
  return new MeeshoLiveAPI(account.session_token, account.session_cookies);
}

// ── List all accounts ─────────────────────────────────────────────────────────
router.get('/', authenticateToken, (req, res) => {
  const rows = db.prepare(`
    SELECT * FROM meesho_accounts
    WHERE panel_user_id = ?
    ORDER BY created_at DESC
  `).all(req.user.id);
  res.json(rows.map(safeAccount));
});

// ── Add account (store credentials, do NOT connect yet) ───────────────────────
router.post('/', authenticateToken, (req, res) => {
  const { account_name, phone, password, store_name } = req.body;

  if (!account_name || !phone) {
    return res.status(400).json({ error: 'Account name and phone are required' });
  }

  const encPhone    = encrypt(phone.replace(/\D/g, ''));
  const encPassword = password ? encrypt(password) : null;

  try {
    const result = db.prepare(`
      INSERT INTO meesho_accounts
        (panel_user_id, account_name, phone, store_name, enc_phone, enc_password, login_status, status)
      VALUES (?, ?, ?, ?, ?, ?, 'disconnected', 'active')
    `).run(req.user.id, account_name, phone, store_name || account_name, encPhone, encPassword);

    db.prepare(`
      INSERT INTO activity_logs (panel_user_id, account_id, action, details)
      VALUES (?, ?, 'account_added', ?)
    `).run(req.user.id, result.lastInsertRowid, `Added account: ${account_name}`);

    const account = db.prepare('SELECT * FROM meesho_accounts WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(safeAccount(account));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

// ── Update account details ────────────────────────────────────────────────────
router.put('/:id', authenticateToken, (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;

  const { account_name, phone, password, store_name, status } = req.body;
  const encPhone    = phone    ? encrypt(phone.replace(/\D/g, '')) : account.enc_phone;
  const encPassword = password ? encrypt(password) : account.enc_password;

  db.prepare(`
    UPDATE meesho_accounts
    SET account_name = COALESCE(?, account_name),
        phone        = COALESCE(?, phone),
        store_name   = COALESCE(?, store_name),
        status       = COALESCE(?, status),
        enc_phone    = ?,
        enc_password = ?
    WHERE id = ? AND panel_user_id = ?
  `).run(account_name, phone, store_name, status, encPhone, encPassword, req.params.id, req.user.id);

  res.json({ message: 'Account updated' });
});

// ── Delete account ────────────────────────────────────────────────────────────
router.delete('/:id', authenticateToken, (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;

  db.prepare('DELETE FROM meesho_accounts WHERE id = ?').run(req.params.id);
  db.prepare(`
    INSERT INTO activity_logs (panel_user_id, action, details)
    VALUES (?, 'account_deleted', ?)
  `).run(req.user.id, `Deleted account: ${account.account_name}`);

  res.json({ message: 'Account deleted' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// MEESHO LOGIN FLOW
// ═══════════════════════════════════════════════════════════════════════════════

// Step 1: Send OTP to the stored phone number
router.post('/:id/send-otp', authenticateToken, async (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;

  const phone = decrypt(account.enc_phone);
  if (!phone) return res.status(400).json({ error: 'No phone number stored for this account' });

  const result = await requestOTP(phone);

  if (result.success) {
    db.prepare(`
      UPDATE meesho_accounts SET login_status = 'otp_pending' WHERE id = ?
    `).run(account.id);
    res.json({ message: `OTP sent to ${phone.slice(0, 4)}****${phone.slice(-3)}`, phone_hint: `${phone.slice(0, 4)}****${phone.slice(-3)}` });
  } else {
    res.status(502).json({ error: result.message || 'Failed to send OTP' });
  }
});

// Step 2a: Verify OTP  →  account connected
router.post('/:id/verify-otp', authenticateToken, async (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;

  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'OTP is required' });

  const phone = decrypt(account.enc_phone);
  const result = await verifyOTP(phone, otp);

  if (result.success) {
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    db.prepare(`
      UPDATE meesho_accounts
      SET session_token   = ?,
          session_cookies = ?,
          session_expiry  = ?,
          login_status    = 'connected',
          supplier_id     = COALESCE(?, supplier_id),
          store_name      = COALESCE(?, store_name),
          last_synced     = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(result.token, result.cookieString, expiry, result.supplierId, result.storeName, account.id);

    db.prepare(`
      INSERT INTO activity_logs (panel_user_id, account_id, action, details)
      VALUES (?, ?, 'meesho_login', 'Connected via OTP')
    `).run(req.user.id, account.id);

    res.json({ message: 'Account connected successfully', store_name: result.storeName });
  } else {
    res.status(401).json({ error: result.message || 'OTP verification failed' });
  }
});

// Step 2b: Login with password (alternative to OTP)
router.post('/:id/login-password', authenticateToken, async (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;

  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const result = await loginWithPassword(email, password);

  if (result.success) {
    const expiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    db.prepare(`
      UPDATE meesho_accounts
      SET session_token   = ?,
          session_cookies = ?,
          session_expiry  = ?,
          login_status    = 'connected',
          email           = COALESCE(email, ?),
          supplier_id     = COALESCE(?, supplier_id),
          store_name      = COALESCE(?, store_name),
          last_synced     = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(result.token, result.cookieString, expiry, email, result.supplierId, result.storeName, account.id);

    db.prepare(`
      INSERT INTO activity_logs (panel_user_id, account_id, action, details)
      VALUES (?, ?, 'meesho_login', 'Connected via password')
    `).run(req.user.id, account.id);

    res.json({ message: 'Account connected', store_name: result.storeName });
  } else {
    res.status(401).json({ error: result.message || 'Login failed' });
  }
});

// Disconnect / logout from Meesho
router.post('/:id/disconnect', authenticateToken, (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;

  db.prepare(`
    UPDATE meesho_accounts
    SET session_token = NULL, session_cookies = NULL, session_expiry = NULL,
        login_status = 'disconnected'
    WHERE id = ?
  `).run(account.id);

  res.json({ message: 'Account disconnected' });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD DATA — aggregate MUST be before /:id routes
// ═══════════════════════════════════════════════════════════════════════════════

// ── Aggregate across all connected accounts ───────────────────────────────────
router.get('/aggregate/dashboard', authenticateToken, async (req, res) => {
  const accounts = db.prepare(`
    SELECT * FROM meesho_accounts
    WHERE panel_user_id = ? AND status = 'active'
  `).all(req.user.id);

  if (accounts.length === 0) {
    return res.json({ total_accounts: 0, total_orders: 0, pending_orders: 0, total_revenue: 0, active_products: 0, accounts: [] });
  }

  let totalOrders = 0, pendingOrders = 0, totalRevenue = 0, activeProducts = 0;
  const summaries = [];

  for (const account of accounts) {
    let stats;
    if (account.session_token && account.login_status === 'connected') {
      const api = getLiveAPI(account);
      const [oRes, pRes] = await Promise.all([api.getOrders({ limit: 100 }), api.getProducts({ limit: 100 })]);
      if (oRes.success) {
        const orders   = oRes.data?.data   || oRes.data?.orders   || [];
        const products = pRes.success ? (pRes.data?.data || pRes.data?.products || []) : [];
        stats = {
          total_orders:    orders.length,
          pending_orders:  orders.filter(o => o.status === 'pending').length,
          total_revenue:   orders.reduce((s, o) => s + (o.price || o.amount || 0), 0),
          active_products: products.filter(p => p.is_active !== false).length,
        };
      }
    }

    if (!stats) {
      const mock = getMockDashboardData(account.id);
      stats = mock.stats;
    }

    totalOrders    += stats.total_orders;
    pendingOrders  += stats.pending_orders;
    totalRevenue   += stats.total_revenue;
    activeProducts += stats.active_products;

    summaries.push({
      id:           account.id,
      account_name: account.account_name,
      store_name:   account.store_name,
      status:       account.status,
      login_status: account.login_status,
      last_synced:  account.last_synced,
      stats,
    });
  }

  res.json({
    total_accounts: accounts.length,
    total_orders:    totalOrders,
    pending_orders:  pendingOrders,
    total_revenue:   totalRevenue,
    active_products: activeProducts,
    accounts:        summaries,
  });
});

router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;

  let data;
  let isLive = false;

  if (account.session_token && account.login_status === 'connected') {
    const api = getLiveAPI(account);
    const [ordersRes, productsRes] = await Promise.all([
      api.getOrders({ page: 1, limit: 50 }),
      api.getProducts({ page: 1, limit: 50 }),
    ]);

    if (ordersRes.success && productsRes.success) {
      isLive = true;
      const orders   = ordersRes.data?.data   || ordersRes.data?.orders   || [];
      const products = productsRes.data?.data  || productsRes.data?.products || [];

      data = {
        stats: {
          total_orders:    orders.length,
          pending_orders:  orders.filter(o => o.status === 'pending' || o.sub_status === 'ORDER_PLACED').length,
          total_revenue:   orders.reduce((s, o) => s + (o.price || o.amount || 0), 0),
          active_products: products.filter(p => p.is_active !== false).length,
        },
        orders:        normaliseOrders(orders, account),
        products:      normaliseProducts(products, account),
        revenue_chart: buildRevenueChart(orders),
      };

      // Cache in DB
      cacheOrders(account.id, orders);
      cacheProducts(account.id, products);
    } else if (ordersRes.expired) {
      // Session expired → mark it
      db.prepare(`UPDATE meesho_accounts SET login_status = 'expired' WHERE id = ?`).run(account.id);
    }
  }

  // Fallback to cached DB data, then demo data
  if (!data) {
    const cached = loadCachedData(account.id);
    if (cached.orders.length || cached.products.length) {
      data = buildDataFromCache(cached, account);
    } else {
      data = getMockDashboardData(account.id);
    }
  }

  db.prepare('UPDATE meesho_accounts SET last_synced = CURRENT_TIMESTAMP WHERE id = ?').run(account.id);

  res.json({
    account_id:   account.id,
    account_name: account.account_name,
    login_status: account.login_status,
    is_live:      isLive,
    ...data,
  });
});

// ── Single account detail ─────────────────────────────────────────────────────
router.get('/:id', authenticateToken, (req, res) => {
  const account = requireAccount(req.params.id, req.user.id, res);
  if (!account) return;
  res.json(safeAccount(account));
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function normaliseOrders(raw, account) {
  return raw.map(o => ({
    order_id:       o.order_id     || o.id || String(o.sub_order_id || ''),
    product_name:   o.product_name || o.name || o.catalog_name || 'Product',
    customer_name:  o.customer_name|| o.receiver_name || 'Customer',
    customer_city:  o.customer_city|| o.city || '',
    amount:         Number(o.price || o.amount || o.order_amount || 0),
    status:         formatStatus(o.status || o.sub_status),
    order_date:     o.order_date   || o.created_at || new Date().toISOString(),
    quantity:       o.quantity     || 1,
    account_id:     account.id,
    account_name:   account.account_name,
  }));
}

function normaliseProducts(raw, account) {
  return raw.map(p => ({
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
  }));
}

function formatStatus(raw) {
  if (!raw) return 'Pending';
  const map = {
    ORDER_PLACED:  'Pending',
    ACCEPTED:      'Accepted',
    DISPATCHED:    'Dispatched',
    DELIVERED:     'Delivered',
    CANCELLED:     'Cancelled',
    RETURNED:      'Cancelled',
    pending:       'Pending',
    accepted:      'Accepted',
    dispatched:    'Dispatched',
    delivered:     'Delivered',
    cancelled:     'Cancelled',
  };
  return map[raw] || raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

function buildRevenueChart(orders) {
  const days = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    days[label] = { date: label, revenue: 0, orders: 0 };
  }
  orders.forEach(o => {
    const d = new Date(o.order_date || o.created_at || Date.now());
    const label = d.toLocaleDateString('en-IN', { weekday: 'short' });
    if (days[label]) {
      days[label].revenue += Number(o.price || o.amount || 0);
      days[label].orders  += 1;
    }
  });
  return Object.values(days);
}

function cacheOrders(accountId, orders) {
  const stmt = db.prepare(`
    INSERT INTO cached_orders (account_id, order_id, order_data, status, order_date)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account_id, order_id) DO UPDATE SET
      order_data = excluded.order_data,
      status     = excluded.status,
      synced_at  = CURRENT_TIMESTAMP
  `);
  const tx = db.transaction(() => {
    orders.forEach(o => {
      const id = o.order_id || o.id || String(o.sub_order_id || '');
      if (id) stmt.run(accountId, id, JSON.stringify(o), o.status, o.order_date || o.created_at || null);
    });
  });
  tx();
}

function cacheProducts(accountId, products) {
  const stmt = db.prepare(`
    INSERT INTO cached_products (account_id, product_id, product_data, status, category)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(account_id, product_id) DO UPDATE SET
      product_data = excluded.product_data,
      status       = excluded.status,
      synced_at    = CURRENT_TIMESTAMP
  `);
  const tx = db.transaction(() => {
    products.forEach(p => {
      const id = p.product_id || p.id || String(p.catalog_id || '');
      if (id) stmt.run(accountId, id, JSON.stringify(p), p.status || 'active', p.category || null);
    });
  });
  tx();
}

function loadCachedData(accountId) {
  const orders   = db.prepare('SELECT order_data   FROM cached_orders   WHERE account_id = ?').all(accountId).map(r => JSON.parse(r.order_data));
  const products = db.prepare('SELECT product_data FROM cached_products WHERE account_id = ?').all(accountId).map(r => JSON.parse(r.product_data));
  return { orders, products };
}

function buildDataFromCache(cached, account) {
  const orders   = normaliseOrders(cached.orders, account);
  const products = normaliseProducts(cached.products, account);
  return {
    stats: {
      total_orders:    orders.length,
      pending_orders:  orders.filter(o => o.status === 'Pending').length,
      total_revenue:   orders.reduce((s, o) => s + o.amount, 0),
      active_products: products.filter(p => p.status === 'active').length,
    },
    orders,
    products,
    revenue_chart: buildRevenueChart(cached.orders),
  };
}

module.exports = router;
