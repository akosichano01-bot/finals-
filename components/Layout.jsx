import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

export default function Layout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const profileRef = useRef(null)

  const roleLabel =
    user?.role && typeof user.role === 'string'
      ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
      : 'Account'

  const confirmLogout = () => {
    logout()
    setShowLogoutModal(false)
    navigate('/login')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = (e) => {
      if (!profileRef.current) return
      if (!profileRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="bg-white border-b border-slate-200/80 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4 h-16 flex-nowrap">
            {/* Left: Logo + main nav (single line) */}
            <div className="flex items-center gap-6 min-w-0">
              <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
                <span className="text-base font-bold text-slate-800 tracking-tight">
                  Ancheta Apartment
                </span>
              </Link>
              <div className="hidden md:flex items-center gap-1 text-sm text-slate-600">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-3 py-2 rounded-lg font-medium transition ${
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

            {/* Right: user profile (single-line, with dropdown) */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <div ref={profileRef} className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  className="flex items-center gap-2 text-xs font-medium text-slate-700 hover:text-slate-900 transition"
                >
                  {/* Simple circular avatar */}
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-white text-xs font-semibold">
                    {user?.name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                  <span className="flex items-center gap-2 max-w-[180px] truncate">
                    <span className="text-[11px] font-semibold truncate">
                      {user?.name || 'User'}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gradient-to-r from-fuchsia-500 to-purple-500 px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap">
                      {roleLabel}
                    </span>
                  </span>
                  <span className="text-[10px] opacity-90">
                    ▼
                  </span>
                </button>

                {menuOpen && (
                  <div className="user-menu">
                    <button
                      type="button"
                      onClick={() => setShowLogoutModal(true)}
                      className="user-menu-item text-rose-600 hover:text-rose-700"
                    >
                      Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 w-full">
        <div className="page-transition" key={location.pathname}>
          <Outlet />
        </div>
      </main>

      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-2">
              Log out of your account?
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              You’ll need to sign in again to access the apartment management system.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setShowLogoutModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={confirmLogout}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="border-t border-slate-200/80 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center text-xs text-slate-500">
          © {new Date().getFullYear()} Ancheta Apartment System —{' '}
          <a
            href="/ra_9653_2009.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline hover:text-blue-700"
          >
            Know more about Rental Law here
          </a>
        </div>
      </footer>
    </div>
  )
}
