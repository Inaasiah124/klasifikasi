import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getTasks, getRecordings, getClassifications, addTask, getUsers } from '../utils/storage';

export default function CoachDashboard() {
  const navigate = useNavigate();

  // data store
  const [tasks, setTasks] = useState(getTasks());
  const [recs, setRecs] = useState(getRecordings());
  const [clf, setClf] = useState(getClassifications());
  const [users, setUsers] = useState(getUsers());

  // UI state
  const [selectedTaskId, setSelectedTaskId] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // modal tambah tugas
  const [open, setOpen] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);

  // buka modal dari Header
  useEffect(() => {
    const openHandler = () => setOpen(true);
    window.addEventListener('openTaskModal', openHandler);
    return () => window.removeEventListener('openTaskModal', openHandler);
  }, []);

  // submit tambah tugas
  const submitTask = (e) => {
    e.preventDefault();
    const ok = addTask({ 
      title: 'Tugas Tes Suara', 
      instruction,
      assignedTo: selectedMembers.length > 0 ? selectedMembers : 'ALL'
    });
    if (ok) {
      setInstruction('');
      setSelectedMembers([]);
      setOpen(false);
    } else {
      alert('Instruksi wajib diisi');
    }
  };

  // sync dari localStorage
  useEffect(() => {
    const refetchTasks = () => setTasks(getTasks());
    const refetchRecs = () => setRecs(getRecordings());
    const refetchClf = () => setClf(getClassifications());
    const refetchUsers = () => setUsers(getUsers());
    window.addEventListener('tasks', refetchTasks);
    window.addEventListener('recordings', refetchRecs);
    window.addEventListener('classifications', refetchClf);
    window.addEventListener('users', refetchUsers);
    return () => {
      window.removeEventListener('tasks', refetchTasks);
      window.removeEventListener('recordings', refetchRecs);
      window.removeEventListener('classifications', refetchClf);
      window.removeEventListener('users', refetchUsers);
    };
  }, []);

  // gabungkan data untuk tabel
  const tableData = useMemo(() => {
    const users = [...new Set(recs.map(r => r.username))];
    return users.map(username => {
      const userRecs = recs.filter(r => r.username === username);
      const latestRec = userRecs.sort((a, b) => b.createdAt - a.createdAt)[0];
      const latestLabel = latestRec ? clf[`${latestRec.taskId}:${username}`]?.label : null;
      
      return {
        username,
        jenisSuara: latestLabel || '-',
        tanggalJoin: latestRec ? new Date(latestRec.createdAt).toLocaleDateString('id-ID') : '-',
        statusKeanggotaan: 'aktif',
        checkSuara: latestLabel ? 'sudah' : 'belum',
        hasilTesSuara: latestLabel || '-'
      };
    });
  }, [recs, clf]);

  // hitung klasifikasi
  const classificationCounts = useMemo(() => {
    const counts = {};
    Object.values(clf).forEach(item => {
      if (item.label && item.label !== '-') {
        counts[item.label] = (counts[item.label] || 0) + 1;
      }
    });
    return counts;
  }, [clf]);

  // toggle status aktif/tidak aktif untuk user
  const toggleUserStatus = (username) => {
    const currentStatus = localStorage.getItem(`user_${username}_active`);
    const newStatus = currentStatus === 'true' ? 'false' : 'true';
    localStorage.setItem(`user_${username}_active`, newStatus);
    window.dispatchEvent(new Event('userStatusChanged'));
  };

  // cek status aktif user
  const isUserActive = (username) => {
    return localStorage.getItem(`user_${username}_active`) !== 'false';
  };

  // toggle anggota yang dipilih
  const toggleMember = (username) => {
    setSelectedMembers(prev => 
      prev.includes(username) 
        ? prev.filter(u => u !== username)
        : [...prev, username]
    );
  };

  const exportCsv = () => {
    const rows = [
      ['Nama', 'Jenis Suara', 'Tanggal Join', 'Status Keanggotaan', 'Check Suara', 'Hasil Tes Suara'],
      ...tableData.map(r => [
        r.username,
        r.jenisSuara,
        r.tanggalJoin,
        r.statusKeanggotaan,
        r.checkSuara,
        r.hasilTesSuara,
      ]),
    ];
    const csv = rows
      .map(cols => cols.map(x => `"${String(x).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'list-anggota-paduan-suara.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">👥</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white/90">Total Anggota</p>
                <p className="text-2xl font-bold text-white">{tableData.length}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-green-600 px-6 py-4">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white/90">Sudah Check</p>
                <p className="text-2xl font-bold text-white">
                  {tableData.filter(t => t.checkSuara === 'sudah').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 px-6 py-4">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">⏳</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white/90">Belum Check</p>
                <p className="text-2xl font-bold text-white">
                  {tableData.filter(t => t.checkSuara === 'belum').length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-4">
            <div className="flex items-center">
              <div className="p-3 bg-white/20 rounded-lg">
                <span className="text-2xl">��</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white/90">Total Rekaman</p>
                <p className="text-2xl font-bold text-white">{recs.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        
        {/* KIRI: List Anggota Paduan Suara */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-gray-700 to-gray-800 px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">List Anggota Paduan Suara</h2>
              <button
                onClick={exportCsv}
                className="px-3 py-1 text-sm bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
              >
                📊 Export CSV
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jenis Suara</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal Join</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check Suara</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tableData.map((row, index) => (
                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-br from-pink-500 to-rose-500 rounded-full flex items-center justify-center text-white font-medium text-sm">
                            {row.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">{row.username}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          row.jenisSuara !== '-' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {row.jenisSuara}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {row.tanggalJoin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => toggleUserStatus(row.username)}
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full transition-colors ${
                            isUserActive(row.username)
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {isUserActive(row.username) ? 'Aktif' : 'Tidak Aktif'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          row.checkSuara === 'sudah' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {row.checkSuara}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <button className="text-blue-600 hover:text-blue-800 transition-colors">
                          👁️ Lihat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* KANAN: Hasil Klasifikasi Suara */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-6 py-4">
              <h2 className="text-lg font-semibold text-white">Hasil Klasifikasi Suara</h2>
            </div>
            
            <div className="p-6 space-y-4">
              {Object.entries(classificationCounts).map(([label, count]) => (
                <div key={label} className="bg-gradient-to-r from-yellow-100 to-amber-100 rounded-xl p-4 border border-yellow-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-semibold text-gray-900 capitalize">
                      {label}
                    </div>
                    <div className="text-lg font-bold text-gray-900">
                      {count}
                    </div>
                  </div>
                </div>
              ))}
              
              {Object.keys(classificationCounts).length === 0 && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-2">🎵</div>
                  <div className="text-sm text-gray-500">
                    Belum ada hasil klasifikasi
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Tambah Tugas */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />
          <div className="relative w-[92vw] max-w-xl rounded-2xl bg-white text-gray-900 shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 px-6 py-4 flex items-center justify-between">
              <div className="font-semibold text-lg text-white">Tambah Tugas</div>
              <button onClick={() => setOpen(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">✕</button>
            </div>

            <form onSubmit={submitTask} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Instruksi</label>
                <textarea
                  value={instruction}
                  onChange={e => setInstruction(e.target.value)}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  placeholder="Masukkan instruksi untuk anggota"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Anggota:</label>
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {users.filter(u => u.role !== 'pelatih').map(user => (
                    <label key={user.username} className="flex items-center gap-2 text-sm mb-2">
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(user.username)}
                        onChange={() => toggleMember(user.username)}
                        className="rounded"
                      />
                      <span>{user.username}</span>
                    </label>
                  ))}
                  {users.filter(u => u.role !== 'pelatih').length === 0 && (
                    <p className="text-sm text-gray-500">Belum ada anggota</p>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setOpen(false)} 
                  className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white transition-colors"
                >
                  Kirim
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}