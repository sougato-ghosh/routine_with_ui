import React from 'react';
import Sidebar from './Sidebar';

function Layout({ children, currentTab, setCurrentTab }) {
  return (
    <div className="flex min-h-screen bg-slate-50 font-inter">
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />
      <main className="ml-64 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}

export default Layout;
