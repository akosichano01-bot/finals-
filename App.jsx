import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
// BINAGO: Idinagdag ang ./src/ sa lahat ng imports sa ibaba
import { AuthProvider, useAuth } from './src/contexts/AuthContext'
import Login from './src/pages/Login'
import Dashboard from './src/pages/Dashboard'
import Units from './src/pages/Units'
import Tenants from './src/pages/Tenants'
import Bills from './src/pages/Bills'
import Payments from './src/pages/Payments'
import Maintenance from './src/pages/Maintenance'
import Users from './src/pages/Users'
import Layout from './src/components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="units" element={<Units />} />
        <Route path="tenants" element={<Tenants />} />
        <Route path="bills" element={<Bills />} />
        <Route path="payments" element={<Payments />} />
        <Route path="maintenance" element={<Maintenance />} />
        {(user?.role === 'manager' || user?.role === 'staff') && (
          <Route path="users" element={<Users />} />
        )}
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" />
      </Router>
    </AuthProvider>
  )
}

export default App
