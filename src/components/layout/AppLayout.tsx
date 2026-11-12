import { type ReactNode, useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutGrid, Users, BarChart3, Sparkles, LogOut, Menu, X, Inbox, UserCog, Settings, MoreHorizontal,
  ListChecks, Gauge, Search, Plus, TrendingUp,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/NotificationBell'
import { ThemeToggle } from '@/components/ThemeToggle'

const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Overview', icon: Gauge },
  { to: '/admin', label: 'Board', icon: LayoutGrid, end: true },
  { to: '/admin/requests', label: 'Requests', icon: Inbox },
  { to: '/admin/communities', label: 'Communities', icon: Users },
  { to: '/admin/team', label: 'Team', icon: UserCog },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const TEAM_NAV = [
  { to: '/team', label: 'My Actions', icon: ListChecks, end: true },
]

function RailButton({ title, onClick, children, active }: { title: string; onClick: () => void; children: ReactNode; active?: boolean }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        'flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-all hover:bg-foreground/10 hover:text-foreground active:scale-90',
        active && 'bg-foreground/10 text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  const NAV = isAdmin ? ADMIN_NAV : TEAM_NAV
  const MOBILE_PRIMARY = isAdmin ? ['/admin', '/admin/requests'] : ['/team']
  const MOBILE_MORE = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to))
  const initial = (profile?.full_name ?? profile?.email ?? '?').slice(0, 1).toUpperCase()

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Desktop icon rail */}
      <aside className="glass z-30 my-3 ml-3 hidden w-[60px] shrink-0 flex-col items-center gap-1.5 rounded-full py-4 md:flex">
        <RailButton title="Search requests" onClick={() => navigate(isAdmin ? '/admin/requests?focus=search' : '/team')}><Search size={17} /></RailButton>
        {isAdmin && <RailButton title="New action" onClick={() => navigate('/admin?new=1')}><Plus size={18} /></RailButton>}
        <div className="my-1 h-px w-5 bg-foreground/15" />
        {isAdmin && <RailButton title="Requests" onClick={() => navigate('/admin/requests')} active={location.pathname.startsWith('/admin/requests')}><Inbox size={17} /></RailButton>}
        {isAdmin && <RailButton title="Team" onClick={() => navigate('/admin/team')} active={location.pathname.startsWith('/admin/team')}><UserCog size={17} /></RailButton>}
        {isAdmin && <RailButton title="Reports" onClick={() => navigate('/admin/reports')} active={location.pathname.startsWith('/admin/reports')}><TrendingUp size={17} /></RailButton>}
        <div className="mt-auto flex flex-col items-center gap-1.5">
          {isAdmin && <RailButton title="Settings" onClick={() => navigate('/admin/settings')} active={location.pathname.startsWith('/admin/settings')}><Settings size={17} /></RailButton>}
          <RailButton title="Sign out" onClick={signOut}><LogOut size={17} /></RailButton>
        </div>
      </aside>

      {/* Mobile drawer */}
      <aside
        className={cn(
          'glass fixed inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col gap-1 rounded-r-[2rem] p-4 transition-transform md:hidden',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl accent-gradient"><Sparkles size={18} /></div>
          <span className="text-base font-semibold">Action Items</span>
          <button className="ml-auto" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive ? 'bg-foreground/10 text-foreground' : 'text-muted-foreground hover:bg-foreground/5',
                )
              }
            >
              <Icon size={17} /> {label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-2 rounded-2xl bg-foreground/5 p-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full accent-gradient text-xs font-semibold">{initial}</div>
          <p className="min-w-0 flex-1 truncate text-xs font-medium">{profile?.full_name ?? profile?.email}</p>
          <button onClick={signOut} className="shrink-0 p-1 text-muted-foreground hover:text-destructive" title="Sign out" aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setMobileOpen(false)} />}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center gap-3 px-3 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))] md:px-5 md:pt-4">
          <button className="glass flex h-10 w-10 items-center justify-center rounded-full md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={18} /></button>

          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl accent-gradient"><Sparkles size={17} /></div>
            <span className="text-base font-semibold tracking-tight">Action Items</span>
          </div>

          <nav className="glass mx-auto hidden items-center gap-0.5 rounded-full p-1 md:flex">
            {NAV.map(({ to, label, end }) => {
              const active = end ? location.pathname === to : location.pathname.startsWith(to)
              return (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={cn(
                    'relative rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="top-nav-pill"
                      className="absolute inset-0 rounded-full bg-foreground/12 ring-1 ring-foreground/10"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <span className="relative z-10">{label}</span>
                </NavLink>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <ThemeToggle />
            <NotificationBell />
            <div className="hidden h-10 w-10 items-center justify-center rounded-full accent-gradient text-sm font-semibold md:flex" title={profile?.full_name ?? profile?.email ?? ''}>{initial}</div>
          </div>
        </header>

        <motion.div
          key={location.pathname}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-0 flex-1 overflow-hidden pb-16 md:pb-0"
        >
          {children}
        </motion.div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="glass fixed inset-x-2 bottom-2 z-40 flex items-center justify-around rounded-full p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex min-w-[64px] flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium', isActive ? 'bg-foreground/12 text-foreground' : 'text-muted-foreground')
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
        {MOBILE_MORE.length > 0 && (
          <button onClick={() => setMoreOpen(true)} className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-full px-3 py-1.5 text-[10px] font-medium text-muted-foreground">
            <MoreHorizontal size={19} />
            More
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/50 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="glass-strong w-full rounded-t-[2rem] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MORE.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => { navigate(to); setMoreOpen(false) }}
                  className="flex items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-3 text-sm font-medium"
                >
                  <Icon size={17} /> {label}
                </button>
              ))}
              <button onClick={signOut} className="flex items-center gap-2 rounded-2xl bg-foreground/5 px-3 py-3 text-sm font-medium text-destructive">
                <LogOut size={17} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
