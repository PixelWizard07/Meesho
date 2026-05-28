import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, Package, Settings, X, TrendingUp, RotateCcw, Wallet } from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/accounts',  icon: Users,           label: 'Accounts'  },
  { to: '/orders',    icon: ShoppingBag,     label: 'Orders'    },
  { to: '/returns',   icon: RotateCcw,       label: 'Returns'   },
  { to: '/products',  icon: Package,         label: 'Products'  },
  { to: '/payments',  icon: Wallet,          label: 'Payments'  },
  { to: '/settings',  icon: Settings,        label: 'Settings'  },
];

export default function Sidebar({ open, onClose }) {
  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/20 lg:hidden" onClick={onClose}/>}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex-shrink-0 flex flex-col bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}`}>
        <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center shadow-sm">
              <TrendingUp size={18} className="text-white"/>
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm leading-tight">Meesho Panel</p>
              <p className="text-pink-500 text-xs font-medium">Multi-Account</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-1 rounded-lg"><X size={18}/></button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                ? 'bg-pink-50 text-pink-600 border border-pink-100'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`
            }>
              {({ isActive }) => (<><Icon size={17} className={isActive ? 'text-pink-500' : ''}/>{label}{isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-pink-500"/>}</>)}
            </NavLink>
          ))}
        </nav>
        <div className="px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-gray-400 text-center">Meesho Panel v2.0</p>
        </div>
      </aside>
    </>
  );
}
