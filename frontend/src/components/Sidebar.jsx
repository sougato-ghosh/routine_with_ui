import React from 'react';
import { cn } from '../utils';
import { logout } from '../api';

const menuItems = [
  { name: 'Overview', icon: 'grid_view', type: 'material' },
  { name: 'Settings', icon: 'settings', type: 'material' },
  { name: 'Teachers', icon: 'person', type: 'symbol' },
  { name: 'Rooms', icon: 'meeting_room', type: 'material' },
  { name: 'Data Studio', icon: 'storage', type: 'material' },
  { name: 'Data Validator', icon: 'fact_check', type: 'material' },
  { name: 'Generator', icon: 'bolt', type: 'material' },
  { name: 'Schedules', icon: 'calendar_today', type: 'material' },
];

function Sidebar({ currentTab, setCurrentTab }) {
  const username = localStorage.getItem('username');

  const handleLogout = () => {
    logout();
    window.location.reload();
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-slate-200 flex flex-col fixed top-0 h-screen z-40">
      <div className="p-6 pb-4 flex items-center gap-2">
        <span className="material-icons text-primary text-3xl">school</span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Cadence</h1>
      </div>

      <div className="px-4 mb-4 relative group">
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all cursor-pointer">
          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="material-icons text-primary text-xl">person</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{username}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">User Account</p>
          </div>
          <span className="material-icons text-slate-400 text-sm">expand_more</span>
        </div>

        <div className="absolute left-4 right-4 top-full pt-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
          <div className="bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium"
            >
              <span className="material-icons text-[18px]">logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setCurrentTab(item.name)}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all font-medium",
              currentTab === item.name
                ? "active-sidebar-item"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            <span className={cn(
              item.type === 'symbol' ? "material-symbols-outlined" : "material-icons",
              "text-[22px]"
            )}>
              {item.icon}
            </span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto px-6 py-4 border-t border-slate-100/50">
        <p className="text-xs text-slate-400 font-medium tracking-wide">
          Developed by BUET ME’24 · C1 Group 1
        </p>
        <p className="text-xs text-slate-300 font-bold italic">
          Imran · Zihad · Ananno · Ruhan · Tasfiyah · Aunkur
        </p>
      </div>
    </aside>
  );
}

export default Sidebar;
