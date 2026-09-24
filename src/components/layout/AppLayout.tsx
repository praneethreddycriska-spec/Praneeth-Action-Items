import { type ReactNode, useState } from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutGrid, Users, BarChart3, Sparkles, LogOut, Menu, X } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/board', label: 'Board', icon: LayoutGrid },
  { to: '/communities', label: 'Communities', icon: Users },
  { to: '/dashboard', label: 'Analytics', icon: BarChart3 },
]

export default function AppLayout({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <aside
        className={cn(
          'glass z-40 flex w-64 shrink-0 flex-col gap-1 rounded-r-3xl p-4 transition-transform md:static md:translate-x-0',
          'fixed inset-y-0 left-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="mb-6 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <Sparkles size={18} />
          </div>
          <span className="text-base font-semibold">Action Items</span>
          <button className="ml-auto md:hidden" onClick={() => setMobileOpen(false)}><X size={18} /></button>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
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
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-violet-500 text-xs font-semibold text-white">
            {(profile?.full_name ?? profile?.email ?? '?').slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">{profile?.full_name ?? profile?.email}</p>
          </div>
          <button onClick={signOut} className="text-muted-foreground hover:text-destructive" title="Sign out">
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setMobileOpen(false)} />}

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 p-3 md:hidden">
          <button className="glass rounded-xl p-2" onClick={() => setMobileOpen(true)}><Menu size={18} /></button>
          <span className="text-sm font-semibold">Action Items</span>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </main>
    </div>
  )
}
