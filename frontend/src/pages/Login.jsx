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
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-pink-600/10 via-transparent to-purple-600/10 pointer-events-none" />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-700 rounded-2xl mb-4 shadow-lg shadow-pink-500/25">
            <TrendingUp size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Meesho Multi Panel</h1>
          <p className="text-gray-400 text-sm mt-1">Manage all your Meesho accounts in one place</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-lg font-semibold text-white mb-6">Sign in to your panel</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Username or Email</label>
              <input
                type="text"
                value={form.username}
                onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                placeholder="admin"
                className="input-field"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Enter your password"
                  className="input-field pr-10"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <LogIn size={16} />
              )}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-6 p-3 bg-gray-800/60 rounded-lg border border-gray-700">
            <p className="text-xs text-gray-500 font-medium mb-1">Demo Credentials</p>
            <p className="text-xs text-gray-400">Username: <span className="text-pink-400 font-mono">admin</span></p>
            <p className="text-xs text-gray-400">Password: <span className="text-pink-400 font-mono">admin123</span></p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Secure multi-account management for Meesho suppliers
        </p>
      </div>
    </div>
  );
}
