import React, { useState, useEffect } from 'react';
import { getSchedules, getScheduleItems, viewSchedule, deleteSchedule } from '../api';
import TimetableGrid from './TimetableGrid';

function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [items, setItems] = useState({ classes: [], teachers: [] });
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'class'|'teacher', id: string }
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [itemsLoading, setItemsLoading] = useState(false);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = () => {
    getSchedules().then(res => {
      setSchedules(res.data);
      if (res.data.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(res.data[0].id);
      }
    });
  };

  useEffect(() => {
    if (selectedScheduleId) {
      setItemsLoading(true);
      getScheduleItems(selectedScheduleId)
        .then(res => {
          setItems(res.data);
          // Default to first class if available
          if (res.data.classes.length > 0) {
            setSelectedItem({ type: 'class', id: res.data.classes[0].id });
          } else if (res.data.teachers.length > 0) {
            setSelectedItem({ type: 'teacher', id: res.data.teachers[0].id });
          } else {
            setSelectedItem(null);
            setScheduleData(null);
          }
        })
        .finally(() => setItemsLoading(false));
    }
  }, [selectedScheduleId]);

  useEffect(() => {
    if (selectedScheduleId && selectedItem) {
      setLoading(true);
      viewSchedule(selectedScheduleId, selectedItem.type, selectedItem.id)
        .then(res => setScheduleData(res.data))
        .finally(() => setLoading(false));
    }
  }, [selectedScheduleId, selectedItem]);

  const handleDeleteSchedule = async (e, id) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this schedule version?')) {
      await deleteSchedule(id);
      if (selectedScheduleId === id) {
        setSelectedScheduleId('');
      }
      fetchSchedules();
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Routine Hub</h2>
          <p className="text-slate-500 mt-1">View and export generated timetables from the database.</p>
        </div>

        <div className="flex items-center gap-3">
          <label className="text-sm font-bold text-slate-500 uppercase tracking-wider">Version:</label>
          <select
            value={selectedScheduleId}
            onChange={(e) => setSelectedScheduleId(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
          >
            {schedules.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} {s.is_active ? '(Active)' : ''}
              </option>
            ))}
          </select>
          {selectedScheduleId && (
            <button
              onClick={(e) => handleDeleteSchedule(e, selectedScheduleId)}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
              title="Delete this version"
            >
              <span className="material-icons text-xl">delete_outline</span>
            </button>
          )}
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar for item selection */}
        <div className="col-span-3 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Classes</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {itemsLoading ? (
                <div className="p-4 text-center text-slate-400 text-xs animate-pulse">Loading classes...</div>
              ) : items.classes.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs italic">No classes found</div>
              ) : (
                items.classes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedItem({ type: 'class', id: c.id })}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group ${
                      selectedItem?.type === 'class' && selectedItem?.id === c.id
                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/10'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{c.name || c.id}</span>
                  </button>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-b border-t border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Teachers</h3>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {itemsLoading ? (
                <div className="p-4 text-center text-slate-400 text-xs animate-pulse">Loading teachers...</div>
              ) : items.teachers.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs italic">No teachers found</div>
              ) : (
                items.teachers.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedItem({ type: 'teacher', id: t.id })}
                    className={`w-full text-left px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between group ${
                      selectedItem?.type === 'teacher' && selectedItem?.id === t.id
                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/10'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{t.name || t.id}</span>
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
          ) : scheduleData ? (
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
                <TimetableGrid data={scheduleData} />
              </div>
            </>
          ) : (
             <div className="h-96 bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center text-slate-400 font-medium italic p-12 text-center">
                <span className="material-icons text-6xl mb-4 opacity-10">calendar_today</span>
                <p>Select a class or teacher from the sidebar to view detailed schedule</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedules;
