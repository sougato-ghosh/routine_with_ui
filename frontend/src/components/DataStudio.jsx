import React, { useState, useEffect } from 'react';
import { getData, updateData, getSettings, updateSettings, exportCSV, importCSV } from '../api';
import { Save, Check, Download, Upload } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const TABS = [
  { name: 'Settings', type: 'settings' },
  {
    name: 'Infrastructure',
    type: 'data',
    files: [
      { id: 'teachers.csv', name: 'Teachers' },
      { id: 'rooms.csv', name: 'Rooms' },
      { id: 'classes.csv', name: 'Classes' },
      { id: 'subjects.csv', name: 'Subjects' },
      { id: 'timeslots.csv', name: 'Timeslots' }
    ]
  },
  {
    name: 'Curriculum',
    type: 'data',
    files: [
      { id: 'curriculum.csv', name: 'Curriculum' }
    ]
  },
  {
    name: 'Constraints',
    type: 'data',
    files: [
      { id: 'teacher_unavailability.csv', name: 'Unavailability' },
      { id: 'teacher_preferences.csv', name: 'Preferences' }
    ]
  },
];

function DataStudio() {
  const [activeTab, setActiveTab] = useState(TABS[0]);
  const [data, setData] = useState({});
  const [settings, setSettings] = useState({});
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (activeTab.type === 'data') {
      activeTab.files.forEach(file => {
        getData(file.id).then(res => {
          setData(prev => ({ ...prev, [file.id]: res.data }));
        });
      });
    } else if (activeTab.type === 'settings') {
      getSettings().then(res => {
        setSettings(res.data);
      });
    }
  }, [activeTab]);

  const handleEdit = (fileId, index, key, value) => {
    setData(prev => {
      const newData = [...prev[fileId]];
      newData[index] = { ...newData[index], [key]: value };
      return { ...prev, [fileId]: newData };
    });
  };

  const handleSettingEdit = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = (fileId) => {
    setSaving(prev => ({ ...prev, [fileId]: true }));
    updateData(fileId, data[fileId])
      .then(() => {
        setToast(`Data Saved!`);
        setTimeout(() => setToast(null), 3000);
      })
      .finally(() => {
        setSaving(prev => ({ ...prev, [fileId]: false }));
      });
  };

  const handleSaveSettings = () => {
    setSaving(prev => ({ ...prev, settings: true }));
    updateSettings(settings)
      .then(() => {
        setToast(`Settings Saved!`);
        setTimeout(() => setToast(null), 3000);
      })
      .finally(() => {
        setSaving(prev => ({ ...prev, settings: false }));
      });
  };

  const handleExport = (fileId) => {
    exportCSV(fileId);
  };

  const handleImport = (fileId, e) => {
    const file = e.target.files[0];
    if (!file) return;

    importCSV(fileId, file)
      .then(() => {
        setToast(`Import Successful!`);
        setTimeout(() => setToast(null), 3000);
        // Refresh data
        getData(fileId).then(res => {
          setData(prev => ({ ...prev, [fileId]: res.data }));
        });
      })
      .catch(err => {
        alert("Import failed: " + err.message);
      });
  };

  return (
    <div>
      <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6">Data Studio</h2>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 animate-bounce z-50">
          <Check size={16} className="text-green-400" />
          {toast}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-2 mb-8 bg-white p-1 rounded-xl border border-slate-200 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.name}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-semibold transition-all",
              activeTab.name === tab.name
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {activeTab.type === 'settings' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 max-w-2xl">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800 text-xl">Global Settings</h3>
            <button
              onClick={handleSaveSettings}
              disabled={saving.settings}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
            >
              <Save size={16} />
              {saving.settings ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          <div className="space-y-4">
            {Object.keys(settings)
              .filter(key => key !== 'footer_right_text')
              .map(key => (
                <div key={key} className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{key.replace(/_/g, ' ')}</label>
                  <input
                    type="text"
                    value={settings[key] || ''}
                    onChange={(e) => handleSettingEdit(key, e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all"
                  />
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Data Editors */}
      {activeTab.type === 'data' && (
        <div className="space-y-12">
          {activeTab.files.map(file => (
            <div key={file.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <h3 className="font-bold text-slate-800">{file.name}</h3>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors cursor-pointer">
                    <Upload size={16} />
                    Import CSV
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => handleImport(file.id, e)} />
                  </label>
                  <button
                    onClick={() => handleExport(file.id)}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-bold transition-colors"
                  >
                    <Download size={16} />
                    Export CSV
                  </button>
                  <button
                    onClick={() => handleSave(file.id)}
                    disabled={saving[file.id]}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors disabled:opacity-50"
                  >
                    <Save size={16} />
                    {saving[file.id] ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left text-sm border-collapse">
                  <thead className="bg-slate-50 text-slate-500 sticky top-0">
                    <tr>
                      {data[file.id]?.[0] && Object.keys(data[file.id][0]).map(key => (
                        <th key={key} className="px-6 py-3 font-semibold uppercase tracking-wider border-b border-slate-200">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data[file.id]?.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-colors">
                        {Object.keys(row).map(key => (
                          <td key={key} className="px-6 py-2">
                            <input
                              type="text"
                              value={row[key] === null ? '' : row[key]}
                              onChange={(e) => handleEdit(file.id, idx, key, e.target.value)}
                              className="w-full bg-transparent focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 py-1"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default DataStudio;
