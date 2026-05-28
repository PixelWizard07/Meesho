import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Search, Wallet, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import { paymentsAPI, accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

const statusStyle = {
  'Paid'   : 'bg-green-100 text-green-700',
  'Pending': 'bg-amber-100 text-amber-700',
  'Processing': 'bg-blue-100 text-blue-700',
};

export default function PaymentsPage() {
  const [payments, setPayments]   = useState([]);
  const [accounts, setAccounts]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [summary, setSummary]     = useState({ total_earnings: 0, pending_payouts: 0 });
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [accountFilter, setAccountFilter] = useState('');
  const [search, setSearch]       = useState('');
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await paymentsAPI.all({ page, limit, account_id: accountFilter || undefined, search: search || undefined });
      setPayments(r.data.payments);
      setTotal(r.data.total);
      setSummary({ total_earnings: r.data.total_earnings || 0, pending_payouts: r.data.pending_payouts || 0 });
    } catch { toast.error('Failed to load payments'); }
    finally { setLoading(false); }
  }, [page, accountFilter, search]);

  useEffect(() => { accountsAPI.list().then(r => setAccounts(r.data)).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);
  const fmt = n => `₹${Number(n || 0).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Payments</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} settlement records</p>
        </div>
        <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/> Refresh
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.total_earnings)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <TrendingUp size={20} className="text-green-500"/>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Pending Payouts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.pending_payouts)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
              <Clock size={20} className="text-amber-500"/>
            </div>
          </div>
        </div>
        <div className="stat-card">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">Settled</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(summary.total_earnings - summary.pending_payouts)}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <CheckCircle size={20} className="text-blue-500"/>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input className="input-field pl-9" placeholder="Search payments…" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}/>
        </div>
        <select className="input-field w-auto" value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1); }}>
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>{['Payment ID','Account','Orders','Amount','Status','Period','Date'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:8}).map((_,i) => (
                <tr key={i} className="border-b border-gray-200">
                  {Array.from({length:7}).map((_,j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>)}
                </tr>
              )) : payments.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14 text-gray-500">
                  <Wallet size={36} className="mx-auto mb-3 text-gray-700"/>
                  No payment records found
                </td></tr>
              ) : payments.map((p, i) => (
                <tr key={`${p.account_id}-${p.payment_id ?? i}`} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{p.payment_id || '—'}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.account_name}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{p.order_count ?? '—'}</td>
                  <td className="px-4 py-3 text-green-600 font-semibold">{fmt(p.amount)}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${statusStyle[p.status] || 'bg-gray-200 text-gray-400'}`}>{p.status || 'Unknown'}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.period || '—'}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-IN') : '—'}
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
    </div>
  );
}
