import { Search } from 'lucide-react'
import type { GroupMode } from '@/types'
import { cn } from '@/lib/utils'

const GROUP_MODES: { value: GroupMode; label: string }[] = [
  { value: 'status', label: 'Status' },
  { value: 'community', label: 'Community' },
  { value: 'individual', label: 'Individual' },
  { value: 'priority', label: 'Priority' },
  { value: 'deadline', label: 'Deadline' },
  { value: 'none', label: 'None' },
]

export function BoardControls({
  groupMode, onGroupMode, search, onSearch, minPriority, onMinPriority,
}: {
  groupMode: GroupMode
  onGroupMode: (m: GroupMode) => void
  search: string
  onSearch: (s: string) => void
  minPriority: number
  onMinPriority: (n: number) => void
}) {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <div className="glass flex w-full items-center gap-1.5 rounded-xl px-2.5 py-1.5 sm:w-auto">
        <Search size={14} className="shrink-0 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search action items…"
          className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground sm:w-40 md:w-56"
        />
      </div>

      <div className="glass flex w-full items-center gap-0.5 overflow-x-auto rounded-xl p-1 sm:w-auto">
        <span className="shrink-0 px-1.5 text-[10px] font-medium uppercase text-muted-foreground">Group by</span>
        {GROUP_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onGroupMode(m.value)}
            className={cn(
              'shrink-0 rounded-lg px-2 py-1 text-xs font-medium transition-colors',
              groupMode === m.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="glass flex w-full items-center gap-2 rounded-xl px-3 py-1.5 sm:w-auto">
        <span className="shrink-0 text-[10px] font-medium uppercase text-muted-foreground">Min priority</span>
        <input
          type="range" min={0} max={10} value={minPriority}
          onChange={(e) => onMinPriority(Number(e.target.value))}
          className="w-full accent-violet-500 sm:w-20"
        />
        <span className="w-4 shrink-0 text-xs font-semibold">{minPriority}</span>
      </div>
    </div>
  )
}
