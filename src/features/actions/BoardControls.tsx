import { Search, LayoutGrid, List } from 'lucide-react'
import type { GroupMode, Profile } from '@/types'
import { cn } from '@/lib/utils'
import { Avatar } from '@/components/Avatar'

const GROUP_MODES: { value: GroupMode; label: string }[] = [
  { value: 'status', label: 'Group: Status' },
  { value: 'community', label: 'Group: Community' },
  { value: 'individual', label: 'Group: Person' },
  { value: 'priority', label: 'Group: Priority' },
  { value: 'deadline', label: 'Group: Deadline' },
  { value: 'none', label: 'No grouping' },
]

const PRIORITIES = [
  { value: 0, label: 'Any priority' },
  { value: 3, label: 'Priority 3+' },
  { value: 5, label: 'Priority 5+' },
  { value: 8, label: 'Priority 8+' },
  { value: 10, label: 'Critical only' },
]

export type BoardView = 'board' | 'list'

export function BoardControls({
  groupMode, onGroupMode, search, onSearch, minPriority, onMinPriority, people, personId, onPerson, view, onView,
}: {
  groupMode: GroupMode
  onGroupMode: (m: GroupMode) => void
  search: string
  onSearch: (s: string) => void
  minPriority: number
  onMinPriority: (n: number) => void
  people: Profile[]
  personId: string | null
  onPerson: (id: string | null) => void
  view: BoardView
  onView: (v: BoardView) => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="glass flex w-full items-center gap-2 rounded-full px-3.5 py-2 sm:w-64">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search action items…"
          className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto">
        {people.map((p) => {
          const first = (p.full_name ?? '?').split(' ')[0]
          const on = personId === p.id
          return (
            <button
              key={p.id}
              onClick={() => onPerson(on ? null : p.id)}
              className={cn(
                'glass flex shrink-0 items-center gap-1.5 rounded-full py-1 pl-1 pr-3 text-xs font-medium transition-all active:scale-95',
                on && '!border-primary !bg-primary/20',
              )}
            >
              <Avatar name={p.full_name} size={22} />
              {first}
            </button>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <select value={groupMode} onChange={(e) => onGroupMode(e.target.value as GroupMode)} className="glass rounded-full py-2 pl-3.5 text-xs font-medium" aria-label="Group by">
          {GROUP_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <select value={minPriority} onChange={(e) => onMinPriority(Number(e.target.value))} className="glass hidden rounded-full py-2 pl-3.5 text-xs font-medium sm:block" aria-label="Minimum priority">
          {PRIORITIES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </select>
        <div className="glass flex items-center rounded-full p-1">
          {([['board', LayoutGrid, 'Board'], ['list', List, 'List']] as const).map(([v, Icon, label]) => (
            <button
              key={v}
              onClick={() => onView(v)}
              aria-pressed={view === v}
              className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors', view === v ? 'bg-foreground/15 text-foreground' : 'text-muted-foreground')}
            >
              <Icon size={13} /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
