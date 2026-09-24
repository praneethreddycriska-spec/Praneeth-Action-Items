import { useMemo, useState } from 'react'
import { Plus, Archive, Trash2, Building2 } from 'lucide-react'
import { useCommunities, useCreateCommunity, useArchiveCommunity } from '@/hooks/useCommunities'
import { useOrganizations, useCreateOrganization, useDeleteOrganization } from '@/hooks/useOrganizations'
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

  const { data: organizations = [] } = useOrganizations()
  const createOrg = useCreateOrganization()
  const deleteOrg = useDeleteOrganization()
  const [orgName, setOrgName] = useState('')

  const submitOrg = () => {
    const trimmed = orgName.trim()
    if (!trimmed) return
    if (organizations.some((o) => o.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('That organization already exists')
      return
    }
    createOrg.mutate(trimmed, { onSuccess: () => setOrgName('') })
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

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-lg font-semibold">Communities</h1>
      </div>

      <div className="glass mb-5 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <input
          value={name} onChange={(e) => setName(e.target.value)} placeholder="New community name…"
          className="min-w-[180px] flex-1 rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5"
        />
        <div className="flex gap-1">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} className="h-6 w-6 rounded-full ring-2 ring-offset-1" style={{ backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${c}` : undefined }} />
          ))}
        </div>
        <button
          onClick={() => { if (name.trim()) { create.mutate({ name: name.trim(), color }); setName('') } }}
          className="flex items-center gap-1 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3 py-2 text-sm font-semibold text-white"
        ><Plus size={15} /> Create</button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => {
          const s = stats.get(c.id) ?? { open: 0, completed: 0, overdue: 0, critical: 0 }
          const total = s.open + s.completed
          const pct = total ? Math.round((s.completed / total) * 100) : 0
          return (
            <div key={c.id} className="glass rounded-2xl p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: c.color }} />
                  <h3 className="text-sm font-semibold">{c.name}</h3>
                </div>
                <button onClick={() => archive.mutate(c.id)} className="text-muted-foreground hover:text-destructive"><Archive size={14} /></button>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <div><p className="font-semibold">{s.open}</p><p className="text-[10px] text-muted-foreground">Open</p></div>
                <div><p className="font-semibold text-red-500">{s.overdue}</p><p className="text-[10px] text-muted-foreground">Overdue</p></div>
                <div><p className="font-semibold text-red-600">{s.critical}</p><p className="text-[10px] text-muted-foreground">Critical</p></div>
                <div><p className="font-semibold text-emerald-600">{pct}%</p><p className="text-[10px] text-muted-foreground">Done</p></div>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
              </div>
            </div>
          )
        })}
        {communities.length === 0 && <p className="text-sm text-muted-foreground">No communities yet — create one above.</p>}
      </div>

      <div className="mb-3 mt-8 flex items-center gap-2">
        <Building2 size={16} className="text-muted-foreground" />
        <h2 className="text-base font-semibold">Organizations / Companies</h2>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Organizations added here appear as selectable options on the public request form.
      </p>

      <div className="glass mb-4 flex flex-wrap items-center gap-2 rounded-2xl p-3">
        <input
          value={orgName}
          onChange={(e) => setOrgName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') submitOrg() }}
          placeholder="New organization / company name…"
          className="min-w-[180px] flex-1 rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5"
        />
        <button
          onClick={submitOrg}
          disabled={!orgName.trim() || createOrg.isPending}
          className="flex items-center gap-1 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
        ><Plus size={15} /> Add</button>
      </div>

      <div className="flex flex-wrap gap-2">
        {organizations.map((o) => (
          <span key={o.id} className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium">
            {o.name}
            <button onClick={() => deleteOrg.mutate(o.id)} className="text-muted-foreground hover:text-destructive"><Trash2 size={12} /></button>
          </span>
        ))}
        {organizations.length === 0 && <p className="text-sm text-muted-foreground">No organizations yet — add one above.</p>}
      </div>
    </div>
  )
}
