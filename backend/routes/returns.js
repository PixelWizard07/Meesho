const express = require('express');
const db      = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { MeeshoAPI }         = require('../services/meeshoAuth');
const { getReturns }        = require('../services/mockData');

const router = express.Router();

function liveAPI(a) { return a.session_token && a.login_status==='connected' ? new MeeshoAPI(a.session_token, a.session_cookies) : null; }
function norm(r, a) {
  return {
    return_id     : r.return_id||r.id||String(r.return_request_id||''),
    order_id      : r.order_id||r.sub_order_id||'',
    product_name  : r.product_name||r.catalog_name||'Product',
    customer_name : r.customer_name||r.receiver_name||'Customer',
    customer_phone: r.customer_phone||r.phone||'',
    amount        : Number(r.amount||r.price||0),
    reason        : r.reason||r.return_reason||'',
    status        : fmtStatus(r.status||r.return_status),
    return_otp    : r.return_otp||r.otp||null,
    otp_expiry    : r.otp_expiry||null,
    return_date   : r.return_date||r.created_at||new Date().toISOString(),
    images        : r.images||[],
    account_id    : a.id, account_name: a.account_name, store_name: a.store_name,
  };
}
function fmtStatus(s) {
  if (!s) return 'Return Requested';
  const m={RETURN_REQUESTED:'Return Requested',OTP_SHARED:'Return OTP Shared',RECEIVED:'Return Received',REFUND_INITIATED:'Refund Initiated',REFUND_COMPLETED:'Refund Completed',REJECTED:'Return Rejected'};
  return m[s]||(s.charAt(0).toUpperCase()+s.slice(1).toLowerCase().replace(/_/g,' '));
}
async function fetchReturns(a) {
  const m = liveAPI(a);
  if (m) {
    const r = await m.getReturns({ per_page:100 });
    if (r.success) return (r.data?.data||r.data?.returns||[]).map(x=>norm(x,a));
    if (r.expired) db.prepare("UPDATE meesho_accounts SET login_status='expired' WHERE id=?").run(a.id);
  }
  const cached = db.prepare('SELECT return_data FROM cached_returns WHERE account_id=? ORDER BY synced_at DESC').all(a.id).map(r=>JSON.parse(r.return_data));
  if (cached.length) return cached;
  return getReturns(a.id).map(r=>({...r, account_id:a.id, account_name:a.account_name, store_name:a.store_name}));
}

/* ── GET /api/returns/all ─── */
router.get('/all', authenticateToken, async (req, res) => {
  const { status, page=1, limit=20, account_id, search } = req.query;
  const accounts = account_id
    ? db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active' AND id=?`).all(req.user.id, account_id)
    : db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active'`).all(req.user.id);

  let all = [];
  for (const a of accounts) { const r = await fetchReturns(a); all.push(...r); }

  if (status && status!=='all') all = all.filter(r=>r.status.toLowerCase()===status.toLowerCase());
  if (search) { const q=search.toLowerCase(); all=all.filter(r=>r.return_id.toLowerCase().includes(q)||r.product_name.toLowerCase().includes(q)||r.customer_name.toLowerCase().includes(q)); }
  all.sort((a,b)=>new Date(b.return_date)-new Date(a.return_date));
  const total=all.length, start=(Number(page)-1)*Number(limit);
  res.json({ returns:all.slice(start,start+Number(limit)), total, page:Number(page), limit:Number(limit) });
});

/* ── GET /api/returns/:returnId/otp  – get return OTP ─── */
router.get('/:returnId/otp', authenticateToken, async (req, res) => {
  const { account_id } = req.query;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });

  const m = liveAPI(a);
  if (m) {
    const r = await m.getReturnOTP(req.params.returnId);
    if (r.success) return res.json({ otp: r.data?.otp||r.data?.return_otp||null, expiry: r.data?.expiry||null, live:true });
  }
  // From cache
  const cached = db.prepare(`SELECT json_extract(return_data,'$.return_otp') AS otp, json_extract(return_data,'$.otp_expiry') AS exp FROM cached_returns WHERE account_id=? AND return_id=?`).get(account_id, req.params.returnId);
  if (cached?.otp) return res.json({ otp:cached.otp, expiry:cached.exp, live:false });

  // Demo OTP
  const demoOTP = String(100000 + (Number(req.params.returnId.replace(/\D/g,''))||12345) % 900000);
  res.json({ otp:demoOTP, expiry:new Date(Date.now()+24*3600000).toISOString(), live:false, demo:true });
});

/* ── POST /api/returns/:returnId/accept ─── */
router.post('/:returnId/accept', authenticateToken, async (req, res) => {
  const { account_id } = req.body;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a); let live=false;
  if (m) { const r=await m.acceptReturn(req.params.returnId); if(r.success) live=true; }
  db.prepare(`UPDATE cached_returns SET return_data=json_set(return_data,'$.status','Return Received'),status='Return Received' WHERE account_id=? AND return_id=?`).run(account_id, req.params.returnId);
  db.prepare(`INSERT INTO activity_logs(panel_user_id,account_id,action,details) VALUES(?,?,'return_accepted',?)`).run(req.user.id,account_id,req.params.returnId);
  res.json({ message:'Return accepted', live });
});

/* ── POST /api/returns/:returnId/reject ─── */
router.post('/:returnId/reject', authenticateToken, async (req, res) => {
  const { account_id, reason='' } = req.body;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a); let live=false;
  if (m) { const r=await m.rejectReturn(req.params.returnId, reason); if(r.success) live=true; }
  db.prepare(`UPDATE cached_returns SET return_data=json_set(return_data,'$.status','Return Rejected'),status='Return Rejected' WHERE account_id=? AND return_id=?`).run(account_id, req.params.returnId);
  res.json({ message:'Return rejected', live });
});

module.exports = router;
