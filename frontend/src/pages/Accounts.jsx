import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, Edit2, RefreshCw, Store, CheckCircle,
  XCircle, ChevronDown, ChevronUp, Key, Mail, Phone,
} from 'lucide-react';
import { accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h3 className="text-lg font-semibold text-white mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function AccountCard({ account, onDelete, onEdit, onRefresh }) {
  const [expanded, setExpanded] = useState(false);
  const [dashData, setDashData] = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);

  const loadDash = async () => {
    if (dashData) { setExpanded(e => !e); return; }
    setExpanded(true);
    setLoadingDash(true);
    try {
      const res = await accountsAPI.getDashboard(account.id);
      setDashData(res.data);
    } catch {
      toast.error('Failed to load account data');
    } finally {
      setLoadingDash(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center">
              <Store size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">{account.account_name}</p>
              <p className="text-gray-500 text-xs">{account.store_name}</p>
            </div>
          </div>
          <span className={`badge ${account.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {account.status}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <Mail size={13} className="text-gray-600" />
            <span className="truncate text-xs">{account.email}</span>
          </div>
          {account.phone && (
            <div className="flex items-center gap-2 text-gray-400">
              <Phone size={13} className="text-gray-600" />
              <span className="text-xs">{account.phone}</span>
            </div>
          )}
        </div>

        {account.last_synced && (
          <p className="text-xs text-gray-600 mt-2">
            Last synced: {new Date(account.last_synced).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {/* Expanded stats */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          {loadingDash ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : dashData ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500">Total Orders</p>
                <p className="text-white font-bold text-lg">{dashData.stats.total_orders}</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-yellow-400 font-bold text-lg">{dashData.stats.pending_orders}</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500">Revenue</p>
                <p className="text-green-400 font-bold">₹{dashData.stats.total_revenue.toLocaleString('en-IN')}</p>
              </div>
              <div className="bg-gray-800/60 rounded-lg p-3">
                <p className="text-xs text-gray-500">Products</p>
                <p className="text-blue-400 font-bold text-lg">{dashData.stats.active_products}</p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-800 px-5 py-3 flex items-center gap-2">
        <button
          onClick={loadDash}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
        >
          {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {expanded ? 'Hide' : 'View Stats'}
        </button>
        <button
          onClick={() => onEdit(account)}
          className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
        >
          <Edit2 size={13} /> Edit
        </button>
        <button
          onClick={() => onDelete(account)}
          className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors ml-auto"
        >
          <Trash2 size={13} /> Remove
        </button>
      </div>
    </div>
  );
}

const emptyForm = { account_name: '', email: '', phone: '', api_token: '', store_name: '', supplier_id: '' };

export default function AccountsPage() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await accountsAPI.list();
      setAccounts(res.data);
    } catch {
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, []);

  const openAdd = () => { setEditAccount(null); setForm(emptyForm); setShowModal(true); };
  const openEdit = (acc) => {
    setEditAccount(acc);
    setForm({ account_name: acc.account_name, email: acc.email, phone: acc.phone || '', api_token: '', store_name: acc.store_name || '', supplier_id: acc.supplier_id || '' });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.account_name || !form.email) {
      toast.error('Account name and email are required');
      return;
    }
    setSaving(true);
    try {
      if (editAccount) {
        await accountsAPI.update(editAccount.id, form);
        toast.success('Account updated');
      } else {
        await accountsAPI.add(form);
        toast.success('Account added successfully');
      }
      setShowModal(false);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save account');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await accountsAPI.delete(deleteTarget.id);
      toast.success('Account removed');
      setDeleteTarget(null);
      fetchAccounts();
    } catch {
      toast.error('Failed to remove account');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Meesho Accounts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''} connected</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Account
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-48 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
          ))}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <Store size={40} className="text-gray-700 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-2">No accounts added yet</h3>
          <p className="text-gray-500 text-sm mb-4">Add your Meesho supplier accounts to manage them from here</p>
          <button onClick={openAdd} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Your First Account
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              onDelete={setDeleteTarget}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <Modal title={editAccount ? 'Edit Account' : 'Add Meesho Account'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Account Name *</label>
              <input className="input-field" value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="e.g. My Saree Shop" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Store Name</label>
              <input className="input-field" value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} placeholder="Display name on Meesho" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Email / Login ID *</label>
              <input className="input-field" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="supplier@example.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Phone</label>
              <input className="input-field" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Supplier ID</label>
              <input className="input-field" value={form.supplier_id} onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))} placeholder="Meesho supplier ID" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1.5 flex items-center gap-1.5">
                <Key size={13} /> API Token (optional)
              </label>
              <input className="input-field font-mono text-xs" value={form.api_token} onChange={e => setForm(f => ({ ...f, api_token: e.target.value }))} placeholder="Meesho supplier API token" />
              <p className="text-xs text-gray-600 mt-1">Get from Meesho Supplier Panel → Settings → API</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving...' : editAccount ? 'Update' : 'Add Account'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirm */}
      {deleteTarget && (
        <Modal title="Remove Account?" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to remove <strong className="text-white">{deleteTarget.account_name}</strong>? All cached data will be deleted.
          </p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} className="btn-danger flex-1">Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
