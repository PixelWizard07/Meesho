import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, ShoppingBag } from 'lucide-react';
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
    if (!form.username || !form.password) return toast.error('Please enter your credentials');
    setLoading(true);
    try {
      await login(form);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch(err) {
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left — Meesho branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[420px] flex-shrink-0 bg-gradient-to-br from-[#f43397] via-[#e0208a] to-[#9b0060] p-10 text-white">
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <span className="text-white font-black text-lg">M</span>
            </div>
            <div>
              <p className="font-bold text-lg leading-none">Meesho Supplier</p>
              <p className="text-white/70 text-xs">Multi-Account Panel</p>
            </div>
          </div>
          <h1 className="text-3xl font-bold leading-snug mb-4">Manage all your<br/>Meesho stores<br/>from one place</h1>
          <p className="text-white/70 text-sm leading-relaxed">View orders, manage returns, generate shipping labels, track payments — all from a single dashboard.</p>
        </div>

        <div className="space-y-3">
          {['Multi-account order management', 'Shipping label generation', 'Return OTP & accept/reject', 'Live payment settlements'].map(f => (
            <div key={f} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <span className="text-white text-xs">✓</span>
              </div>
              <span className="text-white/80 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right — Login form */}
      <div className="flex-1 flex items-center justify-center px-6 bg-[#f5f6fa]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 bg-gradient-to-br from-[#f43397] to-[#c0007b] rounded-xl flex items-center justify-center">
              <span className="text-white font-black text-lg">M</span>
            </div>
            <div>
              <p className="font-bold text-gray-900">Meesho Supplier</p>
              <p className="text-[#f43397] text-xs font-medium">Multi-Account Panel</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm mb-6">Access your supplier panel</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Username</label>
                <input type="text" value={form.username} onChange={e => setForm(f=>({...f,username:e.target.value}))} placeholder="Enter username" className="input-field" autoComplete="username"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Password</label>
                <div className="relative">
                  <input type={showPass?'text':'password'} value={form.password} onChange={e => setForm(f=>({...f,password:e.target.value}))} placeholder="Enter password" className="input-field pr-10" autoComplete="current-password"/>
                  <button type="button" onClick={() => setShowPass(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/> : <LogIn size={16}/>}
                {loading ? 'Signing in…' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5 p-3.5 bg-[#fef0f7] rounded-xl border border-[#fcd4ec]">
              <p className="text-xs text-[#c0007b] font-bold mb-1.5">Default Admin Login</p>
              <p className="text-xs text-gray-600">Username: <span className="font-mono font-bold text-[#f43397]">admin</span></p>
              <p className="text-xs text-gray-600">Password: <span className="font-mono font-bold text-[#f43397]">admin123</span></p>
              <p className="text-xs text-gray-400 mt-2">Each seller has their own login. Admin can create additional users from the Users section.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
