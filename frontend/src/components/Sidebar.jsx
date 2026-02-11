import React from 'react';
import { LayoutDashboard, Database, Zap, Calendar } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const menuItems = [
  { name: 'Overview', icon: LayoutDashboard },
  { name: 'Data Studio', icon: Database },
  { name: 'Generator', icon: Zap },
  { name: 'Schedules', icon: Calendar },
];

function Sidebar({ currentTab, setCurrentTab }) {
  return (
    <div className="w-64 bg-white border-r border-slate-200 h-screen flex flex-col fixed left-0 top-0">
      <div className="p-6">
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <span role="img" aria-label="grad-cap">🎓</span>
          Cadence
        </h1>
      </div>
      <nav className="flex-1 px-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.name}
            onClick={() => setCurrentTab(item.name)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors",
              currentTab === item.name
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            )}
          >
            <item.icon size={18} />
            {item.name}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
