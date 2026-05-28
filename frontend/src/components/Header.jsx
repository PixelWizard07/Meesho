import React from 'react';
import { Menu, LogOut, User, Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Header({ onMenuClick }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 bg-white border-b border-gray-200 shadow-sm flex-shrink-0">
      <div className="flex items-center gap-3">
        <button onClick={onMenuClick} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
          <Menu size={20}/>
        </button>
        <h1 className="text-gray-700 font-semibold text-sm hidden sm:block">Meesho Multi-Account Panel</h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg relative transition-colors">
          <Bell size={18}/>
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-pink-500 rounded-full"/>
        </button>

        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-600 rounded-full flex items-center justify-center shadow-sm">
            <User size={14} className="text-white"/>
          </div>
          <div className="hidden sm:block">
            <p className="text-sm text-gray-800 font-semibold leading-none">{user?.username}</p>
            <p className="text-xs text-gray-400 leading-none mt-0.5 capitalize">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="ml-1 p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Logout">
            <LogOut size={16}/>
          </button>
        </div>
      </div>
    </header>
  );
}
