import axios from 'axios';

const api = axios.create({
  // Prefer env-configured API URL; fall back to same-origin (/api) which works with Vite proxy + prod SPA hosting.
  baseURL: import.meta.env?.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  },
  // Nagdagdag tayo ng timeout para hindi "mag-hang" ang login kung mabagal ang server
  timeout: 10000 
});

// Interceptor para sa Token - Awtomatikong isinasama ang token sa bawat request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// New: Interceptor para sa Response - Para i-handle ang session expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Kung ang server ay nagbalik ng 401 (Unauthorized), ibig sabihin expired na ang session
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Maaari mong i-redirect ang user sa login page dito kung kinakailangan
    }
    return Promise.reject(error);
  }
);

export default api;
