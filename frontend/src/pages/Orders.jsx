import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle, Truck, Clock, Download, Tag, Printer, Package } from 'lucide-react';
import { ordersAPI, accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

const STATUS_OPTS = ['all', 'Pending', 'Accepted', 'Label Generated', 'Dispatched', 'Delivered', 'Cancelled'];

const statusStyle = {
  Pending          : 'bg-amber-100 text-amber-700',
  Accepted         : 'bg-blue-100 text-blue-700',
  'Label Generated': 'bg-indigo-100 text-indigo-700',
  Dispatched       : 'bg-violet-100 text-violet-700',
  Delivered        : 'bg-green-100 text-green-700',
  Cancelled        : 'bg-red-100 text-red-700',
};

function productColor(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  const p = [
    ['from-pink-50 to-rose-100','text-pink-400'],
    ['from-blue-50 to-indigo-100','text-blue-400'],
    ['from-purple-50 to-violet-100','text-purple-400'],
    ['from-emerald-50 to-teal-100','text-emerald-400'],
    ['from-amber-50 to-orange-100','text-amber-400'],
    ['from-cyan-50 to-sky-100','text-cyan-400'],
  ];
  const [bg, icon] = p[Math.abs(h) % p.length];
  return { bg, icon };
}

function generateBulkLabelsHTML(orders) {
  const grouped = {};
  for (const o of orders) {
    const key = o.sku || o.product_name;
    if (!grouped[key]) grouped[key] = { sku: o.sku, product_name: o.product_name, orders: [] };
    grouped[key].orders.push(o);
  }
  const groups = Object.values(grouped);
  const labelHtml = groups.map(g => `
    <div class="sku-section">
      <div class="sku-bar">
        <strong>${g.product_name}</strong>
        ${g.sku ? `<code>${g.sku}</code>` : ''}
        <span class="count">${g.orders.length} label${g.orders.length > 1 ? 's' : ''}</span>
      </div>
      <div class="grid">
        ${g.orders.map(o => `
          <div class="label">
            <div class="top-row"><span class="logo">meesho</span><span class="oid">${o.order_id}</span></div>
            <div class="barcode">||| ${o.order_id} |||</div>
            <div class="section">
              <div class="tag-lbl">SHIP TO</div>
              <strong>${o.customer_name}</strong>
              <div class="sm">${o.address || '—'}</div>
              <div class="sm">PIN ${o.pincode || '—'} · ${o.customer_city || ''} ${o.customer_state || ''}</div>
            </div>
            <div class="section">
              <div class="row"><span class="tag-lbl">PRODUCT</span><span>${o.product_name}</span></div>
              ${o.sku ? `<div class="row"><span class="tag-lbl">SKU</span><span>${o.sku}</span></div>` : ''}
              <div class="row"><span class="tag-lbl">QTY</span><span>${o.quantity || 1}</span></div>
              <div class="row"><span class="tag-lbl">SELLER</span><span>${o.account_name}</span></div>
              ${o.tracking_id ? `<div class="row"><span class="tag-lbl">AWB</span><span>${o.tracking_id}</span></div>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>`).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Bulk Labels</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#f5f5f5;padding:16px}
.print-bar{text-align:center;margin-bottom:20px}
.print-bar button{background:#f43397;color:#fff;border:none;padding:10px 32px;border-radius:6px;font-size:15px;cursor:pointer;margin-right:8px}
.sku-section{margin-bottom:28px}
.sku-bar{display:flex;align-items:center;gap:10px;background:#fff3f8;border:1px solid #fcd4ec;border-radius:8px;padding:8px 14px;margin-bottom:10px;font-size:13px}
.sku-bar code{background:#e5e7eb;padding:2px 8px;border-radius:4px;font-size:11px;color:#374151}
.sku-bar .count{margin-left:auto;color:#9ca3af;font-size:12px}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.label{background:#fff;border:2px solid #111;padding:14px;border-radius:4px;break-inside:avoid;page-break-inside:avoid}
.top-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px}
.logo{font-size:17px;font-weight:900;color:#f43397}
.oid{font-family:monospace;font-size:10px;color:#6b7280}
.barcode{text-align:center;font-size:16px;letter-spacing:5px;font-family:monospace;border:1px solid #e5e7eb;padding:6px;border-radius:4px;margin:8px 0}
.section{border-top:1px solid #e5e7eb;margin-top:8px;padding-top:8px}
strong{font-size:13px;display:block;margin-bottom:2px}
.sm{font-size:11px;color:#374151;line-height:1.4}
.row{display:flex;justify-content:space-between;font-size:11px;margin:2px 0}
.tag-lbl{font-size:9px;text-transform:uppercase;color:#9ca3af;font-weight:bold;letter-spacing:.5px}
@media print{body{background:#fff;padding:0}.print-bar{display:none}.label{border:1px solid #000}}
</style></head><body>
<div class="print-bar">
  <button onclick="window.print()">🖨 Print All Labels</button>
  <span style="font-size:12px;color:#6b7280">${orders.length} labels · ${groups.length} SKU${groups.length > 1 ? 's' : ''}</span>
</div>
${labelHtml}
</body></html>`;
}

function OrderDetailModal({ order, onClose }) {
  const { bg, icon } = productColor(order.product_name);
  const openLabel = () => window.open(ordersAPI.labelUrl(order.sub_order_id || order.order_id, order.account_id), '_blank');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-gray-200 max-h-[90vh] overflow-y-auto">
        <div className={`w-full h-36 bg-gradient-to-br ${bg} flex items-center justify-center rounded-t-2xl`}>
          <Package size={48} className={icon}/>
        </div>
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">{order.product_name}</h3>
              {order.sku && <p className="text-xs text-gray-400 font-mono mt-0.5">SKU: {order.sku}</p>}
              <p className="text-xs text-[#f43397] mt-0.5">{order.account_name}</p>
            </div>
            <span className={`badge ${statusStyle[order.status] || 'bg-gray-200 text-gray-400'}`}>{order.status}</span>
          </div>
          <div className="space-y-1.5 text-xs">
            {[
              ['Order ID', order.order_id],
              ['Category', order.category || '—'],
              ['Quantity', order.quantity || 1],
              ['Amount', `₹${(order.amount||0).toLocaleString('en-IN')}`],
              ['Customer', order.customer_name],
              ['Phone', order.customer_phone || '—'],
              ['City / State', [order.customer_city, order.customer_state].filter(Boolean).join(', ') || '—'],
              ['Address', order.address || '—'],
              ['Pincode', order.pincode || '—'],
              ['Courier', order.courier || '—'],
              ['Tracking', order.tracking_id || '—'],
              ['Order Date', new Date(order.order_date).toLocaleString('en-IN')],
            ].map(([l,v]) => (
              <div key={l} className="flex justify-between border-b border-gray-100 pb-1.5">
                <span className="text-gray-400">{l}</span>
                <span className="text-gray-700 text-right max-w-[60%]">{String(v)}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-5">
            {(order.status === 'Accepted' || order.status === 'Label Generated') && (
              <button onClick={openLabel} className="flex-1 btn-secondary text-xs flex items-center justify-center gap-1.5">
                <Download size={12}/> Download Label
              </button>
            )}
            <button onClick={onClose} className="flex-1 btn-secondary text-sm">Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SkuLabelsModal({ onClose }) {
  const [skus, setSkus]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('Accepted');

  const fetchSkus = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ordersAPI.skuSummary({ status: statusFilter });
      setSkus(r.data.skus);
    } catch { toast.error('Failed to load SKU data'); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchSkus(); }, [fetchSkus]);

  const openLabels = (orders) => {
    const html = generateBulkLabelsHTML(orders);
    window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
  };

  const totalOrders = skus.reduce((s, x) => s + x.total_orders, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-200 flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-900">Orders by SKU</h3>
            <p className="text-xs text-gray-400 mt-0.5">{skus.length} unique SKUs · {totalOrders} orders</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="input-field text-xs w-auto py-1.5">
              <option value="Accepted">Accepted</option>
              <option value="Label Generated">Label Generated</option>
              <option value="Dispatched">Dispatched</option>
              <option value="all">All Statuses</option>
            </select>
            <button onClick={() => openLabels(skus.flatMap(s => s.orders))} disabled={loading || !skus.length} className="btn-primary text-xs flex items-center gap-1.5 py-1.5">
              <Printer size={13}/> Print All
            </button>
            <button onClick={onClose} className="btn-secondary text-xs py-1.5">Close</button>
          </div>
        </div>
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
              <tr>{['SKU / Product','Account Breakdown','Total Qty','Orders','Labels'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:4}).map((_,i) => (
                <tr key={i} className="border-b border-gray-100">
                  {Array.from({length:5}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>)}
                </tr>
              )) : skus.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-gray-400">No orders for selected status</td></tr>
              ) : skus.map((s, i) => {
                const { bg, icon } = productColor(s.product_name);
                return (
                  <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${bg} flex items-center justify-center flex-shrink-0`}>
                          <Package size={14} className={icon}/>
                        </div>
                        <div>
                          <p className="font-medium text-gray-800 text-xs leading-snug">{s.product_name}</p>
                          {s.sku && <p className="text-xs text-gray-400 font-mono">{s.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {s.accounts.map(acc => (
                          <span key={acc.account_id} className="text-xs bg-[#fef0f7] text-[#f43397] px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                            {acc.account_name}: {acc.qty}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{s.total_qty}</td>
                    <td className="px-4 py-3 text-gray-500">{s.total_orders}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => openLabels(s.orders)} className="px-2 py-1 bg-[#fef0f7] text-[#f43397] hover:bg-[#fce4f3] rounded text-xs flex items-center gap-1 whitespace-nowrap">
                        <Printer size={11}/> {s.total_orders}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DispatchModal({ order, onClose, onDone }) {
  const [trackingId, setTrackingId] = useState('');
  const [saving, setSaving]         = useState(false);

  const handle = async () => {
    setSaving(true);
    try {
      await ordersAPI.dispatch(order.sub_order_id || order.order_id, { account_id: order.account_id, tracking_id: trackingId });
      toast.success('Order dispatched');
      onDone();
      onClose();
    } catch { toast.error('Failed to dispatch'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white border border-gray-300 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-gray-900 font-semibold mb-1">Dispatch Order</h3>
        <p className="text-gray-500 text-sm mb-4">{order.product_name}</p>
        <input className="input-field mb-4" placeholder="Tracking ID (optional)" value={trackingId} onChange={e => setTrackingId(e.target.value)}/>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handle} disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
            {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Truck size={14}/>}
            Dispatch
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  const [orders, setOrders]       = useState([]);
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('');
  const [search, setSearch]       = useState('');
  const [dispatchTarget, setDispatchTarget] = useState(null);
  const [detailTarget, setDetailTarget]     = useState(null);
  const [skuModalOpen, setSkuModalOpen]     = useState(false);
  const limit = 15;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await ordersAPI.all({ status: statusFilter, page, limit, account_id: accountFilter || undefined, search: search || undefined });
      setOrders(r.data.orders);
      setTotal(r.data.total);
    } catch { toast.error('Failed to load orders'); }
    finally { setLoading(false); }
  }, [statusFilter, accountFilter, page, search]);

  useEffect(() => { accountsAPI.list().then(r => setAccounts(r.data)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const handleAccept = async order => {
    try {
      await ordersAPI.accept(order.sub_order_id || order.order_id, order.account_id);
      toast.success('Order accepted');
      load();
    } catch { toast.error('Failed to accept order'); }
  };

  const handleCancel = async order => {
    try {
      await ordersAPI.cancel(order.sub_order_id || order.order_id, { account_id: order.account_id });
      toast.success('Order cancelled');
      load();
    } catch { toast.error('Failed to cancel order'); }
  };

  const handleLabel = order => {
    const url = ordersAPI.labelUrl(order.sub_order_id || order.order_id, order.account_id);
    window.open(url, '_blank');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} orders across all accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSkuModalOpen(true)} className="btn-secondary flex items-center gap-2 text-sm">
            <Printer size={14}/> Labels by SKU
          </button>
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input className="input-field pl-9" placeholder="Search orders, products, customers…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
        </div>
        <select className="input-field w-auto" value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1); }}>
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
          {STATUS_OPTS.map(s => (
            <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===s ? 'bg-[#f43397] text-white' : 'text-gray-400 hover:text-gray-700'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>{['Order ID','Product','Customer','Account','Amount','Status','Date','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i) => (
                <tr key={i} className="border-b border-gray-200">
                  {Array.from({length:8}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>)}
                </tr>
              )) : orders.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-500">No orders found</td></tr>
              ) : orders.map(order => (
                <tr key={`${order.account_id}-${order.order_id}`} className="table-row cursor-pointer" onClick={() => setDetailTarget(order)}>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{order.order_id}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{order.product_name}</td>
                  <td className="px-4 py-3">
                    <p className="text-gray-400 text-xs">{order.customer_name}</p>
                    <p className="text-gray-400 text-xs">{order.customer_city}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{order.account_name}</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">₹{(order.amount||0).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusStyle[order.status] || 'bg-gray-200 text-gray-400'}`}>{order.status}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(order.order_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex gap-1 flex-wrap">
                      {order.status === 'Pending' && (
                        <>
                          <button onClick={() => handleAccept(order)} className="px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-xs transition-colors">Accept</button>
                          <button onClick={() => handleCancel(order)} className="px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs transition-colors">Cancel</button>
                        </>
                      )}
                      {order.status === 'Accepted' && (
                        <>
                          <button onClick={() => handleLabel(order)} className="px-2 py-1 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded text-xs transition-colors flex items-center gap-1"><Tag size={11}/> Label</button>
                          <button onClick={() => setDispatchTarget(order)} className="px-2 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded text-xs transition-colors flex items-center gap-1"><Truck size={11}/> Dispatch</button>
                        </>
                      )}
                      {order.status === 'Label Generated' && (
                        <>
                          <button onClick={() => handleLabel(order)} className="px-2 py-1 bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 rounded text-xs transition-colors flex items-center gap-1"><Download size={11}/> Label</button>
                          <button onClick={() => setDispatchTarget(order)} className="px-2 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded text-xs transition-colors flex items-center gap-1"><Truck size={11}/> Dispatch</button>
                        </>
                      )}
                      {order.status === 'Dispatched' && order.tracking_id && (
                        <span className="text-xs text-gray-500 font-mono">{order.tracking_id}</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</p>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page===1} className="px-3 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 bg-gray-100 rounded-md">Prev</button>
              <span className="px-3 py-1 text-xs text-gray-400">{page}/{totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 bg-gray-100 rounded-md">Next</button>
            </div>
          </div>
        )}
      </div>

      {dispatchTarget && <DispatchModal order={dispatchTarget} onClose={() => setDispatchTarget(null)} onDone={load}/>}
      {detailTarget && <OrderDetailModal order={detailTarget} onClose={() => setDetailTarget(null)}/>}
      {skuModalOpen && <SkuLabelsModal onClose={() => setSkuModalOpen(false)}/>}
    </div>
  );
}
