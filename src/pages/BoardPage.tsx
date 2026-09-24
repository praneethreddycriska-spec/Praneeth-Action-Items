import { useMemo, useState } from 'react'
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { format } from 'date-fns'
import type { ActionItem, GroupMode, ActionStatus } from '@/types'
import { STATUS_LABELS, STATUS_ORDER } from '@/types'
import { useActionItems, useMoveActionItem, useUpdateActionItem } from '@/hooks/useActionItems'
import { useCommunities } from '@/hooks/useCommunities'
import { BoardColumn } from '@/features/actions/BoardColumn'
import { BoardControls } from '@/features/actions/BoardControls'
import { QuickCreate } from '@/features/actions/QuickCreate'
import { ActionDetailDrawer } from '@/features/actions/ActionDetailDrawer'
import { getDeadlineState, sortByUrgency, daysOverdue } from '@/utils/deadline'
import { PriorityStars } from '@/components/PriorityStars'

const PRIORITY_BUCKETS = [
  { key: '10', label: 'Critical (10)', test: (p: number) => p === 10 },
  { key: '8-9', label: 'High (8-9)', test: (p: number) => p >= 8 && p <= 9 },
  { key: '6-7', label: 'Medium (6-7)', test: (p: number) => p >= 6 && p <= 7 },
  { key: '3-5', label: 'Low (3-5)', test: (p: number) => p >= 3 && p <= 5 },
  { key: '0-2', label: 'Minimal (0-2)', test: (p: number) => p <= 2 },
]

export default function BoardPage() {
  const { data: items = [], isLoading } = useActionItems()
  const { data: communities = [] } = useCommunities()
  const move = useMoveActionItem()
  const update = useUpdateActionItem()

  const [groupMode, setGroupMode] = useState<GroupMode>('status')
  const [search, setSearch] = useState('')
  const [minPriority, setMinPriority] = useState(0)
  const [selected, setSelected] = useState<ActionItem | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (i.priority < minPriority) return false
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [items, minPriority, search])

  const overdueItems = useMemo(() => sortByUrgency(filtered.filter((i) => getDeadlineState(i) === 'overdue')), [filtered])

  const groups = useMemo(() => {
    if (groupMode === 'status') {
      return STATUS_ORDER.map((s) => ({ key: s, label: STATUS_LABELS[s], items: filtered.filter((i) => i.status === s), accent: undefined as string | undefined }))
    }
    if (groupMode === 'community') {
      const byId = new Map(communities.map((c) => [c.id, c]))
      const ids = Array.from(new Set(filtered.map((i) => i.community_id ?? 'ungrouped')))
      return ids.map((id) => ({
        key: id, label: id === 'ungrouped' ? 'Ungrouped' : byId.get(id)?.name ?? 'Unknown',
        items: filtered.filter((i) => (i.community_id ?? 'ungrouped') === id),
        accent: id === 'ungrouped' ? undefined : byId.get(id)?.color,
      }))
    }
    if (groupMode === 'individual') {
      const names = new Map<string, string>()
      filtered.forEach((i) => { if (i.follow_up_person) names.set(i.follow_up_person_id!, i.follow_up_person.full_name ?? 'Unknown') })
      const ids = Array.from(new Set(filtered.map((i) => i.follow_up_person_id ?? 'unassigned')))
      return ids.map((id) => ({
        key: id, label: id === 'unassigned' ? 'Unassigned' : names.get(id) ?? 'Unknown',
        items: filtered.filter((i) => (i.follow_up_person_id ?? 'unassigned') === id), accent: undefined,
      }))
    }
    if (groupMode === 'priority') {
      return PRIORITY_BUCKETS.map((b) => ({ key: b.key, label: b.label, items: filtered.filter((i) => b.test(i.priority)), accent: undefined }))
    }
    if (groupMode === 'deadline') {
      const states = ['overdue', 'today', 'tomorrow', 'soon3', 'soon7', 'future', 'none', 'completed'] as const
      return states.map((s) => ({ key: s, label: s, items: filtered.filter((i) => getDeadlineState(i) === s), accent: undefined }))
    }
    return [{ key: 'all', label: 'All action items', items: filtered, accent: undefined }]
  }, [groupMode, filtered, communities])

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const item = items.find((i) => i.id === active.id)
    if (!item) return

    const overColumn = groups.find((g) => g.key === over.id)
    if (overColumn && groupMode === 'status') {
      move(item.id, overColumn.key as ActionStatus, Date.now())
      return
    }
    const overItem = items.find((i) => i.id === over.id)
    if (overItem && overItem.status !== item.status) {
      move(item.id, overItem.status, overItem.sort_order - 1)
    } else if (overItem) {
      update.mutate({ id: item.id, sort_order: overItem.sort_order - 0.5 })
    }
  }

  return (
    <div className="relative flex h-full flex-col p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-lg font-semibold">Board</h1>
            <p className="text-xs text-muted-foreground">{format(new Date(), 'EEEE, MMM d yyyy')} · {filtered.length} action items</p>
          </div>
          <QuickCreate />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <BoardControls groupMode={groupMode} onGroupMode={setGroupMode} search={search} onSearch={setSearch} minPriority={minPriority} onMinPriority={setMinPriority} />
        </div>
      </div>

      {overdueItems.length > 0 && (
        <div className="mb-3 rounded-2xl border border-red-500/30 bg-red-500/5 p-3">
          <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" /> Overdue ({overdueItems.length})
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {overdueItems.map((i) => (
              <div
                key={i.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelected(i) }}
                className="glass flex min-w-[220px] shrink-0 cursor-pointer flex-col gap-1 rounded-xl p-2.5 text-left"
              >
                <div className="flex items-center justify-between">
                  <PriorityStars value={i.priority} size={10} />
                  <span className="text-[10px] font-semibold text-red-600">{daysOverdue(i)}d overdue</span>
                </div>
                <p className="truncate text-xs font-medium">{i.title}</p>
                <p className="text-[10px] text-muted-foreground">{i.community?.name ?? 'No community'} {i.follow_up_person ? `· ${i.follow_up_person.full_name}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">Loading board…</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex flex-1 gap-3 overflow-x-auto pb-2">
            {groups.map((g) => (
              <BoardColumn key={g.key} id={g.key} title={g.label} items={g.items} accent={g.accent} onOpen={setSelected} onComplete={(i) => update.mutate({ id: i.id, status: 'completed' })} />
            ))}
          </div>
        </DndContext>
      )}

      <ActionDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
