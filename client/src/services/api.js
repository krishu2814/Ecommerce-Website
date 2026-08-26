import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_GATEWAY_URL || import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach JWT token and correlation tracking
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('nexstore_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Generate lightweight correlation ID for end-to-end tracing
    if (!config.headers['x-correlation-id']) {
      config.headers['x-correlation-id'] = `web-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Optional: Handle token expiration
      console.warn('Session expired or unauthorized request.');
    }
    return Promise.reject(error);
  }
);

export default api;
