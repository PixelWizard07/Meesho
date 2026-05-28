import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Store, ChevronDown, ChevronUp, Wifi, WifiOff, RefreshCw, LogIn, AlertCircle, CheckCircle2, Clock, Mail, Eye, EyeOff } from 'lucide-react';
import { accountsAPI } from '../api/api';
import toast from 'react-hot-toast';

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

const statusMeta = {
  connected   : { label:'Connected',       color:'bg-green-500/20 text-green-400',  Icon: CheckCircle2 },
  expired     : { label:'Session Expired', color:'bg-orange-500/20 text-orange-400', Icon: AlertCircle  },
  disconnected: { label:'Disconnected',    color:'bg-gray-700 text-gray-400',        Icon: WifiOff      },
};

function StatusBadge({ status }) {
  const m = statusMeta[status] || statusMeta.disconnected;
  return <span className={`badge flex items-center gap-1 ${m.color}`}><m.Icon size={11}/>{m.label}</span>;
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
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isConnected ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-gray-800'}`}>
              <Store size={18} className={isConnected ? 'text-white' : 'text-gray-500'}/>
            </div>
            <div>
              <p className="text-white font-semibold">{account.account_name}</p>
              <p className="text-gray-500 text-xs">{account.store_name}</p>
            </div>
          </div>
          <StatusBadge status={account.login_status}/>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          <Mail size={12} className="text-gray-600"/> {account.meesho_email}
        </div>
        {account.last_synced && <p className="text-xs text-gray-700">Synced {new Date(account.last_synced).toLocaleString('en-IN')}</p>}
      </div>

      {expanded && (
        <div className="border-t border-gray-800 px-5 py-4">
          {loading ? (
            <div className="grid grid-cols-2 gap-3">{[...Array(4)].map((_,i)=><div key={i} className="h-14 bg-gray-800 rounded-lg animate-pulse"/>)}</div>
          ) : dash ? (
            <>
              {dash.is_live && <div className="flex items-center gap-1.5 text-xs text-green-400 mb-3"><Wifi size={12}/> Live data</div>}
              <div className="grid grid-cols-2 gap-3">
                {[['Total Orders',dash.stats?.total_orders,'text-white'],['Pending',dash.stats?.pending_orders,'text-yellow-400'],['Revenue',`₹${(dash.stats?.total_revenue||0).toLocaleString('en-IN')}`,'text-green-400'],['Returns',dash.stats?.open_returns,'text-orange-400']].map(([l,v,c])=>(
                  <div key={l} className="bg-gray-800/60 rounded-lg p-3"><p className="text-xs text-gray-500">{l}</p><p className={`font-bold text-lg ${c}`}>{v}</p></div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      <div className="border-t border-gray-800 px-4 py-3 flex items-center gap-1 flex-wrap">
        <button onClick={loadDash} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors">
          {expanded ? <ChevronUp size={12}/> : <ChevronDown size={12}/>} Stats
        </button>
        {!isConnected && <button onClick={()=>onConnect(account)} className="flex items-center gap-1 text-xs text-pink-400 hover:text-pink-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors"><LogIn size={12}/> Connect</button>}
        {account.login_status==='expired' && <button onClick={()=>onConnect(account)} className="flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors"><RefreshCw size={12}/> Reconnect</button>}
        {isConnected && <button onClick={()=>onDisconnect(account)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors"><WifiOff size={12}/> Disconnect</button>}
        <button onClick={()=>onEdit(account)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors"><Edit2 size={12}/> Edit</button>
        <button onClick={()=>onDelete(account)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 px-2 py-1.5 rounded-md hover:bg-gray-800 transition-colors ml-auto"><Trash2 size={12}/> Remove</button>
      </div>
    </div>
  );
}

const empty = { account_name:'', meesho_email:'', password:'', store_name:'' };

export default function AccountsPage() {
  const [accounts, setAccounts]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editAcc, setEditAcc]     = useState(null);
  const [connecting, setConnecting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm]           = useState(empty);
  const [saving, setSaving]       = useState(false);
  const [showPass, setShowPass]   = useState(false);
  const [connectLoading, setConnectLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { const r = await accountsAPI.list(); setAccounts(r.data); }
    catch { toast.error('Failed to load accounts'); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const openEdit = a => { setEditAcc(a); setForm({ account_name:a.account_name, meesho_email:a.meesho_email||'', password:'', store_name:a.store_name||'' }); setShowForm(true); };

  const handleSave = async e => {
    e.preventDefault();
    if (!form.account_name || !form.meesho_email) return toast.error('Account name and Meesho email are required');
    if (!editAcc && !form.password) return toast.error('Password is required for new accounts');
    setSaving(true);
    try {
      if (editAcc) { await accountsAPI.update(editAcc.id, form); toast.success('Updated'); }
      else { await accountsAPI.add(form); toast.success('Account saved — click Connect to link it to Meesho'); }
      setShowForm(false); setEditAcc(null); setForm(empty); load();
    } catch(err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const handleConnect = async acc => {
    setConnecting(acc);
    setConnectLoading(true);
    try {
      const r = await accountsAPI.connect(acc.id);
      toast.success(r.data.message);
      setConnecting(null);
      load();
    } catch(err) {
      // If credentials are wrong/missing, show edit form instead
      const msg = err.response?.data?.error || 'Connection failed';
      if (msg.includes('credentials') || msg.includes('password')) {
        toast.error(msg);
        setConnecting(null);
        openEdit(acc);
      } else {
        toast.error(msg);
        setConnecting(null);
      }
    } finally { setConnectLoading(false); }
  };

  const handleDisconnect = async acc => {
    try { await accountsAPI.disconnect(acc.id); toast.success('Disconnected'); load(); }
    catch { toast.error('Failed to disconnect'); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try { await accountsAPI.delete(deleteTarget.id); toast.success('Removed'); setDeleteTarget(null); load(); }
    catch { toast.error('Failed to remove'); }
  };

  const connected    = accounts.filter(a=>a.login_status==='connected').length;
  const disconnected = accounts.filter(a=>a.login_status==='disconnected').length;
  const expired      = accounts.filter(a=>a.login_status==='expired').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Meesho Accounts</h1>
          <p className="text-gray-500 text-sm mt-0.5">{connected} connected · {disconnected+expired} not connected</p>
        </div>
        <button onClick={()=>{setEditAcc(null);setForm(empty);setShowForm(true);}} className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15}/> Add Account
        </button>
      </div>

      {accounts.length>0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-green-400">{connected}</p><p className="text-xs text-green-600 mt-0.5">Connected</p></div>
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-gray-400">{disconnected}</p><p className="text-xs text-gray-600 mt-0.5">Disconnected</p></div>
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 text-center"><p className="text-2xl font-bold text-orange-400">{expired}</p><p className="text-xs text-orange-600 mt-0.5">Expired</p></div>
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">{[...Array(3)].map((_,i)=><div key={i} className="h-52 bg-gray-900 rounded-xl border border-gray-800 animate-pulse"/>)}</div>
      ) : accounts.length===0 ? (
        <div className="text-center py-16 bg-gray-900 border border-gray-800 rounded-xl">
          <Store size={42} className="text-gray-700 mx-auto mb-3"/>
          <h3 className="text-white font-semibold mb-2">No accounts yet</h3>
          <p className="text-gray-500 text-sm mb-5">Add your Meesho supplier email & password to get started</p>
          <button onClick={()=>setShowForm(true)} className="btn-primary inline-flex items-center gap-2 text-sm"><Plus size={15}/> Add First Account</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map(a=><AccountCard key={a.id} account={a} onConnect={handleConnect} onDisconnect={handleDisconnect} onEdit={openEdit} onDelete={setDeleteTarget}/>)}
        </div>
      )}

      {/* Add / Edit */}
      {showForm && (
        <Modal title={editAcc ? 'Edit Account' : 'Add Meesho Account'} onClose={()=>{setShowForm(false);setEditAcc(null);}}>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Account Label *</label>
              <input className="input-field" value={form.account_name} onChange={e=>setForm(f=>({...f,account_name:e.target.value}))} placeholder="e.g. My Saree Store"/>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Store Name <span className="text-gray-600">(optional)</span></label>
              <input className="input-field" value={form.store_name} onChange={e=>setForm(f=>({...f,store_name:e.target.value}))} placeholder="Display name on Meesho"/>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Meesho Supplier Email *</label>
              <input className="input-field" type="email" value={form.meesho_email} onChange={e=>setForm(f=>({...f,meesho_email:e.target.value}))} placeholder="supplier@gmail.com"/>
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1.5">Meesho Password {editAcc && <span className="text-gray-600">(leave blank to keep current)</span>} *</label>
              <div className="relative">
                <input className="input-field pr-10" type={showPass?'text':'password'} value={form.password} onChange={e=>setForm(f=>({...f,password:e.target.value}))} placeholder="Meesho supplier account password"/>
                <button type="button" onClick={()=>setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300">{showPass?<EyeOff size={15}/>:<Eye size={15}/>}</button>
              </div>
            </div>
            <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <Mail size={14} className="text-blue-400 mt-0.5 shrink-0"/>
              <p className="text-xs text-blue-300">Enter your Meesho supplier panel login credentials. After saving, click <strong>Connect</strong> to link the account.</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button type="button" onClick={()=>{setShowForm(false);setEditAcc(null);}} className="btn-secondary flex-1">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary flex-1">{saving?'Saving…':editAcc?'Update':'Save Account'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Connecting spinner overlay */}
      {connectLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"/>
            <p className="text-white font-medium">Connecting to Meesho…</p>
            <p className="text-gray-500 text-sm">Logging in with your credentials</p>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <Modal title="Remove Account?" onClose={()=>setDeleteTarget(null)}>
          <p className="text-gray-400 text-sm mb-6">Remove <strong className="text-white">{deleteTarget.account_name}</strong>? All cached data will be deleted.</p>
          <div className="flex gap-3">
            <button onClick={()=>setDeleteTarget(null)} className="btn-secondary flex-1">Cancel</button>
            <button onClick={handleDelete} className="btn-danger flex-1">Remove</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
