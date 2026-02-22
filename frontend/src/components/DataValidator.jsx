import React, { useState } from 'react';
import { validateData } from '../api';

function DataValidator() {
  const [status, setStatus] = useState('idle'); // idle, running, complete, error
  const [issues, setIssues] = useState([]);

  const handleRun = () => {
    setStatus('running');
    validateData()
      .then(res => {
        setIssues(res.data);
        setStatus('complete');
      })
      .catch(err => {
        console.error(err);
        setStatus('error');
      });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Data Validator</h2>
        <p className="text-slate-500 mt-1">Check for potential issues in your data before generating schedules.</p>
      </header>

      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h3 className="text-xl font-bold text-slate-900">Run Data Check</h3>
            <p className="text-slate-500 text-sm mt-1">
              The validator will scan for referential integrity, duplicate IDs, teacher workloads, and credit mismatches.
            </p>
          </div>
          <button
            onClick={handleRun}
            disabled={status === 'running'}
            className="flex items-center gap-3 bg-primary hover:bg-primary-hover disabled:bg-slate-300 text-white px-8 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 transition-all active:scale-[0.98] whitespace-nowrap"
          >
            {status === 'running' ? (
              <>
                <span className="material-icons animate-spin">sync</span>
                Validating...
              </>
            ) : (
              <>
                <span className="material-icons">fact_check</span>
                Run Validator
              </>
            )}
          </button>
        </div>
      </div>

      {status === 'complete' && (
        <div className="space-y-4 animate-in fade-in slide-in-from-top-4">
          {issues.length === 0 ? (
            <div className="bg-emerald-50 border border-emerald-100 p-12 rounded-3xl text-center">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-icons text-3xl">done_all</span>
              </div>
              <h4 className="text-2xl font-bold text-emerald-900">All perfect!</h4>
              <p className="text-emerald-700 mt-2">No data inconsistencies or workload issues were found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {issues.map((issue, idx) => (
                <div key={idx} className={`p-5 rounded-2xl border ${
                  issue.type === 'error' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                } flex gap-4`}>
                  <span className={`material-icons ${
                    issue.type === 'error' ? 'text-red-500' : 'text-amber-500'
                  }`}>
                    {issue.type === 'error' ? 'error' : 'warning'}
                  </span>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        issue.type === 'error' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'
                      }`}>
                        {issue.category}
                      </span>
                    </div>
                    <p className={`text-sm font-medium ${
                      issue.type === 'error' ? 'text-red-900' : 'text-amber-900'
                    }`}>
                      {issue.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {status === 'error' && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4 animate-in fade-in">
          <span className="material-icons text-red-500 text-4xl">error_outline</span>
          <div>
            <h4 className="font-bold text-red-900">Validation Error</h4>
            <p className="text-red-700 text-sm">Failed to connect to the validation engine.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataValidator;
