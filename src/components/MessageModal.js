import React, { useEffect, useMemo, useState } from 'react';
import { getUsers, getMessages, messagesForUser, sendMessage } from '../utils/storage';

function MessageModal({ open, role = 'user', username, onClose }) {
  const isCoach = role.toLowerCase() === 'pelatih';
  const [list, setList] = useState([]);
  const [toUser, setToUser] = useState('');
  const [text, setText] = useState('');
  const [editId, setEditId] = useState(null);
  const users = useMemo(() => getUsers().filter(u => u.role !== 'pelatih'), []);

  useEffect(() => {
    if (!open) return;
    const refetch = () => {
      setList(isCoach ? getMessages() : messagesForUser(username));
    };
    refetch();
    window.addEventListener('messages', refetch);
    return () => window.removeEventListener('messages', refetch);
  }, [open, isCoach, username]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    if (isCoach && !toUser) return;

    sendMessage({ to: isCoach ? toUser : username, text: text.trim(), from: isCoach ? 'pelatih' : username, id: editId || null });
    setText('');
    setEditId(null);
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Pesan {isCoach ? '— Pelatih' : '— Inbox'}</h3>
            <button onClick={onClose} className="px-3 py-1 rounded border">Tutup</button>
          </div>

          {isCoach && (
            <form onSubmit={submit} className="border rounded p-3 mb-4 space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <label className="text-sm">Kepada:</label>
                <select value={toUser} onChange={e => setToUser(e.target.value)} className="border rounded px-2 py-1">
                  <option value="">— pilih anggota —</option>
                  {users.map(u => <option key={u.username} value={u.username}>{u.username}</option>)}
                </select>
              </div>
              <textarea
                className="w-full border rounded px-3 py-2 min-h-[80px]"
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Tulis pesan untuk anggota…"
              />
              <div className="flex justify-end gap-2">
                {editId && (
                  <button type="button" onClick={() => { setEditId(null); setText(''); }}
                          className="px-3 py-2 rounded border">Batal Edit</button>
                )}
                <button type="submit" className="px-4 py-2 rounded bg-pink-500 text-white">
                  {editId ? 'Simpan Perubahan' : 'Kirim Pesan'}
                </button>
              </div>
            </form>
          )}

          <div className="max-h-80 overflow-auto">
            {list.length === 0 ? (
              <div className="text-sm text-gray-500">Belum ada pesan.</div>
            ) : (
              <ul className="space-y-2">
                {list.map(m => (
                  <li key={m.id} className="border rounded p-3">
                    <div className="text-xs text-gray-500 mb-1">
                      Kepada: <b>{m.to}</b> • Dari: <b>{m.from}</b> • {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div className="text-sm whitespace-pre-wrap">{m.text}</div>
                    {isCoach && (
                      <div className="mt-2">
                        <button
                          onClick={() => { setEditId(m.id); setText(m.text); setToUser(m.to); }}
                          className="text-xs px-2 py-1 rounded border hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default MessageModal;
