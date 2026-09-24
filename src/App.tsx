import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { RequireAdmin } from '@/components/admin/RequireAdmin'
import LandingPage from '@/pages/public/LandingPage'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import RequestsPage from '@/pages/admin/RequestsPage'
import BoardPage from '@/pages/BoardPage'
import CommunitiesPage from '@/pages/CommunitiesPage'
import DashboardPage from '@/pages/DashboardPage'

function AdminLayoutRoute() {
  return (
    <RequireAdmin>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </RequireAdmin>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/request" element={<LandingPage />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminLayoutRoute />}>
        <Route index element={<BoardPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
