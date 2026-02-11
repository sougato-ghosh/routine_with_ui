import React, { useEffect, useState } from 'react';
import { getOverview } from '../api';

function MetricCard({ label, value }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{label}</div>
      <div className="text-3xl font-extrabold text-slate-800">{value}</div>
    </div>
  );
}

function Overview() {
  const [metrics, setMetrics] = useState({ teachers: 0, classes: 0, rooms: 0, load: 0 });

  useEffect(() => {
    getOverview().then(res => setMetrics(res.data)).catch(err => console.error(err));
  }, []);

  return (
    <div>
      <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-1">Department Overview</h2>
      <p className="text-slate-500 mb-8">Summary of academic resources</p>

      <div className="grid grid-cols-4 gap-6">
        <MetricCard label="Teachers" value={metrics.teachers} />
        <MetricCard label="Classes" value={metrics.classes} />
        <MetricCard label="Rooms" value={metrics.rooms} />
        <MetricCard label="Load" value={metrics.load} />
      </div>

      <div className="mt-8 border-t border-slate-200 pt-8">
        <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex items-center gap-3">
          <span role="img" aria-label="lightbulb">💡</span>
          <p className="text-blue-800 text-sm font-medium">
            Start by verifying your data in <strong>Data Studio</strong>, then execute the <strong>Generator</strong>.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Overview;
