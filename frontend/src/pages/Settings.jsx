import React, { useState } from 'react';
import { Shield, User, Key, Bell, Info, CheckCircle } from 'lucide-react';
import { authAPI } from '../api/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

function Section({ icon: Icon, title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-2.5 mb-5 pb-4 border-b border-gray-800">
        <div className="w-8 h-8 bg-pink-500/10 rounded-lg flex items-center justify-center">
          <Icon size={16} className="text-pink-400" />
        </div>
        <h3 className="text-white font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (pwForm.new_password !== pwForm.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }
    if (pwForm.new_password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setSaving(true);
    try {
      await authAPI.changePassword({ current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password changed successfully');
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-white">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your panel account and preferences</p>
      </div>

      {/* Profile */}
      <Section icon={User} title="Profile">
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Username</label>
              <input className="input-field" value={user?.username || ''} disabled />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Email</label>
              <input className="input-field" value={user?.email || ''} disabled />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Role</label>
            <div className="flex items-center gap-2">
              <span className="badge bg-pink-500/20 text-pink-400 capitalize">{user?.role}</span>
            </div>
          </div>
        </div>
      </Section>

      {/* Change Password */}
      <Section icon={Key} title="Change Password">
        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Current Password</label>
            <input
              type="password"
              className="input-field"
              value={pwForm.current_password}
              onChange={e => setPwForm(f => ({ ...f, current_password: e.target.value }))}
              placeholder="Enter current password"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">New Password</label>
            <input
              type="password"
              className="input-field"
              value={pwForm.new_password}
              onChange={e => setPwForm(f => ({ ...f, new_password: e.target.value }))}
              placeholder="Minimum 6 characters"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Confirm New Password</label>
            <input
              type="password"
              className="input-field"
              value={pwForm.confirm_password}
              onChange={e => setPwForm(f => ({ ...f, confirm_password: e.target.value }))}
              placeholder="Repeat new password"
            />
          </div>
          <button type="submit" disabled={saving} className="btn-primary text-sm">
            {saving ? 'Saving...' : 'Change Password'}
          </button>
        </form>
      </Section>

      {/* API Info */}
      <Section icon={Shield} title="Meesho API Integration">
        <div className="space-y-3 text-sm text-gray-400">
          <p>To connect your Meesho supplier accounts with live data, you need an API token from the Meesho Supplier Panel.</p>
          <div className="bg-gray-800/60 rounded-lg p-4 space-y-2">
            <p className="text-white font-medium text-xs">How to get your API token:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs text-gray-400">
              <li>Log in to your Meesho Supplier Panel</li>
              <li>Go to Settings → API Access</li>
              <li>Generate a new API token</li>
              <li>Copy the token and paste it when adding your account here</li>
            </ol>
          </div>
          <div className="flex items-start gap-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <Info size={15} className="text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-300">
              Without an API token, the panel displays demo data. Add your token in the Accounts section to see live orders and products.
            </p>
          </div>
        </div>
      </Section>

      {/* App info */}
      <Section icon={Info} title="About">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-gray-400">
            <span>Version</span><span className="text-gray-300">1.0.0</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Backend</span><span className="text-gray-300">Node.js + Express</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Database</span><span className="text-gray-300">SQLite</span>
          </div>
          <div className="flex justify-between text-gray-400">
            <span>Frontend</span><span className="text-gray-300">React + Vite + Tailwind</span>
          </div>
        </div>
      </Section>
    </div>
  );
}
