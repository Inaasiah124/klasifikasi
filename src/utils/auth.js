// src/utils/auth.js - Sistem auth sederhana tanpa JWT
export const login = async (npm, password) => {
  try {
    // Simulasi API call ke Flask backend
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ npm, password }),
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const data = await response.json();
    
    // Simpan data user ke localStorage
    localStorage.setItem('token', data.token || 'dummy-token');
    localStorage.setItem('username', data.user.nama);
    localStorage.setItem('npm', data.user.npm);
    localStorage.setItem('role', data.user.role);
    localStorage.setItem('isLoggedIn', 'true');
    
    return { success: true, user: data.user };
  } catch (error) {
    // Fallback ke localStorage untuk development
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const user = users.find(u => u.npm === npm && u.password === password);
    
    if (user) {
      localStorage.setItem('token', 'dummy-token');
      localStorage.setItem('username', user.nama);
      localStorage.setItem('npm', user.npm);
      localStorage.setItem('role', user.role);
      localStorage.setItem('isLoggedIn', 'true');
      return { success: true, user };
    }
    
    return { success: false, error: 'Invalid credentials' };
  }
};

export const register = async (userData) => {
  try {
    // Simulasi API call ke Flask backend
    const response = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      throw new Error('Registration failed');
    }

    const data = await response.json();
    return { success: true, user: data.user };
  } catch (error) {
    // Fallback ke localStorage untuk development
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    
    // Check if user already exists
    if (users.find(u => u.npm === userData.npm)) {
      return { success: false, error: 'User already exists' };
    }
    
    // Add new user
    const newUser = {
      npm: userData.npm,
      nama: userData.nama,
      password: userData.password,
      role: userData.role,
      createdAt: Date.now()
    };
    
    users.push(newUser);
    localStorage.setItem('users', JSON.stringify(users));
    
    return { success: true, user: newUser };
  }
};

export const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('username');
  localStorage.removeItem('npm');
  localStorage.removeItem('role');
  localStorage.removeItem('isLoggedIn');
};

export const getCurrentUser = () => {
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  if (!isLoggedIn) return null;
  
  return {
    npm: localStorage.getItem('npm'),
    nama: localStorage.getItem('username'),
    role: localStorage.getItem('role'),
    token: localStorage.getItem('token')
  };
};

export const isAuthenticated = () => {
  return localStorage.getItem('isLoggedIn') === 'true';
};
