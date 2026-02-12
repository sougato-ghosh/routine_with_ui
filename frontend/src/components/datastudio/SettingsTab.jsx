import React from 'react';

function SettingsTab({ settings, onEdit, onSave, saving }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-8">
      <div className="p-8 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Global Settings</h3>
          <p className="text-slate-500 text-sm mt-1">Configure general session parameters for the routine generator.</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold shadow-md shadow-primary/30 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          <span className="material-icons text-lg">save</span>
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
      <div className="p-8">
        <div className="max-w-md space-y-6">
          {Object.keys(settings).map(key => (
            <div key={key}>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                {key.replace(/_/g, ' ')}
              </label>
              <input
                type="text"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent transition-all outline-none"
                value={settings[key] || ''}
                onChange={(e) => onEdit(key, e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
