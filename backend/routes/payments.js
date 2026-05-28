const express = require('express');
const db      = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { MeeshoAPI }         = require('../services/meeshoAuth');
const { getPayments }       = require('../services/mockData');

const router = express.Router();

function liveAPI(a) { return a.session_token && a.login_status==='connected' ? new MeeshoAPI(a.session_token, a.session_cookies) : null; }

async function fetchPayments(a) {
  const m = liveAPI(a);
  if (m) {
    const r = await m.getPayments({ per_page:20 });
    if (r.success) {
      const raw = r.data?.data||r.data?.settlements||r.data||[];
      return { payments: raw.map(p=>normPayment(p,a)), live:true };
    }
    if (r.expired) db.prepare("UPDATE meesho_accounts SET login_status='expired' WHERE id=?").run(a.id);
  }
  return { payments: getPayments(a.id).map(p=>({...p,account_id:a.id,account_name:a.account_name,store_name:a.store_name})), live:false };
}

function normPayment(p, a) {
  return {
    settlement_id: p.settlement_id||p.id||String(p.payout_id||''),
    period       : p.period||p.payout_cycle||'',
    from_date    : p.from_date||p.start_date||'',
    to_date      : p.to_date||p.end_date||'',
    orders       : Number(p.orders||p.order_count||0),
    gross_amount : Number(p.gross_amount||p.total_amount||0),
    commission   : Number(p.commission||p.platform_fee||0),
    tds          : Number(p.tds||p.tax_deducted||0),
    net_amount   : Number(p.net_amount||p.payout_amount||0),
    status       : p.status||'Processing',
    utr          : p.utr||p.transaction_id||null,
    account_id   : a.id, account_name:a.account_name, store_name:a.store_name,
  };
}

/* ── GET /api/payments/all ─── */
router.get('/all', authenticateToken, async (req, res) => {
  const { account_id, page=1, limit=20 } = req.query;
  const accounts = account_id
    ? db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active' AND id=?`).all(req.user.id, account_id)
    : db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active'`).all(req.user.id);

  let all = [], totalEarnings=0, pendingPayouts=0;
  for (const a of accounts) {
    const { payments } = await fetchPayments(a);
    all.push(...payments);
    totalEarnings += payments.filter(p=>p.status==='Paid').reduce((s,p)=>s+p.net_amount,0);
    pendingPayouts += payments.filter(p=>p.status==='Processing').reduce((s,p)=>s+p.net_amount,0);
  }

  all.sort((a,b)=>new Date(b.to_date||0)-new Date(a.to_date||0));
  const total=all.length, start=(Number(page)-1)*Number(limit);
  res.json({ payments:all.slice(start,start+Number(limit)), total, page:Number(page), limit:Number(limit), total_earnings:totalEarnings, pending_payouts:pendingPayouts });
});

module.exports = router;
