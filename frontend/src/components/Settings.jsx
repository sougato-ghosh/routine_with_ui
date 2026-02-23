import React, { useState, useEffect } from 'react';
import { getSettings, updateSettings } from '../api';
import { Check } from 'lucide-react';
import { cn } from '../utils';

function Settings() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await getSettings();
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to load settings", err);
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      showToast("Settings Saved!");
    } catch (err) {
      console.error("Failed to save settings", err);
      showToast("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 mt-2">Configure global parameters and system preferences.</p>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <Check size={16} className="text-green-400" />
          {toast}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
        <div className="p-8 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Global Settings</h2>
            <p className="text-slate-500 text-sm mt-1">Configure general session parameters for the routine generator.</p>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving || loading}
            className="flex items-center gap-2 bg-primary hover:opacity-90 text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            <span className="material-icons text-lg">save</span>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        <div className="p-8">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="max-w-md space-y-6">
              {Object.keys(settings)
                .filter(key => key !== 'footer_right_text')
                .map(key => (
                  <div key={key}>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                      {key.replace(/_/g, ' ')}
                    </label>
                    <input
                      type="text"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                      value={settings[key] || ''}
                      onChange={(e) => handleEdit(key, e.target.value)}
                    />
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;
