import React, { useState } from 'react';

function CourseDetailsTab({ subjects, loading }) {
  const [selectedTerm, setSelectedTerm] = useState('All');
  const terms = ['All', '1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];

  const filteredSubjects = selectedTerm === 'All'
    ? subjects
    : subjects.filter(s => s.subject_id.startsWith(selectedTerm.split('-')[0]));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[600px]">
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Terms / Semesters</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border-slate-200 bg-slate-50 focus:ring-primary focus:border-primary outline-none" placeholder="Search terms..." type="text"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
          {terms.map(term => (
            <button
              key={term}
              onClick={() => setSelectedTerm(term)}
              className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between group ${
                selectedTerm === term ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <span className="text-sm">{term === 'All' ? 'All Courses' : `Term ${term}`}</span>
              <span className={`material-symbols-outlined text-sm ${selectedTerm === term ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>chevron_right</span>
            </button>
          ))}
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-slate-50/50 gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Courses: {selectedTerm}</h3>
            <p className="text-sm text-slate-500">Managing curriculum subjects</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white hover:bg-primary/90 rounded-lg shadow-sm transition-colors">
              <span className="material-symbols-outlined text-lg">add</span>
              Add Course
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Course ID</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Course Name</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Duration</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="5" className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></td></tr>
              ) : (
                filteredSubjects.map(subject => (
                  <tr key={subject.subject_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-primary">{subject.subject_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">{subject.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded ${
                        subject.required_room_type === 'Lab' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {subject.required_room_type || 'Theory'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{subject.duration} periods</td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                        <span className="material-symbols-outlined text-lg">delete</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default CourseDetailsTab;
