import { useState } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

export default function AdminLoginPage() {
  const { session, isAdmin, isTeamMember, adminChecked, profile, signIn, signOut } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const location = useLocation()
  const requestedFrom = (location.state as { from?: string } | null)?.from
  const defaultDest = isAdmin ? '/admin' : '/team'
  const namespace = isAdmin ? '/admin' : '/team'
  const from = requestedFrom?.startsWith(namespace) ? requestedFrom : defaultDest

  if (session && adminChecked && (isAdmin || isTeamMember)) return <Navigate to={from} replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const result = await signIn(email, password)
    setBusy(false)
    if (result.error) { setError(result.error); return }
  }

  const unauthorized = session && adminChecked && !isAdmin && !isTeamMember

  return (
    <div className="flex h-screen w-full items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        className="glass-strong w-full max-w-sm rounded-3xl p-8"
      >
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-lg">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Sign In</h1>
            <p className="text-xs text-muted-foreground">Operations dashboard</p>
          </div>
        </div>

        {unauthorized && (
          <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            {profile && !profile.active
              ? 'Your account has been deactivated. Contact your administrator.'
              : 'This account is not authorized for dashboard access.'}
            <button onClick={signOut} className="ml-1 underline">Sign out</button>
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2 dark:bg-white/5"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2 dark:bg-white/5"
            required
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
