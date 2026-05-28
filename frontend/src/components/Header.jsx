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
    <header className="flex items-center justify-between px-6 py-3 bg-gray-900 border-b border-gray-800 flex-shrink-0">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-gray-200 font-semibold text-sm hidden sm:block">
          Meesho Multi-Account Panel
        </h1>
      </div>

      <div className="flex items-center gap-2">
        <button className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-lg relative transition-colors">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-pink-500 rounded-full" />
        </button>

        <div className="flex items-center gap-2 pl-2 border-l border-gray-700">
          <div className="w-7 h-7 bg-gradient-to-br from-pink-500 to-pink-700 rounded-full flex items-center justify-center">
            <User size={14} className="text-white" />
          </div>
          <div className="hidden sm:block">
            <p className="text-sm text-gray-200 font-medium leading-none">{user?.username}</p>
            <p className="text-xs text-gray-500 leading-none mt-0.5 capitalize">{user?.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="ml-1 p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
