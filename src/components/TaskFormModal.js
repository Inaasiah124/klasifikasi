// components/TaskFormModal.js
import React, { useState } from 'react';
import { getUsers } from '../utils/storage';

function TaskFormModal({ open, onClose, onCreate }) {
  const [title, setTitle] = useState('');
  const [instruction, setInstruction] = useState('');
  const [assignAll, setAssignAll] = useState(true);
  const [selected, setSelected] = useState([]); // array of usernames
  const users = getUsers();

  if (!open) return null;

  const toggleUser = (u) => {
    setSelected(prev =>
      prev.includes(u) ? prev.filter(x => x !== u) : [...prev, u]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !instruction.trim()) return;
    onCreate({
      title: title.trim(),
      instruction: instruction.trim(),
      assignedTo: assignAll ? 'ALL' : selected,
    });
    setTitle(''); setInstruction(''); setSelected([]); setAssignAll(true);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl p-6">
          <h3 className="text-lg font-semibold mb-1">Buat Tugas Tes Suara</h3>
          <p className="text-sm text-gray-500 mb-4">Isi judul & instruksi, lalu pilih penerima.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm mb-1">Judul Tugas</label>
              <input
                className="w-full border rounded px-3 py-2"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Tes Suara 23 Sept 2025"
              />
            </div>
            <div>
              <label className="block text-sm mb-1">Instruksi</label>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[90px]"
                value={instruction}
                onChange={e => setInstruction(e.target.value)}
                placeholder='Nyanyikan reff "Manusia-manusia kuat, itu kita..."'
              />
            </div>

            <div className="border rounded p-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={assignAll}
                  onChange={() => setAssignAll(v => !v)}
                />
                Kirim ke semua anggota
              </label>

              {!assignAll && (
                <div className="mt-2 max-h-40 overflow-auto space-y-1">
                  {users.map(u => (
                    <label key={u.username} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(u.username)}
                        onChange={() => toggleUser(u.username)}
                      />
                      {u.username} <span className="text-xs text-gray-500">({u.role})</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-3 py-2 rounded border">
                Batal
              </button>
              <button type="submit" className="px-4 py-2 rounded bg-pink-500 text-white">
                Kirim Tugas
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default TaskFormModal;
