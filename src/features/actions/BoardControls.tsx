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
    <div className="flex flex-wrap items-center gap-2">
      <div className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5">
        <Search size={14} className="text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search action items…"
          className="w-40 bg-transparent text-xs outline-none placeholder:text-muted-foreground md:w-56"
        />
      </div>

      <div className="glass flex items-center gap-0.5 rounded-xl p-1">
        <span className="px-1.5 text-[10px] font-medium uppercase text-muted-foreground">Group by</span>
        {GROUP_MODES.map((m) => (
          <button
            key={m.value}
            onClick={() => onGroupMode(m.value)}
            className={cn(
              'rounded-lg px-2 py-1 text-xs font-medium transition-colors',
              groupMode === m.value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5',
            )}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase text-muted-foreground">Min priority</span>
        <input
          type="range" min={0} max={10} value={minPriority}
          onChange={(e) => onMinPriority(Number(e.target.value))}
          className="w-20 accent-violet-500"
        />
        <span className="w-4 text-xs font-semibold">{minPriority}</span>
      </div>
    </div>
  )
}
