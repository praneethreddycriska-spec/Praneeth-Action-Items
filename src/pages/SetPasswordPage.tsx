import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { KeyRound, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'

export default function SetPasswordPage() {
  const { session, isAdmin, isTeamMember, adminChecked } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // supabase-js auto-detects the access/refresh token in the URL hash on
    // load (detectSessionInUrl is on by default) and establishes a session.
    // We just need to wait for that before letting the user set a password.
    if (session) { setReady(true); return }
    const timeout = setTimeout(() => setReady(true), 2500)
    return () => clearTimeout(timeout)
  }, [session])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError("Passwords don't match"); return }
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) { setError(error.message); return }
    setDone(true)
    setTimeout(() => navigate(isAdmin ? '/admin' : '/team', { replace: true }), 1500)
  }

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <div className="glass-strong w-full max-w-sm rounded-3xl p-8 text-center">
          <p className="mb-2 text-sm font-semibold text-destructive">This link is invalid or has expired.</p>
          <p className="text-xs text-muted-foreground">Ask your administrator to send a new invite or password reset link.</p>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-strong w-full max-w-sm rounded-3xl p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={40} />
          <p className="text-sm font-semibold">Password set. Taking you to your dashboard…</p>
        </motion.div>
      </div>
    )
  }

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
            <KeyRound size={20} />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Set your password</h1>
            <p className="text-xs text-muted-foreground">Choose a password to finish setting up your account</p>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            className="w-full rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2 dark:bg-white/5"
            required
            minLength={6}
          />
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Confirm password"
            className="w-full rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2 dark:bg-white/5"
            required
            minLength={6}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? 'Saving…' : 'Set password'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}
