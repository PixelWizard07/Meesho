import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ShoppingBag, Package, TrendingUp, Users,
  RefreshCw, Clock, CheckCircle, XCircle, AlertCircle, PlusCircle,
  Wifi, WifiOff, RotateCcw,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar,
} from 'recharts';
import { accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

function StatCard({ icon: Icon, label, value, sub, color = 'pink', loading }) {
  const colors = {
    pink: 'text-pink-500 bg-pink-50',
    blue: 'text-blue-500 bg-blue-50',
    green: 'text-green-500 bg-green-50',
    yellow: 'text-yellow-500 bg-yellow-50',
  };
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
          {loading ? (
            <div className="h-8 w-24 bg-gray-100 rounded animate-pulse mt-2" />
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
          {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    Pending: 'bg-amber-100 text-amber-700',
    Accepted: 'bg-blue-100 text-blue-700',
    Dispatched: 'bg-violet-100 text-violet-700',
    Delivered: 'bg-green-100 text-green-700',
    Cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`badge ${map[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [accountData, setAccountData] = useState(null);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async (showLoader = true) => {
    if (showLoader) setLoading(true);
    else setRefreshing(true);
    try {
      const [aggRes, accountsRes] = await Promise.all([
        accountsAPI.getAggregate(),
        accountsAPI.list(),
      ]);
      setData(aggRes.data);

      if (accountsRes.data.length > 0) {
        const firstAccount = selectedAccount || accountsRes.data[0];
        setSelectedAccount(firstAccount);
        const detailRes = await accountsAPI.getDashboard(firstAccount.id);
        setAccountData(detailRes.data);
      }
    } catch {
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleAccountSwitch = async (account) => {
    setSelectedAccount(account);
    try {
      const res = await accountsAPI.getDashboard(account.id);
      setAccountData(res.data);
    } catch {
      toast.error('Failed to load account data');
    }
  };

  const fmt = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-0.5">Overview across all your Meesho accounts</p>
        </div>
        <button
          onClick={() => fetchData(false)}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Account selector */}
      {data?.accounts?.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {data.accounts.map(acc => {
            const isConnected = acc.login_status === 'connected';
            return (
              <button
                key={acc.id}
                onClick={() => handleAccountSwitch(acc)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  selectedAccount?.id === acc.id
                    ? 'bg-pink-50 border-pink-200 text-pink-600'
                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                }`}
              >
                {isConnected
                  ? <Wifi size={11} className="text-green-400" />
                  : <WifiOff size={11} className="text-gray-600" />}
                {acc.store_name || acc.account_name}
              </button>
            );
          })}
        </div>
      )}

      {/* Global stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Accounts" value={data?.total_accounts ?? 0} color="blue" loading={loading} />
        <StatCard icon={ShoppingBag} label="Total Orders" value={data?.total_orders ?? 0} sub={`${data?.pending_orders ?? 0} pending`} color="pink" loading={loading} />
        <StatCard icon={TrendingUp} label="Total Revenue" value={data ? fmt(data.total_revenue) : '—'} color="green" loading={loading} />
        <StatCard icon={Package} label="Active Products" value={data?.active_products ?? 0} color="yellow" loading={loading} />
      </div>
      {(data?.open_returns ?? 0) > 0 && (
        <div className="flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3">
          <RotateCcw size={16} className="text-orange-600 shrink-0"/>
          <p className="text-sm text-orange-700"><span className="font-bold text-orange-800">{data.open_returns}</span> open return{data.open_returns !== 1 ? 's' : ''} need your attention</p>
          <a href="/returns" className="ml-auto text-xs text-orange-600 hover:text-orange-700 underline whitespace-nowrap">View Returns</a>
        </div>
      )}

      {/* No accounts state */}
      {!loading && data?.total_accounts === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
          <div className="w-14 h-14 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <PlusCircle size={24} className="text-pink-400" />
          </div>
          <h3 className="text-gray-800 font-semibold mb-2">No Meesho accounts added</h3>
          <p className="text-gray-500 text-sm mb-4">Add your Meesho supplier accounts to start managing from this panel</p>
          <Link to="/accounts" className="btn-primary inline-flex items-center gap-2 text-sm">
            <PlusCircle size={15} /> Add Account
          </Link>
        </div>
      )}

      {/* Charts + recent orders */}
      {accountData && (
        <>
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Revenue Chart */}
            <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-gray-800 font-semibold text-sm">Revenue (Last 7 Days)</h3>
                <div className="flex items-center gap-2">
                  {accountData.is_live
                    ? <span className="flex items-center gap-1 text-xs text-green-500"><Wifi size={11} /> Live</span>
                    : <span className="flex items-center gap-1 text-xs text-gray-500"><WifiOff size={11} /> Demo</span>}
                  <span className="text-xs text-gray-600">{selectedAccount?.store_name || selectedAccount?.account_name}</span>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={accountData.revenue_chart}>
                  <defs>
                    <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                    formatter={v => [`₹${v.toLocaleString('en-IN')}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} fill="url(#revGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Orders chart */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-gray-800 font-semibold text-sm mb-4">Orders per Day</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={accountData.revenue_chart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" tick={{ fontSize: 10 }} />
                  <YAxis stroke="#6b7280" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: 8 }}
                  />
                  <Bar dataKey="orders" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white border border-gray-200 rounded-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <h3 className="text-gray-800 font-semibold text-sm">Recent Orders</h3>
              <Link to="/orders" className="text-pink-400 text-xs hover:text-pink-300">View all</Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium font-medium">Order ID</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium font-medium">Product</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium font-medium">Customer</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium font-medium">Amount</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium font-medium">Status</th>
                    <th className="px-5 py-3 text-left text-xs text-gray-500 font-medium font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {accountData.orders.slice(0, 8).map(order => (
                    <tr key={order.order_id} className="table-row">
                      <td className="px-5 py-3 font-mono text-xs text-gray-400">{order.order_id}</td>
                      <td className="px-5 py-3 text-gray-300 max-w-[160px] truncate">{order.product_name}</td>
                      <td className="px-5 py-3 text-gray-400">{order.customer_name}</td>
                      <td className="px-5 py-3 text-green-400 font-medium">₹{order.amount.toLocaleString('en-IN')}</td>
                      <td className="px-5 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-5 py-3 text-gray-500 text-xs">
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
