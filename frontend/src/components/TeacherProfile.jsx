import React, { useState, useEffect } from 'react';
import { getData, updateData, getSettings } from '../api';
import { cn } from '../utils';

function TeacherProfile({ teacher: initialTeacher, onBack }) {
  const [teacher, setTeacher] = useState(initialTeacher);
  const [unavailability, setUnavailability] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [seniorityLevels, setSeniorityLevels] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [settings, setSettings] = useState({
    days_num: 5,
    periods_num: 9,
    day_labels: 'Sa,Su,Mo,Tu,We',
    period_labels: '1st,2nd,3rd,4th,5th,6th,7th,8th,9th',
    break_period: 6
  });
  const [selectionMode, setSelectionMode] = useState('preferred'); // 'preferred' or 'unavailable'
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState(null); // 'preferred', 'unavailable', or 'neutral'

  useEffect(() => {
    loadData();
  }, [initialTeacher.teacher_id]);

  const loadData = async () => {
    const [unavailRes, prefRes, settingsRes] = await Promise.all([
      getData('teacher_unavailability'),
      getData('teacher_preferences'),
      getSettings()
    ]);
    setUnavailability(unavailRes.data.filter(u => u.teacher_id === teacher.teacher_id));
    setPreferences(prefRes.data.filter(p => p.teacher_id === teacher.teacher_id));

    const s = settingsRes.data;
    if (s.seniority_levels) {
      setSeniorityLevels(s.seniority_levels.split(',').map(s => s.trim()));
    }
    if (s.departments) {
      setDepartments(s.departments.split(',').map(s => s.trim()));
    }

    setSettings({
      days_num: parseInt(s.days_num || 5),
      periods_num: parseInt(s.periods_num || 9),
      day_labels: s.day_labels || 'Sa,Su,Mo,Tu,We',
      period_labels: s.period_labels || '1st,2nd,3rd,4th,5th,6th,7th,8th,9th',
      break_period: parseInt(s.break_period || 6)
    });

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Fetch all to update teacher and constraints
      const [allTeachers, allUnavail, allPref] = await Promise.all([
        getData('teachers'),
        getData('teacher_unavailability'),
        getData('teacher_preferences')
      ]);

      const otherTeachers = allTeachers.data.filter(t => t.teacher_id !== initialTeacher.teacher_id);
      const otherUnavail = allUnavail.data.filter(u => u.teacher_id !== initialTeacher.teacher_id);
      const otherPref = allPref.data.filter(p => p.teacher_id !== initialTeacher.teacher_id);

      // We need to make sure unavailability and preferences use the potentially new teacher_id
      const updatedUnavail = unavailability.map(u => ({ ...u, teacher_id: teacher.teacher_id }));
      const updatedPref = preferences.map(p => ({ ...p, teacher_id: teacher.teacher_id }));

      await Promise.all([
        updateData('teachers', [...otherTeachers, teacher]),
        updateData('teacher_unavailability', [...otherUnavail, ...updatedUnavail]),
        updateData('teacher_preferences', [...otherPref, ...updatedPref])
      ]);
      alert("Profile and constraints saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    setSaving(true);
    try {
      const [allTeachers, allUnavail, allPref] = await Promise.all([
        getData('teachers'),
        getData('teacher_unavailability'),
        getData('teacher_preferences')
      ]);

      const otherTeachers = allTeachers.data.filter(t => t.teacher_id !== initialTeacher.teacher_id);
      const otherUnavail = allUnavail.data.filter(u => u.teacher_id !== initialTeacher.teacher_id);
      const otherPref = allPref.data.filter(p => p.teacher_id !== initialTeacher.teacher_id);

      await Promise.all([
        updateData('teachers', otherTeachers),
        updateData('teacher_unavailability', otherUnavail),
        updateData('teacher_preferences', otherPref)
      ]);
      onBack();
    } catch (err) {
      console.error(err);
      alert("Failed to delete profile");
    } finally {
      setSaving(false);
    }
  };

  const getCellState = (day, period) => {
    if (unavailability.some(u => u.day === day && u.period === period)) return 'unavailable';
    if (preferences.some(p => p.day === day && p.period === period)) return 'preferred';
    return 'neutral';
  };

  const toggleCell = (day, period, targetValue) => {
    // targetValue can be 'preferred', 'unavailable', or 'neutral'
    let nextUnavail = unavailability.filter(u => !(u.day === day && u.period === period));
    let nextPref = preferences.filter(p => !(p.day === day && p.period === period));

    if (targetValue === 'unavailable') {
      nextUnavail.push({ teacher_id: teacher.teacher_id, day, period });
    } else if (targetValue === 'preferred') {
      nextPref.push({ teacher_id: teacher.teacher_id, day, period });
    }

    setUnavailability(nextUnavail);
    setPreferences(nextPref);
  };

  const handleMouseDown = (day, period) => {
    const currentState = getCellState(day, period);
    let target;
    if (selectionMode === 'preferred') {
      target = currentState === 'preferred' ? 'neutral' : 'preferred';
    } else {
      target = currentState === 'unavailable' ? 'neutral' : 'unavailable';
    }
    setDragValue(target);
    setIsDragging(true);
    toggleCell(day, period, target);
  };

  const handleMouseEnter = (day, period) => {
    if (isDragging) {
      toggleCell(day, period, dragValue);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setDragValue(null);
  };

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="flex items-center text-slate-500 hover:text-primary transition-colors"
          >
            <span className="material-icons">arrow_back</span>
            <span className="ml-2 font-medium">Back to Teachers List</span>
          </button>
          <div className="h-6 w-px bg-slate-200 mx-2"></div>
          <h1 className="text-xl font-bold">Teacher Profile</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleDeleteProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-red-500 text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-red-600 transition-all shadow-md disabled:opacity-50"
          >
            <span className="material-icons text-sm">delete</span>
            {saving ? 'Deleting...' : 'Delete Profile'}
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl font-semibold hover:bg-primary/90 transition-all shadow-md disabled:opacity-50"
          >
            <span className="material-icons text-sm">save</span>
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </header>

      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-4xl font-bold border-4 border-primary/10">
                  {teacher.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>
                <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
              </div>
              <div className="text-center md:text-left flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Full Name</label>
                    <input
                      type="text"
                      value={teacher.name}
                      onChange={e => setTeacher({...teacher, name: e.target.value})}
                      className="text-2xl font-extrabold bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none w-full"
                    />
                  </div>
                  <div className="flex flex-wrap justify-center md:justify-start gap-4">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="material-icons text-primary text-lg">badge</span>
                      <input
                        type="text"
                        value={teacher.teacher_id}
                        onChange={e => setTeacher({...teacher, teacher_id: e.target.value})}
                        className="bg-transparent border-b border-transparent hover:border-slate-200 focus:border-primary focus:outline-none w-24"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Department</label>
                      <select
                        value={teacher.department || (departments[0] || 'ME')}
                        onChange={e => setTeacher({...teacher, department: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        {departments.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Seniority</label>
                      <select
                        value={teacher.seniority}
                        onChange={e => setTeacher({...teacher, seniority: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        {seniorityLevels.map((label, idx) => (
                          <option key={idx + 1} value={idx + 1}>{label}</option>
                        ))}
                        {teacher.seniority > seniorityLevels.length && (
                          <option value={teacher.seniority}>Level {teacher.seniority}</option>
                        )}
                        {!seniorityLevels.length && !teacher.seniority && <option value={1}>Level 1</option>}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Load/Day</label>
                      <input
                        type="number"
                        value={teacher.max_load_day}
                        onChange={e => setTeacher({...teacher, max_load_day: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Max Load/Week</label>
                      <input
                        type="number"
                        value={teacher.max_load_week}
                        onChange={e => setTeacher({...teacher, max_load_week: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <section className="bg-white rounded-xl p-8 shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Availability & Preferences</h3>
                <p className="text-slate-500 text-sm mt-1">Select a mode and click or drag on the table to mark periods.</p>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  onClick={() => setSelectionMode('preferred')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                    selectionMode === 'preferred'
                      ? "bg-green-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full border border-white/20", selectionMode === 'preferred' ? "bg-white" : "bg-green-500")}></div>
                  Preferred
                </button>
                <button
                  onClick={() => setSelectionMode('unavailable')}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all",
                    selectionMode === 'unavailable'
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-full border border-white/20", selectionMode === 'unavailable' ? "bg-white" : "bg-red-500")}></div>
                  Unavailable
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full border-collapse select-none">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border-b border-r border-slate-200 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16">Day / Per</th>
                    {Array.from({ length: settings.periods_num }).map((_, i) => {
                      const period = i + 1;
                      if (period === settings.break_period) return null;
                      const label = settings.period_labels.split(',')[i] || `${period}th`;
                      return (
                        <th key={period} className="border-b border-r border-slate-200 p-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider min-w-[80px]">
                          {label}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: settings.days_num }).map((_, di) => {
                    const day = di + 1;
                    const dayLabel = settings.day_labels.split(',')[di] || `${day}`;
                    return (
                      <tr key={day}>
                        <td className="border-b border-r border-slate-200 p-3 bg-slate-50 font-bold text-slate-600 text-sm text-center">
                          {dayLabel}
                        </td>
                        {Array.from({ length: settings.periods_num }).map((_, pi) => {
                          const period = pi + 1;
                          if (period === settings.break_period) return null;
                          const state = getCellState(day, period);
                          return (
                            <td
                              key={period}
                              onMouseDown={() => handleMouseDown(day, period)}
                              onMouseEnter={() => handleMouseEnter(day, period)}
                              className={cn(
                                "border-b border-r border-slate-200 p-0 h-14 transition-colors cursor-pointer relative group",
                                state === 'preferred' && "bg-green-100 hover:bg-green-200",
                                state === 'unavailable' && "bg-red-100 hover:bg-red-200",
                                state === 'neutral' && "bg-white hover:bg-slate-50"
                              )}
                            >
                              {state === 'preferred' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="material-icons text-green-500 text-xl">check_circle</span>
                                </div>
                              )}
                              {state === 'unavailable' && (
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="material-icons text-red-500 text-xl">block</span>
                                </div>
                              )}
                              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity flex items-center justify-center">
                                {selectionMode === 'preferred' && state !== 'preferred' && <span className="material-icons text-green-300 text-xl">add_circle</span>}
                                {selectionMode === 'unavailable' && state !== 'unavailable' && <span className="material-icons text-red-300 text-xl">remove_circle</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-6 flex flex-wrap gap-6 text-xs font-medium text-slate-500 bg-slate-50 p-4 rounded-lg border border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                <span>Preferred Period</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-red-100 border border-red-200"></div>
                <span>Unavailable Period</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-white border border-slate-200"></div>
                <span>No Preference</span>
              </div>
              <div className="ml-auto text-slate-400 italic">
                Tip: You can click and drag to mark multiple cells.
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default TeacherProfile;
