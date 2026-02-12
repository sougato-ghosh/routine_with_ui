import React, { useState, useEffect } from 'react';
import { getData, updateData } from '../api';
import { cn } from '../utils';

function TeacherProfile({ teacher, onBack }) {
  const [unavailability, setUnavailability] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConstraints();
  }, [teacher.teacher_id]);

  const loadConstraints = async () => {
    const [unavailRes, prefRes] = await Promise.all([
      getData('teacher_unavailability.csv'),
      getData('teacher_preferences.csv')
    ]);
    setUnavailability(unavailRes.data.filter(u => u.teacher_id === teacher.teacher_id));
    setPreferences(prefRes.data.filter(p => p.teacher_id === teacher.teacher_id));
    setLoading(false);
  };

  const handleSaveConstraints = async () => {
    setSaving(true);
    try {
      // We need to fetch ALL data first to not overwrite others
      const [allUnavail, allPref] = await Promise.all([
        getData('teacher_unavailability.csv'),
        getData('teacher_preferences.csv')
      ]);

      const otherUnavail = allUnavail.data.filter(u => u.teacher_id !== teacher.teacher_id);
      const otherPref = allPref.data.filter(p => p.teacher_id !== teacher.teacher_id);

      await Promise.all([
        updateData('teacher_unavailability.csv', [...otherUnavail, ...unavailability]),
        updateData('teacher_preferences.csv', [...otherPref, ...preferences])
      ]);
      alert("Constraints saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save constraints");
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
    <div className="flex flex-col min-h-screen bg-background-light">
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
            onClick={handleSaveConstraints}
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
              <div className="text-center md:text-left flex-1">
                <div className="flex flex-col md:flex-row md:items-end gap-2 md:gap-4 mb-2">
                  <h2 className="text-3xl font-extrabold">{teacher.name}</h2>
                  <span className="bg-primary/10 text-primary text-xs font-bold uppercase px-3 py-1 rounded-full mb-1">
                    Seniority {teacher.seniority}
                  </span>
                </div>
                <div className="flex flex-wrap justify-center md:justify-start gap-4">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="material-icons text-primary text-lg">badge</span>
                    <span>ID: {teacher.teacher_id}</span>
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
