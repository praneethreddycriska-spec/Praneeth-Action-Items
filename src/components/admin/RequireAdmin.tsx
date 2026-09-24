import { type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, loading, isAdmin, adminChecked } = useAuth()

  if (loading || (session && !adminChecked)) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session || !isAdmin) return <Navigate to="/admin/login" replace />

  return <>{children}</>
}
