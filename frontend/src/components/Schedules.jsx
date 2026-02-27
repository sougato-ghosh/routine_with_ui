import React, { useState, useEffect, useRef } from 'react';
import { getSchedules, getSchedule, viewSchedule, deleteSchedule, deleteAllSchedules, importCSV, exportCSV } from '../api';
import TimetableGrid from './TimetableGrid';

function Schedules() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [scheduleList, setScheduleList] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState(null);
  const [scheduleMeta, setScheduleMeta] = useState(null);
  const [viewType, setViewType] = useState('class'); // 'class' or 'teacher'
  const [selectedItem, setSelectedItem] = useState('');
  const [gridData, setGridData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [metaLoading, setMetaLoading] = useState(false);
  const scheduleFileInputRef = useRef(null);
  const assignmentFileInputRef = useRef(null);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const fetchSchedules = (selectFirst = true) => {
    getSchedules().then(res => {
      setScheduleList(res.data);
      if (selectFirst && res.data.length > 0 && !selectedScheduleId) {
        setSelectedScheduleId(res.data[0].id);
      }
    });
  };

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
        .catch(err => {
            console.error(err);
            setGridData(null);
        })
        .finally(() => setLoading(false));
    } else {
        setGridData(null);
    }
  }, [selectedScheduleId, viewType, selectedItem]);

  const handleDelete = async () => {
    if (!selectedScheduleId) return;
    if (!window.confirm("Are you sure you want to delete this schedule version?")) return;

    try {
        await deleteSchedule(selectedScheduleId);
        const remaining = scheduleList.filter(s => s.id !== parseInt(selectedScheduleId));
        setScheduleList(remaining);
        if (remaining.length > 0) {
            setSelectedScheduleId(remaining[0].id);
        } else {
            setSelectedScheduleId(null);
            setScheduleMeta(null);
            setGridData(null);
        }
    } catch (err) {
        console.error(err);
        alert("Failed to delete schedule");
    }
  };

  const handleDeleteAll = async () => {
    if (!window.confirm("Are you sure you want to delete ALL schedule versions? This action cannot be undone and will clear all your generated routines.")) return;

    try {
        await deleteAllSchedules();
        setScheduleList([]);
        setSelectedScheduleId(null);
        setScheduleMeta(null);
        setGridData(null);
    } catch (err) {
        console.error(err);
        alert("Failed to delete all schedules");
    }
  };

  const handleImportSchedules = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              await importCSV('schedules', file);
              alert('Schedules imported. Now import assignments.');
              fetchSchedules();
          } catch (err) {
              console.error(err);
              alert('Failed to import schedules');
          }
      }
  };

  const handleImportAssignments = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
          try {
              await importCSV('schedule_assignments', file);
              alert('Assignments imported.');
              fetchSchedules();
          } catch (err) {
              console.error(err);
              alert('Failed to import assignments');
          }
      }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Routine Hub</h2>
          <p className="text-slate-500 mt-1">View and export generated timetables for classes and teachers.</p>
        </div>
        <div className="flex items-center gap-2">
            <input type="file" ref={scheduleFileInputRef} onChange={handleImportSchedules} className="hidden" accept=".csv" />
            <input type="file" ref={assignmentFileInputRef} onChange={handleImportAssignments} className="hidden" accept=".csv" />

            <div className="flex flex-col gap-1">
                <button
                    onClick={() => scheduleFileInputRef.current.click()}
                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg transition-colors border border-slate-200"
                >Import Schedules</button>
                <button
                    onClick={() => assignmentFileInputRef.current.click()}
                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg transition-colors border border-slate-200"
                >Import Assignments</button>
            </div>

            <div className="flex flex-col gap-1">
                <button
                    onClick={() => exportCSV('schedules')}
                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg transition-colors border border-slate-200"
                >Export Schedules</button>
                <button
                    onClick={() => exportCSV('schedule_assignments')}
                    className="text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1 rounded-lg transition-colors border border-slate-200"
                >Export Assignments</button>
            </div>
        </div>
      </header>

      <div className="flex gap-4 items-start relative">
        {/* Sidebar for selection */}
        <div className={`transition-all duration-300 ease-in-out ${isSidebarOpen ? 'w-64' : 'w-0 opacity-0 overflow-hidden'} space-y-6 flex-shrink-0`}>
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

        {/* Toggle Button */}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className={`absolute z-10 top-0 left-0 transition-all duration-300 p-2 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 text-slate-400 hover:text-primary ${isSidebarOpen ? 'translate-x-60 -translate-y-2' : '-translate-x-2 -translate-y-2'}`}
          title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          <span className="material-icons text-sm">{isSidebarOpen ? 'chevron_left' : 'chevron_right'}</span>
        </button>

        {/* Main content area */}
        <div className="flex-1 space-y-6 min-w-0">
          {loading ? (
            <div className="h-96 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4 text-slate-400 font-medium">
              <span className="material-icons animate-spin text-primary text-4xl">sync</span>
              Loading Routine...
            </div>
          ) : gridData ? (
            <>
              <div className="flex justify-end gap-3">
                 <button
                   onClick={handleDeleteAll}
                   className="flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                 >
                   <span className="material-icons text-sm">delete_sweep</span>
                   Delete All Versions
                 </button>
                 <button
                   onClick={handleDelete}
                   className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95"
                 >
                   <span className="material-icons text-sm">delete</span>
                   Delete Version
                 </button>
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
