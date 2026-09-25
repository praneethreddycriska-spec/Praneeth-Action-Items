import { type ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, Users, BarChart3, Sparkles, LogOut, Menu, X, Inbox, UserCog, Settings, MoreHorizontal, ListChecks } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { NotificationBell } from '@/components/NotificationBell'
import { ThemeToggle } from '@/components/ThemeToggle'

const ADMIN_NAV = [
  { to: '/admin', label: 'Board', icon: LayoutGrid, end: true },
  { to: '/admin/requests', label: 'Requests', icon: Inbox },
  { to: '/admin/communities', label: 'Communities', icon: Users },
  { to: '/admin/team', label: 'Team', icon: UserCog },
  { to: '/admin/dashboard', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
]

const TEAM_NAV = [
  { to: '/team', label: 'My Actions', icon: ListChecks, end: true },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, isAdmin, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  const NAV = isAdmin ? ADMIN_NAV : TEAM_NAV
  const MOBILE_PRIMARY = isAdmin ? ['/admin', '/admin/requests'] : ['/team']
  const MOBILE_MORE = NAV.filter((n) => !MOBILE_PRIMARY.includes(n.to))

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <aside
        className={cn(
          'glass z-40 flex w-64 shrink-0 flex-col gap-1 rounded-r-3xl p-4 transition-transform md:static md:translate-x-0',
          'fixed inset-y-0 left-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl accent-gradient shadow-lg">
            <Sparkles size={18} />
          </div>
          <span className="text-base font-semibold">Action Items</span>
          <button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu"><X size={18} /></button>
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
                  'flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all',
                  isActive
                    ? 'bg-white/80 text-primary shadow-sm dark:bg-white/10'
                    : 'text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5',
                )
              }
            >
              <Icon size={17} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto flex items-center gap-2 rounded-2xl bg-white/50 p-2.5 dark:bg-white/5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-xs font-semibold text-white">
            {(profile?.full_name ?? profile?.email ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{profile?.full_name ?? profile?.email}</p>
          </div>
          <button onClick={signOut} className="shrink-0 p-1 text-muted-foreground hover:text-destructive" title="Sign out" aria-label="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] md:justify-end">
          <button className="glass rounded-xl p-2 md:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <span className="text-sm font-semibold md:hidden">Action Items</span>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden pb-16 md:pb-0">{children}</div>
      </main>

      {/* Mobile bottom navigation */}
      <nav className="glass fixed inset-x-2 bottom-2 z-40 flex items-center justify-around rounded-2xl p-1.5 pb-[max(0.375rem,env(safe-area-inset-bottom))] md:hidden">
        {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn('flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium', isActive ? 'text-primary' : 'text-muted-foreground')
            }
          >
            <Icon size={19} />
            {label}
          </NavLink>
        ))}
        {MOBILE_MORE.length > 0 && (
          <button onClick={() => setMoreOpen(true)} className="flex min-w-[64px] flex-col items-center gap-0.5 rounded-xl px-2 py-1.5 text-[10px] font-medium text-muted-foreground">
            <MoreHorizontal size={19} />
            More
          </button>
        )}
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/30 md:hidden" onClick={() => setMoreOpen(false)}>
          <div className="glass-strong w-full rounded-t-3xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="grid grid-cols-2 gap-2">
              {MOBILE_MORE.map(({ to, label, icon: Icon }) => (
                <button
                  key={to}
                  onClick={() => { navigate(to); setMoreOpen(false) }}
                  className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-3 text-sm font-medium dark:bg-white/5"
                >
                  <Icon size={17} /> {label}
                </button>
              ))}
              <button onClick={signOut} className="flex items-center gap-2 rounded-xl bg-white/50 px-3 py-3 text-sm font-medium text-destructive dark:bg-white/5">
                <LogOut size={17} /> Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
