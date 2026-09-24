import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import AuthPage from '@/pages/AuthPage'
import AppLayout from '@/components/layout/AppLayout'
import BoardPage from '@/pages/BoardPage'
import CommunitiesPage from '@/pages/CommunitiesPage'
import DashboardPage from '@/pages/DashboardPage'

export default function App() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<AuthPage />} />
      </Routes>
    )
  }

  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Navigate to="/board" replace />} />
        <Route path="/board" element={<BoardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/communities" element={<CommunitiesPage />} />
        <Route path="*" element={<Navigate to="/board" replace />} />
      </Routes>
    </AppLayout>
  )
}
