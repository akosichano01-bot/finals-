import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/units', label: 'Units', icon: '🏢' },
    ...(user?.role === 'manager' || user?.role === 'staff'
      ? [{ path: '/tenants', label: 'Tenants', icon: '👥' }]
      : []),
    { path: '/bills', label: 'Bills', icon: '💰' },
    { path: '/payments', label: 'Payments', icon: '💳' },
    { path: '/maintenance', label: 'Maintenance', icon: '🔧' },
    ...(user?.role === 'manager' || user?.role === 'staff'
      ? [{ path: '/users', label: 'Users', icon: '👤' }]
      : []),
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-14">
            <div className="flex items-center gap-8">
              <Link to="/dashboard" className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-800 tracking-tight">Ancheta's Apartment</span>
              </Link>
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      isActive(item.path)
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="/ra_9653_2009.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-slate-600 hover:text-indigo-600 font-medium hidden sm:block"
              >
                Rental Law (PDF)
              </a>
              <span className="text-sm text-slate-500 hidden sm:inline">{user?.name}</span>
              <span className="badge bg-slate-100 text-slate-600">{user?.role}</span>
              <button
                onClick={handleLogout}
                className="btn-secondary text-sm py-2 px-3"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}
