import React, { useState, useEffect } from 'react';
import { getData, updateData } from '../api';
import { cn } from '../utils';
import { DEPARTMENTS } from '../constants';

function TeacherProfile({ teacher: initialTeacher, onBack }) {
  const [teacher, setTeacher] = useState(initialTeacher);
  const [unavailability, setUnavailability] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConstraints();
  }, [initialTeacher.teacher_id]);

  const loadConstraints = async () => {
    const [unavailRes, prefRes] = await Promise.all([
      getData('teacher_unavailability.csv'),
      getData('teacher_preferences.csv')
    ]);
    setUnavailability(unavailRes.data.filter(u => u.teacher_id === teacher.teacher_id));
    setPreferences(prefRes.data.filter(p => p.teacher_id === teacher.teacher_id));
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      // Fetch all to update teacher and constraints
      const [allTeachers, allUnavail, allPref] = await Promise.all([
        getData('teachers.csv'),
        getData('teacher_unavailability.csv'),
        getData('teacher_preferences.csv')
      ]);

      const otherTeachers = allTeachers.data.filter(t => t.teacher_id !== initialTeacher.teacher_id);
      const otherUnavail = allUnavail.data.filter(u => u.teacher_id !== initialTeacher.teacher_id);
      const otherPref = allPref.data.filter(p => p.teacher_id !== initialTeacher.teacher_id);

      // We need to make sure unavailability and preferences use the potentially new teacher_id
      const updatedUnavail = unavailability.map(u => ({ ...u, teacher_id: teacher.teacher_id }));
      const updatedPref = preferences.map(p => ({ ...p, teacher_id: teacher.teacher_id }));

      await Promise.all([
        updateData('teachers.csv', [...otherTeachers, teacher]),
        updateData('teacher_unavailability.csv', [...otherUnavail, ...updatedUnavail]),
        updateData('teacher_preferences.csv', [...otherPref, ...updatedPref])
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
        getData('teachers.csv'),
        getData('teacher_unavailability.csv'),
        getData('teacher_preferences.csv')
      ]);

      const otherTeachers = allTeachers.data.filter(t => t.teacher_id !== initialTeacher.teacher_id);
      const otherUnavail = allUnavail.data.filter(u => u.teacher_id !== initialTeacher.teacher_id);
      const otherPref = allPref.data.filter(p => p.teacher_id !== initialTeacher.teacher_id);

      await Promise.all([
        updateData('teachers.csv', otherTeachers),
        updateData('teacher_unavailability.csv', otherUnavail),
        updateData('teacher_preferences.csv', otherPref)
      ]);
      onBack();
    } catch (err) {
      console.error(err);
      alert("Failed to delete profile");
    } finally {
      setSaving(false);
    }
  };

  const addUnavailability = () => {
    setUnavailability([...unavailability, { teacher_id: teacher.teacher_id, day: 1, period: 1 }]);
  };

  const addPreference = () => {
    setPreferences([...preferences, { teacher_id: teacher.teacher_id, day: 1, period: 1 }]);
  };

  const updateUnavail = (index, key, value) => {
    const next = [...unavailability];
    next[index][key] = parseInt(value);
    setUnavailability(next);
  };

  const updatePref = (index, key, value) => {
    const next = [...preferences];
    next[index][key] = parseInt(value);
    setPreferences(next);
  };

  const removeUnavail = (index) => setUnavailability(unavailability.filter((_, i) => i !== index));
  const removePref = (index) => setPreferences(preferences.filter((_, i) => i !== index));

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
                        value={teacher.department || 'ME'}
                        onChange={e => setTeacher({...teacher, department: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      >
                        {DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Seniority</label>
                      <input
                        type="number"
                        value={teacher.seniority}
                        onChange={e => setTeacher({...teacher, seniority: parseInt(e.target.value)})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                      />
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Unavailability</h3>
                <button onClick={addUnavailability} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                  <span className="material-icons text-sm">add</span> Add
                </button>
              </div>
              <div className="space-y-3">
                {unavailability.map((u, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Day</label>
                        <input type="number" min="1" max="7" value={u.day} onChange={(e) => updateUnavail(i, 'day', e.target.value)} className="w-full text-sm border-none bg-white rounded px-2 py-1" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Period</label>
                        <input type="number" min="1" max="10" value={u.period} onChange={(e) => updateUnavail(i, 'period', e.target.value)} className="w-full text-sm border-none bg-white rounded px-2 py-1" />
                      </div>
                    </div>
                    <button onClick={() => removeUnavail(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                ))}
                {unavailability.length === 0 && <p className="text-slate-400 italic text-sm text-center py-4">No unavailability records</p>}
              </div>
            </section>

            <section className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">Preferences</h3>
                <button onClick={addPreference} className="text-primary text-sm font-bold flex items-center gap-1 hover:underline">
                  <span className="material-icons text-sm">add</span> Add
                </button>
              </div>
              <div className="space-y-3">
                {preferences.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Day</label>
                        <input type="number" min="1" max="7" value={p.day} onChange={(e) => updatePref(i, 'day', e.target.value)} className="w-full text-sm border-none bg-white rounded px-2 py-1" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Period</label>
                        <input type="number" min="1" max="10" value={p.period} onChange={(e) => updatePref(i, 'period', e.target.value)} className="w-full text-sm border-none bg-white rounded px-2 py-1" />
                      </div>
                    </div>
                    <button onClick={() => removePref(i)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <span className="material-icons">delete</span>
                    </button>
                  </div>
                ))}
                {preferences.length === 0 && <p className="text-slate-400 italic text-sm text-center py-4">No preference records</p>}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TeacherProfile;
