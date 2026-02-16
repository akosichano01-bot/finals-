import axios from 'axios';

const api = axios.create({
  // PALITAN MO ITO: Gamitin ang live URL ng Render
  baseURL: 'https://finals-tenant-system.onrender.com/api',
  withCredentials: true
});

export default api;
