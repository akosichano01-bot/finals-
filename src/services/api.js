import axios from 'axios'

const api = axios.create({
  baseURL: https://finals-tenant-system.onrender.com/api,
  headers: {
    'Content-Type': 'application/json',
  },
})

export default api

