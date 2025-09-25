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
  
  // Get NPM from localStorage
  const npm = localStorage.getItem('npm') || username;
  
  // Check if user is active (from coach dashboard)
  const [isActive, setIsActive] = useState(() => {
    return localStorage.getItem(`member_${npm}_active`) === 'true';
  });

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

  // Listen for member status updates from coach dashboard
  useEffect(() => {
    const handleMemberStatusUpdate = () => {
      const userActive = localStorage.getItem(`member_${npm}_active`) === 'true';
      setIsActive(userActive);
    };
    
    window.addEventListener('memberStatusUpdate', handleMemberStatusUpdate);
    return () => window.removeEventListener('memberStatusUpdate', handleMemberStatusUpdate);
  }, [npm]);

  // ambil tugas terbaru untuk user - PERBAIKAN LOGIKA
  const latestTask = useMemo(() => {
    // Jika ada tugas, ambil yang terbaru (meskipun status kosong)
    if (tasks.length > 0) {
      // Urutkan berdasarkan tanggal dibuat (terbaru dulu)
      const sortedTasks = tasks.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      return sortedTasks[0];
    }
    return null;
  }, [tasks]);

  // ambil hasil klasifikasi terbaru untuk user
  const latestClassification = useMemo(() => {
    if (!latestTask) return null;
    const key = `${latestTask.id}:${npm}`;
    return clf[key] || null;
  }, [clf, latestTask, npm]);

  // data untuk stats cards
  const userRecs = useMemo(() => {
    return recs.filter(r => r.username === npm);
  }, [recs, npm]);

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
        username: npm,
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
      setErr('Gagal mengakses mikrofon. Izinkan mic di browser ya 🎤');
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
      username: npm,
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
                {tasks.filter(t => t.status && t.status[npm] === 'done').length}
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
                {tasks.filter(t => t.status && t.status[npm] === 'pending').length}
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
              <h3 className="text-sm font-medium text-gray-700 mb-2">Instruksi:</h3>
              <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                  {latestTask?.instruction || 'Belum ada instruksi dari pelatih'}
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
                <span className={`w-2 h-2 rounded-full mr-2 ${
                  isActive ? 'bg-green-500' : 'bg-red-500'
                }`}></span>
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

      {/* Modal Rekam - Hanya menampilkan instruksi jika ada tugas */}
      {showRecordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowRecordModal(false)} />
          <div className="relative w-[92vw] max-w-xl rounded-2xl bg-white text-gray-900 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="font-bold text-xl text-gray-900">Check Jenis Suara</div>
              <button 
                onClick={() => setShowRecordModal(false)} 
                className="text-gray-500 hover:text-gray-700 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Instruksi dari Coach - Hanya tampil jika ada tugas */}
              {latestTask && (
                <div className="mb-8">
                  <div className="text-sm font-semibold text-gray-900 mb-3">Instruksi:</div>
                  <div className="bg-white border border-gray-300 rounded-lg p-4 shadow-sm">
                    <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                      {latestTask.instruction}
                    </p>
                  </div>
                </div>
              )}

              {/* Kontrol rekam */}
              <div className="flex flex-col items-center gap-6">
                {/* Microphone Button */}
                <button
                  onClick={recording ? stopRec : startRec}
                  className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 ${
                    recording 
                      ? 'bg-red-500 text-white hover:bg-red-600' 
                      : 'bg-purple-500 text-white hover:bg-purple-600'
                  }`}
                  title={recording ? 'Stop Recording' : 'Start Recording'}
                >
                  <span className="text-3xl">🎤</span>
                </button>

                {/* Audio Player/Progress Bar */}
                <div className="w-full max-w-md">
                  <div className="flex items-center gap-3">
                    <button className="text-blue-600 hover:text-blue-800">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                    <div className="flex-1 h-2 bg-gray-300 rounded-full">
                      <div className="h-2 bg-blue-500 rounded-full" style={{ width: '0%' }}></div>
                    </div>
                    <span className="text-sm font-mono text-gray-600 w-12 text-right">00:00</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={resetRec}
                    disabled={!blob && !previewURL}
                    className="px-4 py-2 rounded-lg border border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
                  >
                    <span className="text-sm">⏹</span>
                    Rekam ulang
                  </button>
                  <button
                    onClick={uploadRec}
                    disabled={!blob}
                    className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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