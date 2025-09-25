// src/pages/RecordingsPage.js
import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getRecordings, addRecording, getUsers, setClassification } from '../utils/storage';
import Footer from '../components/Footer';

function RecordingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const search = new URLSearchParams(location.search);
  const modalMode = search.get('modal') === '1';

  const role = (localStorage.getItem('role') || 'user').toLowerCase();
  const isCoach = role === 'pelatih';

  const [recs, setRecs] = useState(getRecordings());
  const [users] = useState(getUsers());
  const [owner, setOwner] = useState(localStorage.getItem('username') || 'user');

  // UI state
  const [mode, setMode] = useState(modalMode ? 'record' : 'upload'); // modal: langsung ke record

  // Upload state
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);

  // Record state
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState(null);
  const [stream, setStream] = useState(null);
  const [blob, setBlob] = useState(null);
  const [previewURL, setPreviewURL] = useState('');
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  const [success, setSuccess] = useState({ open: false, fileName: '' });
  const tickRef = useRef(null);
  const mimeRef = useRef('audio/webm');

  useEffect(() => {
    const refetch = () => setRecs(getRecordings());
    window.addEventListener('recordings', refetch);
    return () => window.removeEventListener('recordings', refetch);
  }, []);

  useEffect(() => {
    return () => cleanup();
    // eslint-disable-next-line
  }, []);

  const workTask = {
    id: localStorage.getItem('workTaskId') || null,
    title: localStorage.getItem('workTaskTitle') || '',
    instruction: localStorage.getItem('workTaskInstruction') || '',
  };

  const cleanup = () => {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null; }
    if (recorder && recorder.state === 'recording') recorder.stop();
    if (stream) stream.getTracks().forEach(t => t.stop());
    if (previewURL) URL.revokeObjectURL(previewURL);
  };

  // helpers
  const fileToDataURL = (f) => new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result);
    fr.readAsDataURL(f);
  });

  const pickMime = () => {
    if (window.MediaRecorder?.isTypeSupported('audio/webm')) return 'audio/webm';
    if (window.MediaRecorder?.isTypeSupported('audio/ogg'))  return 'audio/ogg';
    if (window.MediaRecorder?.isTypeSupported('audio/mp4'))  return 'audio/mp4';
    return 'audio/webm';
  };

  // Upload
  const onDrop = async (e) => {
    e.preventDefault(); e.stopPropagation();
    setDrag(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith('audio/')) setFile(f);
  };

  const uploadFile = async () => {
    if (!file) return;
    const dataUrl = await fileToDataURL(file);
    addRecording({
      username: owner,
      fileName: file.name,
      mime: file.type || 'audio/*',
      dataUrl,
      taskId: workTask.id || null
    });
    setFile(null);
    setSuccess({ open: true, fileName: file.name });
  };

  // Rekam
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
    const dataUrl = await fileToDataURL(new File([blob], fileName, { type: mimeRef.current }));
    addRecording({ username: owner, fileName, mime: mimeRef.current, dataUrl, taskId: workTask.id || null });
    resetRec();
    setSuccess({ open: true, fileName });
  };

  const mmss = (s) => {
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const ss = String(s % 60).padStart(2, '0');
    return `${m}:${ss}`;
  };

  // Wrapper untuk mode modal vs halaman penuh
  const Wrapper = ({ children }) => modalMode
    ? <div className="rounded-2xl bg-white text-gray-900 shadow-2xl">{children}</div>
    : <div className="min-h-screen bg-white text-gray-900">{children}</div>;

  return (
    <Wrapper>
      <div className={modalMode ? "p-5" : "max-w-6xl mx-auto px-6 py-8"}>

        {/* header */}
        <div className={modalMode ? "" : "mb-8"}>
          <div className={modalMode ? "px-5 pt-1 pb-3 border-b flex items-center justify-between" : ""}>
            <h1 className={modalMode ? "text-lg font-semibold" : "text-3xl font-bold text-gray-900"}>
              {modalMode ? "Kerjakan Tugas" : "🎤 Uploads Suara & Hasil Klasifikasi"}
            </h1>
            {modalMode && (
              <button onClick={() => navigate(-1)} className="px-2 text-gray-600">✕</button>
            )}
          </div>

          {!modalMode && (
            <div className="mt-4">
              <div className="inline-flex bg-gray-100 rounded-xl p-1 border border-gray-200">
                <button
                  className={`px-4 py-2 rounded-lg text-sm transition ${mode==='upload' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => setMode('upload')}
                >
                  ⬆️ Upload
                </button>
                <button
                  className={`px-4 py-2 rounded-lg text-sm transition ${mode==='record' ? 'bg-blue-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
                  onClick={() => setMode('record')}
                >
                  🎧 Rekam
                </button>
              </div>
            </div>
          )}

          {/* content */}
          {mode === 'upload' && !modalMode ? (
            <div
              onDragEnter={(e)=>{e.preventDefault(); setDrag(true);}}
              onDragOver={(e)=>{e.preventDefault();}}
              onDragLeave={(e)=>{e.preventDefault(); setDrag(false);}}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-2xl p-8 text-center transition mt-6
                ${drag ? 'border-blue-400 bg-blue-50' : 'border-gray-300 bg-gray-50'}
              `}
            >
              <p className="text-gray-600">Seret & letakkan file audio di sini</p>
              <p className="text-sm text-gray-400">atau</p>
              <label className="mt-3 inline-block cursor-pointer">
                <span className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-sm shadow">
                  Pilih File
                </span>
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </label>
              {file && <p className="mt-3 text-sm text-gray-600">Dipilih: <b>{file.name}</b></p>}

              <div className="flex justify-end mt-5">
                <button
                  onClick={uploadFile}
                  disabled={!file}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white shadow"
                >
                  ⬆️ Upload
                </button>
              </div>
            </div>
          ) : (
            <div className={modalMode ? "p-0" : "mt-6"}>
              {/* Instruksi tugas (jika ada) */}
              {workTask.id && (
                <div className="mb-6">
                  <div className={modalMode ? "text-sm font-semibold mb-2" : "text-sm font-medium text-gray-700 mb-2"}>{workTask.title}</div>
                  <textarea
                    readOnly
                    value={workTask.instruction}
                    className={modalMode ? "w-full rounded-xl border text-sm p-3" : "w-full rounded-xl border border-gray-300 text-sm p-3 bg-gray-50"}
                    rows={3}
                  />
                </div>
              )}

              {/* Kontrol rekam */}
              <div className="flex flex-col items-center gap-5">
                <button
                  onClick={recording ? stopRec : startRec}
                  className={`w-28 h-28 rounded-full flex items-center justify-center shadow
                              ${recording ? 'bg-rose-600 text-white' : 'bg-white border border-gray-300 text-gray-800 hover:bg-gray-50'}`}
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
                        <div className="h-1 bg-blue-600 rounded" style={{ width: `${Math.min(100, (secs/60)*100)}%` }} />
                      </div>
                      <span className="ml-3 font-mono">{mmss(secs)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={resetRec}
                    disabled={!blob && !previewURL}
                    className="px-3 py-2 rounded-lg border bg-gray-100 text-gray-800 disabled:opacity-50 hover:bg-gray-200"
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
          )}
        </div>

        {!modalMode && (
          <>
            {/* Hasil Klasifikasi */}
            <div className="grid lg:grid-cols-2 gap-8 mt-8">
              {/* Uploads Suara */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">�� Uploads Suara</h2>
                <div>
                  {recs.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🎵</div>
                      <div className="text-sm text-gray-500">Belum ada rekaman</div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recs.slice(0, 5).map((r) => (
                        <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                              <span className="text-pink-600">🎵</span>
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{r.fileName}</div>
                              <div className="text-xs text-gray-500">{new Date(r.createdAt).toLocaleDateString('id-ID')}</div>
                            </div>
                          </div>
                          <audio controls src={r.dataUrl} className="w-32 h-8" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Hasil Klasifikasi */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Hasil Klasifikasi</h2>
                <div>
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">��</div>
                    <div className="text-sm text-gray-500">Hasil klasifikasi akan muncul di sini</div>
                    <div className="text-xs text-gray-400 mt-2">Setelah rekaman dianalisis oleh AI</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

      </div>

      {/* Footer untuk halaman penuh */}
      {!modalMode && <Footer />}

      {/* Modal sukses */}
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
                Audio <b>{success.fileName}</b> berhasil disimpan{workTask.title ? ` untuk tugas "${workTask.title}"` : ''}.
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setSuccess({ open: false, fileName: '' })}
                  className="px-4 py-2 rounded-lg border"
                >
                  Tutup
                </button>
                <button
                  onClick={() => {
                    localStorage.removeItem('workTaskId');
                    localStorage.removeItem('workTaskTitle');
                    localStorage.removeItem('workTaskInstruction');
                    setSuccess({ open: false, fileName: '' });
                    if (modalMode) navigate(-1);
                  }}
                  className="px-4 py-2 rounded-lg bg-pink-600 text-white"
                >
                  Selesai
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Wrapper>
  );
}

export default RecordingsPage;