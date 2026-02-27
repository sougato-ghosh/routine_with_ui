import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Simple hash function for consistent coloring
const getSubjectColor = (name) => {
  if (!name) return 'transparent';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsla(${h}, 75%, 92%, 1)`;
};

function TimetableGrid({ data }) {
  if (!data || !data.table) return null;

  const { metadata, table } = data;

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="text-center mb-6">
        <div className="text-sm font-medium text-slate-500 uppercase tracking-widest mb-1">
          {metadata.header_title}
        </div>
        <div className="text-3xl font-black text-slate-900 mb-4 tracking-tighter">
          {metadata.class_title}
        </div>
        {metadata.home_room && (
          <div className="flex justify-end">
             <div className="bg-slate-100 text-slate-700 px-3 py-1 rounded-lg text-sm font-bold border border-slate-200">
               {metadata.home_room}
             </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-1">
          <thead>
            {table.slice(0, 1).map((row, ridx) => (
              <tr key={ridx}>
                {row.map((cell, cidx) => {
                  const isBreakCell = cell.classes.includes('break-cell');
                  return (
                    <th
                      key={cidx}
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                      className={cn(
                        "bg-slate-100 text-slate-500 font-bold p-2 text-[10px] uppercase tracking-wider rounded-lg border border-slate-200",
                        cidx === 0 && "w-14 bg-slate-600 text-white border-slate-700",
                        isBreakCell && "min-w-0 w-8 text-slate-400 text-[9px] font-bold uppercase tracking-widest [writing-mode:vertical-lr]"
                      )}
                    >
                      {isBreakCell ? (
                        <div className="flex flex-col items-center justify-center gap-1">
                           <span>{cell.text.split(' ')[0]}</span>
                           <span className="opacity-60">{cell.text.split(' ').slice(1).join(' ')}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col">
                            <span>{cell.text.replace(/\d{1,2}:\d{2}.*/, '')}</span>
                            <span className="text-[10px] font-normal opacity-70">{cell.text.match(/\d{1,2}:\d{2}.*/)?.[0]}</span>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.slice(1).map((row, ridx) => (
              <tr key={ridx}>
                {row.map((cell, cidx) => {
                  const isDayCell = cidx === 0;
                  const isBreakCell = cell.classes.includes('break-cell');
                  const isLastRow = ridx === table.slice(1).length - 1;
                  const subject = cell.content.find(c => c.type === 'subject')?.text;
                  const teacher = cell.content.find(c => c.type === 'teacher')?.text;
                  const room = cell.content.find(c => c.type === 'room')?.text;

                  return (
                    <td
                      key={cidx}
                      colSpan={cell.colspan}
                      rowSpan={cell.rowspan}
                      style={{
                        backgroundColor: subject ? getSubjectColor(subject) : undefined
                      }}
                      className={cn(
                        "h-20 min-w-[75px] p-1.5 rounded-lg border border-slate-200 align-top transition-all",
                        isDayCell && "min-w-0 w-14 bg-slate-600! text-white! font-bold text-2xl flex items-center justify-center border-slate-700!",
                        isBreakCell && "min-w-0 w-8 bg-white",
                        !isDayCell && !isBreakCell && !subject && "bg-white"
                      )}
                    >
                      {isDayCell ? (
                        <div className="h-full flex items-center justify-center">{cell.text}</div>
                      ) : isBreakCell ? (
                        null
                      ) : subject ? (
                        <div className="flex flex-col h-full">
                          <div className="font-extrabold text-sm text-slate-800 leading-tight mb-auto">
                            {subject}
                          </div>
                          <div className="flex justify-between items-end mt-2">
                            <div className="text-[10px] font-medium text-slate-500 bg-white/50 px-1.5 py-0.5 rounded border border-slate-200/50">
                              {teacher}
                            </div>
                            {room && (
                              <div className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                {room}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-8 flex justify-between text-[11px] font-bold text-slate-400 uppercase tracking-widest border-t border-slate-100 pt-6">
        <div>{metadata.footer_left}</div>
        <div>{metadata.footer_right}</div>
      </div>
    </div>
  );
}

export default TimetableGrid;
