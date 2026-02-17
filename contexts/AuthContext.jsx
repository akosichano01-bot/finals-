import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      // Siguraduhing naka-set ang header bago mag-fetch
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      // Siguraduhing tama ang nesting ng data (response.data.user o response.data)
      setUser(response.data.user || response.data)
    } catch (error) {
      console.error("Fetch user error:", error)
      logout() // I-clear ang session kung expired na ang token
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      // Nagpadala tayo ng credentials sa backend
      const response = await api.post('/auth/login', { email, password })
      const { token, user } = response.data

      // I-save ang session
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(user)
      
      return user
    } catch (error) {
      // Kinukuha ang error message mula sa backend para sa toast
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.'
      throw new Error(message)
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    delete api.defaults.headers.common['Authorization']
    setUser(null)
    setLoading(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
