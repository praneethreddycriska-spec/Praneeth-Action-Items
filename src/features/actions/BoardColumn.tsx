import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { ActionItem } from '@/types'
import { ActionCard } from './ActionCard'
import { cn } from '@/lib/utils'

export function BoardColumn({
  id, title, items, onOpen, onComplete, accent,
}: {
  id: string
  title: string
  items: ActionItem[]
  onOpen: (item: ActionItem) => void
  onComplete: (item: ActionItem) => void
  accent?: string
}) {
  const { setNodeRef, isOver } = useDroppable({ id })

  return (
    <div className="flex h-full w-72 shrink-0 flex-col rounded-[1.75rem] bg-primary/[0.05] p-2 ring-1 ring-primary/[0.07] dark:bg-white/[0.03]">
      <div className="mb-2 flex items-center gap-2 px-2 pt-1">
        {accent && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn('flex-1 space-y-2 overflow-y-auto rounded-2xl p-1.5 transition-colors', isOver && 'bg-primary/10 ring-2 ring-primary/30')}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item, idx) => (
            <ActionCard key={item.id} index={idx} item={item} onOpen={() => onOpen(item)} onComplete={() => onComplete(item)} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-primary/25 text-xs text-muted-foreground">
            No items
          </div>
        )}
      </div>
    </div>
  )
}
