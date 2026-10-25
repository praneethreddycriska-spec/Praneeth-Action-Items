import { useMemo } from 'react'
import { format, isToday, isThisWeek } from 'date-fns'
import { motion } from 'framer-motion'
import { Inbox, Flame, AlarmClock, CheckCircle2, Layers, Hourglass, UserX, CalendarClock, Sparkles } from 'lucide-react'
import { useActionItems } from '@/hooks/useActionItems'
import { useRequests } from '@/hooks/useRequests'
import { useAuth } from '@/hooks/useAuth'
import { getDeadlineState } from '@/utils/deadline'
import { CountUp, Stagger, StaggerItem, FadeUp } from '@/components/motion'

type Tone = 'lilac' | 'mint' | 'peach' | 'sky' | 'rose'

function StatTile({ label, value, tone, icon: Icon, hint }: { label: string; value: number; tone: Tone; icon: typeof Inbox; hint?: string }) {
  return (
    <StaggerItem>
      <div className={`tone-${tone} lift flex h-full flex-col justify-between rounded-3xl p-4`}>
        <div className="mb-4 flex items-center justify-between">
          <p className="text-[11px] font-medium uppercase tracking-wide text-foreground/60">{label}</p>
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/70 text-foreground/70 dark:bg-white/10"><Icon size={15} /></span>
        </div>
        <div>
          <CountUp value={value} className="text-4xl font-bold leading-none tracking-tight" />
          {hint && <p className="mt-1.5 text-[11px] text-foreground/55">{hint}</p>}
        </div>
      </div>
    </StaggerItem>
  )
}

function FunnelBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max ? Math.max(6, Math.round((value / max) * 100)) : 6
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="font-medium">{label}</span>
        <span className="font-semibold">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-primary/10">
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const { data: items = [] } = useActionItems()
  const { data: requests = [] } = useRequests()

  const requestKpis = useMemo(() => {
    const newCount = requests.filter((r) => r.status === 'new').length
    const thisWeek = requests.filter((r) => isThisWeek(new Date(r.created_at))).length
    const accepted = requests.filter((r) => ['accepted', 'converted', 'in_progress', 'waiting', 'completed'].includes(r.status)).length
    const converted = requests.filter((r) => ['converted', 'in_progress', 'waiting', 'completed'].includes(r.status)).length
    const completed = requests.filter((r) => r.status === 'completed').length
    const rejected = requests.filter((r) => r.status === 'rejected').length
    return { total: requests.length, newCount, thisWeek, accepted, converted, completed, rejected }
  }, [requests])

  const kpis = useMemo(() => {
    const open = items.filter((i) => i.status !== 'completed')
    const overdue = items.filter((i) => getDeadlineState(i) === 'overdue')
    const dueToday = open.filter((i) => i.deadline && isToday(new Date(i.deadline)))
    const dueWeek = open.filter((i) => i.deadline && isThisWeek(new Date(i.deadline)))
    const critical = open.filter((i) => i.priority === 10)
    const unassigned = open.filter((i) => !i.follow_up_person_id)
    const waiting = open.filter((i) => i.status === 'waiting')
    const blocked = open.filter((i) => i.status === 'blocked')
    const completedToday = items.filter((i) => i.completed_at && isToday(new Date(i.completed_at)))
    return { open: open.length, overdue: overdue.length, dueToday: dueToday.length, dueWeek: dueWeek.length, critical: critical.length, unassigned: unassigned.length, waiting: waiting.length, blocked: blocked.length, completedToday: completedToday.length }
  }, [items])

  const followUps = useMemo(() => {
    const map = new Map<string, { name: string; open: number; overdue: number }>()
    for (const i of items) {
      if (!i.follow_up_person_id || i.status === 'completed') continue
      const key = i.follow_up_person_id
      if (!map.has(key)) map.set(key, { name: i.follow_up_person?.full_name ?? 'Unknown', open: 0, overdue: 0 })
      const e = map.get(key)!
      e.open++
      if (getDeadlineState(i) === 'overdue') e.overdue++
    }
    return Array.from(map.values()).sort((a, b) => b.open - a.open)
  }, [items])

  const communityWorkload = useMemo(() => {
    const map = new Map<string, { name: string; color: string; open: number; overdue: number; critical: number; completed: number }>()
    for (const i of items) {
      const key = i.community_id ?? 'none'
      const name = i.community?.name ?? 'Ungrouped'
      if (!map.has(key)) map.set(key, { name, color: i.community?.color ?? '#94A3B8', open: 0, overdue: 0, critical: 0, completed: 0 })
      const e = map.get(key)!
      if (i.status === 'completed') e.completed++; else e.open++
      if (getDeadlineState(i) === 'overdue') e.overdue++
      if (i.priority === 10) e.critical++
    }
    return Array.from(map.values()).sort((a, b) => b.open - a.open)
  }, [items])

  const { profile } = useAuth()
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const firstName = (profile?.full_name ?? 'there').split(' ')[0]
  const funnelMax = Math.max(requestKpis.total, 1)

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6">
      <FadeUp>
        <div className="hero-card mb-5 rounded-[2rem] p-5 md:p-7">
          <div className="relative z-10 max-w-xl">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-primary"><Sparkles size={13} /> {format(new Date(), 'EEEE, MMM d')}</p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{greeting}, {firstName}</h1>
            <p className="mt-1.5 text-sm text-foreground/65">
              {kpis.overdue > 0 ? `${kpis.overdue} overdue and ` : ''}{kpis.open} open action {kpis.open === 1 ? 'item' : 'items'} across your team.
              {requestKpis.newCount > 0 ? ` ${requestKpis.newCount} new ${requestKpis.newCount === 1 ? 'request is' : 'requests are'} waiting for review.` : ' Your request inbox is clear.'}
            </p>
          </div>
        </div>
      </FadeUp>

      <Stagger className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Total requests" value={requestKpis.total} tone="lilac" icon={Inbox} hint={`${requestKpis.thisWeek} this week`} />
        <StatTile label="New requests" value={requestKpis.newCount} tone="sky" icon={Layers} hint="Awaiting review" />
        <StatTile label="Converted" value={requestKpis.converted} tone="mint" icon={CheckCircle2} hint="Became action items" />
        <StatTile label="Overdue" value={kpis.overdue} tone="rose" icon={AlarmClock} hint="Needs attention" />
        <StatTile label="Open" value={kpis.open} tone="lilac" icon={Layers} />
        <StatTile label="Due today" value={kpis.dueToday} tone="peach" icon={CalendarClock} hint={`${kpis.dueWeek} due this week`} />
        <StatTile label="Critical" value={kpis.critical} tone="rose" icon={Flame} />
        <StatTile label="Completed today" value={kpis.completedToday} tone="mint" icon={CheckCircle2} />
      </Stagger>

      <div className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-2">
        <Stagger className="contents">
          <StatTile label="Unassigned" value={kpis.unassigned} tone="peach" icon={UserX} hint="No follow-up person" />
          <StatTile label="Waiting" value={kpis.waiting} tone="sky" icon={Hourglass} hint="Blocked on others" />
        </Stagger>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <FadeUp delay={0.15} className="lg:col-span-1">
          <div className="glass h-full rounded-3xl p-5">
            <h3 className="mb-4 text-sm font-semibold">Request funnel</h3>
            <div className="space-y-3.5">
              <FunnelBar label="Requests" value={requestKpis.total} max={funnelMax} color="hsl(var(--primary))" />
              <FunnelBar label="Accepted" value={requestKpis.accepted} max={funnelMax} color="hsl(var(--accent))" />
              <FunnelBar label="Converted" value={requestKpis.converted} max={funnelMax} color="#10B981" />
              <FunnelBar label="Completed" value={requestKpis.completed} max={funnelMax} color="#059669" />
            </div>
            {requestKpis.rejected > 0 && <p className="mt-4 text-xs text-red-500">{requestKpis.rejected} rejected</p>}
          </div>
        </FadeUp>

        <FadeUp delay={0.22} className="lg:col-span-1">
          <div className="glass h-full rounded-3xl p-5">
            <h3 className="mb-4 text-sm font-semibold">Community workload</h3>
            <div className="space-y-3">
              {communityWorkload.map((c) => {
                const total = c.open + c.completed
                const pct = total ? Math.round((c.completed / total) * 100) : 0
                return (
                  <div key={c.name}>
                    <div className="mb-1 flex items-center gap-2 text-xs">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      <span className="text-muted-foreground">{c.open} open</span>
                      {c.overdue > 0 && <span className="text-red-500">{c.overdue} overdue</span>}
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-primary/10">
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: c.color }} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                    </div>
                  </div>
                )
              })}
              {communityWorkload.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
            </div>
          </div>
        </FadeUp>

        <FadeUp delay={0.29} className="lg:col-span-1">
          <div className="glass h-full rounded-3xl p-5">
            <h3 className="mb-4 text-sm font-semibold">Follow-ups</h3>
            <div className="space-y-2.5">
              {followUps.map((f) => (
                <div key={f.name} className="flex items-center gap-3 rounded-2xl bg-primary/6 px-3 py-2 text-xs">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full accent-gradient text-[11px] font-semibold">{f.name.slice(0, 1).toUpperCase()}</span>
                  <span className="flex-1 truncate font-medium">{f.name}</span>
                  <span className="text-muted-foreground">{f.open} open</span>
                  {f.overdue > 0 && <span className="font-medium text-red-500">{f.overdue} overdue</span>}
                </div>
              ))}
              {followUps.length === 0 && <p className="text-xs text-muted-foreground">No follow-ups assigned.</p>}
            </div>
          </div>
        </FadeUp>
      </div>
    </div>
  )
}
