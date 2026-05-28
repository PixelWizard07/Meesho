import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Search, Eye, CheckCircle, XCircle, KeyRound, Clock, AlertCircle, Package } from 'lucide-react';
import { returnsAPI, accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

const STATUS_OPTS = ['all','Return Requested','Return OTP Shared','Return Received','Refund Initiated','Refund Completed','Return Rejected'];

const statusStyle = {
  'Return Requested' : 'bg-amber-100 text-amber-700',
  'Return OTP Shared': 'bg-blue-100 text-blue-700',
  'Return Received'  : 'bg-violet-100 text-violet-700',
  'Refund Initiated' : 'bg-orange-100 text-orange-700',
  'Refund Completed' : 'bg-green-100 text-green-700',
  'Return Rejected'  : 'bg-red-100 text-red-700',
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

function OTPModal({ ret, onClose }) {
  const [otp, setOtp]       = useState(null);
  const [expiry, setExpiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo]     = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await returnsAPI.getOTP(ret.return_id, ret.account_id);
        setOtp(r.data.otp);
        setExpiry(r.data.expiry);
        setDemo(r.data.demo);
      } catch { toast.error('Failed to get OTP'); onClose(); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-gray-300 rounded-2xl p-6 w-full max-w-sm shadow-2xl text-center">
        <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4"><KeyRound size={24} className="text-blue-500"/></div>
        <h3 className="text-lg font-semibold text-gray-900 mb-1">Return OTP</h3>
        <p className="text-gray-500 text-sm mb-5">{ret.product_name}</p>
        {loading ? (
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"/>
        ) : (
          <>
            <div className="bg-gray-100 rounded-xl py-4 px-6 mb-4">
              <p className="text-4xl font-bold font-mono tracking-widest text-blue-600">{otp}</p>
              {expiry && <p className="text-xs text-gray-400 mt-2">Valid till {new Date(expiry).toLocaleString('en-IN')}</p>}
            </div>
            {demo && <p className="text-xs text-amber-600 mb-3">Demo OTP — connect account for live OTP</p>}
            <p className="text-sm text-gray-500">Share this OTP with the customer to confirm pickup</p>
          </>
        )}
        <button onClick={onClose} className="btn-secondary w-full mt-5">Close</button>
      </div>
    </div>
  );
}

function DetailModal({ ret, onClose, onAccept, onReject }) {
  const [reason, setReason] = useState('');
  const [acting, setActing] = useState('');
  const { bg, icon } = productColor(ret.product_name);

  const act = async (fn, label) => {
    setActing(label);
    await fn();
    setActing('');
    onClose();
  };

  const canAct = ret.status === 'Return Requested' || ret.status === 'Return OTP Shared';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        {ret.images && ret.images.length > 0 ? (
          <div className="flex gap-2 p-4 bg-gray-50 rounded-t-2xl overflow-x-auto">
            {ret.images.map((img, i) => <img key={i} src={img} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0"/>)}
          </div>
        ) : (
          <div className={`w-full h-32 bg-gradient-to-br ${bg} flex items-center justify-center rounded-t-2xl`}>
            <Package size={40} className={icon}/>
          </div>
        )}
        <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-5">Return Details</h3>
        <div className="space-y-3 text-sm">
          {[['Return ID',ret.return_id],['Order ID',ret.order_id],['Product',ret.product_name],['Customer',ret.customer_name],['Phone',ret.customer_phone||'—'],['Amount',`₹${(ret.amount||0).toLocaleString('en-IN')}`],['Reason',ret.reason||'—'],['Date',new Date(ret.return_date).toLocaleString('en-IN')],['Account',ret.account_name]].map(([l,v])=>(
            <div key={l} className="flex justify-between border-b border-gray-200 pb-2">
              <span className="text-gray-500">{l}</span>
              <span className="text-gray-700 text-right max-w-[60%]">{v}</span>
            </div>
          ))}
          <div className="flex justify-between border-b border-gray-200 pb-2">
            <span className="text-gray-500">Status</span>
            <span className={`badge ${statusStyle[ret.status]||'bg-gray-200 text-gray-400'}`}>{ret.status}</span>
          </div>
        </div>

        {canAct && (
          <div className="mt-5 space-y-3">
            <textarea className="input-field text-sm" rows={2} placeholder="Rejection reason (optional)" value={reason} onChange={e=>setReason(e.target.value)}/>
            <div className="flex gap-3">
              <button onClick={()=>act(()=>onAccept(ret,reason),'accept')} disabled={!!acting} className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm">
                {acting==='accept'?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<CheckCircle size={14}/>} Accept Return
              </button>
              <button onClick={()=>act(()=>onReject(ret,reason),'reject')} disabled={!!acting} className="flex-1 btn-danger flex items-center justify-center gap-2 text-sm">
                {acting==='reject'?<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>:<XCircle size={14}/>} Reject
              </button>
            </div>
          </div>
        )}
        <button onClick={onClose} className="btn-secondary w-full mt-3 text-sm">Close</button>
        </div>
      </div>
    </div>
  );
}

const SYNC_INTERVAL = 60000; // 60 seconds

export default function ReturnsPage() {
  const [returns, setReturns]   = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('');
  const [search, setSearch]     = useState('');
  const [otpTarget, setOtpTarget]     = useState(null);
  const [detailTarget, setDetailTarget] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [syncing, setSyncing]   = useState(false);
  const limit = 15;

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setSyncing(true);
    try {
      const r = await returnsAPI.all({ status: statusFilter, page, limit, account_id: accountFilter||undefined, search: search||undefined });
      setReturns(r.data.returns);
      setTotal(r.data.total);
      setLastSync(new Date());
    } catch { if (!silent) toast.error('Failed to load returns'); }
    finally { setLoading(false); setSyncing(false); }
  }, [statusFilter, accountFilter, page, search]);

  useEffect(() => { accountsAPI.list().then(r=>setAccounts(r.data)).catch(()=>{}); }, []);
  useEffect(() => { load(); }, [load]);

  // Auto-sync every 60 seconds
  useEffect(() => {
    const id = setInterval(() => load(true), SYNC_INTERVAL);
    return () => clearInterval(id);
  }, [load]);

  const handleAccept = async (ret) => {
    try { await returnsAPI.accept(ret.return_id, ret.account_id); toast.success('Return accepted'); load(); }
    catch { toast.error('Failed'); }
  };
  const handleReject = async (ret, reason) => {
    try { await returnsAPI.reject(ret.return_id, { account_id: ret.account_id, reason }); toast.success('Return rejected'); load(); }
    catch { toast.error('Failed'); }
  };

  const openReturnCount  = returns.filter(r=>r.status==='Return Requested').length;
  const otpPendingCount  = returns.filter(r=>r.status==='Return OTP Shared').length;
  const totalPages       = Math.ceil(total/limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Returns</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} returns across all accounts · {openReturnCount} need action</p>
        </div>
        <div className="flex items-center gap-3">
          {lastSync && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              {syncing ? <RefreshCw size={11} className="animate-spin text-[#f43397]"/> : <Clock size={11}/>}
              {syncing ? 'Syncing…' : `Synced ${lastSync.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit'})}`}
            </span>
          )}
          <button onClick={() => load()} className="btn-secondary flex items-center gap-2 text-sm"><RefreshCw size={14} className={loading?'animate-spin':''}/> Refresh</button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-card text-center"><p className="text-xl font-bold text-yellow-400">{openReturnCount}</p><p className="text-xs text-gray-500 mt-1">Needs Action</p></div>
        <div className="stat-card text-center"><p className="text-xl font-bold text-blue-400">{otpPendingCount}</p><p className="text-xs text-gray-500 mt-1">OTP Pending</p></div>
        <div className="stat-card text-center"><p className="text-xl font-bold text-green-400">{returns.filter(r=>r.status==='Refund Completed').length}</p><p className="text-xs text-gray-500 mt-1">Refund Done</p></div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"/>
          <input className="input-field pl-9" placeholder="Search returns…" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/>
        </div>
        <select className="input-field w-auto" value={accountFilter} onChange={e=>{setAccountFilter(e.target.value);setPage(1);}}>
          <option value="">All Accounts</option>
          {accounts.map(a=><option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>
        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 overflow-x-auto">
          {STATUS_OPTS.map(s=>(
            <button key={s} onClick={()=>{setStatusFilter(s);setPage(1);}} className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${statusFilter===s?'bg-[#f43397] text-white':'text-gray-400 hover:text-gray-700'}`}>{s==='all'?'All':s}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200">
              <tr>{['Return ID','Product','Customer','Account','Amount','Reason','Status','Date','Actions'].map(h=><th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? Array.from({length:6}).map((_,i)=>(
                <tr key={i} className="border-b border-gray-200">{Array.from({length:9}).map((_,j)=><td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>)}</tr>
              )) : returns.length===0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-gray-500">No returns found</td></tr>
              ) : returns.map(r=>(
                <tr key={`${r.account_id}-${r.return_id}`} className="table-row">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{r.return_id}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[140px] truncate">{r.product_name}</td>
                  <td className="px-4 py-3"><p className="text-gray-400 text-xs">{r.customer_name}</p><p className="text-gray-400 text-xs">{r.customer_phone}</p></td>
                  <td className="px-4 py-3"><span className="text-xs text-[#f43397] bg-[#fef0f7] px-2 py-0.5 rounded-full font-medium">{r.account_name}</span></td>
                  <td className="px-4 py-3 text-rose-600 font-semibold">₹{r.amount.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[100px] truncate">{r.reason}</td>
                  <td className="px-4 py-3"><span className={`badge ${statusStyle[r.status]||'bg-gray-200 text-gray-400'}`}>{r.status}</span></td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(r.return_date).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button onClick={()=>setDetailTarget(r)} className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors" title="View details"><Eye size={13}/></button>
                      {(r.status==='Return Requested'||r.status==='Return OTP Shared') && (
                        <>
                          <button onClick={()=>setOtpTarget(r)} className="px-2 py-1 bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 rounded text-xs transition-colors" title="Get OTP"><KeyRound size={12}/></button>
                          <button onClick={()=>handleAccept(r)} className="px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-xs transition-colors">Accept</button>
                          <button onClick={()=>handleReject(r,'')} className="px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs transition-colors">Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages>1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">Showing {(page-1)*limit+1}–{Math.min(page*limit,total)} of {total}</p>
            <div className="flex gap-1">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1} className="px-3 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 bg-gray-100 rounded-md">Prev</button>
              <span className="px-3 py-1 text-xs text-gray-400">{page}/{totalPages}</span>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages} className="px-3 py-1 text-xs text-gray-400 hover:text-gray-700 disabled:opacity-30 bg-gray-100 rounded-md">Next</button>
            </div>
          </div>
        )}
      </div>

      {otpTarget && <OTPModal ret={otpTarget} onClose={()=>setOtpTarget(null)}/>}
      {detailTarget && <DetailModal ret={detailTarget} onClose={()=>setDetailTarget(null)} onAccept={handleAccept} onReject={handleReject}/>}
    </div>
  );
}
