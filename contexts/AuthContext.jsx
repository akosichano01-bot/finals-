import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const savedUser = localStorage.getItem('user') // 1. Kunin ang user mula sa storage

    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      // I-set muna ang user mula sa localStorage para hindi mag-undefined ang role habang nag-fe-fetch
      if (savedUser) {
        try {
          setUser(JSON.parse(savedUser)) //
        } catch (e) {
          console.error("Storage parse error:", e)
        }
      }
      
      fetchUser()
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async () => {
    try {
      const response = await api.get('/auth/me')
      const userData = response.data.user || response.data
      
      setUser(userData)
      // 2. I-update ang storage para laging fresh ang user info
      localStorage.setItem('user', JSON.stringify(userData)) 
    } catch (error) {
      console.error("Fetch user error:", error)
      if (error.response?.status === 401) {
        logout()
      }
    } finally {
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password })
      const { token, user: loggedUser } = response.data

      // 3. I-save ang parehong token at user object
      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(loggedUser)) // Importante ito para sa role detection
      
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      setUser(loggedUser)
      
      return loggedUser
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please check your credentials.'
      throw new Error(message)
    }
  }

  const logout = () => {
    // 4. Linisin lahat ng records sa storage
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
