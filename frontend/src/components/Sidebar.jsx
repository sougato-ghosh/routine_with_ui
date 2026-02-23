import React from 'react';
import { cn } from '../utils';

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
  return (
    <aside className="w-64 bg-sidebar border-r border-slate-200 flex flex-col fixed top-0 h-screen z-40">
      <div className="p-6 flex items-center gap-2">
        <span className="material-icons text-primary text-3xl">school</span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-800">Cadence</h1>
      </div>
      <nav className="flex-1 px-4 space-y-2 mt-4">
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
    </aside>
  );
}

export default Sidebar;
