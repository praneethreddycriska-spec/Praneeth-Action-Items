import { useMemo } from 'react'
import { useActionItems } from '@/hooks/useActionItems'
import { getDeadlineState } from '@/utils/deadline'
import { isToday, isThisWeek } from 'date-fns'

function KpiCard({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className="glass rounded-2xl p-3.5">
      <p className="text-[10px] font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold" style={tone ? { color: tone } : undefined}>{value}</p>
    </div>
  )
}

export default function DashboardPage() {
  const { data: items = [] } = useActionItems()

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

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-4 text-lg font-semibold">Analytics</h1>

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Open" value={kpis.open} />
        <KpiCard label="Overdue" value={kpis.overdue} tone="#DC2626" />
        <KpiCard label="Due today" value={kpis.dueToday} tone="#EA580C" />
        <KpiCard label="Due this week" value={kpis.dueWeek} />
        <KpiCard label="Critical" value={kpis.critical} tone="#DC2626" />
        <KpiCard label="Unassigned" value={kpis.unassigned} />
        <KpiCard label="Waiting" value={kpis.waiting} />
        <KpiCard label="Completed today" value={kpis.completedToday} tone="#059669" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold">Community workload</h3>
          <div className="space-y-2">
            {communityWorkload.map((c) => (
              <div key={c.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="w-28 truncate font-medium">{c.name}</span>
                <span className="text-muted-foreground">{c.open} open</span>
                <span className="text-red-500">{c.overdue} overdue</span>
                <span className="text-red-600">{c.critical} critical</span>
                <span className="ml-auto text-emerald-600">{c.completed} done</span>
              </div>
            ))}
            {communityWorkload.length === 0 && <p className="text-xs text-muted-foreground">No data yet.</p>}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-semibold">Follow-up dashboard</h3>
          <div className="space-y-2">
            {followUps.map((f) => (
              <div key={f.name} className="flex items-center gap-2 text-xs">
                <span className="w-28 truncate font-medium">{f.name}</span>
                <span className="text-muted-foreground">{f.open} open</span>
                <span className="text-red-500">{f.overdue} overdue</span>
              </div>
            ))}
            {followUps.length === 0 && <p className="text-xs text-muted-foreground">No follow-ups assigned.</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
