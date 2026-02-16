import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// BINAGO: Tinanggal ang lahat ng folder paths dahil nasa root na silang lahat base sa image_9a63b9.png
import { AuthProvider, useAuth } from './AuthContext'
import Login from './Login'
import Dashboard from './Dashboard'
import Units from './Units'
import Tenants from './Tenants'
import Bills from './Bills'
import Payments from './Payments'
import Maintenance from './Maintenance'
import Users from './Users'
import Layout from './Layout'

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
