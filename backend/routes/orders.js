const express = require('express');
const db      = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { MeeshoAPI }         = require('../services/meeshoAuth');
const { getOrders }         = require('../services/mockData');

const router = express.Router();

function getAccountRows(userId, accountId) {
  if (accountId) return db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active' AND id=?`).all(userId, accountId);
  return db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active'`).all(userId);
}
function liveAPI(a) { return a.session_token && a.login_status==='connected' ? new MeeshoAPI(a.session_token, a.session_cookies) : null; }
function fmtStatus(s) {
  if (!s) return 'Pending';
  const m={ORDER_PLACED:'Pending',ACCEPTED:'Accepted',LABEL_GENERATED:'Label Generated',DISPATCHED:'Dispatched',DELIVERED:'Delivered',CANCELLED:'Cancelled',pending:'Pending',accepted:'Accepted',dispatched:'Dispatched',delivered:'Delivered',cancelled:'Cancelled'};
  return m[s]||(s.charAt(0).toUpperCase()+s.slice(1).toLowerCase());
}
function norm(o, a) {
  return {
    order_id      : o.order_id||o.id||String(o.sub_order_id||''),
    sub_order_id  : o.sub_order_id||o.order_id||String(o.id||''),
    product_name  : o.product_name||o.catalog_name||o.name||'Product',
    sku           : o.sku||'',
    category      : o.category||'',
    customer_name : o.customer_name||o.receiver_name||'Customer',
    customer_city : o.customer_city||o.city||'',
    customer_state: o.customer_state||o.state||'',
    customer_phone: o.customer_phone||o.phone||'',
    address       : o.address||'',
    pincode       : o.pincode||'',
    amount        : Number(o.price||o.amount||o.order_amount||0),
    quantity      : o.quantity||1,
    status        : fmtStatus(o.status||o.sub_status),
    courier       : o.courier||o.courier_name||'',
    tracking_id   : o.tracking_id||o.awb||null,
    label_url     : o.label_url||null,
    order_date    : o.order_date||o.created_at||new Date().toISOString(),
    account_id    : a.id, account_name: a.account_name, store_name: a.store_name,
  };
}
async function fetchOrders(a, params={}) {
  const m = liveAPI(a);
  if (m) {
    const r = await m.getOrders(params);
    if (r.success) return (r.data?.data||r.data?.orders||[]).map(o=>norm(o,a));
    if (r.expired) db.prepare("UPDATE meesho_accounts SET login_status='expired' WHERE id=?").run(a.id);
  }
  // cached
  const cached = db.prepare('SELECT order_data FROM cached_orders WHERE account_id=? ORDER BY order_date DESC').all(a.id).map(r=>JSON.parse(r.order_data));
  if (cached.length) return cached;
  return getOrders(a.id).map(o=>({...o, account_id:a.id, account_name:a.account_name, store_name:a.store_name}));
}

/* ── GET /api/orders/all ─── */
router.get('/all', authenticateToken, async (req, res) => {
  const { status, page=1, limit=20, account_id, search } = req.query;
  const accounts = getAccountRows(req.user.id, account_id);
  let all = [];
  for (const a of accounts) { const o = await fetchOrders(a); all.push(...o); }

  if (status && status!=='all') all = all.filter(o=>o.status.toLowerCase()===status.toLowerCase());
  if (search) { const q=search.toLowerCase(); all=all.filter(o=>o.order_id.toLowerCase().includes(q)||o.product_name.toLowerCase().includes(q)||o.customer_name.toLowerCase().includes(q)); }
  all.sort((a,b)=>new Date(b.order_date)-new Date(a.order_date));
  const total=all.length, start=(Number(page)-1)*Number(limit);
  res.json({ orders: all.slice(start,start+Number(limit)), total, page:Number(page), limit:Number(limit) });
});

/* ── GET /api/orders/account/:accountId ─── */
router.get('/account/:accountId', authenticateToken, async (req, res) => {
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(req.params.accountId, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const { status, page=1, limit=20 } = req.query;
  let orders = await fetchOrders(a);
  if (status&&status!=='all') orders=orders.filter(o=>o.status.toLowerCase()===status.toLowerCase());
  const total=orders.length, start=(Number(page)-1)*Number(limit);
  res.json({ orders:orders.slice(start,start+Number(limit)), total, page:Number(page), limit:Number(limit) });
});

/* ── Accept order ─── */
router.post('/:subOrderId/accept', authenticateToken, async (req, res) => {
  const { account_id } = req.body;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a);
  let live=false, msg='Order accepted';
  if (m) { const r=await m.acceptOrder(req.params.subOrderId); if(r.success) live=true; else msg+=` (cached only)`; }
  db.prepare(`UPDATE cached_orders SET order_data=json_set(order_data,'$.status','Accepted') WHERE account_id=? AND order_id=?`).run(account_id, req.params.subOrderId);
  db.prepare(`INSERT INTO activity_logs(panel_user_id,account_id,action,details) VALUES(?,?,'order_accepted',?)`).run(req.user.id,account_id,req.params.subOrderId);
  res.json({ message:msg, live });
});

/* ── Cancel / reject order ─── */
router.post('/:subOrderId/cancel', authenticateToken, async (req, res) => {
  const { account_id, reason='' } = req.body;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a);
  let live=false;
  if (m) { const r=await m.cancelOrder(req.params.subOrderId, reason); if(r.success) live=true; }
  db.prepare(`UPDATE cached_orders SET order_data=json_set(order_data,'$.status','Cancelled') WHERE account_id=? AND order_id=?`).run(account_id, req.params.subOrderId);
  db.prepare(`INSERT INTO activity_logs(panel_user_id,account_id,action,details) VALUES(?,?,'order_cancelled',?)`).run(req.user.id,account_id,JSON.stringify({id:req.params.subOrderId,reason}));
  res.json({ message:'Order cancelled', live });
});

/* ── Mark dispatched ─── */
router.post('/:subOrderId/dispatch', authenticateToken, async (req, res) => {
  const { account_id, tracking_id, courier } = req.body;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a);
  let live=false;
  if (m) { const r=await m.dispatchOrder(req.params.subOrderId,{tracking_id,courier}); if(r.success) live=true; }
  db.prepare(`UPDATE cached_orders SET order_data=json_set(json_set(json_set(order_data,'$.status','Dispatched'),'$.tracking_id',?),'$.courier',?) WHERE account_id=? AND order_id=?`).run(tracking_id||'',courier||'',account_id,req.params.subOrderId);
  res.json({ message:'Order dispatched', live });
});

/* ── Download / generate shipping label ─── */
router.get('/:subOrderId/label', authenticateToken, async (req, res) => {
  const { account_id } = req.query;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a);
  if (m) {
    const r = await m.getLabel(req.params.subOrderId);
    if (r.success) {
      res.setHeader('Content-Type', r.contentType);
      res.setHeader('Content-Disposition', `attachment; filename="label_${req.params.subOrderId}.pdf"`);
      return res.send(Buffer.from(r.data));
    }
  }
  // Generate a simple demo label PDF using plain HTML→text
  res.setHeader('Content-Type', 'text/html');
  res.setHeader('Content-Disposition', `attachment; filename="label_${req.params.subOrderId}.html"`);
  const order = db.prepare(`SELECT json_extract(order_data,'$.product_name') AS name, json_extract(order_data,'$.customer_name') AS cname, json_extract(order_data,'$.address') AS addr, json_extract(order_data,'$.pincode') AS pin, json_extract(order_data,'$.tracking_id') AS track, json_extract(order_data,'$.courier') AS courier FROM cached_orders WHERE account_id=? AND order_id=?`).get(account_id, req.params.subOrderId) || {};
  res.send(generateLabelHTML(req.params.subOrderId, order, a));
});

function generateLabelHTML(orderId, order, account) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8">
  <style>
    body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#fff}
    .label{border:2px solid #000;padding:20px;max-width:400px;margin:auto}
    .logo{font-size:24px;font-weight:bold;color:#f43397;text-align:center;margin-bottom:16px}
    .section{margin:12px 0;border-top:1px solid #ddd;padding-top:12px}
    .row{display:flex;justify-content:space-between;margin:4px 0;font-size:13px}
    .label-title{font-weight:bold;font-size:11px;color:#666;text-transform:uppercase}
    .barcode{text-align:center;font-size:28px;letter-spacing:8px;margin:16px 0;font-family:monospace}
    h3{margin:0 0 8px;font-size:14px}
    @media print{body{margin:0}}
  </style></head><body>
  <div class="label">
    <div class="logo">meesho</div>
    <div class="section">
      <div class="label-title">Order ID</div>
      <h3>${orderId}</h3>
      <div class="barcode">||| ${orderId} |||</div>
    </div>
    <div class="section">
      <div class="label-title">Ship To</div>
      <div style="font-size:14px;font-weight:bold">${order.cname||'Customer'}</div>
      <div style="font-size:12px;margin-top:4px">${order.addr||'Address not available'}</div>
      <div style="font-size:12px">PIN: <strong>${order.pin||'—'}</strong></div>
    </div>
    <div class="section">
      <div class="row"><span class="label-title">Product</span><span style="font-size:12px;text-align:right;max-width:60%">${order.name||'—'}</span></div>
      <div class="row"><span class="label-title">Courier</span><span>${order.courier||'—'}</span></div>
      <div class="row"><span class="label-title">Tracking ID</span><span>${order.track||'—'}</span></div>
      <div class="row"><span class="label-title">Seller</span><span>${account.store_name||account.account_name}</span></div>
    </div>
    <div style="text-align:center;font-size:10px;color:#999;margin-top:16px">
      Generated by Meesho Multi-Account Panel · ${new Date().toLocaleString('en-IN')}
    </div>
  </div>
  <div style="text-align:center;margin-top:20px">
    <button onclick="window.print()" style="background:#f43397;color:#fff;border:none;padding:10px 24px;border-radius:6px;font-size:14px;cursor:pointer">Print Label</button>
  </div>
</body></html>`;
}

module.exports = router;
