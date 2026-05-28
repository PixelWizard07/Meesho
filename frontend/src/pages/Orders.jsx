import React, { useEffect, useState, useCallback } from 'react';
import { Search, Filter, RefreshCw, CheckCircle, XCircle, Truck, Clock } from 'lucide-react';
import { ordersAPI, accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

const STATUS_OPTIONS = ['all', 'Pending', 'Accepted', 'Dispatched', 'Delivered', 'Cancelled'];

const statusStyle = {
  Pending: 'bg-yellow-500/20 text-yellow-400',
  Accepted: 'bg-blue-500/20 text-blue-400',
  Dispatched: 'bg-purple-500/20 text-purple-400',
  Delivered: 'bg-green-500/20 text-green-400',
  Cancelled: 'bg-red-500/20 text-red-400',
};

const statusIcon = {
  Pending: Clock,
  Accepted: CheckCircle,
  Dispatched: Truck,
  Delivered: CheckCircle,
  Cancelled: XCircle,
};

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('all');
  const [accountFilter, setAccountFilter] = useState('');
  const [search, setSearch] = useState('');
  const limit = 15;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await ordersAPI.all({
        status: statusFilter,
        page,
        limit,
        account_id: accountFilter || undefined,
      });
      setOrders(res.data.orders);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, accountFilter, page]);

  useEffect(() => {
    accountsAPI.list().then(r => setAccounts(r.data)).catch(() => {});
    fetchOrders();
  }, [fetchOrders]);

  const handleStatusUpdate = async (order, newStatus) => {
    try {
      await ordersAPI.updateStatus(order.order_id, { account_id: order.account_id, status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      fetchOrders();
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const filtered = search
    ? orders.filter(o =>
        o.order_id.toLowerCase().includes(search.toLowerCase()) ||
        o.product_name.toLowerCase().includes(search.toLowerCase()) ||
        o.customer_name.toLowerCase().includes(search.toLowerCase())
      )
    : orders;

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} orders across all accounts</p>
        </div>
        <button onClick={fetchOrders} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input-field pl-9"
            placeholder="Search orders, products, customers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Account filter */}
        <select
          className="input-field w-auto min-w-[160px]"
          value={accountFilter}
          onChange={e => { setAccountFilter(e.target.value); setPage(1); }}
        >
          <option value="">All Accounts</option>
          {accounts.map(a => (
            <option key={a.id} value={a.id}>{a.account_name}</option>
          ))}
        </select>

        {/* Status filter */}
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Order ID</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Product</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Customer</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Account</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Amount</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Status</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Date</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-gray-800">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-gray-800 rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">No orders found</td>
                </tr>
              ) : (
                filtered.map(order => {
                  const Icon = statusIcon[order.status] || Clock;
                  return (
                    <tr key={`${order.account_id}-${order.order_id}`} className="table-row">
                      <td className="px-4 py-3 font-mono text-xs text-gray-400">{order.order_id}</td>
                      <td className="px-4 py-3 text-gray-300 max-w-[150px] truncate">{order.product_name}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-300 text-xs">{order.customer_name}</p>
                          <p className="text-gray-600 text-xs">{order.customer_city}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{order.account_name}</td>
                      <td className="px-4 py-3 text-green-400 font-medium">₹{order.amount.toLocaleString('en-IN')}</td>
                      <td className="px-4 py-3">
                        <span className={`badge flex items-center gap-1 w-fit ${statusStyle[order.status] || 'bg-gray-700 text-gray-400'}`}>
                          <Icon size={11} /> {order.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {new Date(order.order_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="px-4 py-3">
                        {order.status === 'Pending' && (
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleStatusUpdate(order, 'Accepted')}
                              className="px-2 py-1 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded text-xs transition-colors"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(order, 'Cancelled')}
                              className="px-2 py-1 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded text-xs transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                        {order.status === 'Accepted' && (
                          <button
                            onClick={() => handleStatusUpdate(order, 'Dispatched')}
                            className="px-2 py-1 bg-purple-600/20 text-purple-400 hover:bg-purple-600/30 rounded text-xs transition-colors"
                          >
                            Dispatch
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <p className="text-xs text-gray-500">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 bg-gray-800 rounded-md transition-colors"
              >
                Prev
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const p = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`px-3 py-1 text-xs rounded-md transition-colors ${
                      p === page ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-gray-200 bg-gray-800'
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-xs text-gray-400 hover:text-gray-200 disabled:opacity-30 bg-gray-800 rounded-md transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
