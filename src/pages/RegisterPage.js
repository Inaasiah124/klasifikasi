import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import heroImage from '../assets/1.png';
import { authAPI } from '../utils/api';

function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ npm: '', nama: '', password: '', role: 'user' });
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setErr('');
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErr('');

    const npm = form.npm.trim();
    const nama = form.nama.trim();
    const password = form.password.trim();
    const role = form.role;

    if (!npm || !nama || !password) {
      setErr('NPM, Nama Lengkap, dan Password wajib diisi.');
      setLoading(false);
      return;
    }

    // Validasi NPM (minimal 8 digit)
    if (npm.length < 8) {
      setErr('NPM harus minimal 8 digit.');
      setLoading(false);
      return;
    }

    try {
      // Coba register via API terlebih dahulu
      try {
        const response = await authAPI.register({
          npm,
          nama,
          password,
          role
        });
        
        alert('Registrasi berhasil! Silakan login dengan NPM Anda.');
        navigate('/login');
        return;
      } catch (apiError) {
        // Jika API tidak tersedia, fallback ke localStorage
        console.log('API not available, using localStorage fallback');
      }

      // Fallback ke localStorage
      const users = JSON.parse(localStorage.getItem('users') || '[]');

      // cek duplikasi NPM
      if (users.some((u) => u.npm === npm)) {
        setErr('NPM sudah terdaftar. Gunakan NPM yang berbeda.');
        setLoading(false);
        return;
      }

      // simpan user baru ke array users
      users.push({ 
        npm, 
        nama, 
        password, 
        role,
        username: npm, // untuk kompatibilitas dengan sistem lama
        createdAt: Date.now()
      });
      localStorage.setItem('users', JSON.stringify(users));

      alert('Registrasi berhasil! Silakan login dengan NPM Anda.');
      navigate('/login');

    } catch (error) {
      console.error('Register error:', error);
      setErr('Terjadi kesalahan saat registrasi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-pink-50 to-rose-50 px-4">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-lg text-center">
        {/* Logo/Image */}
        <img
          src={heroImage}
          alt="Register illustration"
          className="w-32 mx-auto mb-6"
        />

        <h2 className="text-2xl font-bold text-gray-800 mb-6">Register</h2>

        {/* Error */}
        {err && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-left">
            {err}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleRegister} className="space-y-4 text-left">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">NPM</label>
            <input
              type="text"
              name="npm"
              placeholder="Masukan NPM"
              value={form.npm}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nama</label>
            <input
              type="text"
              name="nama"
              placeholder="Masukan Nama Lengkap"
              value={form.nama}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              name="password"
              placeholder="Masukan Password"
              value={form.password}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 placeholder-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              name="role"
              value={form.role}
              onChange={handleChange}
              disabled={loading}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent disabled:bg-gray-100"
            >
              <option value="user">Anggota Paduan Suara</option>
              <option value="pelatih">Pelatih</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold transition-colors mt-6 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <span
            onClick={() => navigate('/login')}
            className="text-red-600 font-medium underline cursor-pointer hover:text-red-700"
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;