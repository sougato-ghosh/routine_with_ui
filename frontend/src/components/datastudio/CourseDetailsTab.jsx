import React, { useState, useEffect, useRef } from 'react';
import { getData, updateData, importCSV, exportCSV, getSettings } from '../../api';
import { cn } from '../../utils';

function CourseDetailsTab({ activeTerms = [] }) {
  const [selectedTerm, setSelectedTerm] = useState('All');
  const [subjects, setSubjects] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]); // Uses `${class_id}-${subject_id}`
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState({
    class_id: '',
    subject_id: '',
    dept: 'ME',
    name: '',
    duration: 1,
    required_room_type: 'Theory',
    viable_rooms: '',
    is_optional: false
  });
  const fileInputRef = useRef(null);

  const allTerms = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
  const terms = ['All', ...allTerms.filter(t => activeTerms.includes(t))];
  const filteredTerms = terms.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [subjectsRes, settingsRes] = await Promise.all([
        getData('subjects'),
        getSettings()
      ]);
      setSubjects(subjectsRes.data);
      if (settingsRes.data.departments) {
        const depts = settingsRes.data.departments.split(',').map(s => s.trim());
        setDepartments(depts);
        if (depts.length > 0) {
          setNewSubject(prev => ({ ...prev, dept: depts[0] }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch initial data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = () => {
    setLoading(true);
    getData('subjects').then(res => {
      setSubjects(res.data);
      setLoading(false);
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importCSV('subjects', file);
        fetchSubjects();
        alert('Courses imported successfully');
      } catch (err) {
        console.error(err);
        alert('Failed to import courses');
      }
    }
  };

  const handleExport = () => {
    exportCSV('subjects');
  };

  const handleDeleteSubjects = async (idsToDelete) => {
    try {
      setLoading(true);
      const updatedSubjects = subjects.filter(s => !idsToDelete.includes(`${s.class_id}-${s.subject_id}`));
      await updateData('subjects', updatedSubjects);
      setSelectedIds(selectedIds.filter(id => !idsToDelete.includes(id)));
      fetchSubjects();
    } catch (err) {
      console.error(err);
      alert('Failed to delete courses');
      setLoading(false);
    }
  };

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const classId = selectedTerm === 'All' ? newSubject.class_id : selectedTerm.replace('-', '');
      const subjectToAdd = { ...newSubject, class_id: classId };
      await updateData('subjects', [...subjects, subjectToAdd]);
      setIsModalOpen(false);
      setNewSubject({
        class_id: '',
        subject_id: '',
        dept: departments[0] || 'ME',
        name: '',
        duration: 1,
        required_room_type: 'Theory',
        viable_rooms: '',
        is_optional: false
      });
      fetchSubjects();
    } catch (err) {
      console.error(err);
      alert('Failed to add course');
    }
  };

  const filteredSubjects = selectedTerm === 'All'
    ? subjects
    : subjects.filter(s => s.class_id === selectedTerm.replace('-', ''));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col md:flex-row overflow-hidden min-h-[600px] h-full">
      <aside className="w-full md:w-72 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col shrink-0">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Terms / Semesters</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border-slate-200 bg-slate-50 focus:ring-primary focus:border-primary outline-none transition-all"
              placeholder="Search terms..."
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 custom-scrollbar">
          {filteredTerms.map(term => (
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

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-white gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Courses: {selectedTerm === 'All' ? 'All' : `Term ${selectedTerm}`}</h3>
            <p className="text-sm text-slate-500">Managing curriculum subjects</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-base">file_upload</span>
              Import
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              Export
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={() => handleDeleteSubjects(selectedIds)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete ({selectedIds.length})
              </button>
            )}
            <button
              disabled={selectedTerm === 'All'}
              onClick={() => setIsModalOpen(true)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all",
                selectedTerm === 'All' ? "bg-slate-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
              )}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Course
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100 w-12">
                   <input
                    type="checkbox"
                    checked={filteredSubjects.length > 0 && filteredSubjects.every(s => selectedIds.includes(`${s.class_id}-${s.subject_id}`))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allFilteredIds = filteredSubjects.map(s => `${s.class_id}-${s.subject_id}`);
                        setSelectedIds(prev => [...new Set([...prev, ...allFilteredIds])]);
                      } else {
                        const allFilteredIds = filteredSubjects.map(s => `${s.class_id}-${s.subject_id}`);
                        setSelectedIds(selectedIds.filter(id => !allFilteredIds.includes(id)));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Course ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Dept</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Course Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Duration</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Type</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Viable Rooms</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Optional</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="8" className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></td></tr>
              ) : filteredSubjects.length === 0 ? (
                <tr><td colSpan="8" className="p-10 text-center text-slate-500 text-sm">No courses found for this term.</td></tr>
              ) : (
                filteredSubjects.map(subject => {
                  const selectionId = `${subject.class_id}-${subject.subject_id}`;
                  return (
                    <tr key={selectionId} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(selectionId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds([...selectedIds, selectionId]);
                            } else {
                              setSelectedIds(selectedIds.filter(id => id !== selectionId));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                        />
                      </td>
                      <td className="px-6 py-4 font-mono text-sm font-semibold text-primary">{subject.subject_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-600">{subject.dept}</td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900">{subject.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{subject.duration} periods</td>
                      <td className="px-6 py-4 text-sm">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md",
                          subject.required_room_type === 'Lab' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        )}>
                          {subject.required_room_type || 'Theory'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">{subject.viable_rooms || 'Any'}</td>
                      <td className="px-6 py-4 text-sm">
                        {subject.is_optional ? (
                          <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Yes
                          </span>
                        ) : (
                          <span className="text-slate-300 font-bold text-[10px] uppercase tracking-wider">No</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Course</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddSubject} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Subject ID</label>
                  <input
                    required
                    type="text"
                    value={newSubject.subject_id}
                    onChange={e => setNewSubject({...newSubject, subject_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="e.g. CSE101"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                  <select
                    value={newSubject.dept}
                    onChange={e => setNewSubject({...newSubject, dept: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                  >
                    {departments.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course Name</label>
                <input
                  required
                  type="text"
                  value={newSubject.name}
                  onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. Introduction to Programming"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Duration (Periods)</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={newSubject.duration}
                    onChange={e => setNewSubject({...newSubject, duration: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Type</label>
                  <select
                    value={newSubject.required_room_type}
                    onChange={e => setNewSubject({...newSubject, required_room_type: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Lab">Lab</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Viable Rooms (IDs, comma-separated)</label>
                <input
                  type="text"
                  value={newSubject.viable_rooms}
                  onChange={e => setNewSubject({...newSubject, viable_rooms: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. R101, R102 or leave empty for any"
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-slate-700">Optional Course</span>
                  <span className="text-[10px] text-slate-500">Toggle if this is an elective course</span>
                </div>
                <button
                  type="button"
                  onClick={() => setNewSubject({...newSubject, is_optional: !newSubject.is_optional})}
                  className={cn(
                    "w-12 h-6 rounded-full transition-all relative",
                    newSubject.is_optional ? "bg-primary" : "bg-slate-300"
                  )}
                >
                  <div className={cn(
                    "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                    newSubject.is_optional ? "right-1" : "left-1"
                  )} />
                </button>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                >
                  Save Course
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseDetailsTab;
