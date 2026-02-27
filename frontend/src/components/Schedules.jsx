import React, { useState, useEffect } from 'react';
import { getSchedules, getSchedule, viewSchedule } from '../api';
import TimetableGrid from './TimetableGrid';

function Schedules() {
  const [scheduleList, setScheduleList] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [scheduleMeta, setScheduleMeta] = useState(null);
  const [viewType, setViewType] = useState('class'); // 'class' or 'teacher'
  const [selectedItem, setSelectedItem] = useState('');
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);

  useEffect(() => {
    getSchedules().then(res => {
      setScheduleList(res.data);
      if (res.data.length > 0) {
        setSelectedScheduleId(res.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedScheduleId) {
      setMetaLoading(true);
      getSchedule(selectedScheduleId)
        .then(res => {
          setScheduleMeta(res.data);
          if (res.data.classes.length > 0) {
            setSelectedItem(res.data.classes[0]);
            setViewType('class');
          } else if (res.data.teachers.length > 0) {
            setSelectedItem(res.data.teachers[0]);
            setViewType('teacher');
          }
        })
        .finally(() => setMetaLoading(false));
    }
  }, [selectedScheduleId]);

  useEffect(() => {
    if (selectedScheduleId && viewType && selectedItem) {
      setLoading(true);
      viewSchedule(selectedScheduleId, viewType, selectedItem)
        .then(res => setGridData(res.data))
        .finally(() => setLoading(false));
    }
  }, [selectedScheduleId, viewType, selectedItem]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Routine Hub</h2>
        <p className="text-slate-500 mt-1">View and export generated timetables for classes and teachers.</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar for selection */}
        <div className="col-span-3 space-y-6">
          {/* Schedule Version Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Schedule Version</h3>
            </div>
            <div className="p-2">
              <select
                className="w-full p-2 text-sm font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={selectedScheduleId || ''}
                onChange={(e) => setSelectedScheduleId(e.target.value)}
              >
                {scheduleList.map(s => (
                  <option key={s.id} value={s.id}>{s.name} ({s.created_at})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Type Selection */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
             <div className="flex p-1 bg-slate-100 m-2 rounded-xl">
                <button
                  onClick={() => { setViewType('class'); if (scheduleMeta?.classes?.length) setSelectedItem(scheduleMeta.classes[0]); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewType === 'class' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                >Classes</button>
                <button
                  onClick={() => { setViewType('teacher'); if (scheduleMeta?.teachers?.length) setSelectedItem(scheduleMeta.teachers[0]); }}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${viewType === 'teacher' ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-slate-700'}`}
                >Teachers</button>
             </div>

             <div className="max-h-[calc(100vh-400px)] overflow-y-auto p-2 space-y-1 custom-scrollbar">
               {metaLoading ? (
                 <div className="p-4 text-center text-slate-400 text-xs">Loading...</div>
               ) : (
                 (viewType === 'class' ? scheduleMeta?.classes : scheduleMeta?.teachers)?.map(item => (
                   <button
                     key={item}
                     onClick={() => setSelectedItem(item)}
                     className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-between group ${
                       selectedItem === item
                         ? 'bg-primary/10 text-primary shadow-sm border border-primary/10'
                         : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                     }`}
                   >
                     <span className="truncate">{item}</span>
                     <span className={`material-icons text-sm transition-all ${selectedItem === item ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`}>chevron_right</span>
                   </button>
                 ))
               )}
             </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="col-span-9 space-y-6">
          {loading ? (
            <div className="h-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4 text-slate-400 font-medium">
              <span className="material-icons animate-spin text-primary text-4xl">sync</span>
              Loading Routine...
            </div>
          ) : gridData ? (
            <>
              <div className="flex justify-end">
                 <button
                   onClick={() => window.print()}
                   className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200 active:scale-95"
                 >
                   <span className="material-icons text-sm">download</span>
                   Export PDF / Print
                 </button>
              </div>
              <div className="bg-white p-2 rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
                <TimetableGrid data={gridData} />
              </div>
            </>
          ) : (
             <div className="h-96 bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 font-medium italic p-12 text-center">
                <span className="material-icons text-6xl mb-4 opacity-10">calendar_today</span>
                <p>Select a schedule and item from the sidebar to view detailed schedule</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedules;
