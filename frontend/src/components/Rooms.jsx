import React, { useState, useEffect } from 'react';
import { getData } from '../api';
import { cn } from '../utils';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getData('rooms.csv').then(res => {
      setRooms(res.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="flex flex-col">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-slate-900">Rooms Management</h2>
        <p className="text-slate-500 mt-1">Configure and manage all physical teaching spaces.</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
        <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-800">Rooms</h3>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all text-sm font-semibold">
              <span className="material-symbols-outlined text-[18px]">upload_file</span>
              Import CSV
            </button>
            <button className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-all text-sm font-semibold shadow-sm">
              <span className="material-symbols-outlined text-[18px]">save</span>
              Save Changes
            </button>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-8 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">ROOM_ID</th>
                <th className="px-8 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">NAME</th>
                <th className="px-8 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 text-center">CAPACITY</th>
                <th className="px-8 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">TYPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-8 py-10 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.room_id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-4 font-medium text-slate-900">{room.room_id}</td>
                    <td className="px-8 py-4 text-slate-600 font-medium">{room.name}</td>
                    <td className="px-8 py-4 text-center text-slate-600 font-medium">{room.capacity}</td>
                    <td className="px-8 py-4 text-slate-600 font-medium">
                      <span className={cn(
                        "px-2 py-1 rounded text-xs font-bold uppercase",
                        room.type === 'Laboratory' ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {room.type}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-8 py-4 border-t border-slate-100 bg-slate-50/30 flex items-center justify-between shrink-0">
          <p className="text-sm text-slate-500 font-medium">Total Rooms: {rooms.length}</p>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <span className="material-symbols-outlined text-sm">info</span>
            List is currently sorted by room ID
          </div>
        </div>
      </div>
    </div>
  );
}

export default Rooms;
