import React, { useState } from 'react';
import { runScheduler } from '../api';
import { Zap, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';

function Generator() {
  const [status, setStatus] = useState('idle'); // idle, running, complete, error
  const [result, setResult] = useState(null);
  const [warnings, setWarnings] = useState('');

  const handleRun = () => {
    setStatus('running');
    runScheduler()
      .then(res => {
        setResult(res.data.result);
        setWarnings(res.data.warnings);
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
    <div>
      <h2 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-6">AI Generator</h2>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
        <div className="max-w-md mx-auto">
          <p className="text-slate-600 mb-8">
            Click below to run the Google OR-Tools solver. It will find the most efficient schedule based on your constraints.
          </p>

          <button
            onClick={handleRun}
            disabled={status === 'running'}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-xl font-bold text-lg shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5"
          >
            {status === 'running' ? (
              <>
                <Loader2 className="animate-spin" />
                Engine is calculating...
              </>
            ) : (
              <>
                <Zap fill="currentColor" />
                Run Scheduler
              </>
            )}
          </button>
        </div>
      </div>

      {(status === 'complete' || status === 'error') && result && (
        <div className="mt-8 space-y-6 animate-in fade-in slide-in-from-top-4">
          {status === 'complete' ? (
            <div className="bg-green-50 border border-green-100 p-6 rounded-2xl flex items-center gap-4">
              <CheckCircle2 className="text-green-500" size={32} />
              <div>
                <h4 className="font-bold text-green-900">Routine Generated!</h4>
                <p className="text-green-700 text-sm">{result?.status}</p>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-center gap-4">
              <AlertTriangle className="text-red-500" size={32} />
              <div>
                <h4 className="font-bold text-red-900">Generation Failed</h4>
                <p className="text-red-700 text-sm">{result?.status}</p>
              </div>
            </div>
          )}

          {warnings ? (
            <div className={status === 'error' ? "bg-red-50 border border-red-200 rounded-2xl overflow-hidden shadow-sm" : "bg-amber-50 border border-amber-100 rounded-2xl overflow-hidden"}>
              <div className={status === 'error' ? "px-6 py-4 border-b border-red-200 flex items-center gap-2 bg-red-100/50" : "px-6 py-4 border-b border-amber-100 flex items-center gap-2 bg-amber-100/50"}>
                <AlertTriangle className={status === 'error' ? "text-red-600" : "text-amber-600"} size={20} />
                <h4 className={status === 'error' ? "font-bold text-red-900 uppercase text-xs tracking-wider" : "font-bold text-amber-900 uppercase text-xs tracking-wider"}>
                  {status === 'error' ? "Critical Data Issues Found" : "Data Validation Report"}
                </h4>
              </div>
              <div className="p-6">
                <pre className={status === 'error' ? "text-sm font-mono text-red-800 bg-white/80 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap border border-red-100" : "text-xs font-mono text-amber-800 bg-white/50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap"}>
                  {warnings}
                </pre>
              </div>
            </div>
          ) : (
            status === 'error' && (
              <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center">
                <p className="text-slate-600 text-sm italic">
                  No specific data validation issues were detected. The solver might be over-constrained.
                </p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}

export default Generator;
