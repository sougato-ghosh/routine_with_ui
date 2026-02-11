import React, { useState, useEffect } from 'react';
import { getSchedules, getSchedule } from '../api';
import TimetableGrid from './TimetableGrid';
import { Download, ChevronRight, Loader2 } from 'lucide-react';

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
    <div>
      <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6">Routine Hub</h2>

      <div className="grid grid-cols-12 gap-8">
        {/* Sidebar for file selection */}
        <div className="col-span-3">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden sticky top-8">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Select Timetable</h3>
            </div>
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-2 space-y-1">
              {fileList.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-sm italic">
                  No routines found. Please run the generator.
                </div>
              ) : (
                fileList.map(file => (
                  <button
                    key={file}
                    onClick={() => setSelectedFile(file)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between group ${
                      selectedFile === file
                        ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                        : 'text-slate-600 hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <span className="truncate">{file.replace('.html', '')}</span>
                    <ChevronRight size={16} className={`transition-transform ${selectedFile === file ? 'translate-x-0' : '-translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'}`} />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="col-span-9 space-y-6">
          {loading ? (
            <div className="h-96 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col items-center justify-center gap-4 text-slate-400 font-medium">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              Loading Routine...
            </div>
          ) : scheduleData ? (
            <>
              <div className="flex justify-end">
                 <button
                   onClick={() => window.print()}
                   className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-slate-200"
                 >
                   <Download size={18} />
                   Export PDF / Print
                 </button>
              </div>
              <TimetableGrid data={scheduleData} />
            </>
          ) : (
             <div className="h-96 bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl flex items-center justify-center text-slate-400 font-medium italic">
                Select a timetable from the list to view
             </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Schedules;
