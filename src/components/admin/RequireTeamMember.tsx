import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RequireTeamMember({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin, isTeamMember, adminChecked } = useAuth()
  const location = useLocation()

  if (loading || (session && !adminChecked)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session || (!isTeamMember && !isAdmin)) {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }

  // Super admin previewing /team lands on their own dashboard instead.
  if (isAdmin) return <Navigate to="/admin" replace />

  return <>{children}</>
}
