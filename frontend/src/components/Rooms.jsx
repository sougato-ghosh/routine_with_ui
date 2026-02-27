import React, { useState, useEffect, useRef } from 'react';
import { getData, updateData, importCSV, exportCSV } from '../api';
import { cn } from '../utils';

function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newRoom, setNewRoom] = useState({
    room_id: '',
    name: '',
    capacity: 40,
    type: 'Theory'
  });
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = () => {
    setLoading(true);
    getData('rooms').then(res => {
      setRooms(res.data);
      setLoading(false);
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importCSV('rooms', file);
        fetchRooms();
        alert('Rooms imported successfully');
      } catch (err) {
        console.error(err);
        alert('Failed to import rooms');
      }
    }
  };

  const handleExport = () => {
    exportCSV('rooms');
  };

  const handleDeleteRooms = async (idsToDelete) => {
    try {
      setLoading(true);
      const updatedRooms = rooms.filter(r => !idsToDelete.includes(r.room_id));
      await updateData('rooms', updatedRooms);
      setSelectedIds(selectedIds.filter(id => !idsToDelete.includes(id)));
      fetchRooms();
    } catch (err) {
      console.error(err);
      alert('Failed to delete rooms');
      setLoading(false);
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    try {
      await updateData('rooms', [...rooms, newRoom]);
      setIsModalOpen(false);
      setNewRoom({
        room_id: '',
        name: '',
        capacity: 40,
        type: 'Theory'
      });
      fetchRooms();
    } catch (err) {
      console.error(err);
      alert('Failed to add room');
    }
  };

  return (
    <div className="flex flex-col">
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Rooms</h1>
        <p className="text-slate-500 mt-2">Configure and manage all physical teaching spaces.</p>
      </header>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[750px] max-h-[calc(100vh-200px)]">
        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-white">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Rooms List</h2>
            <p className="text-sm text-slate-500 mt-1">Total: {rooms.length} Teaching Spaces</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <button
              onClick={handleImportClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-base">file_upload</span>
              Import CSV
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              Export CSV
            </button>
            {selectedIds.length > 0 && (
              <button
                onClick={() => handleDeleteRooms(selectedIds)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                Delete Selected ({selectedIds.length})
              </button>
            )}
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:opacity-90 transition-opacity shadow-sm"
            >
              <span className="material-symbols-outlined text-base">add_home</span>
              Add Room
            </button>
          </div>
        </div>

        <div className="overflow-y-auto custom-scrollbar flex-1 bg-slate-50/50">
          <table className="w-full text-left border-separate border-spacing-0">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 border-b border-slate-200 w-12">
                   <input
                    type="checkbox"
                    checked={rooms.length > 0 && selectedIds.length === rooms.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(rooms.map(r => r.room_id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">ROOM_ID</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">NAME</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-center">CAPACITY</th>
                <th className="px-6 py-4 text-[12px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">TYPE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center bg-white">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center bg-white text-slate-500">
                    No rooms found. Add one or import from CSV.
                  </td>
                </tr>
              ) : (
                rooms.map((room) => (
                  <tr key={room.room_id} className="hover:bg-slate-50/50 transition-colors bg-white">
                    <td className="px-6 py-4 border-b border-slate-100">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(room.room_id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds([...selectedIds, room.room_id]);
                          } else {
                            setSelectedIds(selectedIds.filter(id => id !== room.room_id));
                          }
                        }}
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600 border-b border-slate-100">{room.room_id}</td>
                    <td className="px-6 py-4 text-slate-900 font-bold border-b border-slate-100">{room.name}</td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium border-b border-slate-100">{room.capacity}</td>
                    <td className="px-6 py-4 border-b border-slate-100">
                      <span className={cn(
                        "px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider",
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
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Add New Room</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleAddRoom} className="p-6 space-y-4">
              <div className="space-y-1">
                <label htmlFor="room_id" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room ID</label>
                <input
                  id="room_id"
                  required
                  type="text"
                  value={newRoom.room_id}
                  onChange={e => setNewRoom({...newRoom, room_id: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. R101"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="name" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Name</label>
                <input
                  id="name"
                  required
                  type="text"
                  value={newRoom.name}
                  onChange={e => setNewRoom({...newRoom, name: e.target.value})}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  placeholder="e.g. Physics Lab"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="capacity" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Capacity</label>
                  <input
                    id="capacity"
                    required
                    type="number"
                    min="1"
                    value={newRoom.capacity}
                    onChange={e => setNewRoom({...newRoom, capacity: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="type" className="text-xs font-bold text-slate-500 uppercase tracking-wider">Room Type</label>
                  <select
                    id="type"
                    value={newRoom.type}
                    onChange={e => setNewRoom({...newRoom, type: e.target.value})}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-white"
                  >
                    <option value="Theory">Theory</option>
                    <option value="Laboratory">Laboratory</option>
                  </select>
                </div>
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
                  Save Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Rooms;
