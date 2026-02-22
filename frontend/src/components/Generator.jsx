import React, { useState } from 'react';
import { runScheduler } from '../api';

function Generator() {
  const [status, setStatus] = useState('idle'); // idle, running, complete, error
  const [result, setResult] = useState(null);

  const handleRun = () => {
    setStatus('running');
    runScheduler()
      .then(res => {
        setResult(res.data.result);
        if (res.data.result.status.startsWith('ERROR')) {
          setStatus('error');
        } else {
          setStatus('complete');
        }
      })
      .catch(err => {
        console.error(err);
        setStatus('error');
        setResult({ status: 'Failed to connect to the scheduling engine.' });
      });
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">AI Generator</h2>
        <p className="text-slate-500 mt-1">Execute the Google OR-Tools solver to find the optimal schedule.</p>
      </header>

      <div className="bg-white p-12 rounded-3xl border border-slate-200 shadow-sm text-center mb-8">
        <div className="max-w-md mx-auto">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto mb-6">
            <span className="material-icons text-4xl">bolt</span>
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-2">Ready to Generate?</h3>
          <p className="text-slate-500 mb-8">
            The engine will consider all teacher constraints, room capacities, and course requirements to build your routine.
          </p>

          <button
            onClick={handleRun}
            disabled={status === 'running'}
            className="w-full flex items-center justify-center gap-3 bg-primary hover:bg-primary-hover disabled:bg-slate-300 text-white py-4 rounded-2xl font-bold text-lg shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
          >
            {status === 'running' ? (
              <>
                <span className="material-icons animate-spin">sync</span>
                Engine calculating...
              </>
            ) : (
              <>
                <span className="material-icons">play_arrow</span>
                Run Scheduler
              </>
            )}
          </button>
        </div>
      </div>

      {(status === 'complete' || status === 'error') && result && (
        <div className="space-y-6 animate-in fade-in slide-in-from-top-4">
          {status === 'complete' ? (
            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl flex items-center gap-4">
              <span className="material-icons text-emerald-500 text-4xl">check_circle</span>
              <div>
                <h4 className="font-bold text-emerald-900">Routine Generated Successfully!</h4>
                <p className="text-emerald-700 text-sm">{result?.status}</p>
                <p className="text-emerald-600 text-xs mt-1">Scheduled {result?.sessions_scheduled} / {result?.sessions_total} sessions.</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4">
              <span className="material-icons text-red-500 text-4xl">error_outline</span>
              <div>
                <h4 className="font-bold text-red-900">Generation Failed</h4>
                <p className="text-red-700 text-sm">{result?.status}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Generator;
