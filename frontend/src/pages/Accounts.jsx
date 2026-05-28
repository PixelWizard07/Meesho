import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Store, ChevronDown, ChevronUp, WifiOff, RefreshCw, LogIn, AlertCircle, CheckCircle2, Mail, Eye, EyeOff, Lock, Zap } from 'lucide-react';
import { accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

function Modal({ title, children, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-gray-900 mb-5">{title}</h3>
        {children}
      </div>
    </div>
  );
}

const statusMeta = {
  connected   : { label:'Connected',       color:'bg-green-100 text-green-700',   Icon: CheckCircle2 },
  expired     : { label:'Session Expired', color:'bg-amber-100 text-amber-700',   Icon: AlertCircle  },
  disconnected: { label:'Not Connected',   color:'bg-gray-100 text-gray-500',     Icon: WifiOff      },
};
function StatusBadge({ status }) {
  const m = statusMeta[status] || statusMeta.disconnected;
  return <span className={`badge flex items-center gap-1 ${m.color}`}><m.Icon size={11}/>{m.label}</span>;
}

function ConnectPasswordModal({ account, onClose, onDone }) {
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handle = async e => {
    e.preventDefault();
    if (!password) return toast.error('Please enter your Meesho password');
    setLoading(true);
    try {
      const r = await accountsAPI.connect(account.id, password);
      toast.success(r.data.message || 'Account connected!');
      onDone(); onClose();
    } catch(err) {
      toast.error(err.response?.data?.error || 'Connection failed. Check your password.');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="w-12 h-12 bg-pink-50 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Lock size={22} className="text-pink-500"/>
        </div>
        <h3 className="text-lg font-bold text-gray-900 text-center mb-1">Connect Account</h3>
        <p className="text-gray-500 text-sm text-center mb-5">{account.account_name}</p>
        <div className="bg-gray-50 rounded-xl p-3 mb-5 flex items-center gap-2">
          <Mail size={14} className="text-gray-400 shrink-0"/>
          <p className="text-sm text-gray-700 font-medium">{account.meesho_email}</p>
        </div>
        <form onSubmit={handle} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1.5">Meesho Password</label>
            <div className="relative">
              <input type={showPass ? 'text' : 'password'} className="input-field pr-10" placeholder="Enter your Meesho password" value={password} onChange={e => setPassword(e.target.value)} autoFocus/>
              <button type="button" onClick={() => setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPass ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <Zap size={15}/>}
            {loading ? 'Connecting & Syncing…' : 'Connect & Sync'}
          </button>
        </form>
        <button onClick={onClose} className="btn-secondary w-full mt-2 text-sm">Cancel</button>
      </div>
    </div>
  );
}

function AccountCard({ account, onDelete, onEdit, onConnect, onDisconnect }) {
  const [expanded, setExpanded] = useState(false);
  const [dash, setDash]         = useState(null);
  const [loading, setLoading]   = useState(false);
  const isConnected = account.login_status === 'connected';

  const loadDash = async () => {
    if (dash) { setExpanded(e=>!e); return; }
    setExpanded(true); setLoading(true);
    try { const r = await accountsAPI.getDashboard(account.id); setDash(r.data); }
    catch { toast.error('Could not load stats'); }
    finally { setLoading(false); }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-pink-200 transition-all duration-200">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-sm ${isConnected ? 'bg-gradient-to-br from-pink-500 to-rose-600' : 'bg-gray-100'}`}>
              <Store size={20} className={isConnected ? 'text-white' : 'text-gray-400'}/>
            </div>
            <div>
              <p className="text-gray-900 font-bold">{account.account_name}</p>
              <p className="text-gray-500 text-xs">{account.store_name}</p>
            </div>
          </div>
          <StatusBadge status={account.login_status}/>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <Mail size={12} className="text-gray-400"/> {account.meesho_email}
        </div>
        {account.last_synced && <p className="text-xs text-gray-400">Last synced {new Date(account.last_synced).toLocaleString('en-IN')}</p>}
      </div>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4 bg-slate-50">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="h-14 bg-gray-200 rounded-xl animate-pulse"/>)}</div>
          ) : dash ? (
            <>
              {dash.is_live && <div className="flex items-center gap-1.5 text-xs text-green-600 mb-3 font-medium"><span className="w-2 h-2 rounded-full bg-green-500 inline-block animate-pulse"/> Live data</div>}
              <div className="grid grid-cols-2 gap-3">
                {[['Total Orders',dash.stats?.total_orders,'text-gray-900'],['Pending',dash.stats?.pending_orders,'text-amber-600'],['Revenue',`₹${(dash.stats?.total_revenue||0).toLocaleString('en-IN')}`,'text-green-600'],['Open Returns',dash.stats?.open_returns,'text-rose-600']].map(([l,v,c])=>(
                  <div key={l} className="bg-white rounded-xl p-3 border border-gray-200 shadow-sm">
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className={`font-bold text-lg ${c}`}>{v}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-1 flex-wrap bg-gray-50/50">
        <button onClick={loadDash} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} Stats
        </button>
        {!isConnected && (
          <button onClick={() => onConnect(account)} className="flex items-center gap-1 text-xs text-pink-600 hover:text-pink-700 px-2 py-1.5 rounded-lg hover:bg-pink-50 transition-colors font-semibold">
            <LogIn size={12}/> Connect
          </button>
        )}
        {account.login_status === 'expired' && (
          <button onClick={() => onConnect(account)} className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 px-2 py-1.5 rounded-lg hover:bg-amber-50 transition-colors font-semibold">
            <RefreshCw size={12}/> Reconnect
          </button>
        )}
        {isConnected && (
          <button onClick={() => onDisconnect(account)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <WifiOff size={12}/> Disconnect
          </button>
        )}
        <button onClick={() => onEdit(account)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 px-2 py-1.5 rounded-lg hover:bg-gray-100 transition-colors">
          <Edit2 size={12}/> Edit
        </button>
        <button onClick={() => onDelete(account)} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-600 px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors ml-auto">
          <Trash2 size={12}/> Remove
        </button>
      </div>
    </div>
  );
}

const empty = { account_name:'', meesho_email:'', store_name:'' };

export default function AccountsPage() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editAcc, setEditAcc]     = useState(null);
  const [connectTarget, setConnectTarget] = useState(null);
  const [deleteTarget, setDeleteTarget]   = useState(null);
  const [form, setForm]           = useState(empty);
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await accountsAPI.list(); setAccounts(r.data); }
    catch { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openEdit = a => { setEditAcc(a); setForm({ account_name:a.account_name, meesho_email:a.meesho_email||'', store_name:a.store_name||'' }); setShowForm(true); };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.account_name || !form.meesho_email) return toast.error('Account name and Meesho email are required');
    setSaving(true);
    try {
      if (editAcc) { await accountsAPI.update(editAcc.id, form); toast.success('Account updated'); }
      else { await accountsAPI.add(form); toast.success('Account saved — click Connect to link it'); }
      setShowForm(false); setEditAcc(null); setForm(empty); load();
    } catch(err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleDisconnect = async acc => {
    try { await accountsAPI.disconnect(acc.id); toast.success('Disconnected'); load(); }
    catch { toast.error('Failed to disconnect'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await accountsAPI.delete(deleteTarget.id); toast.success('Account removed'); setDeleteTarget(null); load(); }
    catch { toast.error('Failed to remove'); }
  };

  const connected    = accounts.filter(a=>a.login_status==='connected').length;
  const disconnected = accounts.filter(a=>a.login_status==='disconnected').length;
  const expired      = accounts.filter(a=>a.login_status==='expired').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Meesho Accounts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{connected} connected · {disconnected+expired} not connected</p>
        </div>
        <button onClick={() => { setEditAcc(null); setForm(empty); setShowForm(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15}/> Add Account
        </button>
      </div>

      {accounts.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-green-600">{connected}</p>
            <p className="text-xs text-green-600 font-medium mt-0.5">Connected</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-500">{disconnected}</p>
            <p className="text-xs text-gray-500 font-medium mt-0.5">Not Connected</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-center shadow-sm">
            <p className="text-2xl font-bold text-amber-600">{expired}</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Session Expired</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-52 bg-white rounded-2xl border border-gray-200 animate-pulse shadow-sm"/>)}</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-white border border-gray-200 rounded-2xl shadow-sm">
          <div className="w-16 h-16 bg-pink-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={30} className="text-pink-400"/>
          </div>
          <h3 className="text-gray-900 font-bold mb-2">No accounts yet</h3>
          <p className="text-gray-500 text-sm mb-5">Add your Meesho supplier email to get started</p>
          <button onClick={() => setShowForm(true)} className="btn-primary inline-flex items-center gap-2 text-sm"><Plus size={15}/> Add First Account</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a => <AccountCard key={a.id} account={a} onConnect={setConnectTarget} onDisconnect={handleDisconnect} onEdit={openEdit} onDelete={setDeleteTarget}/>)}
        </div>
      )}

      {showForm && (
        <Modal title={editAcc ? 'Edit Account' : 'Add Meesho Account'} onClose={() => { setShowForm(false); setEditAcc(null); }}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Account Label *</label>
              <input className="input-field" value={form.account_name} onChange={e => setForm(f=>({...f,account_name:e.target.value}))} placeholder="e.g. My Saree Store"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Store Name <span className="text-gray-400 font-normal">(optional)</span></label>
              <input className="input-field" value={form.store_name} onChange={e => setForm(f=>({...f,store_name:e.target.value}))} placeholder="Display name on Meesho"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Meesho Supplier Email *</label>
              <input className="input-field" type="email" value={form.meesho_email} onChange={e => setForm(f=>({...f,meesho_email:e.target.value}))} placeholder="supplier@gmail.com"/>
            </div>
            <div className="flex items-start gap-2.5 p-3.5 bg-blue-50 border border-blue-100 rounded-xl">
              <Mail size={14} className="text-blue-500 mt-0.5 shrink-0"/>
              <p className="text-xs text-blue-700">After saving, click <strong>Connect</strong> on the card — you will be asked for your Meesho password at that point.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={() => { setShowForm(false); setEditAcc(null); }} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : editAcc ? 'Update' : 'Save Account'}</button>
            </div>
          </form>
        </Modal>
      )}

      {connectTarget && (
        <ConnectPasswordModal account={connectTarget} onClose={() => setConnectTarget(null)} onDone={load}/>
      )}

      {deleteTarget && (
        <Modal title="Remove Account?" onClose={() => setDeleteTarget(null)}>
          <p className="text-gray-500 text-sm mb-6">Remove <strong className="text-gray-900">{deleteTarget.account_name}</strong>? All cached data will be deleted.</p>
          <div className="flex gap-3">
            <button onClick={() => setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} className="btn-danger flex-1">Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
