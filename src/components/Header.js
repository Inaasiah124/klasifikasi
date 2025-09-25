import React, { useState } from 'react';

function Header({
  role = 'user',
  onHome,
  onOpenTaskModal,
  onOpenUserTasks,
  onLogout,
  onOpenUploadModal,
}) {
  const [open, setOpen] = useState(false);
  const isCoach = role.toLowerCase() === 'pelatih';

  return (
    <header className="bg-gradient-to-r from-red-50 to-pink-50 border-b border-red-100 shadow-sm">
      {/* Top bar */}
      
      {/* Main header */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo & Title */}
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-lg">F</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Hello, {isCoach ? 'Coach' : 'Nama'}
              </h1>
              <p className="text-sm text-gray-600">
                {isCoach ? 'Dashboard Pelatih' : 'Dashboard Anggota'}
              </p>
            </div>
          </div>

          {/* Navigation & Actions */}
          <div className="flex items-center space-x-4">
            {/* Navigation Menu - hanya untuk coach */}
            {isCoach && (
              <nav className="hidden md:flex items-center space-x-6">
                <button
                  onClick={onHome}
                  className="text-gray-700 hover:text-red-600 font-medium transition-colors"
                >
                 
                </button>
                <button
                  onClick={onOpenTaskModal}
                  className="text-gray-700 hover:text-red-600 font-medium transition-colors"
                >
                  📋 Kelola Tugas
                </button>
              </nav>
            )}

            {/* Untuk pengguna: Uploads membuka modal upload */}
            {!isCoach && (
              <nav className="hidden md:flex items-center space-x-6">
                <button
                  onClick={onOpenUploadModal}
                  className="text-gray-700 hover:text-red-600 font-medium transition-colors"
                >
                  🎤 Uploads Suara
                </button>
              </nav>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setOpen(!open)}
              className="md:hidden p-2 rounded-lg hover:bg-red-100"
            >
              <span className="text-xl">☰</span>
            </button>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="px-4 py-2 border border-red-200 hover:bg-red-50 text-red-700 rounded-lg text-sm font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {open && (
          <div className="md:hidden mt-4 pb-4 border-t border-red-100">
            <div className="flex flex-col space-y-2 pt-4">
              {isCoach ? (
                <>
                  <button
                    onClick={() => { onHome(); setOpen(false); }}
                    className="text-left px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    🏠 Dashboard
                  </button>
                  <button
                    onClick={() => { onOpenTaskModal(); setOpen(false); }}
                    className="text-left px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    📋 Kelola Tugas
                  </button>
                </>
              ) : (
                <button
                  onClick={() => { onOpenUploadModal(); setOpen(false); }}
                  className="text-left px-4 py-2 text-gray-700 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  🎤 Uploads Suara
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

export default Header;