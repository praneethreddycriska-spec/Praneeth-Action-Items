import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useActionItems, useUpdateActionItem } from '@/hooks/useActionItems'
import { useAuth } from '@/hooks/useAuth'
import { getDeadlineState, sortByUrgency, daysOverdue } from '@/utils/deadline'
import { PriorityStars } from '@/components/PriorityStars'
import { ActionDetailDrawer } from '@/features/actions/ActionDetailDrawer'
import type { ActionItem } from '@/types'
import { cn } from '@/lib/utils'

type Filter = 'assigned' | 'due_today' | 'overdue' | 'upcoming' | 'completed' | 'waiting'

export default function MyActionsPage() {
  const { user, profile } = useAuth()
  const { data: items = [], isLoading } = useActionItems()
  const update = useUpdateActionItem()
  const [filter, setFilter] = useState<Filter>('assigned')
  const [selected, setSelected] = useState<ActionItem | null>(null)

  // RLS already scopes `items` to what this team member can see (assigned to them,
  // or in a community they belong to). This further narrows to "assigned to me" views.
  const mine = useMemo(() => items.filter((i) => i.owner_id === user?.id || i.follow_up_person_id === user?.id), [items, user])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'due_today': return mine.filter((i) => getDeadlineState(i) === 'today')
      case 'overdue': return sortByUrgency(mine.filter((i) => getDeadlineState(i) === 'overdue'))
      case 'upcoming': return mine.filter((i) => ['tomorrow', 'soon3', 'soon7', 'future'].includes(getDeadlineState(i)))
      case 'completed': return mine.filter((i) => i.status === 'completed')
      case 'waiting': return mine.filter((i) => i.status === 'waiting')
      default: return sortByUrgency(mine.filter((i) => i.status !== 'completed'))
    }
  }, [mine, filter])

  const counts = {
    assigned: mine.filter((i) => i.status !== 'completed').length,
    due_today: mine.filter((i) => getDeadlineState(i) === 'today').length,
    overdue: mine.filter((i) => getDeadlineState(i) === 'overdue').length,
    upcoming: mine.filter((i) => ['tomorrow', 'soon3', 'soon7', 'future'].includes(getDeadlineState(i))).length,
    waiting: mine.filter((i) => i.status === 'waiting').length,
    completed: mine.filter((i) => i.status === 'completed').length,
  }

  const tabs: { key: Filter; label: string }[] = [
    { key: 'assigned', label: 'Assigned to Me' },
    { key: 'due_today', label: 'Due Today' },
    { key: 'overdue', label: 'Overdue' },
    { key: 'upcoming', label: 'Upcoming' },
    { key: 'waiting', label: 'Waiting' },
    { key: 'completed', label: 'Completed' },
  ]

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-1 text-lg font-semibold">My Actions</h1>
      <p className="mb-4 text-xs text-muted-foreground">Welcome, {profile?.full_name} · {format(new Date(), 'EEEE, MMM d')}</p>

      <div className="glass mb-4 flex flex-wrap gap-1 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className={cn(
              'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
              filter === t.key ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5',
            )}
          >
            {t.label} <span className="ml-1 opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => {
            const state = getDeadlineState(item)
            return (
              <button key={item.id} onClick={() => setSelected(item)} className="glass rounded-2xl p-3.5 text-left">
                <div className="mb-1.5 flex items-center justify-between">
                  <PriorityStars value={item.priority} size={11} />
                  {state === 'overdue' && <span className="text-[10px] font-semibold text-red-600">{daysOverdue(item)}d overdue</span>}
                </div>
                <p className="mb-1.5 line-clamp-2 text-sm font-medium">{item.title}</p>
                {item.community && (
                  <span className="mb-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${item.community.color}22`, color: item.community.color }}>
                    {item.community.name}
                  </span>
                )}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{item.deadline ? format(new Date(item.deadline), 'MMM d') : 'No deadline'}</span>
                  {item.status !== 'completed' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); update.mutate({ id: item.id, status: 'completed' }) }}
                      className="rounded-full bg-emerald-500/15 px-2 py-0.5 font-medium text-emerald-600"
                    >
                      Complete
                    </button>
                  )}
                </div>
              </button>
            )
          })}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">Nothing here.</p>}
        </div>
      )}

      <ActionDetailDrawer item={selected} onClose={() => setSelected(null)} />
    </div>
  )
}
