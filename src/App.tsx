import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import { RequireAdmin } from '@/components/admin/RequireAdmin'
import { RequireTeamMember } from '@/components/admin/RequireTeamMember'
import LandingPage from '@/pages/public/LandingPage'
import AdminLoginPage from '@/pages/admin/AdminLoginPage'
import SetPasswordPage from '@/pages/SetPasswordPage'
import RequestsPage from '@/pages/admin/RequestsPage'
import TeamPage from '@/pages/admin/TeamPage'
import SettingsPage from '@/pages/admin/SettingsPage'
import BoardPage from '@/pages/BoardPage'
import CommunitiesPage from '@/pages/CommunitiesPage'
import DashboardPage from '@/pages/DashboardPage'
import MyActionsPage from '@/pages/team/MyActionsPage'

function AdminLayoutRoute() {
  return (
    <RequireAdmin>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </RequireAdmin>
  )
}

function TeamLayoutRoute() {
  return (
    <RequireTeamMember>
      <AppLayout>
        <Outlet />
      </AppLayout>
    </RequireTeamMember>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/request" element={<LandingPage />} />

      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/set-password" element={<SetPasswordPage />} />

      <Route path="/admin" element={<AdminLayoutRoute />}>
        <Route index element={<BoardPage />} />
        <Route path="requests" element={<RequestsPage />} />
        <Route path="communities" element={<CommunitiesPage />} />
        <Route path="team" element={<TeamPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>

      <Route path="/team" element={<TeamLayoutRoute />}>
        <Route index element={<MyActionsPage />} />
        <Route path="*" element={<Navigate to="/team" replace />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
