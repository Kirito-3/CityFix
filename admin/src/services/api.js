import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api/v1';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Inject JWT Token securely
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('cityfix_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Capture session expiration (401 Unauthorized)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      console.warn('Session expired or unauthorized. Logging out...');
      localStorage.removeItem('cityfix_admin_token');
      localStorage.removeItem('cityfix_admin_user');
      // Dispatch custom event to trigger React context logout if listening
      window.dispatchEvent(new Event('auth-session-expired'));
    }
    return Promise.reject(error);
  }
);

export default api;
