import React, { useState, useEffect, useRef } from 'react';
import { getData, updateData, importCSV, exportCSV, getSettings } from '../api';
import { cn } from '../utils';
import TeacherProfile from './TeacherProfile';

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [seniorityLevels, setSeniorityLevels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState('All');
  const [selectedTeacher, setSelectedTeacher] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTeacher, setNewTeacher] = useState({
    teacher_id: '',
    name: '',
    department: 'ME',
    seniority: 1,
    max_load_day: 6,
    max_load_week: 30
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [teachersRes, settingsRes] = await Promise.all([
        getData('teachers'),
        getSettings()
      ]);
      setTeachers(teachersRes.data);
      if (settingsRes.data.seniority_levels) {
        setSeniorityLevels(settingsRes.data.seniority_levels.split(',').map(s => s.trim()));
      }
      if (settingsRes.data.departments) {
        const depts = settingsRes.data.departments.split(',').map(s => s.trim());
        setDepartments(depts);
        if (depts.length > 0) {
          setNewTeacher(prev => ({ ...prev, department: depts[0] }));
        }
      }
    } catch (err) {
      console.error("Failed to fetch initial data", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = () => {
    setLoading(true);
    getData('teachers').then(res => {
      setTeachers(res.data);
      setLoading(false);
    });
  };

  const getSeniorityLabel = (level) => {
    const idx = parseInt(level) - 1;
    if (idx >= 0 && idx < seniorityLevels.length) {
      return seniorityLevels[idx];
    }
    return `Level ${level}`;
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importCSV('teachers', file);
        fetchTeachers();
        alert('Teachers imported successfully');
      } catch (err) {
        console.error(err);
        alert('Failed to import teachers');
      }
    }
  };

  const handleExport = () => {
    exportCSV('teachers');
  };

  const handleDeleteTeachers = async (idsToDelete) => {
    try {
      setLoading(true);
      const [unavailRes, prefRes] = await Promise.all([
        getData('teacher_unavailability'),
        getData('teacher_preferences')
      ]);

      const updatedTeachers = teachers.filter(t => !idsToDelete.includes(t.teacher_id));
      const updatedUnavail = unavailRes.data.filter(u => !idsToDelete.includes(u.teacher_id));
      const updatedPref = prefRes.data.filter(p => !idsToDelete.includes(p.teacher_id));

      await Promise.all([
        updateData('teachers', updatedTeachers),
        updateData('teacher_unavailability', updatedUnavail),
        updateData('teacher_preferences', updatedPref)
      ]);

      setSelectedIds(selectedIds.filter(id => !idsToDelete.includes(id)));
      fetchTeachers();
    } catch (err) {
      console.error(err);
      alert('Failed to delete teachers');
      setLoading(false);
    }
  };

  const handleAddTeacher = async (e) => {
    e.preventDefault();
    try {
      await updateData('teachers', [...teachers, newTeacher]);
      setIsModalOpen(false);
      setNewTeacher({
        teacher_id: '',
        name: '',
        department: departments[0] || 'ME',
        seniority: 1,
        max_load_day: 6,
        max_load_week: 30
      });
      fetchTeachers();
    } catch (err) {
      console.error(err);
      alert('Failed to add teacher');
    }
  };

  if (selectedTeacher) {
    return <TeacherProfile teacher={selectedTeacher} onBack={() => { setSelectedTeacher(null); setSelectedDept('All'); fetchTeachers(); }} />;
  }

  const filteredTeachers = selectedDept === 'All'
    ? teachers
    : teachers.filter(t => t.department === selectedDept);

  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Teachers</h1>
        <p className="text-slate-500 mt-2">Manage faculty members, their availability, and teaching loads.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px] max-h-[calc(100vh-200px)]">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
          <div className="flex items-center gap-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Faculty List</h2>
              <p className="text-sm text-slate-500 mt-1">Total: {teachers.length} Active Faculty Members</p>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="deptFilter" className="text-sm font-semibold text-slate-700">Filter by Department:</label>
              <select
                id="deptFilter"
                value={selectedDept}
                onChange={(e) => {
                  setSelectedDept(e.target.value);
                  setSelectedIds([]);
                }}
                className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white font-medium text-slate-700"
              >
                <option value="All">All Departments</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-base">file_upload</span>
              Import CSV
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              Export CSV
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={() => handleDeleteTeachers(selectedIds)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
            >
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
            filteredTeachers.map((teacher) => (
              <button
                key={teacher.teacher_id}
                onClick={() => setSelectedTeacher(teacher)}
                className="w-full text-left relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden group"
              >
                <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-primary"></div>
                <div className="px-6 py-5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(teacher.teacher_id)}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, teacher.teacher_id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== teacher.teacher_id));
                        }
                      }}
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                      {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-900">{teacher.name}</h3>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-black tracking-wider uppercase">
                          {teacher.department || 'N/A'}
                        </span>
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-black tracking-wider uppercase">
                          {getSeniorityLabel(teacher.seniority)}
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
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Teacher</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddTeacher} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="teacher_id" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Teacher ID</label>
                  <input
                    id="teacher_id"
                    required
                    type="text"
                    value={newTeacher.teacher_id}
                    onChange={e => setNewTeacher({...newTeacher, teacher_id: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="e.g. T001"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="seniority" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Seniority</label>
                  <select
                    id="seniority"
                    required
                    value={newTeacher.seniority}
                    onChange={e => setNewTeacher({...newTeacher, seniority: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                  >
                    {seniorityLevels.map((label, idx) => (
                      <option key={idx + 1} value={idx + 1}>{label}</option>
                    ))}
                    {newTeacher.seniority > seniorityLevels.length && (
                      <option value={newTeacher.seniority}>Level {newTeacher.seniority}</option>
                    )}
                    {!seniorityLevels.length && !newTeacher.seniority && <option value={1}>Level 1</option>}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                <input
                  id="name"
                  required
                  type="text"
                  value={newTeacher.name}
                  onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. Dr. John Doe"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="department" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Department</label>
                <select
                  id="department"
                  value={newTeacher.department}
                  onChange={e => setNewTeacher({...newTeacher, department: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                >
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <label htmlFor="max_load_day" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max Load/Day</label>
                  <input
                    id="max_load_day"
                    required
                    type="number"
                    value={newTeacher.max_load_day}
                    onChange={e => setNewTeacher({...newTeacher, max_load_day: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="max_load_week" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Max Load/Week</label>
                  <input
                    id="max_load_week"
                    required
                    type="number"
                    value={newTeacher.max_load_week}
                    onChange={e => setNewTeacher({...newTeacher, max_load_week: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
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
                  Save Teacher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Teachers;
