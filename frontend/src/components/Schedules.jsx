import React, { useState, useEffect } from 'react';
import { getSchedules, getSchedule } from '../api';
import TimetableGrid from './TimetableGrid';

function Schedules() {
  const [fileList, setFileList] = useState([]);
  const [selectedFile, setSelectedFile] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getSchedules().then(res => {
      setFileList(res.data);
      if (res.data.length > 0) {
        setSelectedFile(res.data[0]);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedFile) {
      setLoading(true);
      getSchedule(selectedFile)
        .then(res => setScheduleData(res.data))
        .finally(() => setLoading(false));
    }
  }, [selectedFile]);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Routine Hub</h2>
        <p className="text-slate-500 mt-1">View and export generated timetables for classes and teachers.</p>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar for file selection */}
        <div className="col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Timetable</h3>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {fileList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm italic">
                  <span className="material-icons text-3xl mb-2 block opacity-20">history</span>
                  No routines found. Please run the generator.
                </div>
              ) : (
                fileList.map(file => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between group ${
                      selectedFile === file
                        ? 'bg-primary/10 text-primary shadow-sm border border-primary/10'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{file.replace('.html', '').replace(/_/g, ' ')}</span>
                    <span className={`material-icons text-sm transition-all ${selectedFile === file ? 'translate-x-0 opacity-100' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`}>chevron_right</span>
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
                <p>Select a timetable from the sidebar to view detailed schedule</p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedules;
