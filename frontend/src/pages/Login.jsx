import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Eye, EyeOff, LogIn } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter your credentials');
      return;
    }
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-white to-rose-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-pink-100/60 via-transparent to-purple-100/40 pointer-events-none"/>

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-rose-600 rounded-2xl mb-4 shadow-xl shadow-pink-300/40">
            <TrendingUp size={28} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Meesho Multi Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage all your Meesho accounts in one place</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-xl shadow-gray-200/80">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Sign in to your panel</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Username</label>
              <input type="text" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} placeholder="admin" className="input-field" autoComplete="username"/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Password</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Enter your password" className="input-field pr-10" autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
              {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <LogIn size={16}/>}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 p-3.5 bg-pink-50 rounded-xl border border-pink-100">
            <p className="text-xs text-pink-700 font-semibold mb-1">Demo Credentials</p>
            <p className="text-xs text-gray-600">Username: <span className="text-pink-600 font-mono font-bold">admin</span></p>
            <p className="text-xs text-gray-600">Password: <span className="text-pink-600 font-mono font-bold">admin123</span></p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">Secure multi-account management for Meesho suppliers</p>
      </div>
    </div>
  );
}
