import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CoachDashboard from './CoachDashboard';
import PenggunaDashboard from './PenggunaDashboard';
import { isAuthenticated, getCurrentUser } from '../utils/auth';

export default function DashboardPage() {
  const navigate = useNavigate();
  const user = getCurrentUser();

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const onLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    localStorage.removeItem('npm');
    localStorage.removeItem('userId');
    window.dispatchEvent(new Event('auth'));
    navigate('/login', { replace: true });
  };

  const onOpenTaskModal = () => {
    window.dispatchEvent(new Event('openTaskModal'));
  };

  const onOpenUploadModal = () => {
    window.dispatchEvent(new Event('openUploadModal'));
  };

  const onHome = () => navigate('/', { replace: false });
  const onOpenUserTasks = () => navigate('/record', { replace: false });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 text-gray-100 flex flex-col">
      <Header
        role={user.role}
        onHome={onHome}
        onOpenTaskModal={onOpenTaskModal}
        onOpenUserTasks={onOpenUserTasks}
        onLogout={onLogout}
        onOpenUploadModal={onOpenUploadModal}
      />

      <main className="flex-1">
        {user.role === 'pelatih'
          ? <CoachDashboard />
          : <PenggunaDashboard username={user.nama || user.npm} />}
      </main>

      <Footer />
    </div>
  );
}