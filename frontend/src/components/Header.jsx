import React from 'react';
import { Menu, LogOut, User, Bell, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); toast.success('Logged out'); navigate('/login'); };

  return (
    <header className="flex items-center justify-between px-5 py-3 bg-white border-b border-gray-100 shadow-sm flex-shrink-0 z-10">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-1.5 text-gray-400 hover:text-[#f43397] hover:bg-[#fce4f3] rounded-lg transition-colors">
          <Menu size={20}/>
        </button>
        {/* Meesho-style breadcrumb header */}
        <div className="hidden sm:flex items-center gap-2">
          <span className="text-[#f43397] font-bold text-sm">Meesho</span>
          <span className="text-gray-300">/</span>
          <span className="text-gray-600 text-sm font-medium">Supplier Panel</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="relative p-2 text-gray-400 hover:text-[#f43397] hover:bg-[#fce4f3] rounded-xl transition-colors">
          <Bell size={18}/>
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#f43397] rounded-full"/>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-100 ml-1">
          <div className="w-8 h-8 bg-gradient-to-br from-[#f43397] to-[#c0007b] rounded-full flex items-center justify-center shadow-sm">
            <User size={14} className="text-white"/>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm text-gray-800 font-bold leading-none">{user?.username}</p>
            <p className="text-[10px] text-gray-400 leading-none mt-0.5 capitalize tracking-wide">{user?.role}</p>
          </div>
          <ChevronDown size={14} className="text-gray-400 hidden sm:block"/>
          <button onClick={handleLogout} className="ml-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
            <LogOut size={16}/>
          </button>
        </div>
      </div>
    </header>
  );
}
