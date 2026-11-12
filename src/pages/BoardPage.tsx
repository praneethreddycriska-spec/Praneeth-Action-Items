import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { DndContext, PointerSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { format, isThisMonth } from 'date-fns'
import { Layers, AlarmClock, CheckCircle2, Trophy } from 'lucide-react'
import type { ActionItem, GroupMode, ActionStatus } from '@/types'
import { STATUS_LABELS, STATUS_ORDER } from '@/types'
import { useActionItems, useMoveActionItem, useUpdateActionItem } from '@/hooks/useActionItems'
import { useCommunities, useProfiles } from '@/hooks/useCommunities'
import { BoardColumn, type Tone } from '@/features/actions/BoardColumn'
import { BoardControls, type BoardView } from '@/features/actions/BoardControls'
import { QuickCreate } from '@/features/actions/QuickCreate'
import { Skeleton, CountUp } from '@/components/motion'
import { ActionDetailDrawer } from '@/features/actions/ActionDetailDrawer'
import { getDeadlineState, sortByUrgency, daysOverdue } from '@/utils/deadline'
import { AvatarStack } from '@/components/Avatar'
import { cn } from '@/lib/utils'
import type { Profile } from '@/types'

const PRIORITY_BUCKETS = [
  { key: '10', label: 'Critical (10)', test: (p: number) => p === 10 },
  { key: '8-9', label: 'High (8-9)', test: (p: number) => p >= 8 && p <= 9 },
  { key: '6-7', label: 'Medium (6-7)', test: (p: number) => p >= 6 && p <= 7 },
  { key: '3-5', label: 'Low (3-5)', test: (p: number) => p >= 3 && p <= 5 },
  { key: '0-2', label: 'Minimal (0-2)', test: (p: number) => p <= 2 },
]

const STATUS_TONE: Record<ActionStatus, Tone> = {
  inbox: 'blue', todo: 'olive', in_progress: 'rust', waiting: 'slate', blocked: 'rust', completed: 'slate',
}
const TONES: Tone[] = ['blue', 'olive', 'rust', 'slate']

function StatChip({ icon: Icon, value, label }: { icon: typeof Layers; value: number; label: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="glass flex h-10 w-10 items-center justify-center rounded-full"><Icon size={16} /></span>
      <div>
        <CountUp value={value} className="block text-lg font-semibold leading-none" />
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

function DoneTile({ count, open, onToggle }: { count: number; open: boolean; onToggle: () => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'completed' })
  return (
    <div className="hidden w-[112px] shrink-0 flex-col gap-3 pt-9 lg:flex">
      <button
        ref={setNodeRef}
        onClick={onToggle}
        className={cn('glass flex flex-col items-center gap-1.5 rounded-[2rem] px-3 py-5 text-center transition-all hover:scale-[1.03] active:scale-95', isOver && '!border-primary ring-2 ring-primary/50')}
        title={open ? 'Hide completed' : 'Show completed'}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full accent-gradient"><Trophy size={20} /></span>
        <span className="text-sm font-semibold">Done</span>
        <span className="text-[11px] text-muted-foreground">{count} total</span>
        <span className="mt-1 text-[10px] font-medium text-ink">{open ? 'Hide' : 'Show'}</span>
      </button>
    </div>
  )
}

function ListView({ items, onOpen }: { items: ActionItem[]; onOpen: (i: ActionItem) => void }) {
  if (items.length === 0) return <p className="glass rounded-3xl p-8 text-center text-sm text-muted-foreground">No action items match your filters.</p>
  return (
    <div className="space-y-2 pb-6">
      {items.map((i, idx) => {
        const st = getDeadlineState(i)
        return (
          <button
            key={i.id}
            onClick={() => onOpen(i)}
            style={{ animationDelay: `${Math.min(idx, 10) * 30}ms` }}
            className="glass lift animate-fade-up flex w-full items-center gap-3 rounded-full px-4 py-3 text-left"
          >
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold', i.priority >= 8 ? 'bg-red-400/20 text-red-400' : 'bg-foreground/10')}>{i.priority}</span>
            <span className="min-w-0 flex-1">
              <span className={cn('block truncate text-sm font-semibold', i.status === 'completed' && 'line-through opacity-60')}>{i.title}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{[i.community?.name, i.requested_by_name ? `by ${i.requested_by_name}` : null].filter(Boolean).join(' · ') || 'No community'}</span>
            </span>
            <span className="hidden rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-medium sm:inline">{STATUS_LABELS[i.status]}</span>
            <span className={cn('hidden w-24 shrink-0 text-right text-xs sm:block', st === 'overdue' ? 'font-semibold text-red-400' : 'text-muted-foreground')}>
              {i.deadline ? (st === 'overdue' ? `${daysOverdue(i)}d overdue` : format(new Date(i.deadline), 'MMM d')) : '—'}
            </span>
            <AvatarStack names={[i.follow_up_person?.full_name, i.owner?.full_name]} size={26} />
          </button>
        )
      })}
    </div>
  )
}

export default function BoardPage() {
  const { data: items = [], isLoading } = useActionItems()
  const { data: communities = [] } = useCommunities()
  const { data: profiles = [] } = useProfiles()
  const move = useMoveActionItem()
  const update = useUpdateActionItem()
  const navigate = useNavigate()

  const [groupMode, setGroupMode] = useState<GroupMode>('status')
  const [search, setSearch] = useState('')
  const [minPriority, setMinPriority] = useState(0)
  const [personId, setPersonId] = useState<string | null>(null)
  const [view, setView] = useState<BoardView>('board')
  const [showDone, setShowDone] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = items.find((x) => x.id === selectedId) ?? null
  const setSelected = (x: ActionItem | null) => setSelectedId(x?.id ?? null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (i.priority < minPriority) return false
      if (personId && i.follow_up_person_id !== personId && i.owner_id !== personId) return false
      if (search && !i.title.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [items, minPriority, search, personId])

  const stats = useMemo(() => ({
    open: items.filter((i) => i.status !== 'completed').length,
    overdue: items.filter((i) => getDeadlineState(i) === 'overdue').length,
    doneMonth: items.filter((i) => i.completed_at && isThisMonth(new Date(i.completed_at))).length,
    doneTotal: items.filter((i) => i.status === 'completed').length,
  }), [items])

  const overdueItems = useMemo(() => sortByUrgency(filtered.filter((i) => getDeadlineState(i) === 'overdue')), [filtered])

  const groups = useMemo(() => {
    if (groupMode === 'status') {
      return STATUS_ORDER.filter((s) => s !== 'completed' || showDone).map((s) => ({ key: s, label: STATUS_LABELS[s], items: filtered.filter((i) => i.status === s), tone: STATUS_TONE[s] }))
    }
    if (groupMode === 'community') {
      const byId = new Map(communities.map((c) => [c.id, c]))
      const ids = Array.from(new Set(filtered.map((i) => i.community_id ?? 'ungrouped')))
      return ids.map((id) => ({
        key: id, label: id === 'ungrouped' ? 'Ungrouped' : byId.get(id)?.name ?? 'Unknown',
        items: filtered.filter((i) => (i.community_id ?? 'ungrouped') === id),
        tone: undefined,
      }))
    }
    if (groupMode === 'individual') {
      const names = new Map<string, string>()
      filtered.forEach((i) => { if (i.follow_up_person) names.set(i.follow_up_person_id!, i.follow_up_person.full_name ?? 'Unknown') })
      const ids = Array.from(new Set(filtered.map((i) => i.follow_up_person_id ?? 'unassigned')))
      return ids.map((id) => ({
        key: id, label: id === 'unassigned' ? 'Unassigned' : names.get(id) ?? 'Unknown',
        items: filtered.filter((i) => (i.follow_up_person_id ?? 'unassigned') === id), tone: undefined,
      }))
    }
    if (groupMode === 'priority') {
      return PRIORITY_BUCKETS.map((b) => ({ key: b.key, label: b.label, items: filtered.filter((i) => b.test(i.priority)), tone: undefined }))
    }
    if (groupMode === 'deadline') {
      const states = ['overdue', 'today', 'tomorrow', 'soon3', 'soon7', 'future', 'none', 'completed'] as const
      return states.map((s) => ({ key: s, label: s, items: filtered.filter((i) => getDeadlineState(i) === s), tone: undefined }))
    }
    return [{ key: 'all', label: 'All action items', items: filtered, tone: undefined }]
  }, [groupMode, filtered, communities, showDone])

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over) return
    const item = items.find((i) => i.id === active.id)
    if (!item) return

    if (over.id === 'completed') { move(item.id, 'completed', Date.now()); return }
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
    <div className="relative flex h-full flex-col px-3 pb-3 md:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-x-7 gap-y-3">
        <div>
          <h1 className="text-[30px] font-light leading-[1.02] tracking-tight md:text-[38px]">
            Action <br className="hidden md:block" />Pipeline
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">{format(new Date(), 'EEEE, MMM d yyyy')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <StatChip icon={Layers} value={stats.open} label="Open actions" />
          <StatChip icon={AlarmClock} value={stats.overdue} label="Overdue" />
          <StatChip icon={CheckCircle2} value={stats.doneMonth} label="Done this month" />
        </div>
        <div className="ml-auto"><QuickCreate /></div>
      </div>

      <div className="mb-4">
        <BoardControls
          groupMode={groupMode} onGroupMode={setGroupMode} search={search} onSearch={setSearch}
          minPriority={minPriority} onMinPriority={setMinPriority}
          people={(profiles as Profile[]).filter((p) => p.active)} personId={personId} onPerson={setPersonId}
          view={view} onView={setView}
        />
      </div>

      {overdueItems.length > 0 && view === 'board' && (
        <div className="mb-3 flex items-center gap-2 rounded-full border border-red-400/25 bg-red-500/10 py-1.5 pl-3.5 pr-1.5">
          <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold text-red-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" /> Overdue ({overdueItems.length})
          </span>
          <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {overdueItems.map((i) => (
              <button
                key={i.id}
                onClick={() => setSelected(i)}
                className="glass flex shrink-0 items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium transition-transform active:scale-95"
                title={i.title}
              >
                <span className="font-semibold text-red-400">{daysOverdue(i)}d</span>
                <span className="max-w-[160px] truncate">{i.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-1 gap-3 overflow-hidden">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-72 w-[272px] shrink-0" />)}</div>
      ) : view === 'list' ? (
        <div className="min-h-0 flex-1 overflow-y-auto"><ListView items={sortByUrgency(filtered)} onOpen={setSelected} /></div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
            {groups.map((g, idx) => (
              <BoardColumn
                key={g.key} id={g.key} title={g.label} items={g.items}
                tone={g.tone ?? TONES[idx % TONES.length]}
                onOpen={setSelected}
                onComplete={(i) => update.mutate({ id: i.id, status: 'completed' })}
                onAdd={groupMode === 'status' ? () => navigate(`/admin?new=1&status=${g.key}`) : undefined}
              />
            ))}
            {groupMode === 'status' && <DoneTile count={stats.doneTotal} open={showDone} onToggle={() => setShowDone((v) => !v)} />}
          </div>
        </DndContext>
      )}

      <ActionDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
