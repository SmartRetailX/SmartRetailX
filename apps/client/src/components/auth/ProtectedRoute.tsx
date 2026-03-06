import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Loader2 } from 'lucide-react'

export function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * Wraps public-only routes (login, register) so that
 * already-authenticated users are redirected to the dashboard.
 */
export function GuestRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}

interface RoleGuardProps {
  allowedRoles: string[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Guards a route so only users with specified roles can access it.
 * Unauthorized users are redirected to / (their role-appropriate home).
 */
export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { hasRole } = useAuth()

  if (!hasRole(allowedRoles)) {
    return fallback || <Navigate to="/" replace />
  }

  return <>{children}</>
}
