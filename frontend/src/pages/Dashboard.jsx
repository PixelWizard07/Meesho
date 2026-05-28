import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Package, TrendingUp, Users, RefreshCw, PlusCircle,
  Wifi, WifiOff, ChevronDown, ChevronUp, RotateCcw, Wallet,
  CheckCircle2, AlertCircle, Clock, Tag,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

const orderStatusStyle = {
  Pending  : 'bg-amber-100 text-amber-700',
  Accepted : 'bg-blue-100 text-blue-700',
  'Label Generated': 'bg-indigo-100 text-indigo-700',
  Dispatched: 'bg-violet-100 text-violet-700',
  Delivered : 'bg-green-100 text-green-700',
  Cancelled : 'bg-red-100 text-red-700',
};

function MiniStat({ label, value, color }) {
  return (
    <div className="text-center">
      <p className={`text-xl font-bold ${color}`}>{value ?? 0}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
    </div>
  );
}

function AccountRow({ account, detail, onExpand, expanded, loadingDetail }) {
  const isConnected = account.login_status === 'connected';
  const stats = account.stats || {};

  return (
    <div className="meesho-card">
      {/* Account header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm ${isConnected ? 'bg-gradient-to-br from-[#f43397] to-[#c0007b] text-white' : 'bg-gray-100 text-gray-400'}`}>
            {account.account_name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{account.account_name}</p>
            <p className="text-xs text-gray-400">{account.store_name || account.meesho_email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {isConnected ? (
            <span className="badge bg-green-100 text-green-700 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"/>Live
            </span>
          ) : account.login_status === 'expired' ? (
            <span className="badge bg-amber-100 text-amber-700 flex items-center gap-1"><AlertCircle size={10}/>Expired</span>
          ) : (
            <Link to="/accounts" className="badge bg-gray-100 text-gray-500 flex items-center gap-1 hover:bg-[#fce4f3] hover:text-[#f43397] transition-colors">
              <WifiOff size={10}/>Connect
            </Link>
          )}
          <button onClick={onExpand} className="flex items-center gap-1 text-xs text-gray-500 hover:text-[#f43397] px-2.5 py-1.5 rounded-lg hover:bg-[#fef0f7] transition-colors font-medium">
            {expanded ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
            {expanded ? 'Hide' : 'Details'}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 divide-x divide-gray-100 px-2">
        <div className="py-3 px-3"><MiniStat label="Orders" value={stats.total_orders} color="text-gray-800"/></div>
        <div className="py-3 px-3"><MiniStat label="Pending" value={stats.pending_orders} color="text-amber-600"/></div>
        <div className="py-3 px-3"><MiniStat label="Revenue" value={`₹${((stats.total_revenue||0)/1000).toFixed(1)}k`} color="text-green-600"/></div>
        <div className="py-3 px-3"><MiniStat label="Returns" value={stats.open_returns} color={(stats.open_returns||0)>0?'text-rose-600':'text-gray-800'}/></div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-gray-100 bg-gray-50/50 px-5 py-5">
          {loadingDetail ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-[#f43397] border-t-transparent rounded-full animate-spin"/>
            </div>
          ) : detail ? (
            <div className="space-y-5">
              {/* Revenue chart */}
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Revenue — Last 7 Days</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <AreaChart data={detail.revenue_chart}>
                    <defs>
                      <linearGradient id={`grad-${account.id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f43397" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#f43397" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                    <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 10 }}/>
                    <YAxis stroke="#9ca3af" tick={{ fontSize: 10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`}/>
                    <Tooltip contentStyle={{ backgroundColor:'#fff', border:'1px solid #f0f0f0', borderRadius:8, fontSize:12 }} formatter={v=>[`₹${v.toLocaleString('en-IN')}`, 'Revenue']}/>
                    <Area type="monotone" dataKey="revenue" stroke="#f43397" strokeWidth={2} fill={`url(#grad-${account.id})`}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Recent orders */}
              {detail.orders?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-semibold text-gray-700">Recent Orders</h4>
                    <Link to="/orders" className="text-xs text-[#f43397] hover:underline">View all</Link>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-gray-100">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Order ID','Product','Customer','Amount','Status','Date'].map(h=>(
                            <th key={h} className="px-3 py-2.5 text-left text-xs text-gray-500 font-semibold">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {detail.orders.slice(0,5).map(o=>(
                          <tr key={o.order_id} className="border-t border-gray-50 hover:bg-[#fef0f7] transition-colors">
                            <td className="px-3 py-2.5 font-mono text-xs text-gray-400">{o.order_id}</td>
                            <td className="px-3 py-2.5 text-gray-700 text-xs max-w-[130px] truncate">{o.product_name}</td>
                            <td className="px-3 py-2.5 text-gray-500 text-xs">{o.customer_name}</td>
                            <td className="px-3 py-2.5 text-green-600 text-xs font-semibold">₹{(o.amount||0).toLocaleString('en-IN')}</td>
                            <td className="px-3 py-2.5">
                              <span className={`badge ${orderStatusStyle[o.status]||'bg-gray-100 text-gray-600'}`}>{o.status}</span>
                            </td>
                            <td className="px-3 py-2.5 text-gray-400 text-xs">{new Date(o.order_date).toLocaleDateString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const [aggData, setAggData]       = useState(null);
  const [details, setDetails]       = useState({});      // { accountId: data }
  const [loadingDetail, setLoadingDetail] = useState({}); // { accountId: bool }
  const [expanded, setExpanded]     = useState({});      // { accountId: bool }
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadAgg = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true); else setRefreshing(true);
    try {
      const r = await accountsAPI.getAggregate();
      setAggData(r.data);
    } catch { toast.error('Failed to load dashboard'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { loadAgg(); }, [loadAgg]);

  const toggleAccount = async (accId) => {
    const nowExpanded = !expanded[accId];
    setExpanded(prev => ({ ...prev, [accId]: nowExpanded }));
    if (nowExpanded && !details[accId]) {
      setLoadingDetail(prev => ({ ...prev, [accId]: true }));
      try {
        const r = await accountsAPI.getDashboard(accId);
        setDetails(prev => ({ ...prev, [accId]: r.data }));
      } catch { toast.error('Failed to load account details'); }
      finally { setLoadingDetail(prev => ({ ...prev, [accId]: false })); }
    }
  };

  const fmt = n => new Intl.NumberFormat('en-IN', { style:'currency', currency:'INR', maximumFractionDigits:0 }).format(n||0);

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">All your Meesho accounts in one view</p>
        </div>
        <button onClick={() => loadAgg(false)} disabled={refreshing} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={refreshing ? 'animate-spin text-[#f43397]' : ''}/> Refresh
        </button>
      </div>

      {/* Aggregate stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users,      label:'Total Accounts',  value: aggData?.total_accounts??0,            color:'text-[#f43397]', bg:'bg-[#fef0f7]' },
          { icon: ShoppingBag,label:'Total Orders',    value: aggData?.total_orders??0,              color:'text-blue-500',  bg:'bg-blue-50',   sub:`${aggData?.pending_orders??0} pending` },
          { icon: TrendingUp, label:'Total Revenue',   value: loading ? '—' : fmt(aggData?.total_revenue), color:'text-green-500', bg:'bg-green-50' },
          { icon: Package,    label:'Active Products', value: aggData?.active_products??0,           color:'text-violet-500',bg:'bg-violet-50' },
        ].map(({ icon: Icon, label, value, color, bg, sub }) => (
          <div key={label} className="stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
                {loading ? <div className="h-7 w-20 bg-gray-100 rounded-lg animate-pulse mt-2"/> : <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>}
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
                <Icon size={20} className={color}/>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Returns alert */}
      {(aggData?.open_returns??0) > 0 && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3">
          <RotateCcw size={16} className="text-rose-500 shrink-0"/>
          <p className="text-sm text-rose-700 font-medium">
            <span className="font-bold">{aggData.open_returns}</span> open return{aggData.open_returns!==1?'s':''} need your attention
          </p>
          <Link to="/returns" className="ml-auto text-xs text-rose-600 hover:text-rose-800 font-semibold underline whitespace-nowrap">View Returns →</Link>
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { to:'/orders',   icon:ShoppingBag, label:'Orders',   color:'text-blue-500',   bg:'bg-blue-50'    },
          { to:'/returns',  icon:RotateCcw,   label:'Returns',  color:'text-rose-500',   bg:'bg-rose-50'    },
          { to:'/products', icon:Package,     label:'Products', color:'text-violet-500', bg:'bg-violet-50'  },
          { to:'/payments', icon:Wallet,      label:'Payments', color:'text-green-500',  bg:'bg-green-50'   },
        ].map(({to, icon:Icon, label, color, bg}) => (
          <Link key={to} to={to} className="meesho-card flex flex-col items-center justify-center py-4 gap-2 hover:border-[#f9c4e7] hover:shadow-md transition-all group">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg} group-hover:scale-110 transition-transform`}>
              <Icon size={20} className={color}/>
            </div>
            <p className="text-xs font-semibold text-gray-600 group-hover:text-[#f43397] transition-colors">{label}</p>
          </Link>
        ))}
      </div>

      {/* No accounts state */}
      {!loading && aggData?.total_accounts === 0 && (
        <div className="meesho-card p-12 text-center">
          <div className="w-16 h-16 bg-[#fef0f7] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PlusCircle size={28} className="text-[#f43397]"/>
          </div>
          <h3 className="text-gray-900 font-bold mb-2">No Meesho accounts added yet</h3>
          <p className="text-gray-500 text-sm mb-5">Add your Meesho supplier email to start managing from this panel</p>
          <Link to="/accounts" className="btn-primary inline-flex items-center gap-2 text-sm"><PlusCircle size={15}/> Add Account</Link>
        </div>
      )}

      {/* All accounts — each on same page */}
      {(aggData?.accounts?.length ?? 0) > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-gray-800">All Accounts</h2>
            <Link to="/accounts" className="text-xs text-[#f43397] hover:underline font-medium">Manage accounts →</Link>
          </div>

          {loading ? (
            Array.from({length:2}).map((_,i) => <div key={i} className="meesho-card h-28 animate-pulse bg-gray-50"/>)
          ) : (
            aggData.accounts.map(acc => (
              <AccountRow
                key={acc.id}
                account={acc}
                detail={details[acc.id]}
                loadingDetail={loadingDetail[acc.id]}
                expanded={!!expanded[acc.id]}
                onExpand={() => toggleAccount(acc.id)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
