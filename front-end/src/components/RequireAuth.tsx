import { Navigate, useLocation } from 'react-router'
import type { ReactNode } from 'react'
import { useAuth } from '../auth-context'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <p className="page-loading">Loading...</p>
  if (!user) {
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}
