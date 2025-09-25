// src/App.js
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import RecordingsPage from './pages/RecordingsPage';

function App() {
  const location = useLocation();
  const state = location.state && location.state.background ? location.state : null;

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem('isLoggedIn') === 'true'
  );
  const [role, setRole] = useState(
    (localStorage.getItem('role') || '').toLowerCase()
  );

  useEffect(() => {
    const syncAuth = () => {
      setIsLoggedIn(localStorage.getItem('isLoggedIn') === 'true');
      setRole((localStorage.getItem('role') || '').toLowerCase());
    };
    window.addEventListener('auth', syncAuth);
    window.addEventListener('storage', syncAuth);
    syncAuth();
    return () => {
      window.removeEventListener('auth', syncAuth);
      window.removeEventListener('storage', syncAuth);
    };
  }, [location]);

  return (
    <>
      {/* Routes utama; jika ada background, gunakan itu agar dashboard tetap terlihat */}
      <Routes location={state?.background || location}>
        <Route path="/" element={<Navigate to="/login" />} />

        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/dashboard" /> : <LoginPage />}
        />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={isLoggedIn ? <DashboardPage /> : <Navigate to="/login" />}
        />

        {/* Halaman rekam; bisa standalone atau sebagai modal (lihat di bawah) */}
        <Route
          path="/record"
          element={isLoggedIn ? <RecordingsPage /> : <Navigate to="/login" />}
        />

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>

      {/* Layer modal jika datang dengan state.background (misal dari Kerjakan) */}
      {state?.background && (
        <Routes>
          <Route
            path="/record"
            element={
              isLoggedIn ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                  <div className="absolute inset-0 bg-black/60" />
                  <div className="relative w-[92vw] max-w-xl">
                    <RecordingsPage />
                  </div>
                </div>
              ) : <Navigate to="/login" />
            }
          />
        </Routes>
      )}
    </>
  );
}

export default App;