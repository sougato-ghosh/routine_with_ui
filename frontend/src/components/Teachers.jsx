import React, { useState, useEffect } from 'react';
import { getData } from '../api';
import { cn } from '../utils';
import TeacherProfile from './TeacherProfile';

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData('teachers.csv').then(res => {
      setTeachers(res.data);
      setLoading(false);
    });
  }, []);

  if (selectedTeacher) {
    return <TeacherProfile teacher={selectedTeacher} onBack={() => setSelectedTeacher(null)} />;
  }

  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Teachers</h1>
        <p className="text-slate-500 mt-2">Manage faculty members, their availability, and teaching loads.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px] max-h-[calc(100vh-200px)]">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Faculty List</h2>
            <p className="text-sm text-slate-500 mt-1">Total: {teachers.length} Active Faculty Members</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors">
              <span className="material-symbols-outlined text-base">file_upload</span>
              Import CSV
            </button>
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm">
              <span className="material-symbols-outlined text-base">person_add</span>
              Add Teacher
            </button>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-4 bg-slate-50/50">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            teachers.map((teacher) => (
              <button
                key={teacher.teacher_id}
                onClick={() => setSelectedTeacher(teacher)}
                className="w-full text-left relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">{teacher.name}</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black tracking-wider uppercase">
                          Seniority {teacher.seniority}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">ID: {teacher.teacher_id}</span>
                        <span className="flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">schedule</span>
                          Max {teacher.max_load_week} hrs/week
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-300 group-hover:text-primary transition-colors">chevron_right</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Teachers;
