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

  // Modal state
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [selectedRecording, setSelectedRecording] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    instruction: '',
    selectedMembers: []
  });

  // Search state for members
  const [memberSearch, setMemberSearch] = useState('');

  // Listen for events
  useEffect(() => {
    const handleTasksUpdate = () => setTasks(getTasks());
    const handleRecordingsUpdate = () => setRecs(getRecordings());
    const handleClassificationsUpdate = () => setClf(getClassifications());
    const handleOpenTaskModal = () => setShowTaskModal(true);
    const handleMemberStatusUpdate = () => {
      // Force re-render when member status changes
      setUsers([...getUsers()]);
    };

    window.addEventListener('tasks', handleTasksUpdate);
    window.addEventListener('recordings', handleRecordingsUpdate);
    window.addEventListener('classifications', handleClassificationsUpdate);
    window.addEventListener('openTaskModal', handleOpenTaskModal);
    window.addEventListener('memberStatusUpdate', handleMemberStatusUpdate);

    return () => {
      window.removeEventListener('tasks', handleTasksUpdate);
      window.removeEventListener('recordings', handleRecordingsUpdate);
      window.removeEventListener('classifications', handleClassificationsUpdate);
      window.removeEventListener('openTaskModal', handleOpenTaskModal);
      window.removeEventListener('memberStatusUpdate', handleMemberStatusUpdate);
    };
  }, []);

  // Filtered members based on search
  const filteredMembers = useMemo(() => {
    if (!memberSearch) return users;
    return users.filter(user => 
      user.nama.toLowerCase().includes(memberSearch.toLowerCase()) ||
      user.npm.toLowerCase().includes(memberSearch.toLowerCase())
    );
  }, [users, memberSearch]);

  // Voice classification stats - only Alto and Sopran
  const voiceStats = useMemo(() => {
    const classifications = Object.values(clf);
    const sopran = classifications.filter(c => c.label === 'Sopran').length;
    const alto = classifications.filter(c => c.label === 'Alto').length;

    return { sopran, alto };
  }, [clf]);

  // Handle task form changes
  const handleTaskFormChange = (field, value) => {
    setTaskForm(prev => ({ ...prev, [field]: value }));
  };

  // Handle member selection
  const handleMemberToggle = (memberNpm) => {
    setTaskForm(prev => ({
      ...prev,
      selectedMembers: prev.selectedMembers.includes(memberNpm)
        ? prev.selectedMembers.filter(npm => npm !== memberNpm)
        : [...prev.selectedMembers, memberNpm]
    }));
  };

  // Handle task submission - PERBAIKAN LOGIKA
  const handleTaskSubmit = () => {
    if (!taskForm.title.trim()) {
      alert('Judul tugas harus diisi');
      return;
    }

    if (!taskForm.instruction.trim()) {
      alert('Instruksi harus diisi');
      return;
    }

    if (taskForm.selectedMembers.length === 0) {
      alert('Pilih minimal satu anggota');
      return;
    }

    // Create task dengan status untuk anggota yang dipilih
    const newTask = {
      id: Date.now().toString(),
      title: taskForm.title,
      instruction: taskForm.instruction,
      createdAt: Date.now(),
      status: {} // Initialize status object
    };

    // Set status untuk setiap anggota yang dipilih
    taskForm.selectedMembers.forEach(npm => {
      newTask.status[npm] = 'pending';
    });

    // Add task to storage
    const currentTasks = getTasks();
    const updatedTasks = [...currentTasks, newTask];
    localStorage.setItem('tasks', JSON.stringify(updatedTasks));
    
    // Reset form
    setTaskForm({
      title: '',
      instruction: '',
      selectedMembers: []
    });
    setShowTaskModal(false);
    alert('Tugas berhasil ditambahkan!');
    
    // Trigger tasks update event
    window.dispatchEvent(new Event('tasks'));
  };

  // Get member name by npm
  const getMemberName = (npm) => {
    const user = users.find(u => u.npm === npm);
    return user ? user.nama : npm;
  };

  // Toggle member active status
  const toggleMemberStatus = (npm) => {
    const currentStatus = localStorage.getItem(`member_${npm}_active`) === 'true';
    localStorage.setItem(`member_${npm}_active`, (!currentStatus).toString());
    // Trigger re-render
    window.dispatchEvent(new Event('memberStatusUpdate'));
  };

  // Check if member is active
  const isMemberActive = (npm) => {
    return localStorage.getItem(`member_${npm}_active`) === 'true';
  };

  // Get member's voice type
  const getMemberVoiceType = (npm) => {
    const classification = Object.values(clf).find(c => 
      Object.keys(clf).some(key => key.includes(npm))
    );
    return classification ? classification.label : '-';
  };

  // Check if member has done voice check - PERBAIKAN LOGIKA
  const hasDoneVoiceCheck = (npm) => {
    // Cek apakah ada rekaman yang sudah didengarkan coach
    const hasBeenListened = localStorage.getItem(`recording_listened_${npm}`) === 'true';
    return hasBeenListened ? 'sudah' : 'belum';
  };

  // Get member's join date (simulated)
  const getMemberJoinDate = (npm) => {
    const user = users.find(u => u.npm === npm);
    if (user && user.createdAt) {
      return new Date(user.createdAt).toLocaleDateString('id-ID');
    }
    return '20/09/2025'; // Default date
  };

  // Get recordings for a specific user
  const getUserRecordings = (npm) => {
    return recs.filter(rec => rec.username === npm);
  };

  // Handle audio playback - PERBAIKAN LOGIKA
  const handlePlayRecording = (recording) => {
    setSelectedRecording(recording);
    setShowAudioModal(true);
    
    // Mark recording as listened by coach
    localStorage.setItem(`recording_listened_${recording.username}`, 'true');
    
    // Trigger re-render to update status
    window.dispatchEvent(new Event('memberStatusUpdate'));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Hello, Coach</h1>
          {/* Tombol Tambah Tugas dihapus - sudah ada di Header */}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex">
        {/* Left Section - Members Table */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
              <h2 className="text-xl font-bold text-white text-center">List Anggota Paduan Suara</h2>
            </div>
            
            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Nama</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Jenis Suara</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Tanggal Join</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Check Suara</th>
                    <th className="px-6 py-4 text-center text-sm font-medium text-gray-700">Rekaman</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user, index) => {
                    const userRecordings = getUserRecordings(user.npm);
                    return (
                      <tr key={user.npm} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-center">
                                <span className="text-white font-semibold text-sm">
                                  {user.nama ? user.nama.charAt(0).toUpperCase() : 'U'}
                                </span>
                              </div>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{user.nama || '-'}</div>
                              <div className="text-sm text-gray-500">{user.npm}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            getMemberVoiceType(user.npm) === 'Sopran' 
                              ? 'bg-red-100 text-red-700' 
                              : getMemberVoiceType(user.npm) === 'Alto'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {getMemberVoiceType(user.npm)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {getMemberJoinDate(user.npm)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => toggleMemberStatus(user.npm)}
                            className={`inline-flex px-3 py-1 text-xs font-medium rounded-full transition-colors duration-200 ${
                              isMemberActive(user.npm)
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {isMemberActive(user.npm) ? 'Aktif' : 'Tidak Aktif'}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            hasDoneVoiceCheck(user.npm) === 'sudah'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {hasDoneVoiceCheck(user.npm)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          {userRecordings.length > 0 ? (
                            <div className="flex items-center justify-center space-x-2">
                              <span className="text-sm text-gray-500">{userRecordings.length}</span>
                              <button
                                onClick={() => handlePlayRecording(userRecordings[0])}
                                className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
                              >
                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M8 5v14l11-7z"/>
                                </svg>
                                Play
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Section - Voice Classification Results */}
        <div className="w-80 bg-white rounded-lg shadow-sm border border-gray-200 m-6">
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-lg">
            <h3 className="text-lg font-bold text-white text-center">Hasil Klasifikasi Suara</h3>
          </div>
          
          <div className="p-6 space-y-4">
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="text-center">
                <div className="text-2xl mb-2 text-red-600">��</div>
                <p className="text-lg font-medium text-red-700">Sopran</p>
                <p className="text-3xl font-bold text-red-800">{voiceStats.sopran}</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-6 border border-red-200">
              <div className="text-center">
                <div className="text-2xl mb-2 text-red-600">��</div>
                <p className="text-lg font-medium text-red-700">Alto</p>
                <p className="text-3xl font-bold text-red-800">{voiceStats.alto}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audio Modal */}
      {showAudioModal && selectedRecording && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Rekaman Audio</h2>
                <button
                  onClick={() => setShowAudioModal(false)}
                  className="text-white hover:text-red-200 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama File:</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{selectedRecording.fileName}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Anggota:</label>
                  <p className="text-sm text-gray-900 bg-gray-50 p-2 rounded border border-gray-200">{getMemberName(selectedRecording.username)}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Audio Player:</label>
                  <audio controls className="w-full">
                    <source src={selectedRecording.dataUrl} type={selectedRecording.mime} />
                    Browser Anda tidak mendukung audio player.
                  </audio>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end">
              <button
                onClick={() => setShowAudioModal(false)}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-colors duration-200"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 border-b border-gray-200 rounded-t-lg">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">Tambah Tugas</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-white hover:text-red-200 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Judul Tugas
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => handleTaskFormChange('title', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 bg-white"
                  placeholder="Masukkan judul tugas"
                />
              </div>

              {/* Instruction */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instruksi untuk Anggota
                </label>
                <textarea
                  value={taskForm.instruction}
                  onChange={(e) => handleTaskFormChange('instruction', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-gray-900 bg-white"
                  rows={6}
                  placeholder="Masukkan instruksi yang akan muncul di modal rekam anggota, contoh:&#10;&#10;nyanyikan potongan lagu manusia kuat&#10;&#10;Manusia-manusia kuat, itu kita&#10;Jiwa-jiwa yang kuat, itu kita&#10;Manusia-manusia kuat, itu kita&#10;Jiwa-jiwa yang kuat, itu kita"
                />
              </div>

              {/* Member Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pilih Anggota:
                </label>
                
                {/* Search Input */}
                <div className="relative mb-4">
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-gray-900 bg-white"
                    placeholder="Cari anggota..."
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>

                {/* Member List */}
                <div className="bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto border border-gray-200">
                  {filteredMembers.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">Tidak ada anggota ditemukan</p>
                  ) : (
                    <div className="space-y-2">
                      {filteredMembers.map(user => (
                        <label key={user.npm} className="flex items-center space-x-3 p-2 hover:bg-white rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={taskForm.selectedMembers.includes(user.npm)}
                            onChange={() => handleMemberToggle(user.npm)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                          />
                          <div className="flex-1">
                            <p className="font-medium text-gray-800">{user.nama}</p>
                            <p className="text-sm text-gray-600">{user.npm}</p>
                          </div>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                {/* Selected Members Summary */}
                {taskForm.selectedMembers.length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-sm font-medium text-red-700 mb-2">
                      Anggota Terpilih ({taskForm.selectedMembers.length}):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {taskForm.selectedMembers.map(npm => (
                        <span key={npm} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded-full">
                          {getMemberName(npm)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg flex justify-end space-x-3">
              <button
                onClick={() => setShowTaskModal(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200"
              >
                Batal
              </button>
              <button
                onClick={handleTaskSubmit}
                className="px-6 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-colors duration-200"
              >
                Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}