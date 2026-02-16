import axios from 'axios';

const api = axios.create({
  // Palitan mo ito ng totoong URL ng iyong Backend sa Render
  baseURL: 'https://finals-tenant-system.onrender.com/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor para sa Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
