import React from 'react';
import Sidebar from './Sidebar';

function Layout({ children, currentTab, setCurrentTab }) {
  const isSchedulesTab = currentTab === 'Schedules';

  return (
    <div className="flex min-h-screen bg-background text-slate-900">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="ml-64 flex-1 p-8 overflow-y-auto">
        <div className={isSchedulesTab ? "w-full" : "max-w-7xl mx-auto"}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
