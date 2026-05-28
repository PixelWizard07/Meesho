import React, { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2, RefreshCw, ShieldCheck, Shield, Mail, User, KeyRound, Users } from 'lucide-react';
import { usersAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const ROLES = ['admin', 'viewer'];

function CreateUserModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ username: '', email: '', password: '', role: 'viewer' });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.email || !form.password) return toast.error('All fields required');
    if (form.password.length < 6) return toast.error('Password must be at least 6 characters');
    setSaving(true);
    try {
      await usersAPI.create(form);
      toast.success(`User "${form.username}" created`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to create user');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl border border-gray-200">
        <h3 className="font-semibold text-gray-900 mb-4">Create Panel User</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Username</label>
            <input className="input-field" placeholder="e.g. rahul_store" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} autoFocus/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Email</label>
            <input className="input-field" type="email" placeholder="user@example.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Password</label>
            <input className="input-field" type="password" placeholder="Min 6 characters" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Role</label>
            <div className="flex gap-2">
              {ROLES.map(r => (
                <button key={r} type="button" onClick={() => setForm(f => ({ ...f, role: r }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border capitalize transition-colors ${form.role === r ? 'bg-[#f43397] text-white border-[#f43397]' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                  {r === 'admin' ? '🛡 Admin' : '👁 Viewer'}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1.5">Admin can manage users & all accounts. Viewer is read-only.</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <UserPlus size={14}/>}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const { user: me } = useAuth();
  const [users, setUsers]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await usersAPI.list();
      setUsers(r.data);
    } catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (u) => {
    if (!confirm(`Delete user "${u.username}"? All their Meesho accounts will also be removed.`)) return;
    try {
      await usersAPI.delete(u.id);
      toast.success(`User "${u.username}" deleted`);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to delete user'); }
  };

  if (me?.role !== 'admin') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <ShieldCheck size={40} className="text-gray-300 mx-auto mb-3"/>
          <p className="text-gray-500">Admin access required to manage users.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Panel Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{users.length} login{users.length !== 1 ? 's' : ''} · each with their own Meesho accounts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="btn-secondary flex items-center gap-2 text-sm">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''}/>
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
            <UserPlus size={14}/> Add User
          </button>
        </div>
      </div>

      {/* Info box */}
      <div className="bg-[#fef0f7] border border-[#fcd4ec] rounded-xl p-4">
        <p className="text-sm text-[#c0007b] font-medium mb-1">Multi-Login System</p>
        <p className="text-xs text-gray-600">Each user logs in with their own username and password. They can only see and manage the Meesho accounts they add themselves. Admins can view all users below.</p>
      </div>

      {/* Users list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-gray-200">
            <tr>{['User','Email','Role','Meesho Accounts','Last Login','Actions'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs text-gray-500 font-medium">{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {loading ? Array.from({ length: 3 }).map((_, i) => (
              <tr key={i} className="border-b border-gray-100">
                {Array.from({ length: 6 }).map((_, j) => <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 rounded animate-pulse"/></td>)}
              </tr>
            )) : users.map(u => (
              <tr key={u.id} className={`border-b border-gray-100 ${u.id === me?.id ? 'bg-[#fef0f7]/50' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f43397] to-[#c0007b] flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-xs font-bold">{u.username.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 text-xs">{u.username}</p>
                      {u.id === me?.id && <span className="text-xs text-[#f43397]">You</span>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{u.email}</td>
                <td className="px-4 py-3">
                  <span className={`badge ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'} flex items-center gap-1 w-fit`}>
                    {u.role === 'admin' ? <ShieldCheck size={11}/> : <Shield size={11}/>} {u.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm font-semibold text-gray-700">{u.account_count}</span>
                  <span className="text-xs text-gray-400 ml-1">account{u.account_count !== 1 ? 's' : ''}</span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {u.last_login ? new Date(u.last_login).toLocaleString('en-IN') : 'Never'}
                </td>
                <td className="px-4 py-3">
                  {u.id !== me?.id ? (
                    <button onClick={() => handleDelete(u)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors" title="Delete user">
                      <Trash2 size={14}/>
                    </button>
                  ) : (
                    <span className="text-xs text-gray-300">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Login info */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2"><Users size={15}/> How multi-login works</h3>
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: UserPlus, title: 'Create Users', desc: 'Admin creates panel users with username, email, password, and role.' },
            { icon: KeyRound, title: 'Separate Logins', desc: 'Each user logs in with their own credentials on the login page.' },
            { icon: Users, title: 'Own Accounts', desc: 'Each user adds and manages their own Meesho supplier accounts — fully isolated.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="flex gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#fef0f7] flex items-center justify-center flex-shrink-0">
                <Icon size={14} className="text-[#f43397]"/>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-900">{title}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={load}/>}
    </div>
  );
}
