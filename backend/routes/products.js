const express = require('express');
const db      = require('../db/database');
const { authenticateToken } = require('../middleware/auth');
const { MeeshoAPI }         = require('../services/meeshoAuth');
const { getProducts }       = require('../services/mockData');

const router = express.Router();

function liveAPI(a) { return a.session_token && a.login_status==='connected' ? new MeeshoAPI(a.session_token, a.session_cookies) : null; }
function norm(p, a) {
  return {
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
    account_id : a.id, account_name:a.account_name, store_name:a.store_name,
  };
}
async function fetchProducts(a) {
  const m = liveAPI(a);
  if (m) {
    const r = await m.getProducts({ per_page:100 });
    if (r.success) return (r.data?.data||r.data?.products||[]).map(p=>norm(p,a));
    if (r.expired) db.prepare("UPDATE meesho_accounts SET login_status='expired' WHERE id=?").run(a.id);
  }
  const cached = db.prepare('SELECT product_data FROM cached_products WHERE account_id=?').all(a.id).map(r=>JSON.parse(r.product_data));
  if (cached.length) return cached;
  return getProducts(a.id).map(p=>({...p, account_id:a.id, account_name:a.account_name, store_name:a.store_name}));
}

router.get('/all', authenticateToken, async (req, res) => {
  const { account_id, category, status, page=1, limit=20, search } = req.query;
  const accounts = account_id
    ? db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active' AND id=?`).all(req.user.id, account_id)
    : db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active'`).all(req.user.id);

  let all = [];
  for (const a of accounts) { const p = await fetchProducts(a); all.push(...p); }

  if (category) all=all.filter(p=>p.category.toLowerCase().includes(category.toLowerCase()));
  if (status&&status!=='all') all=all.filter(p=>p.status===status);
  if (search) { const q=search.toLowerCase(); all=all.filter(p=>p.name.toLowerCase().includes(q)||p.category.toLowerCase().includes(q)); }
  const total=all.length, start=(Number(page)-1)*Number(limit);
  res.json({ products:all.slice(start,start+Number(limit)), total, page:Number(page), limit:Number(limit) });
});

router.put('/:productId/inventory', authenticateToken, async (req, res) => {
  const { account_id, quantity } = req.body;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a); let live=false;
  if (m) { const r=await m.updateInventory(req.params.productId, quantity); if(r.success) live=true; }
  db.prepare(`UPDATE cached_products SET product_data=json_set(product_data,'$.inventory',?) WHERE account_id=? AND product_id=?`).run(quantity, account_id, req.params.productId);
  res.json({ message:`Stock updated to ${quantity}`, live });
});

router.put('/:productId/toggle', authenticateToken, async (req, res) => {
  const { account_id, is_active } = req.body;
  const a = db.prepare('SELECT * FROM meesho_accounts WHERE id=? AND panel_user_id=?').get(account_id, req.user.id);
  if (!a) return res.status(404).json({ error:'Account not found' });
  const m = liveAPI(a); let live=false;
  if (m) { const r=await m.toggleProduct(req.params.productId, is_active); if(r.success) live=true; }
  db.prepare(`UPDATE cached_products SET product_data=json_set(json_set(product_data,'$.is_active',?),'$.status',?) WHERE account_id=? AND product_id=?`).run(is_active?1:0,is_active?'active':'inactive',account_id,req.params.productId);
  res.json({ message:`Product ${is_active?'activated':'deactivated'}`, live });
});

router.get('/categories', authenticateToken, async (req, res) => {
  const accounts = db.prepare(`SELECT * FROM meesho_accounts WHERE panel_user_id=? AND status='active'`).all(req.user.id);
  const map={};
  for (const a of accounts) {
    const ps = await fetchProducts(a);
    ps.forEach(p=>{ if(!map[p.category]) map[p.category]={count:0,revenue:0}; map[p.category].count++; map[p.category].revenue+=p.price*p.sales; });
  }
  res.json(Object.entries(map).map(([name,s])=>({name,...s})));
});

module.exports = router;
