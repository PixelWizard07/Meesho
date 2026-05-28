import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingBag, Package, Settings, X, RotateCcw, Wallet } from 'lucide-react';

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
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-60 flex-shrink-0 flex flex-col bg-white border-r border-gray-100 shadow-md transform transition-transform duration-200 ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden lg:border-0'}`}>

        {/* Meesho logo area */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1">
              {/* Meesho-style logo - M shape with gradient */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#f43397] to-[#c0007b] flex items-center justify-center shadow-sm">
                <span className="text-white font-black text-sm">M</span>
              </div>
            </div>
            <div>
              <p className="text-gray-900 font-bold text-sm leading-tight">Meesho Supplier</p>
              <p className="text-[#f43397] text-[10px] font-semibold tracking-wide">MULTI PANEL</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-gray-400 hover:text-gray-600 p-1"><X size={18}/></button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                ? 'bg-[#fce4f3] text-[#f43397] border border-[#f9c4e7]'
                : 'text-gray-500 hover:text-gray-800 hover:bg-gray-50'}`
            }>
              {({ isActive }) => (
                <>
                  <Icon size={17} className={isActive ? 'text-[#f43397]' : 'text-gray-400'}/>
                  <span>{label}</span>
                  {isActive && <span className="ml-auto w-1.5 h-4 rounded-full bg-[#f43397]"/>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <p className="text-[10px] text-gray-400 text-center tracking-wide uppercase">Powered by Meesho Panel</p>
        </div>
      </aside>
    </>
  );
}
