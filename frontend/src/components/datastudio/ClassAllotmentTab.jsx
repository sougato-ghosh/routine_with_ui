import React, { useState, useEffect, useRef } from 'react';
import { updateData, importCSV, exportCSV } from '../../api';
import { cn } from '../../utils';

function ClassAllotmentTab({ activeTerms = [], courses, selectedCourse, setSelectedCourse, teachers, classes, curriculum, onSave }) {
  const allTerms = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'].filter(t => activeTerms.includes(t));
  const [selectedTerm, setSelectedTerm] = useState(allTerms[0] || '');
  const [isCourseSidebarOpen, setIsCourseSidebarOpen] = useState(true);
  const [localAllotments, setLocalAllotments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [selectedAllotmentIds, setSelectedAllotmentIds] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAllotment, setNewAllotment] = useState({
    teacher_id: '',
    sections: [],
    periods_per_week: 2
  });
  const [termSearch, setTermSearch] = useState('');
  const [courseSearch, setCourseSearch] = useState('');
  const fileInputRef = useRef(null);

  // When selectedTerm changes, update selectedCourse if it's not in that term
  useEffect(() => {
    if (selectedTerm) {
      const termCode = selectedTerm.replace('-', '');
      const termCourses = courses.filter(c => c.class_id === termCode);
      if (termCourses.length > 0) {
        if (!selectedCourse || selectedCourse.class_id !== termCode) {
          setSelectedCourse(termCourses[0]);
        }
      } else {
        setSelectedCourse(null);
      }
    }
  }, [selectedTerm, courses]);

  // When selectedCourse or curriculum changes, update local allotments
  useEffect(() => {
    if (selectedCourse && curriculum) {
      // Correctly filter allotments for this specific course in this specific term
      const courseAllotments = curriculum.filter(c =>
        c.subject_id === selectedCourse.subject_id &&
        c.class_id.startsWith(selectedCourse.class_id)
      );

      // Group by teacher
      const grouped = courseAllotments.reduce((acc, curr) => {
        const existing = acc.find(a => a.teacher_id === curr.teacher_id);
        if (existing) {
          if (!existing.sections.includes(curr.class_id)) {
            existing.sections.push(curr.class_id);
          }
        } else {
          acc.push({
            teacher_id: curr.teacher_id,
            sections: [curr.class_id],
            periods_per_week: curr.periods_per_week || 2
          });
        }
        return acc;
      }, []);

      setLocalAllotments(grouped);
    } else {
      setLocalAllotments([]);
    }
  }, [selectedCourse, curriculum]);

  const syncCurriculum = async (updatedLocalAllotments) => {
    try {
      if (!selectedCourse) return;

      // 1. Filter out all current allotments for this course
      const otherCurriculum = curriculum.filter(c =>
        !(c.subject_id === selectedCourse.subject_id && c.class_id.startsWith(selectedCourse.class_id))
      );

      // 2. Add updated allotments
      const newEntries = [];
      updatedLocalAllotments.forEach(a => {
        if (a.teacher_id && a.sections.length > 0) {
          a.sections.forEach(clsId => {
            newEntries.push({
              class_id: clsId,
              subject_id: selectedCourse.subject_id,
              dept: selectedCourse.dept,
              teacher_id: a.teacher_id,
              periods_per_week: a.periods_per_week
            });
          });
        }
      });

      const updatedCurriculum = [...otherCurriculum, ...newEntries];
      await updateData('curriculum', updatedCurriculum);
      onSave(); // This triggers data reload in parent
    } catch (err) {
      console.error("Sync failed", err);
    }
  };

  const handleUpdateAllotment = async (idx, key, value) => {
    const next = [...localAllotments];
    next[idx][key] = value;
    setLocalAllotments(next);
    await syncCurriculum(next);
  };

  const toggleSection = async (idx, classId) => {
    const next = [...localAllotments];
    const sections = next[idx].sections;
    if (sections.includes(classId)) {
      next[idx].sections = sections.filter(s => s !== classId);
    } else {
      next[idx].sections = [...sections, classId];
    }
    setLocalAllotments(next);
    await syncCurriculum(next);
  };

  const handleDeleteSelected = async () => {
    const next = localAllotments.filter(a => !selectedAllotmentIds.includes(a.teacher_id));
    setLocalAllotments(next);
    setSelectedAllotmentIds([]);
    await syncCurriculum(next);
  };

  const handleAddAllotment = async (e) => {
    e.preventDefault();
    if (!newAllotment.teacher_id || newAllotment.sections.length === 0) {
      alert("Please select a teacher and at least one section.");
      return;
    }

    // Check if teacher already has allotment for this course
    if (localAllotments.some(a => a.teacher_id === newAllotment.teacher_id)) {
      alert("This teacher is already assigned to this course.");
      return;
    }

    const next = [...localAllotments, newAllotment];
    setLocalAllotments(next);
    setIsAddModalOpen(false);
    setNewAllotment({ teacher_id: '', sections: [], periods_per_week: 2 });
    await syncCurriculum(next);
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importCSV('curriculum', file);
        onSave();
        alert('Curriculum imported successfully');
      } catch (err) {
        console.error(err);
        alert('Failed to import curriculum');
      }
    }
  };

  const handleExport = () => exportCSV('curriculum');

  const filteredTerms = allTerms.filter(t => t.toLowerCase().includes(termSearch.toLowerCase()));
  const termCode = selectedTerm.replace('-', '');
  const termCourses = courses.filter(c => c.class_id === termCode);
  const filteredCourses = termCourses.filter(c =>
    c.name.toLowerCase().includes(courseSearch.toLowerCase()) ||
    c.subject_id.toLowerCase().includes(courseSearch.toLowerCase())
  );

  const relevantClasses = classes.filter(c => c.class_id.startsWith(selectedCourse?.class_id || '---'));

  return (
    <div className="flex-1 flex gap-6 overflow-hidden h-full">
      {/* Term Sidebar */}
      <aside className="w-64 bg-white border border-slate-200 rounded-2xl flex flex-col shrink-0 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Terms</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
            <input
              className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border-slate-200 bg-white focus:ring-primary focus:border-primary outline-none"
              placeholder="Search..."
              value={termSearch}
              onChange={e => setTermSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredTerms.map(term => (
            <button
              key={term}
              onClick={() => setSelectedTerm(term)}
              className={`w-full text-left px-4 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                selectedTerm === term ? 'bg-primary/10 text-primary font-bold' : 'hover:bg-slate-50 text-slate-600'
              }`}
            >
              <span className="text-xs">Term {term}</span>
              <span className={`material-symbols-outlined text-sm ${selectedTerm === term ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>chevron_right</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Course Sidebar */}
      <aside className={cn(
        "bg-white border border-slate-200 rounded-2xl flex flex-col transition-all duration-300 overflow-hidden shadow-sm relative",
        isCourseSidebarOpen ? "w-80" : "w-12"
      )}>
        <button
          onClick={() => setIsCourseSidebarOpen(!isCourseSidebarOpen)}
          className="absolute right-1 top-4 z-10 w-6 h-6 bg-white border border-slate-200 rounded-full flex items-center justify-center text-slate-400 hover:text-primary transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-sm">{isCourseSidebarOpen ? 'chevron_left' : 'chevron_right'}</span>
        </button>

        {isCourseSidebarOpen && (
          <>
            <div className="p-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Courses</h3>
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
                <input
                  className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border-slate-200 bg-white focus:ring-primary focus:border-primary outline-none"
                  placeholder="Filter courses..."
                  value={courseSearch}
                  onChange={e => setCourseSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredCourses.map(course => (
                <button
                  key={`${course.class_id}-${course.subject_id}`}
                  onClick={() => setSelectedCourse(course)}
                  className={cn(
                    "w-full flex flex-col items-start px-4 py-3 rounded-xl transition-all",
                    selectedCourse?.subject_id === course.subject_id && selectedCourse?.class_id === course.class_id
                      ? 'bg-primary/10 border border-primary/20 text-primary'
                      : 'hover:bg-slate-50 text-slate-700'
                  )}
                >
                  <span className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    selectedCourse?.subject_id === course.subject_id && selectedCourse?.class_id === course.class_id ? 'opacity-70' : 'text-slate-400'
                  )}>
                    {course.subject_id}
                  </span>
                  <span className="text-xs font-semibold text-left">{course.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {selectedCourse ? (
          <>
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-white gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{selectedCourse.subject_id}: {selectedCourse.name}</h2>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                    {selectedCourse.required_room_type || 'Theory'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Assign teachers and sections for this course</p>
              </div>
              <div className="flex items-center gap-2">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" className="hidden" />
                <button onClick={handleImportClick} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="material-symbols-outlined text-base">file_upload</span> Import
                </button>
                <button onClick={handleExport} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                  <span className="material-symbols-outlined text-base">file_download</span> Export
                </button>
                {selectedAllotmentIds.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                    Delete ({selectedAllotmentIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {localAllotments.length === 0 ? (
                <div className="p-10 text-center border-2 border-dashed border-slate-100 rounded-2xl text-slate-400">
                  <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                  <p className="text-sm font-medium">No teachers assigned to this course yet.</p>
                </div>
              ) : (
                localAllotments.map((allotment, idx) => (
                  <div key={allotment.teacher_id} className="p-5 border border-slate-100 rounded-xl bg-slate-50/30 hover:border-primary/30 transition-colors flex gap-6 items-start">
                    <div className="pt-2">
                      <input
                        type="checkbox"
                        checked={selectedAllotmentIds.includes(allotment.teacher_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAllotmentIds([...selectedAllotmentIds, allotment.teacher_id]);
                          } else {
                            setSelectedAllotmentIds(selectedAllotmentIds.filter(id => id !== allotment.teacher_id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </div>
                    <div className="flex-1 flex flex-wrap items-end gap-6">
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Teacher</label>
                        <div className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700">
                          {teachers.find(t => t.teacher_id === allotment.teacher_id)?.name || allotment.teacher_id}
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 text-center">Periods/Week</label>
                        <input
                          type="number"
                          className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                          value={allotment.periods_per_week}
                          onChange={(e) => handleUpdateAllotment(idx, 'periods_per_week', parseInt(e.target.value) || 0)}
                        />
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Assigned Sections</label>
                        <div className="flex flex-wrap gap-1 p-1 bg-white border border-slate-200 rounded-lg min-h-[42px]">
                          {relevantClasses.map(cls => (
                            <button
                              key={cls.class_id}
                              onClick={() => toggleSection(idx, cls.class_id)}
                              className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                                allotment.sections.includes(cls.class_id)
                                  ? 'bg-primary text-white shadow-sm'
                                  : 'text-slate-400 hover:bg-slate-50'
                              }`}
                            >
                              {cls.class_id.slice(-1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}

              <button
                onClick={() => setIsAddModalOpen(true)}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 group"
              >
                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">add_circle</span>
                <span className="font-bold text-sm">Add Teacher Allotment</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/30">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">school</span>
            <p className="text-lg font-medium">Select a term and course to manage allotments</p>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-xl font-bold text-slate-900">Add Allotment</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddAllotment} className="p-6 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Select Teacher</label>
                <select
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  value={newAllotment.teacher_id}
                  onChange={e => setNewAllotment({...newAllotment, teacher_id: e.target.value})}
                >
                  <option value="">Choose a teacher...</option>
                  {teachers.map(t => (
                    <option key={t.teacher_id} value={t.teacher_id}>{t.name} ({t.teacher_id})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Periods Per Week</label>
                <input
                  type="number"
                  min="1"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none text-sm"
                  value={newAllotment.periods_per_week}
                  onChange={e => setNewAllotment({...newAllotment, periods_per_week: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assign Sections</label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                  {relevantClasses.map(cls => (
                    <button
                      key={cls.class_id}
                      type="button"
                      onClick={() => {
                        const sections = newAllotment.sections.includes(cls.class_id)
                          ? newAllotment.sections.filter(s => s !== cls.class_id)
                          : [...newAllotment.sections, cls.class_id];
                        setNewAllotment({...newAllotment, sections});
                      }}
                      className={cn(
                        "px-4 py-2 rounded-lg font-bold text-xs transition-all",
                        newAllotment.sections.includes(cls.class_id)
                          ? "bg-primary text-white shadow-md shadow-primary/20"
                          : "bg-white text-slate-400 border border-slate-200 hover:border-primary/30"
                      )}
                    >
                      {cls.class_id.slice(-1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-primary rounded-xl hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                >
                  Add Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassAllotmentTab;
