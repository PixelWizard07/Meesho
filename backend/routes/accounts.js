const express = require('express');
const db      = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { loginWithPassword, MeeshoAPI } = require('../services/meeshoAuth');
const { encrypt, decrypt }             = require('../services/encrypt');
const { getDashboard }                 = require('../services/mockData');
const emailSvc                         = require('../services/emailService');

const router = express.Router();

/* ── helpers ──────────────────────────────────────────────────────── */
function safe(row) {
  const { enc_email, enc_password, session_token, session_cookies, ...out } = row;
  out.has_credentials = !!(row.enc_email && row.enc_password);
  out.has_session     = !!row.session_token;
  return out;
}
function find(id, uid, res) {
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(id, uid);
  if (!a) { res.status(404).json({ error: 'Account not found' }); return null; }
  return a;
}
function api(account) {
  if (!account.session_token) return null;
  return new MeeshoAPI(account.session_token, account.session_cookies);
}
function markExpired(id) {
  db.prepare("UPDATE meesho_accounts SET login_status='expired' WHERE id=?").run(id);
}

/* ── CRUD ─────────────────────────────────────────────────────────── */
router.get('/', authenticateToken, (req, res) => {
  const rows = db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? ORDER BY created_at DESC`).all(req.user.id);
  res.json(rows.map(safe));
});

router.post('/', authenticateToken, (req, res) => {
  const { account_name, meesho_email, password, store_name } = req.body;
  if (!account_name || !meesho_email)
    return res.status(400).json({ error: 'account_name and meesho_email are required' });

  try {
    const r = db.prepare(`
      INSERT INTO meesho_accounts
        (panel_user_id, account_name, meesho_email, store_name, enc_email, enc_password, login_status, status)
      VALUES (?,?,?,?,?,?,'disconnected','active')
    `).run(req.user.id, account_name, meesho_email, store_name || account_name,
           encrypt(meesho_email), password ? encrypt(password) : null);

    db.prepare(`INSERT INTO activity_logs(panel_user_id,account_id,action,details) VALUES(?,?,'account_added',?)`)
      .run(req.user.id, r.lastInsertRowid, `Added: ${account_name}`);

    res.status(201).json(safe(db.prepare('SELECT * FROM meesho_accounts WHERE id=?').get(r.lastInsertRowid)));
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to add account' });
  }
});

router.put('/:id', authenticateToken, (req, res) => {
  const a = find(req.params.id, req.user.id, res); if (!a) return;
  const { account_name, meesho_email, password, store_name, status } = req.body;
  db.prepare(`
    UPDATE meesho_accounts SET
      account_name = COALESCE(?,account_name),
      meesho_email = COALESCE(?,meesho_email),
      store_name   = COALESCE(?,store_name),
      status       = COALESCE(?,status),
      enc_email    = COALESCE(?,enc_email),
      enc_password = COALESCE(?,enc_password)
    WHERE id=? AND panel_user_id=?
  `).run(account_name, meesho_email, store_name, status,
         meesho_email ? encrypt(meesho_email) : null,
         password     ? encrypt(password)     : null,
         req.params.id, req.user.id);
  res.json({ message: 'Account updated' });
});

router.delete('/:id', authenticateToken, (req, res) => {
  const a = find(req.params.id, req.user.id, res); if (!a) return;
  db.prepare('DELETE FROM meesho_accounts WHERE id=?').run(req.params.id);
  res.json({ message: 'Account deleted' });
});

/* ── Connect (email + password → live session) ───────────────────── */
router.post('/:id/connect', authenticateToken, async (req, res) => {
  const a = find(req.params.id, req.user.id, res); if (!a) return;

  // Accept password from body (asked at connect time) OR fall back to stored encrypted creds
  const { password: bodyPassword } = req.body;
  let email, password;

  if (bodyPassword) {
    email    = a.meesho_email;
    password = bodyPassword;
    // Persist encrypted so reconnect works without re-entering
    db.prepare('UPDATE meesho_accounts SET enc_email=?, enc_password=? WHERE id=?')
      .run(encrypt(email), encrypt(password), a.id);
  } else if (a.enc_email && a.enc_password) {
    email    = decrypt(a.enc_email);
    password = decrypt(a.enc_password);
  } else {
    return res.status(400).json({ error: 'Please enter your Meesho password to connect.' });
  }

  if (!email || !password)
    return res.status(400).json({ error: 'Could not retrieve credentials. Please re-enter your password.' });

  const result = await loginWithPassword(email, password);

  if (result.success) {
    const expiry = new Date(Date.now() + 7*24*3600*1000).toISOString();
    db.prepare(`
      UPDATE meesho_accounts SET
        session_token=?, session_cookies=?, session_expiry=?, login_status='connected',
        supplier_id=COALESCE(?,supplier_id), store_name=COALESCE(NULLIF(?,''),store_name),
        phone=COALESCE(NULLIF(?,''),phone), last_synced=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(result.token, result.cookies, expiry, result.supplierId, result.storeName, result.phone, a.id);
    db.prepare(`INSERT INTO activity_logs(panel_user_id,account_id,action,details) VALUES(?,?,'connected','Connected via email+password')`)
      .run(req.user.id, a.id);

    // Send email notification
    const panelUser = db.prepare('SELECT email, username FROM panel_users WHERE id=?').get(req.user.id);
    if (panelUser?.email) {
      emailSvc.sendAccountConnected({
        to: panelUser.email,
        accountName: a.account_name,
        storeName: result.storeName || a.store_name,
        meeshoEmail: email,
        username: panelUser.username,
      }).catch(() => {});
    }

    res.json({ message: 'Account connected to Meesho', store_name: result.storeName });
  } else {
    res.status(401).json({ error: result.message || 'Login failed — check email/password' });
  }
});

router.post('/:id/disconnect', authenticateToken, (req, res) => {
  const a = find(req.params.id, req.user.id, res); if (!a) return;
  db.prepare(`UPDATE meesho_accounts SET session_token=NULL,session_cookies=NULL,session_expiry=NULL,login_status='disconnected' WHERE id=?`).run(a.id);

  const panelUser = db.prepare('SELECT email, username FROM panel_users WHERE id=?').get(req.user.id);
  if (panelUser?.email) {
    emailSvc.sendAccountDisconnected({ to: panelUser.email, accountName: a.account_name, username: panelUser.username }).catch(() => {});
  }

  res.json({ message: 'Disconnected' });
});

/* ── Per-account dashboard ───────────────────────────────────────── */
router.get('/:id/dashboard', authenticateToken, async (req, res) => {
  const a = find(req.params.id, req.user.id, res); if (!a) return;
  let data, isLive = false;

  if (a.session_token && a.login_status === 'connected') {
    const m = api(a);
    const [oR, pR, rR] = await Promise.all([m.getOrders({ per_page:50 }), m.getProducts({ per_page:50 }), m.getReturns({ per_page:20 })]);
    if (oR.success) {
      isLive = true;
      const orders   = normaliseOrders(oR.data?.data || oR.data?.orders || [], a);
      const products = normaliseProducts((pR.success ? pR.data?.data || pR.data?.products || [] : []), a);
      const returns  = normaliseReturns((rR.success ? rR.data?.data || rR.data?.returns || [] : []), a);
      data = buildData(orders, products, returns);
      cacheAll(a.id, orders, products, returns);
    } else if (oR.expired) markExpired(a.id);
  }

  if (!data) {
    const cached = loadCached(a.id);
    if (cached.orders.length) data = buildData(cached.orders, cached.products, cached.returns);
    else data = formatMock(getDashboard(a.id), a);
  }

  db.prepare('UPDATE meesho_accounts SET last_synced=CURRENT_TIMESTAMP WHERE id=?').run(a.id);
  res.json({ account_id: a.id, account_name: a.account_name, login_status: a.login_status, is_live: isLive, ...data });
});

/* ── Aggregate dashboard ─────────────────────────────────────────── */
router.get('/aggregate/dashboard', authenticateToken, async (req, res) => {
  const accounts = db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active'`).all(req.user.id);
  if (!accounts.length) return res.json({ total_accounts:0, total_orders:0, pending_orders:0, total_revenue:0, active_products:0, open_returns:0, accounts:[] });

  let total_orders=0, pending_orders=0, total_revenue=0, active_products=0, open_returns=0;
  const summaries = [];

  for (const a of accounts) {
    let stats;
    if (a.session_token && a.login_status === 'connected') {
      const m = api(a);
      const [oR, pR, rR] = await Promise.all([m.getOrders({ per_page:100 }), m.getProducts({ per_page:100 }), m.getReturns({ per_page:50 })]);
      if (oR.success) {
        const orders   = normaliseOrders(oR.data?.data || oR.data?.orders || [], a);
        const products = normaliseProducts((pR.success ? pR.data?.data || pR.data?.products || [] : []), a);
        const returns  = normaliseReturns((rR.success ? rR.data?.data || rR.data?.returns || [] : []), a);
        stats = calcStats(orders, products, returns);
      }
    }
    if (!stats) stats = getDashboard(a.id).stats;

    total_orders    += stats.total_orders;
    pending_orders  += stats.pending_orders;
    total_revenue   += stats.total_revenue;
    active_products += stats.active_products;
    open_returns    += stats.open_returns || 0;
    summaries.push({ id: a.id, account_name: a.account_name, store_name: a.store_name, meesho_email: a.meesho_email, status: a.status, login_status: a.login_status, last_synced: a.last_synced, stats });
  }
  res.json({ total_accounts: accounts.length, total_orders, pending_orders, total_revenue, active_products, open_returns, accounts: summaries });
});

router.get('/:id', authenticateToken, (req, res) => {
  const a = find(req.params.id, req.user.id, res); if (!a) return;
  res.json(safe(a));
});

/* ── Normalisation helpers ───────────────────────────────────────── */
function normaliseOrders(raw, a) {
  return raw.map(o => ({
    order_id      : o.order_id || o.id || String(o.sub_order_id||''),
    sub_order_id  : o.sub_order_id || o.order_id || String(o.id||''),
    product_name  : o.product_name || o.catalog_name || o.name || 'Product',
    sku           : o.sku || '',
    category      : o.category || '',
    customer_name : o.customer_name || o.receiver_name || 'Customer',
    customer_city : o.customer_city || o.city || '',
    customer_state: o.customer_state || o.state || '',
    customer_phone: o.customer_phone || o.phone || '',
    address       : o.address || '',
    pincode       : o.pincode || '',
    amount        : Number(o.price||o.amount||o.order_amount||0),
    quantity      : o.quantity||1,
    status        : fmtStatus(o.status||o.sub_status),
    courier       : o.courier||o.courier_name||'',
    tracking_id   : o.tracking_id||o.awb||null,
    label_url     : o.label_url||null,
    order_date    : o.order_date||o.created_at||new Date().toISOString(),
    account_id    : a.id, account_name: a.account_name, store_name: a.store_name,
  }));
}
function extractProductImage(p) {
  if (Array.isArray(p.images) && p.images.length) return typeof p.images[0] === 'string' ? p.images[0] : p.images[0]?.url || p.images[0]?.image_url || null;
  if (p.image_url) return p.image_url;
  if (p.primary_image) return p.primary_image;
  if (p.thumbnail_url) return p.thumbnail_url;
  if (p.cover_image_url) return p.cover_image_url;
  if (Array.isArray(p.catalog_images) && p.catalog_images.length) return typeof p.catalog_images[0] === 'string' ? p.catalog_images[0] : p.catalog_images[0]?.url || null;
  if (Array.isArray(p.product_images) && p.product_images.length) return typeof p.product_images[0] === 'string' ? p.product_images[0] : p.product_images[0]?.url || null;
  return null;
}
function normaliseProducts(raw, a) {
  return raw.map(p => ({
    product_id : p.product_id||p.id||String(p.catalog_id||''),
    catalog_id : p.catalog_id||p.id||String(p.product_id||''),
    name       : p.name||p.product_name||p.catalog_name||'Product',
    category   : p.category||p.category_name||'General',
    price      : Number(p.price||p.mrp||0),
    inventory  : Number(p.inventory||p.quantity||p.stock_count||0),
    sales      : Number(p.sales||p.total_sold||0),
    rating     : Number(p.rating||p.avg_rating||0).toFixed(1),
    status     : p.is_active===false?'inactive':'active',
    is_active  : p.is_active!==false,
    image_url  : extractProductImage(p),
    account_id : a.id, account_name: a.account_name, store_name: a.store_name,
  }));
}
function normaliseReturns(raw, a) {
  return raw.map(r => ({
    return_id     : r.return_id||r.id||String(r.return_request_id||''),
    order_id      : r.order_id||r.sub_order_id||'',
    product_name  : r.product_name||r.catalog_name||'Product',
    customer_name : r.customer_name||r.receiver_name||'Customer',
    customer_phone: r.customer_phone||r.phone||'',
    amount        : Number(r.amount||r.price||0),
    reason        : r.reason||r.return_reason||'',
    status        : fmtReturnStatus(r.status||r.return_status),
    return_otp    : r.return_otp||r.otp||null,
    otp_expiry    : r.otp_expiry||null,
    return_date   : r.return_date||r.created_at||new Date().toISOString(),
    images        : r.images||[],
    account_id    : a.id, account_name: a.account_name, store_name: a.store_name,
  }));
}
function fmtStatus(s) {
  if (!s) return 'Pending';
  const m={ORDER_PLACED:'Pending',ACCEPTED:'Accepted',LABEL_GENERATED:'Label Generated',DISPATCHED:'Dispatched',DELIVERED:'Delivered',CANCELLED:'Cancelled',pending:'Pending',accepted:'Accepted',dispatched:'Dispatched',delivered:'Delivered',cancelled:'Cancelled'};
  return m[s]||(s.charAt(0).toUpperCase()+s.slice(1).toLowerCase());
}
function fmtReturnStatus(s) {
  if (!s) return 'Return Requested';
  const m={RETURN_REQUESTED:'Return Requested',OTP_SHARED:'Return OTP Shared',RECEIVED:'Return Received',REFUND_INITIATED:'Refund Initiated',REFUND_COMPLETED:'Refund Completed',REJECTED:'Return Rejected'};
  return m[s]||(s.charAt(0).toUpperCase()+s.slice(1).toLowerCase().replace(/_/g,' '));
}
function calcStats(orders, products, returns) {
  return {
    total_orders   : orders.length,
    pending_orders : orders.filter(o=>o.status==='Pending').length,
    total_revenue  : orders.filter(o=>o.status!=='Cancelled').reduce((s,o)=>s+o.amount,0),
    active_products: products.filter(p=>p.is_active).length,
    open_returns   : returns.filter(r=>['Return Requested','Return OTP Shared'].includes(r.status)).length,
  };
}
function buildData(orders, products, returns) {
  const revByDay={};
  for(let i=6;i>=0;i--){const d=new Date(Date.now()-i*86400000);const l=d.toLocaleDateString('en-IN',{weekday:'short'});revByDay[l]={date:l,revenue:0,orders:0};}
  orders.forEach(o=>{const l=new Date(o.order_date).toLocaleDateString('en-IN',{weekday:'short'});if(revByDay[l]){revByDay[l].revenue+=o.amount;revByDay[l].orders++;}});
  return { stats: calcStats(orders,products,returns), orders, products, returns, revenue_chart: Object.values(revByDay) };
}
function formatMock(mock, a) {
  return buildData(normaliseOrders(mock.orders,a), normaliseProducts(mock.products,a), normaliseReturns(mock.returns,a));
}
function cacheAll(accountId, orders, products, returns) {
  const stmtO = db.prepare(`INSERT INTO cached_orders(account_id,order_id,order_data,status,order_date) VALUES(?,?,?,?,?) ON CONFLICT(account_id,order_id) DO UPDATE SET order_data=excluded.order_data,status=excluded.status,synced_at=CURRENT_TIMESTAMP`);
  const stmtP = db.prepare(`INSERT INTO cached_products(account_id,product_id,product_data,status,category) VALUES(?,?,?,?,?) ON CONFLICT(account_id,product_id) DO UPDATE SET product_data=excluded.product_data,status=excluded.status,synced_at=CURRENT_TIMESTAMP`);
  const stmtR = db.prepare(`INSERT INTO cached_returns(account_id,return_id,return_data,status) VALUES(?,?,?,?) ON CONFLICT(account_id,return_id) DO UPDATE SET return_data=excluded.return_data,status=excluded.status,synced_at=CURRENT_TIMESTAMP`);
  db.transaction(()=>{
    orders.forEach(o=>{ if(o.order_id) stmtO.run(accountId,o.order_id,JSON.stringify(o),o.status,o.order_date||null); });
    products.forEach(p=>{ if(p.product_id) stmtP.run(accountId,p.product_id,JSON.stringify(p),p.status,p.category||null); });
    returns.forEach(r=>{ if(r.return_id) stmtR.run(accountId,r.return_id,JSON.stringify(r),r.status); });
  })();
}
function loadCached(accountId) {
  return {
    orders  : db.prepare('SELECT order_data   FROM cached_orders   WHERE account_id=? ORDER BY order_date   DESC').all(accountId).map(r=>JSON.parse(r.order_data)),
    products: db.prepare('SELECT product_data FROM cached_products WHERE account_id=?').all(accountId).map(r=>JSON.parse(r.product_data)),
    returns : db.prepare('SELECT return_data  FROM cached_returns  WHERE account_id=? ORDER BY synced_at    DESC').all(accountId).map(r=>JSON.parse(r.return_data)),
  };
}

module.exports = router;
