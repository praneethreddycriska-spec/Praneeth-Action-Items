import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin, adminChecked } = useAuth()
  const location = useLocation()

  if (loading || (session && !adminChecked)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session || !isAdmin) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }

  return <>{children}</>
}
