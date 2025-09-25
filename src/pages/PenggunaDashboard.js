import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getTasks, getClassifications, getRecordings, addRecording } from '../utils/storage';
import UploadModal from '../components/UploadModal';

export default function PenggunaDashboard({ username = (localStorage.getItem('username') || 'Nama') }) {
  const navigate = useNavigate();
  const location = useLocation();

  // data
  const [tasks, setTasks] = useState(getTasks());
  const [clf, setClf] = useState(getClassifications());
  const [recs, setRecs] = useState(getRecordings());
  const [isActive, setIsActive] = useState(false); // Default false, harus diaktifkan coach

  // modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [blob, setBlob] = useState(null);
  const [previewURL, setPreviewURL] = useState('');
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  const [success, setSuccess] = useState({ open: false, fileName: '' });
  const tickRef = React.useRef(null);
  const mimeRef = React.useRef('audio/webm');

  // sync storage
  useEffect(() => {
    const refetchTasks = () => setTasks(getTasks());
    const refetchClf = () => setClf(getClassifications());
    const refetchRecs = () => setRecs(getRecordings());
    window.addEventListener('tasks', refetchTasks);
    window.addEventListener('classifications', refetchClf);
    window.addEventListener('recordings', refetchRecs);
    return () => {
      window.removeEventListener('tasks', refetchTasks);
      window.removeEventListener('classifications', refetchClf);
      window.removeEventListener('recordings', refetchRecs);
    };
  }, []);

  // buka modal upload dari Header
  useEffect(() => {
    const openHandler = () => setShowUploadModal(true);
    window.addEventListener('openUploadModal', openHandler);
    return () => window.removeEventListener('openUploadModal', openHandler);
  }, []);

  // cek status aktif user - default false, harus diaktifkan coach
  useEffect(() => {
    const checkUserStatus = () => {
      const userActive = localStorage.getItem(`user_${username}_active`) === 'true';
      setIsActive(userActive);
    };
    
    checkUserStatus();
    window.addEventListener('userStatusChanged', checkUserStatus);
    return () => window.removeEventListener('userStatusChanged', checkUserStatus);
  }, [username]);

  // ambil tugas terbaru untuk user
  const latestTask = useMemo(() => {
    return tasks
      .sort((a, b) => b.createdAt - a.createdAt)
      .find(task => task.status && task.status[username] !== undefined) || null;
  }, [tasks, username]);

  // ambil hasil klasifikasi terbaru untuk user
  const latestClassification = useMemo(() => {
    if (!latestTask) return null;
    const key = `${latestTask.id}:${username}`;
    return clf[key] || null;
  }, [clf, latestTask, username]);

  // data untuk stats cards
  const userRecs = useMemo(() => {
    return recs.filter(r => r.username === username);
  }, [recs, username]);

  const handleCheck = () => {
    if (!isActive) {
      alert('Akun Anda belum diaktifkan oleh pelatih. Silakan hubungi pelatih untuk mengaktifkan akun Anda terlebih dahulu.');
      return;
    }
    setShowRecordModal(true);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const newRecording = {
        username,
        fileName: file.name,
        mime: file.type,
        dataUrl,
        taskId: latestTask?.id || null,
      };

      addRecording(newRecording);
      setShowUploadModal(false);
      setSuccess({ open: true, fileName: file.name });
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Gagal mengupload file');
    }
  };

  // Record functions
  const pickMime = () => {
    if (window.MediaRecorder?.isTypeSupported('audio/webm')) return 'audio/webm';
    if (window.MediaRecorder?.isTypeSupported('audio/ogg'))  return 'audio/ogg';
    if (window.MediaRecorder?.isTypeSupported('audio/mp4'))  return 'audio/mp4';
    return 'audio/webm';
  };

  const startRec = async () => {
    try {
      setErr('');
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 }
      });
      setStream(s);

      const mt = pickMime();
      mimeRef.current = mt;
      const mr = new MediaRecorder(s, { mimeType: mt });
      const chunks = [];

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        const b = new Blob(chunks, { type: mt });
        setBlob(b);
        const url = URL.createObjectURL(b);
        setPreviewURL(url);
        setRecording(false);
        if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
      };

      mr.start();
      setRecorder(mr);
      setBlob(null);
      setPreviewURL('');
      setRecording(true);
      setSecs(0);
      tickRef.current = setInterval(() => setSecs(s => s + 1), 1000);
    } catch {
      setErr('Gagal mengakses mikrofon. Izinkan mic di browser ya ��');
    }
  };

  const stopRec = () => {
    if (recorder && recorder.state === 'recording') recorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
  };

  const resetRec = () => {
    if (previewURL) URL.revokeObjectURL(previewURL);
    setBlob(null); setPreviewURL(''); setErr(''); setSecs(0);
  };

  const uploadRec = async () => {
    if (!blob) return;
    const ext = mimeRef.current.split('/')[1] || 'webm';
    const fileName = `rec_${new Date().toISOString().replace(/[:.]/g, '-')}.${ext}`;
    
    const newRecording = {
      username,
      fileName,
      mime: mimeRef.current,
      dataUrl: await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      }),
      taskId: latestTask?.id || null,
    };
    
    addRecording(newRecording);
    resetRec();
    setShowRecordModal(false);
    setSuccess({ open: true, fileName });
  };

  const mmss = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${m}:${ss}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      
      {/* Stats Cards - Di luar card utama */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Tugas</p>
              <p className="text-2xl font-bold text-gray-900">{tasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tugas Selesai</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status && t.status[username] === 'done').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Tugas Pending</p>
              <p className="text-2xl font-bold text-gray-900">
                {tasks.filter(t => t.status && t.status[username] === 'pending').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <span className="text-2xl">🎵</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Rekaman</p>
              <p className="text-2xl font-bold text-gray-900">{userRecs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Card Utama - Hanya berisi dua kartu besar */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        {/* Two Cards Layout */}
        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Left Card: Check Jenis Suara */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Check Jenis Suara</h2>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Instruksi!</h3>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  {latestTask?.instruction || 'belum ada instruksi dari pelatih'}
                </p>
              </div>
            </div>

            {/* Status indicator */}
            <div className="mb-4">
              <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isActive 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                <span className="w-2 h-2 rounded-full mr-2 ${
                  isActive ? 'bg-green-500' : 'bg-red-500'
                }"></span>
                {isActive ? 'Akun Aktif' : 'Akun Belum Aktif'}
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleCheck}
                disabled={!isActive}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isActive 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isActive ? 'Check' : 'Belum Aktif'}
              </button>
            </div>
          </div>

          {/* Right Card: Jenis Suara */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Jenis Suara</h2>
            
            <div className="bg-yellow-100 border border-yellow-200 rounded-lg p-8 text-center">
              <div className="text-4xl font-bold text-gray-900">
                {latestClassification?.label || '-'}
              </div>
              {latestClassification && (
                <div className="text-sm text-gray-600 mt-2">
                  Terakhir diperiksa: {new Date(latestClassification.at).toLocaleDateString('id-ID')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        open={showUploadModal}
        title="Upload Suara"
        description="Pilih file audio untuk diupload"
        accept="audio/*"
        onClose={() => setShowUploadModal(false)}
        onSubmit={handleFileUpload}
      />

      {/* Modal Rekam */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRecordModal(false)} />
          <div className="relative w-[92vw] max-w-xl rounded-2xl bg-white text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="font-semibold text-lg">Check Jenis Suara</div>
              <button onClick={() => setShowRecordModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">✕</button>
            </div>

            <div className="p-6">
              {/* Instruksi tugas */}
              {latestTask && (
                <div className="mb-6">
                  <div className="text-sm font-semibold mb-2">{latestTask.title}</div>
                  <textarea
                    readOnly
                    value={latestTask.instruction}
                    className="w-full rounded-xl border text-sm p-3"
                    rows={3}
                  />
                </div>
              )}

              {/* Kontrol rekam */}
              <div className="flex flex-col items-center gap-5">
                <button
                  onClick={recording ? stopRec : startRec}
                  className={`w-28 h-28 rounded-full flex items-center justify-center shadow
                              ${recording ? 'bg-rose-600 text-white' : 'bg-white border border-gray-300 text-gray-800'}`}
                  title={recording ? 'Stop' : 'Mulai'}
                >
                  <span className="text-3xl">{recording ? '■' : '🎤'}</span>
                </button>

                {/* Player bar */}
                <div className="w-full max-w-xl">
                  {previewURL ? (
                    <audio controls src={previewURL} className="w-full" />
                  ) : (
                    <div className="w-full h-10 rounded-xl bg-gray-200 flex items-center px-3 text-gray-700 text-sm">
                      <span className="mr-2">▶</span>
                      <div className="flex-1 h-1 bg-gray-400 rounded">
                        <div className="h-1 bg-pink-500 rounded" style={{ width: `${Math.min(100, (secs/60)*100)}%` }} />
                      </div>
                      <span className="ml-3 font-mono">{mmss(secs)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={resetRec}
                    disabled={!blob && !previewURL}
                    className="px-3 py-2 rounded-lg border bg-gray-100 text-gray-800 disabled:opacity-50"
                  >
                    🔁 Rekam ulang
                  </button>
                  <button
                    onClick={uploadRec}
                    disabled={!blob}
                    className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                  >
                    Kirim
                  </button>
                </div>
              </div>

              {err && (
                <div className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">
                  {err}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Sukses */}
      {success.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSuccess({ open: false, fileName: '' })} />
          <div className="relative w-[92vw] max-w-md rounded-2xl bg-white text-gray-900 shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <div className="font-semibold">Berhasil disimpan</div>
              <button onClick={() => setSuccess({ open: false, fileName: '' })} className="px-2">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div className="text-sm text-gray-700">
                Audio <b>{success.fileName}</b> berhasil disimpan{latestTask?.title ? ` untuk tugas "${latestTask.title}"` : ''}.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSuccess({ open: false, fileName: '' })}
                  className="px-4 py-2 rounded-lg border"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}