import React, { useEffect, useState } from 'react';
import {
  Plus, Trash2, Edit2, Store, ChevronDown, ChevronUp,
  Wifi, WifiOff, RefreshCw, KeyRound, Phone, LogIn,
  AlertCircle, CheckCircle2, Clock, ShieldAlert,
} from 'lucide-react';
import { accountsAPI } from '../api/api';
import api from '../api/api';
import toast from 'react-hot-toast';

// ── small helpers ─────────────────────────────────────────────────────────────

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold text-white mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const loginStatusMeta = {
  connected:    { label: 'Connected',    color: 'bg-green-500/20 text-green-400',  icon: CheckCircle2 },
  otp_pending:  { label: 'OTP Pending',  color: 'bg-yellow-500/20 text-yellow-400', icon: Clock },
  expired:      { label: 'Session Expired', color: 'bg-orange-500/20 text-orange-400', icon: AlertCircle },
  disconnected: { label: 'Disconnected', color: 'bg-gray-700 text-gray-400',       icon: WifiOff },
};

function LoginStatusBadge({ status }) {
  const meta = loginStatusMeta[status] || loginStatusMeta.disconnected;
  const Icon = meta.icon;
  return (
    <span className={`badge flex items-center gap-1 ${meta.color}`}>
      <Icon size={11} /> {meta.label}
    </span>
  );
}

// ── OTP / Connect Modal ───────────────────────────────────────────────────────
function ConnectModal({ account, onClose, onSuccess }) {
  const [step, setStep]       = useState(account.login_status === 'otp_pending' ? 'otp' : 'start');
  const [otp, setOtp]         = useState('');
  const [loading, setLoading] = useState(false);
  const [phoneHint, setPhoneHint] = useState('');

  // Use email+password tab
  const [tab, setTab]         = useState('phone'); // 'phone' | 'password'
  const [pwEmail, setPwEmail] = useState('');
  const [pwPass, setPwPass]   = useState('');

  const sendOTP = async () => {
    setLoading(true);
    try {
      const res = await api.post(`/accounts/${account.id}/send-otp`);
      setPhoneHint(res.data.phone_hint || '');
      setStep('otp');
      toast.success(`OTP sent to ${res.data.phone_hint || 'your number'}`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (!otp.trim()) { toast.error('Enter the OTP'); return; }
    setLoading(true);
    try {
      const res = await api.post(`/accounts/${account.id}/verify-otp`, { otp: otp.trim() });
      toast.success(`Account connected! ${res.data.store_name ? `(${res.data.store_name})` : ''}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Wrong OTP, try again');
    } finally {
      setLoading(false);
    }
  };

  const loginPassword = async () => {
    if (!pwEmail || !pwPass) { toast.error('Enter email and password'); return; }
    setLoading(true);
    try {
      const res = await api.post(`/accounts/${account.id}/login-password`, { email: pwEmail, password: pwPass });
      toast.success(`Connected! ${res.data.store_name ? `(${res.data.store_name})` : ''}`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal title={`Connect — ${account.account_name}`} onClose={onClose}>
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-800 rounded-lg p-1 mb-5">
        {[['phone', 'Phone + OTP'], ['password', 'Email + Password']].map(([id, label]) => (
          <button
            key={id}
            onClick={() => { setTab(id); setStep('start'); }}
            className={`flex-1 py-1.5 rounded-md text-xs font-medium transition-colors ${
              tab === id ? 'bg-pink-600 text-white' : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'phone' && (
        <>
          {step === 'start' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <Phone size={15} className="text-blue-400 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-300">
                  An OTP will be sent to the phone number <strong>{account.phone}</strong> linked to this account.
                </p>
              </div>
              <button onClick={sendOTP} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
                {loading
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Phone size={15} />}
                {loading ? 'Sending OTP…' : 'Send OTP to Meesho'}
              </button>
            </div>
          )}

          {step === 'otp' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-400">
                Enter the 6-digit OTP sent to <span className="text-white font-medium">{phoneHint || account.phone}</span>
              </p>
              <input
                className="input-field text-center text-2xl font-mono tracking-widest"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                autoFocus
                onKeyDown={e => e.key === 'Enter' && verifyOTP()}
              />
              <button onClick={verifyOTP} disabled={loading || otp.length < 4} className="btn-primary w-full">
                {loading ? 'Verifying…' : 'Verify & Connect'}
              </button>
              <button onClick={() => setStep('start')} className="btn-secondary w-full text-sm">
                Resend OTP
              </button>
            </div>
          )}
        </>
      )}

      {tab === 'password' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <ShieldAlert size={15} className="text-yellow-400 mt-0.5 shrink-0" />
            <p className="text-xs text-yellow-300">
              Use your Meesho Supplier Panel login email and password.
            </p>
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Meesho Email</label>
            <input className="input-field" type="email" value={pwEmail} onChange={e => setPwEmail(e.target.value)} placeholder="supplier@example.com" />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Password</label>
            <input className="input-field" type="password" value={pwPass} onChange={e => setPwPass(e.target.value)} placeholder="Meesho account password" />
          </div>
          <button onClick={loginPassword} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading
              ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <LogIn size={15} />}
            {loading ? 'Connecting…' : 'Connect Account'}
          </button>
        </div>
      )}

      <button onClick={onClose} className="btn-secondary w-full mt-3 text-sm">Cancel</button>
    </Modal>
  );
}

// ── Account Card ──────────────────────────────────────────────────────────────
function AccountCard({ account, onDelete, onEdit, onConnect, onDisconnect, onRefresh }) {
  const [expanded, setExpanded]   = useState(false);
  const [dashData, setDashData]   = useState(null);
  const [loadingDash, setLoadingDash] = useState(false);

  const loadDash = async () => {
    if (dashData) { setExpanded(e => !e); return; }
    setExpanded(true);
    setLoadingDash(true);
    try {
      const res = await accountsAPI.getDashboard(account.id);
      setDashData(res.data);
    } catch {
      toast.error('Failed to load stats');
    } finally {
      setLoadingDash(false);
    }
  };

  const isConnected = account.login_status === 'connected';

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gray-800'}`}>
              <Store size={18} className={isConnected ? 'text-white' : 'text-gray-500'} />
            </div>
            <div>
              <p className="text-white font-semibold leading-tight">{account.account_name}</p>
              <p className="text-gray-500 text-xs">{account.store_name}</p>
            </div>
          </div>
          <LoginStatusBadge status={account.login_status} />
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Phone size={12} className="text-gray-600" />
          <span>{account.phone || '—'}</span>
        </div>

        {account.last_synced && (
          <p className="text-xs text-gray-700">
            Synced {new Date(account.last_synced).toLocaleString('en-IN')}
          </p>
        )}
      </div>

      {/* Live data stats */}
      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          {loadingDash ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse" />)}
            </div>
          ) : dashData ? (
            <>
              {dashData.is_live && (
                <div className="flex items-center gap-1.5 text-xs text-green-400 mb-3">
                  <Wifi size={12} /> Live data from Meesho
                </div>
              )}
              {!dashData.is_live && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
                  <WifiOff size={12} /> Showing {isConnected ? 'cached' : 'demo'} data
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-white font-bold text-lg">{dashData.stats?.total_orders}</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-yellow-400 font-bold text-lg">{dashData.stats?.pending_orders}</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Revenue</p>
                  <p className="text-green-400 font-bold">₹{(dashData.stats?.total_revenue || 0).toLocaleString('en-IN')}</p>
                </div>
                <div className="bg-gray-800/60 rounded-lg p-3">
                  <p className="text-xs text-gray-500">Products</p>
                  <p className="text-blue-400 font-bold text-lg">{dashData.stats?.active_products}</p>
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* Actions */}
      <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-1 flex-wrap">
        <button onClick={loadDash} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          Stats
        </button>

        {!isConnected && (
          <button onClick={() => onConnect(account)} className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
            <Wifi size={12} /> Connect
          </button>
        )}

        {(account.login_status === 'expired' || account.login_status === 'otp_pending') && (
          <button onClick={() => onConnect(account)} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
            <RefreshCw size={12} /> Reconnect
          </button>
        )}

        {isConnected && (
          <>
            <button onClick={() => { setDashData(null); setExpanded(false); onRefresh(account); }} className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
              <RefreshCw size={12} /> Sync
            </button>
            <button onClick={() => onDisconnect(account)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
              <WifiOff size={12} /> Disconnect
            </button>
          </>
        )}

        <button onClick={() => onEdit(account)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
          <Edit2 size={12} /> Edit
        </button>

        <button onClick={() => onDelete(account)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors ml-auto">
          <Trash2 size={12} /> Remove
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
const emptyForm = { account_name: '', phone: '', password: '', store_name: '' };

export default function AccountsPage() {
  const [accounts, setAccounts]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showAdd, setShowAdd]         = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [connectTarget, setConnectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [form, setForm]               = useState(emptyForm);
  const [saving, setSaving]           = useState(false);

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

  const openEdit = acc => {
    setEditAccount(acc);
    setForm({ account_name: acc.account_name, phone: acc.phone || '', password: '', store_name: acc.store_name || '' });
    setShowAdd(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.account_name || !form.phone) { toast.error('Account name and phone are required'); return; }
    setSaving(true);
    try {
      if (editAccount) {
        await accountsAPI.update(editAccount.id, form);
        toast.success('Account updated');
      } else {
        await accountsAPI.add(form);
        toast.success('Account added — now connect it to Meesho');
      }
      setShowAdd(false);
      setEditAccount(null);
      setForm(emptyForm);
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (acc) => {
    try {
      await api.post(`/accounts/${acc.id}/disconnect`);
      toast.success('Disconnected');
      fetchAccounts();
    } catch {
      toast.error('Failed to disconnect');
    }
  };

  const handleRefresh = async (acc) => {
    try {
      await accountsAPI.getDashboard(acc.id);
      toast.success('Synced');
      fetchAccounts();
    } catch {
      toast.error('Sync failed');
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
      toast.error('Failed to remove');
    }
  };

  const connected    = accounts.filter(a => a.login_status === 'connected').length;
  const disconnected = accounts.filter(a => a.login_status === 'disconnected').length;
  const expired      = accounts.filter(a => a.login_status === 'expired').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Meesho Accounts</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {connected} connected · {disconnected + expired} need attention
          </p>
        </div>
        <button onClick={() => { setEditAccount(null); setForm(emptyForm); setShowAdd(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} /> Add Account
        </button>
      </div>

      {/* Status strip */}
      {accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-green-400">{connected}</p>
            <p className="text-xs text-green-600 mt-0.5">Connected</p>
          </div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-gray-400">{disconnected}</p>
            <p className="text-xs text-gray-600 mt-0.5">Disconnected</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold text-orange-400">{expired}</p>
            <p className="text-xs text-orange-600 mt-0.5">Session Expired</p>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-52 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />)}
        </div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <Store size={42} className="text-gray-700 mx-auto mb-3" />
          <h3 className="text-white font-semibold mb-2">No accounts yet</h3>
          <p className="text-gray-500 text-sm mb-5">
            Add your Meesho supplier accounts and connect them with your phone number + OTP
          </p>
          <button onClick={() => setShowAdd(true)} className="btn-primary inline-flex items-center gap-2 text-sm">
            <Plus size={15} /> Add First Account
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(acc => (
            <AccountCard
              key={acc.id}
              account={acc}
              onConnect={setConnectTarget}
              onDisconnect={handleDisconnect}
              onRefresh={handleRefresh}
              onEdit={openEdit}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showAdd && (
        <Modal title={editAccount ? 'Edit Account' : 'Add Meesho Account'} onClose={() => { setShowAdd(false); setEditAccount(null); }}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Account Name *</label>
              <input className="input-field" value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} placeholder="e.g. My Saree Shop" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Store Display Name</label>
              <input className="input-field" value={form.store_name} onChange={e => setForm(f => ({ ...f, store_name: e.target.value }))} placeholder="Name shown on Meesho" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Meesho Registered Phone *</label>
              <input className="input-field" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+91 9876543210" />
              <p className="text-xs text-gray-600 mt-1">OTP will be sent to this number to connect</p>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Meesho Password <span className="text-gray-600">(optional — for email login)</span></label>
              <input className="input-field" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Meesho account password" />
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setShowAdd(false); setEditAccount(null); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">
                {saving ? 'Saving…' : editAccount ? 'Update' : 'Save & Connect Later'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Connect / OTP modal */}
      {connectTarget && (
        <ConnectModal
          account={connectTarget}
          onClose={() => setConnectTarget(null)}
          onSuccess={fetchAccounts}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Remove Account?" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">
            Remove <strong className="text-white">{deleteTarget.account_name}</strong>?
            All cached orders and products will be deleted.
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
