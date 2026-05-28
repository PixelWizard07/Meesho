import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, ShoppingBag, Package,
  Settings, X, TrendingUp,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts', icon: Users, label: 'Accounts' },
  { to: '/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/products', icon: Package, label: 'Products' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/60 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-30
          w-64 flex-shrink-0 flex flex-col
          bg-gray-900 border-r border-gray-800
          transform transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-pink-700 rounded-lg flex items-center justify-center">
              <TrendingUp size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">Meesho</p>
              <p className="text-pink-400 text-xs leading-none mt-0.5">Multi Panel</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-500 hover:text-gray-300 p-1">
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-pink-600/20 text-pink-400 border border-pink-600/30'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-800">
          <p className="text-xs text-gray-600 text-center">Meesho Panel v1.0</p>
        </div>
      </aside>
    </>
  );
}
