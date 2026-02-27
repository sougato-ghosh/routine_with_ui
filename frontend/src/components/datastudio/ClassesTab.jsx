import React, { useState, useEffect, useRef } from 'react';
import { getData, updateData, importCSV, exportCSV, getSettings } from '../../api';
import { cn } from '../../utils';

function ClassesTab({ activeTerms = [] }) {
  const [selectedTerm, setSelectedTerm] = useState('All');
  const [classes, setClasses] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [settings, setSettings] = useState({});
  const [newClass, setNewClass] = useState({
    class_id: '',
    name: '',
    size: 40
  });
  const [selectedSuffix, setSelectedSuffix] = useState('');
  const fileInputRef = useRef(null);

  const allTerms = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];
  const terms = ['All', ...allTerms.filter(t => activeTerms.includes(t))];
  const filteredTerms = terms.filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

  useEffect(() => {
    fetchClasses();
    fetchSettings();
  }, []);

  const fetchClasses = () => {
    setLoading(true);
    getData('classes').then(res => {
      setClasses(res.data);
      setLoading(false);
    });
  };

  const fetchSettings = async () => {
    try {
      const res = await getSettings();
      setSettings(res.data);
    } catch (err) {
      console.error("Failed to fetch settings", err);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importCSV('classes', file);
        fetchClasses();
        alert('Classes imported successfully');
      } catch (err) {
        console.error(err);
        alert('Failed to import classes');
      }
    }
  };

  const handleExport = () => {
    exportCSV('classes');
  };

  const handleDeleteClasses = async (idsToDelete) => {
    try {
      setLoading(true);
      const updatedClasses = classes.filter(c => !idsToDelete.includes(c.class_id));
      await updateData('classes', updatedClasses);
      setSelectedIds(selectedIds.filter(id => !idsToDelete.includes(id)));
      fetchClasses();
    } catch (err) {
      console.error(err);
      alert('Failed to delete classes');
      setLoading(false);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!selectedSuffix && selectedTerm !== 'All') {
      alert('Please select a section (A/B/C)');
      return;
    }
    try {
      await updateData('classes', [...classes, newClass]);
      setIsModalOpen(false);
      setNewClass({
        class_id: '',
        name: '',
        size: 40
      });
      setSelectedSuffix('');
      fetchClasses();
    } catch (err) {
      console.error(err);
      alert('Failed to add class');
    }
  };

  const filteredClasses = selectedTerm === 'All'
    ? classes
    : classes.filter(c => c.class_id.includes(selectedTerm.replace('-', '')));

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
              <span className="text-sm">{term === 'All' ? 'All Classes' : `Term ${term}`}</span>
              <span className={`material-symbols-outlined text-sm ${selectedTerm === term ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>chevron_right</span>
            </button>
          ))}
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between bg-white gap-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Classes: {selectedTerm === 'All' ? 'All' : `Term ${selectedTerm}`}</h3>
            <p className="text-sm text-slate-500">Manage class sections and enrollment sizes</p>
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
                onClick={() => handleDeleteClasses(selectedIds)}
                className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete ({selectedIds.length})
              </button>
            )}
            <button
              disabled={selectedTerm === 'All'}
              onClick={() => {
                setNewClass({
                  class_id: selectedTerm.replace('-', ''),
                  name: '',
                  size: 40
                });
                setSelectedSuffix('');
                setIsModalOpen(true);
              }}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg shadow-sm transition-all",
                selectedTerm === 'All' ? "bg-slate-300 cursor-not-allowed" : "bg-primary hover:bg-primary/90"
              )}
            >
              <span className="material-symbols-outlined text-lg">add</span>
              Add Class
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b border-slate-100 w-12">
                   <input
                    type="checkbox"
                    checked={filteredClasses.length > 0 && filteredClasses.every(c => selectedIds.includes(c.class_id))}
                    onChange={(e) => {
                      if (e.target.checked) {
                        const allFilteredIds = filteredClasses.map(c => c.class_id);
                        setSelectedIds(prev => [...new Set([...prev, ...allFilteredIds])]);
                      } else {
                        const allFilteredIds = filteredClasses.map(c => c.class_id);
                        setSelectedIds(selectedIds.filter(id => !allFilteredIds.includes(id)));
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Class ID</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Name</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">Size</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan="4" className="p-10 text-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div></td></tr>
              ) : filteredClasses.length === 0 ? (
                <tr><td colSpan="4" className="p-10 text-center text-slate-500 text-sm">No classes found for this term.</td></tr>
              ) : (
                filteredClasses.map(cls => (
                  <tr key={cls.class_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(cls.class_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, cls.class_id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== cls.class_id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-mono text-sm font-semibold text-primary">{cls.class_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{cls.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{cls.size} students</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Class</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddClass} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Class ID</label>
                <div className="flex items-center gap-2">
                   <div className="px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-500 font-mono text-sm">
                      {selectedTerm.replace('-', '')}
                   </div>
                   <div className="flex-1 flex gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      {(settings.sections || "A,B,C").split(',').map(s => s.trim()).map(suffix => (
                        <button
                          key={suffix}
                          type="button"
                          onClick={() => {
                            setSelectedSuffix(suffix);
                            const [level, term] = selectedTerm.split('-');
                            setNewClass({
                              ...newClass,
                              class_id: selectedTerm.replace('-', '') + suffix,
                              name: `Level ${level} Term ${term} Section ${suffix}`
                            });
                          }}
                          className={cn(
                            "flex-1 py-1.5 text-xs font-bold rounded-lg transition-all",
                            selectedSuffix === suffix
                              ? "bg-white text-primary shadow-sm"
                              : "text-slate-500 hover:text-slate-700 hover:bg-white/50"
                          )}
                        >
                          {suffix}
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Name</label>
                <input
                  required
                  type="text"
                  value={newClass.name}
                  onChange={e => setNewClass({...newClass, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. Level 1 Term 1 Section A"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Size (Students)</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={newClass.size}
                  onChange={e => setNewClass({...newClass, size: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                />
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
                  Save Class
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClassesTab;
