import React, { useEffect, useState, useCallback } from 'react';
import { Search, RefreshCw, Package, Star, Edit2, ChevronUp, ChevronDown, ToggleLeft, ToggleRight } from 'lucide-react';
import { productsAPI, accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

function InventoryModal({ product, onClose, onSave }) {
  const [qty, setQty] = useState(product.inventory);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await productsAPI.updateInventory(product.product_id, { account_id: product.account_id, quantity: qty });
      toast.success('Inventory updated');
      onSave();
      onClose();
    } catch {
      toast.error('Failed to update inventory');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white border border-gray-300 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="text-gray-900 font-semibold mb-1">Update Inventory</h3>
        <p className="text-gray-500 text-sm mb-4">{product.name}</p>
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => setQty(q => Math.max(0, q - 1))} className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"><ChevronDown size={18} /></button>
          <input
            type="number"
            min="0"
            value={qty}
            onChange={e => setQty(Number(e.target.value))}
            className="input-field text-center text-xl font-bold"
          />
          <button onClick={() => setQty(q => q + 1)} className="w-9 h-9 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center"><ChevronUp size={18} /></button>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Update'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [editInventory, setEditInventory] = useState(null);
  const limit = 12;

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productsAPI.all({
        page, limit,
        account_id: accountFilter || undefined,
        category: categoryFilter || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
        search: search || undefined,
      });
      setProducts(res.data.products);
      setTotal(res.data.total);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [page, accountFilter, categoryFilter, statusFilter, search]);

  useEffect(() => {
    accountsAPI.list().then(r => setAccounts(r.data)).catch(() => {});
    productsAPI.categories().then(r => setCategories(r.data)).catch(() => {});
    fetchProducts();
  }, [fetchProducts]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} products across all accounts</p>
        </div>
        <button onClick={fetchProducts} className="btn-secondary flex items-center gap-2 text-sm">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            className="input-field pl-9"
            placeholder="Search products..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>

        <select className="input-field w-auto" value={accountFilter} onChange={e => { setAccountFilter(e.target.value); setPage(1); }}>
          <option value="">All Accounts</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.account_name}</option>)}
        </select>

        <select className="input-field w-auto" value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
        </select>

        <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1">
          {['all', 'active', 'inactive'].map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize ${
                statusFilter === s ? 'bg-[#f43397] text-white' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Category summary strip */}
      {categories.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {categories.map(c => (
            <button
              key={c.name}
              onClick={() => { setCategoryFilter(c.name); setPage(1); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                categoryFilter === c.name
                  ? 'bg-[#fef0f7] border-[#f9c4e7] text-[#f43397]'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              {c.name} <span className="text-gray-400 ml-1">({c.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-52 bg-white rounded-xl border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-xl">
          <Package size={40} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No products found</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map(product => (
            <div key={`${product.account_id}-${product.product_id}`} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-colors">
              {/* Color block placeholder for image */}
              <div className="w-full h-28 bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg flex items-center justify-center mb-3">
                <Package size={30} className="text-pink-300" />
              </div>

              <div className="space-y-1">
                <p className="text-white text-sm font-medium leading-snug line-clamp-2">{product.name}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#f43397] bg-[#fef0f7] px-2 py-0.5 rounded-full">{product.category}</span>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <Star size={11} fill="currentColor" />
                    <span className="text-xs">{product.rating}</span>
                  </div>
                </div>
                <p className="text-lg font-bold text-gray-900">₹{product.price.toLocaleString('en-IN')}</p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Stock: <span className={`font-medium ${product.inventory < 10 ? 'text-red-400' : 'text-green-400'}`}>{product.inventory}</span></span>
                  <span>Sales: {product.sales}</span>
                </div>
                <p className="text-xs text-gray-600 truncate">{product.account_name}</p>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={async () => {
                    const newStatus = product.status === 'active' ? 'inactive' : 'active';
                    try {
                      await productsAPI.toggle(product.product_id, { account_id: product.account_id, status: newStatus });
                      toast.success(`Product ${newStatus}`);
                      fetchProducts();
                    } catch { toast.error('Failed to toggle product'); }
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs transition-colors ${product.status === 'active' ? 'bg-green-100 text-green-700 hover:bg-green-500/30' : 'bg-gray-200 text-gray-400 hover:bg-gray-600'}`}
                >
                  {product.status === 'active' ? <ToggleRight size={13}/> : <ToggleLeft size={13}/>}
                  {product.status}
                </button>
                <button
                  onClick={() => setEditInventory(product)}
                  className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-gray-700 rounded-md text-xs transition-colors ml-auto"
                >
                  <Edit2 size={11}/> Stock
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">Prev</button>
          <span className="text-gray-500 text-sm">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary text-xs px-3 py-1.5 disabled:opacity-30">Next</button>
        </div>
      )}

      {editInventory && (
        <InventoryModal
          product={editInventory}
          onClose={() => setEditInventory(null)}
          onSave={fetchProducts}
        />
      )}
    </div>
  );
}
