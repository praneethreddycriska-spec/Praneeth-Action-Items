import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import type { ActionItem } from '@/types'
import { ActionCard } from './ActionCard'
import { cn } from '@/lib/utils'
import { getDeadlineState } from '@/utils/deadline'

export type Tone = 'blue' | 'olive' | 'rust' | 'slate'

const DOT: Record<Tone, string> = {
  blue: 'bg-sky-300', olive: 'bg-lime-300', rust: 'bg-orange-300', slate: 'bg-zinc-300',
}

export function BoardColumn({
  id, title, items, tone, onOpen, onComplete, onAdd,
}: {
  id: string
  title: string
  items: ActionItem[]
  tone: Tone
  onOpen: (item: ActionItem) => void
  onComplete: (item: ActionItem) => void
  onAdd?: () => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const overdue = items.filter((i) => getDeadlineState(i) === 'overdue').length

  return (
    <div className="flex h-full w-[272px] shrink-0 flex-col">
      <div className="mb-2.5 flex items-center gap-2 px-1">
        <span className={cn('h-2.5 w-2.5 rounded-full ring-2 ring-white/20', DOT[tone])} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-sm font-semibold">{title}</h3>
            <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[11px] font-semibold">{items.length}</span>
          </div>
          <p className="text-[11px] text-muted-foreground">{overdue > 0 ? `${overdue} overdue` : items.length ? 'On track' : 'Empty'}</p>
        </div>
        {onAdd && (
          <button onClick={onAdd} title={`Add to ${title}`} aria-label={`Add to ${title}`} className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 transition hover:bg-foreground/20 active:scale-90">
            <Plus size={14} />
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn('flex-1 space-y-2.5 overflow-y-auto rounded-[1.6rem] p-1 pb-4 transition-colors', isOver && 'bg-foreground/5 ring-2 ring-primary/40')}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, idx) => (
            <ActionCard key={item.id} index={idx} tone={tone} item={item} onOpen={() => onOpen(item)} onComplete={() => onComplete(item)} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-[1.4rem] border border-dashed border-foreground/15 text-xs text-muted-foreground">
            Drop items here
          </div>
        )}
      </div>
    </div>
  )
}
