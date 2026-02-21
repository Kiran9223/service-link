import { Link, useNavigate } from 'react-router-dom'
import { Zap, Bell, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useAppDispatch, useAppSelector } from '@/hooks/useAppDispatch'
import { logout } from '@/store/slices/authSlice'
import { openNotificationPanel } from '@/store/slices/uiSlice'

export default function Navbar() {
  const { isAuthenticated, user, isProvider } = useAuth()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const unreadCount = useAppSelector((s) => s.ui.notificationUnreadCount)

  const handleLogout = () => {
    dispatch(logout())
    navigate('/')
  }

  const dashboardPath = isProvider ? '/provider/dashboard' : '/dashboard'

  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-lg shadow-sm z-50 border-b border-purple-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">ServiceLink</span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/services" className="text-gray-700 hover:text-purple-600 font-medium transition">
              Browse Services
            </Link>

            {isAuthenticated ? (
              <>
                <Link to={dashboardPath} className="text-gray-700 hover:text-purple-600 font-medium transition">
                  Dashboard
                </Link>

                {/* Notification bell */}
                <button
                  onClick={() => dispatch(openNotificationPanel())}
                  className="relative p-2 text-gray-600 hover:text-purple-600 transition"
                  aria-label="Notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">Hi, {user?.name?.split(' ')[0]}</span>
                  <button onClick={handleLogout} className="btn-outline py-2 text-sm">
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-purple-600 border-2 border-purple-600 rounded-xl font-semibold hover:bg-purple-50 transition">
                  Sign In
                </Link>
                <Link to="/register" className="btn-primary py-2">
                  Get Started
                </Link>
              </>
            )}
          </div>

          {/* Mobile menu toggle */}
          <button className="md:hidden p-2 text-gray-600" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3 animate-fadeIn">
          <Link to="/services" className="block py-2 text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>
            Browse Services
          </Link>
          {isAuthenticated ? (
            <>
              <Link to={dashboardPath} className="block py-2 text-gray-700 font-medium" onClick={() => setMobileOpen(false)}>
                Dashboard
              </Link>
              <button onClick={handleLogout} className="w-full btn-outline text-sm">Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="block w-full text-center py-2 border-2 border-purple-600 text-purple-600 rounded-xl font-semibold" onClick={() => setMobileOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="block w-full text-center btn-primary" onClick={() => setMobileOpen(false)}>
                Get Started
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  )
}
