import React, { useState, useEffect } from 'react';
import { updateData } from '../../api';

function ClassAllotmentTab({ courses, selectedCourse, setSelectedCourse, teachers, classes, curriculum, onSave }) {
  const [localAllotments, setLocalAllotments] = useState([]);
  const [saving, setSaving] = useState(false);

  // When selectedCourse or curriculum changes, update local allotments
  useEffect(() => {
    if (selectedCourse && curriculum) {
      const courseAllotments = curriculum.filter(c => c.subject_id === selectedCourse.subject_id);

      // Group by teacher
      const grouped = courseAllotments.reduce((acc, curr) => {
        const existing = acc.find(a => a.teacher_id === curr.teacher_id);
        if (existing) {
          existing.sections.push(curr.class_id);
        } else {
          acc.push({
            teacher_id: curr.teacher_id,
            sections: [curr.class_id],
            periods_per_week: curr.periods_per_week || 2
          });
        }
        return acc;
      }, []);

      setLocalAllotments(grouped.length > 0 ? grouped : [{ teacher_id: '', sections: [], periods_per_week: 2 }]);
    }
  }, [selectedCourse, curriculum]);

  const handleAddAllotment = () => {
    setLocalAllotments([...localAllotments, { teacher_id: '', sections: [], periods_per_week: 2 }]);
  };

  const handleRemoveAllotment = (index) => {
    setLocalAllotments(localAllotments.filter((_, i) => i !== index));
  };

  const handleUpdateAllotment = (index, key, value) => {
    const next = [...localAllotments];
    next[index][key] = value;
    setLocalAllotments(next);
  };

  const toggleSection = (index, classId) => {
    const next = [...localAllotments];
    const sections = next[index].sections;
    if (sections.includes(classId)) {
      next[index].sections = sections.filter(s => s !== classId);
    } else {
      next[index].sections = [...sections, classId];
    }
    setLocalAllotments(next);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Create new curriculum data
      // 1. Keep other courses
      const otherCurriculum = curriculum.filter(c => c.subject_id !== selectedCourse.subject_id);

      // 2. Add updated allotments for this course
      const updatedCurriculum = [...otherCurriculum];
      localAllotments.forEach(a => {
        if (a.teacher_id && a.sections.length > 0) {
          a.sections.forEach(clsId => {
            updatedCurriculum.push({
              class_id: clsId,
              subject_id: selectedCourse.subject_id,
              teacher_id: a.teacher_id,
              periods_per_week: a.periods_per_week,
              user_id: 'default_user'
            });
          });
        }
      });

      await updateData('curriculum.csv', updatedCurriculum);
      onSave();
    } catch (err) {
      console.error("Save failed", err);
      alert("Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Filter classes that match the level of the course (heuristic: first digit of ID)
  const courseLevel = selectedCourse?.subject_id.match(/\d/)?.[0];
  const relevantClasses = classes.filter(c => c.class_id.startsWith(courseLevel || ''));

  return (
    <div className="flex-1 pb-8 overflow-hidden flex gap-6">
      <div className="w-80 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Courses</h3>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
            <input className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all" placeholder="Filter courses..." type="text"/>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
          <div className="space-y-1">
            {courses.map(course => (
              <button
                key={course.subject_id}
                onClick={() => setSelectedCourse(course)}
                className={`w-full flex flex-col items-start px-4 py-3 rounded-xl transition-all ${
                  selectedCourse?.subject_id === course.subject_id
                    ? 'bg-primary/10 border border-primary/20 text-primary'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <span className={`text-xs font-bold uppercase tracking-wide ${selectedCourse?.subject_id === course.subject_id ? 'opacity-70' : 'text-slate-400'}`}>
                  {course.subject_id}
                </span>
                <span className="text-sm font-semibold">{course.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col overflow-hidden">
        {selectedCourse ? (
          <>
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold text-slate-900">{selectedCourse.subject_id}: {selectedCourse.name}</h2>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary text-[10px] font-bold rounded uppercase tracking-wider">
                    {selectedCourse.required_room_type || 'Theory'}
                  </span>
                </div>
                <p className="text-sm text-slate-500">Assign teachers and sections for this course</p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-lg bg-primary text-white text-sm font-semibold shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                {saving ? 'Saving...' : 'Save Allotments'}
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {localAllotments.map((allotment, idx) => (
                <div key={idx} className="p-5 border border-slate-100 rounded-xl bg-slate-50/30 hover:border-primary/30 transition-colors">
                  <div className="flex flex-wrap items-end gap-6">
                    <div className="flex-1 min-w-[240px]">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Teacher</label>
                      <select
                        className="w-full pl-4 pr-10 py-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary outline-none"
                        value={allotment.teacher_id}
                        onChange={(e) => handleUpdateAllotment(idx, 'teacher_id', e.target.value)}
                      >
                        <option value="">Select Teacher</option>
                        {teachers.map(t => (
                          <option key={t.teacher_id} value={t.teacher_id}>{t.name} ({t.teacher_id})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 text-center">Periods/Week</label>
                      <input
                        type="number"
                        className="w-20 px-3 py-2 border border-slate-200 rounded-lg text-center"
                        value={allotment.periods_per_week}
                        onChange={(e) => handleUpdateAllotment(idx, 'periods_per_week', parseInt(e.target.value))}
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Assigned Sections</label>
                      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 border border-slate-200 rounded-lg min-h-[42px]">
                        {relevantClasses.map(cls => (
                          <button
                            key={cls.class_id}
                            onClick={() => toggleSection(idx, cls.class_id)}
                            className={`px-3 py-1.5 rounded-md font-bold text-xs transition-all ${
                              allotment.sections.includes(cls.class_id)
                                ? 'bg-primary text-white shadow-sm'
                                : 'text-slate-500 hover:bg-slate-200'
                            }`}
                          >
                            {cls.class_id.slice(-1)}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveAllotment(idx)}
                      className="h-10 w-10 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={handleAddAllotment}
                className="w-full py-4 border-2 border-dashed border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 hover:border-primary hover:text-primary transition-all flex items-center justify-center gap-2 group"
              >
                <span className="material-symbols-outlined text-xl group-hover:scale-110 transition-transform">add_circle</span>
                <span className="font-medium">Add Teacher Allotment</span>
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <span className="material-icons text-6xl mb-4">school</span>
            <p className="text-lg font-medium">Select a course from the list to manage its allotments</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ClassAllotmentTab;
