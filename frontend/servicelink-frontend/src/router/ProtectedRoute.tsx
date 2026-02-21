import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import type { UserRole } from '@/types/auth.types'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'

interface ProtectedRouteProps {
  requiredRole?: UserRole
}

export default function ProtectedRoute({ requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  if (isLoading) return <LoadingSpinner fullPage />

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user?.role !== requiredRole) {
    // Wrong role — redirect to appropriate dashboard
    const redirect = user?.role === 'SERVICE_PROVIDER' ? '/provider/dashboard' : '/dashboard'
    return <Navigate to={redirect} replace />
  }

  return <Outlet />
}
