import React, { useState, useEffect } from 'react';
import { getData, updateData, getSettings, updateSettings } from '../api';
import { Check } from 'lucide-react';
import { cn } from '../utils';

import SettingsTab from './datastudio/SettingsTab';
import TermDetailsTab from './datastudio/TermDetailsTab';
import CourseDetailsTab from './datastudio/CourseDetailsTab';
import ClassesTab from './datastudio/ClassesTab';
import ClassAllotmentTab from './datastudio/ClassAllotmentTab';

const TABS = [
  { id: 'settings', name: 'Settings' },
  { id: 'terms', name: 'Term Details' },
  { id: 'courses', name: 'Course Details' },
  { id: 'classes', name: 'Classes' },
  { id: 'allotment', name: 'Class Allotment' },
];

function DataStudio() {
  const [activeTab, setActiveTab] = useState('settings');
  const [settings, setSettings] = useState({});
  const [activeTerms, setActiveTerms] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [curriculum, setCurriculum] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'settings') {
        const res = await getSettings();
        setSettings(res.data);
      } else if (activeTab === 'terms') {
        const res = await getData('terms.csv');
        setActiveTerms(res.data.filter(t => t.is_active).map(t => t.name));
      } else if (activeTab === 'courses') {
        const res = await getData('subjects.csv');
        setSubjects(res.data);
      } else if (activeTab === 'classes') {
        const res = await getData('classes.csv');
        setClasses(res.data);
      } else if (activeTab === 'allotment') {
        const [subjRes, teachRes, clsRes, currRes] = await Promise.all([
          getData('subjects.csv'),
          getData('teachers.csv'),
          getData('classes.csv'),
          getData('curriculum.csv')
        ]);
        setSubjects(subjRes.data);
        setTeachers(teachRes.data);
        setClasses(clsRes.data);
        setCurriculum(currRes.data);
        if (!selectedCourse && subjRes.data.length > 0) {
          setSelectedCourse(subjRes.data[0]);
        }
      }
    } catch (err) {
      console.error("Failed to load data", err);
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
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTerm = (termName) => {
    setActiveTerms(prev =>
      prev.includes(termName)
        ? prev.filter(t => t !== termName)
        : [...prev, termName]
    );
  };

  const handleSaveTerms = async () => {
    setSaving(true);
    try {
      const termData = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'].map(name => ({
        name,
        is_active: activeTerms.includes(name)
      }));
      await updateData('terms.csv', termData);
      showToast("Terms Updated!");
    } finally {
      setSaving(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <SettingsTab
            settings={settings}
            onEdit={(k, v) => setSettings(p => ({ ...p, [k]: v }))}
            onSave={handleSaveSettings}
            saving={saving}
          />
        );
      case 'terms':
        return (
          <TermDetailsTab
            activeTerms={activeTerms}
            onToggleTerm={handleToggleTerm}
            onSave={handleSaveTerms}
            saving={saving}
          />
        );
      case 'courses':
        return <CourseDetailsTab subjects={subjects} loading={loading} />;
      case 'classes':
        return <ClassesTab classes={classes} loading={loading} />;
      case 'allotment':
        return (
          <ClassAllotmentTab
            courses={subjects}
            selectedCourse={selectedCourse}
            setSelectedCourse={setSelectedCourse}
            teachers={teachers}
            classes={classes}
            curriculum={curriculum}
            onSave={() => {
              showToast("Allotments Saved!");
              loadData();
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-100px)]">
      <header className="mb-8">
        <h2 className="text-3xl font-extrabold text-slate-900 mb-6">Data Studio</h2>
        <div className="inline-flex p-1 bg-white border border-slate-200 rounded-xl shadow-sm">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "px-6 py-2 text-sm font-semibold rounded-lg transition-all",
                activeTab === tab.id
                  ? "bg-primary text-white shadow-md"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {tab.name}
            </button>
          ))}
        </div>
      </header>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 bg-slate-800 text-white px-4 py-2 rounded-lg shadow-xl flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <Check size={16} className="text-green-400" />
          {toast}
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
}

export default DataStudio;
