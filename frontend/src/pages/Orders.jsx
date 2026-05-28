import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, CheckCircle, XCircle, Truck, Clock, Download, Tag } from 'lucide-react';
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
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
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
                <tr key={`${order.account_id}-${order.order_id}`} className="table-row">
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
                  <td className="px-4 py-3">
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
    </div>
  );
}
