import { useMemo, useState } from 'react'
import { Plus, Archive, Building2, Layers, AlarmClock } from 'lucide-react'
import { CountUp } from '@/components/motion'
import { useCommunities, useCreateCommunity, useArchiveCommunity } from '@/hooks/useCommunities'
import { useActionItems } from '@/hooks/useActionItems'
import { getDeadlineState } from '@/utils/deadline'
import { toast } from 'sonner'

const COLORS = ['#7C6CF6', '#F472B6', '#38BDF8', '#34D399', '#FBBF24', '#FB7185']

export default function CommunitiesPage() {
  const { data: communities = [] } = useCommunities()
  const { data: items = [] } = useActionItems()
  const create = useCreateCommunity()
  const archive = useArchiveCommunity()
  const [name, setName] = useState('')
  const [color, setColor] = useState(COLORS[0])

  const submitCommunity = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    if (communities.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('That community / organization already exists')
      return
    }
    create.mutate({ name: trimmed, color }, { onSuccess: () => setName('') })
  }

  const stats = useMemo(() => {
    const map = new Map<string, { open: number; completed: number; overdue: number; critical: number }>()
    for (const item of items) {
      const key = item.community_id ?? 'none'
      if (!map.has(key)) map.set(key, { open: 0, completed: 0, overdue: 0, critical: 0 })
      const s = map.get(key)!
      if (item.status === 'completed') s.completed++
      else s.open++
      if (getDeadlineState(item) === 'overdue') s.overdue++
      if (item.priority === 10) s.critical++
    }
    return map
  }, [items])

  const totals = useMemo(() => {
    let open = 0, overdue = 0
    stats.forEach((v) => { open += v.open; overdue += v.overdue })
    return { open, overdue }
  }, [stats])

  return (
    <div className="h-full overflow-y-auto px-3 pb-8 md:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3">
        <div>
          <h1 className="text-[30px] font-light leading-[1.02] tracking-tight md:text-[38px]">Communities <br className="hidden md:block" />&amp; Organizations</h1>
          <p className="mt-1 max-w-sm text-[11px] text-muted-foreground">Each one is a community on the board and a selectable organization on the public request form.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {[
            { icon: Building2, value: communities.length, label: 'Communities' },
            { icon: Layers, value: totals.open, label: 'Open actions' },
            { icon: AlarmClock, value: totals.overdue, label: 'Overdue' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="glass flex h-10 w-10 items-center justify-center rounded-full"><Icon size={16} /></span>
              <div><CountUp value={value} className="block text-lg font-semibold leading-none" /><span className="text-[11px] text-muted-foreground">{label}</span></div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass mb-5 flex flex-wrap items-center gap-2 rounded-[2rem] p-2.5">
        <input
          value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') submitCommunity() }} placeholder="New community / organization name…"
          className="min-w-[180px] flex-1 rounded-full border border-border bg-foreground/5 px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/40"
        />
        <div className="flex gap-1.5 px-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} aria-label={`Color ${c}`} className="h-6 w-6 rounded-full transition-transform hover:scale-110" style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px hsl(var(--background)), 0 0 0 4px ${c}` : undefined }} />
          ))}
        </div>
        <button
          onClick={submitCommunity}
          disabled={!name.trim() || create.isPending}
          className="flex items-center gap-1.5 rounded-full accent-gradient px-5 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-95 disabled:opacity-50"
        ><Plus size={15} /> Create</button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {communities.map((c, idx) => {
          const s = stats.get(c.id) ?? { open: 0, completed: 0, overdue: 0, critical: 0 }
          const total = s.open + s.completed
          const pct = total ? Math.round((s.completed / total) * 100) : 0
          return (
            <div key={c.id} style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }} className="glass lift animate-fade-up rounded-[1.8rem] p-4">
              <div className="mb-3 flex items-start justify-between">
                <span className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold text-black/80" style={{ backgroundColor: c.color }}>{c.name.slice(0, 1).toUpperCase()}</span>
                <button onClick={() => archive.mutate(c.id)} title="Archive" aria-label={`Archive ${c.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 text-muted-foreground transition hover:bg-red-500/20 hover:text-red-400"><Archive size={14} /></button>
              </div>
              <p className="mb-3 truncate text-[15px] font-semibold">{c.name}</p>
              <div className="mb-3 grid grid-cols-4 gap-1 rounded-2xl bg-foreground/5 p-2.5 text-center">
                <div><p className="text-sm font-semibold">{s.open}</p><p className="text-[10px] text-muted-foreground">Open</p></div>
                <div><p className={`text-sm font-semibold ${s.overdue ? 'text-red-400' : ''}`}>{s.overdue}</p><p className="text-[10px] text-muted-foreground">Overdue</p></div>
                <div><p className={`text-sm font-semibold ${s.critical ? 'text-red-400' : ''}`}>{s.critical}</p><p className="text-[10px] text-muted-foreground">Critical</p></div>
                <div><p className="text-sm font-semibold">{pct}%</p><p className="text-[10px] text-muted-foreground">Done</p></div>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-foreground/10">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: c.color }} />
              </div>
            </div>
          )
        })}
        {communities.length === 0 && <p className="glass col-span-full rounded-3xl p-8 text-center text-sm text-muted-foreground">No communities yet — add one above.</p>}
      </div>
    </div>
  )
}
