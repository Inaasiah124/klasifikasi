// src/utils/api.js
import axios from 'axios';
import { getCurrentUser, logout } from './auth';

// Base URL untuk Flask API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const FLASK_URL = process.env.REACT_APP_FLASK_URL || 'http://localhost:5000';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor untuk menambahkan token
api.interceptors.request.use(
  (config) => {
    const user = getCurrentUser();
    if (user && user.token) {
      config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor untuk handle token expiry
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (npm, password) => api.post('/auth/login', { npm, password }),
  register: (userData) => api.post('/auth/register', userData),
  logout: () => api.post('/auth/logout'),
  refreshToken: () => api.post('/auth/refresh'),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  updateProfile: (data) => api.put('/user/profile', data),
  getUsers: () => api.get('/user/users'),
  activateUser: (npm) => api.post(`/user/activate/${npm}`),
  deactivateUser: (npm) => api.post(`/user/deactivate/${npm}`),
};

// Task API
export const taskAPI = {
  getTasks: () => api.get('/tasks'),
  createTask: (taskData) => api.post('/tasks', taskData),
  updateTask: (id, taskData) => api.put(`/tasks/${id}`, taskData),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
  getTaskById: (id) => api.get(`/tasks/${id}`),
};

// Recording API
export const recordingAPI = {
  getRecordings: () => api.get('/recordings'),
  uploadRecording: (formData) => api.post('/recordings/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getRecordingById: (id) => api.get(`/recordings/${id}`),
  deleteRecording: (id) => api.delete(`/recordings/${id}`),
};

// Classification API
export const classificationAPI = {
  classifyAudio: (formData) => api.post('/classify', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getClassifications: () => api.get('/classifications'),
  getClassificationById: (id) => api.get(`/classifications/${id}`),
};

// File upload helper
export const uploadFile = async (file, endpoint) => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await api.post(endpoint, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Audio classification helper
export const classifyAudio = async (audioFile) => {
  try {
    const formData = new FormData();
    formData.append('audio', audioFile);
    
    const response = await api.post('/classify', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    
    return response.data;
  } catch (error) {
    console.error('Classification error:', error);
    return null;
  }
};

export default api;
