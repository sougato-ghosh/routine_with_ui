import React from 'react';

const TERMS = ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'];

function TermDetailsTab({ activeTerms, onToggleTerm, onSave, saving }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-slate-900">Academic Terms</h3>
          <p className="text-sm text-slate-500 mt-1">Select the terms to be included in the current routine generation session.</p>
        </div>
        <button
          onClick={onSave}
          disabled={saving}
          className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
        >
          <span className="material-icons text-sm">save</span>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
      <div className="p-8 flex flex-col items-center">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-5xl">
          {TERMS.map(term => {
            const isActive = activeTerms.includes(term);
            return (
              <button
                key={term}
                onClick={() => onToggleTerm(term)}
                className={`group relative flex flex-col items-center justify-center p-8 rounded-2xl border-2 transition-all hover:shadow-lg ${
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-slate-200 bg-white hover:border-primary/50'
                }`}
              >
                <span className={`text-3xl font-bold ${isActive ? 'text-primary' : 'text-slate-400'}`}>{term}</span>
                {isActive && (
                  <>
                    <span className="text-xs font-bold text-primary mt-2 uppercase tracking-widest">Selected</span>
                    <div className="absolute top-3 right-3 text-primary">
                      <span className="material-icons">check_circle</span>
                    </div>
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TermDetailsTab;
