import React, { useEffect, useState } from 'react';
import { getOverview } from '../api';

function MetricCard({ label, value, icon, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white ${color}`}>
        <span className="material-icons">{icon}</span>
      </div>
      <div>
        <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-0.5">{label}</div>
        <div className="text-2xl font-black text-slate-800">{value}</div>
      </div>
    </div>
  );
}

function Overview() {
  const [metrics, setMetrics] = useState({ teachers: 0, classes: 0, rooms: 0, load: 0 });

  useEffect(() => {
    getOverview().then(res => setMetrics(res.data)).catch(err => console.error(err));
  }, []);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Department Overview</h2>
        <p className="text-slate-500 mt-1">Summary of academic resources and institutional data.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard label="Teachers" value={metrics.teachers} icon="people" color="bg-indigo-500" />
        <MetricCard label="Classes" value={metrics.classes} icon="groups" color="bg-emerald-500" />
        <MetricCard label="Rooms" value={metrics.rooms} icon="meeting_room" color="bg-amber-500" />
        <MetricCard label="Load" value={metrics.load} icon="assignment" color="bg-primary" />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-8 border-b border-slate-200">
          <h3 className="text-xl font-bold text-slate-900">System Status</h3>
          <p className="text-slate-500 text-sm mt-1">Current operational status of the timetable generator.</p>
        </div>
        <div className="p-8">
          <div className="flex items-start gap-4 p-4 bg-purple-50 border border-purple-100 rounded-xl">
            <span className="material-icons text-primary">info</span>
            <div>
              <h4 className="text-sm font-semibold text-purple-800">Quick Tip</h4>
              <p className="text-sm text-purple-700 mt-1">
                Ensure all Teacher-Course allotments are finalized in the <strong>Data Studio</strong> before running a new generation session.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Overview;
