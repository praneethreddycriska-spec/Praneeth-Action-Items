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
    <div className="flex h-full w-72 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        {accent && <span className="h-2 w-2 rounded-full" style={{ backgroundColor: accent }} />}
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={cn('flex-1 space-y-2 overflow-y-auto rounded-2xl p-1.5 transition-colors', isOver && 'bg-primary/5')}
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <ActionCard key={item.id} item={item} onOpen={() => onOpen(item)} onComplete={() => onComplete(item)} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-border/60 text-xs text-muted-foreground">
            No items
          </div>
        )}
      </div>
    </div>
  )
}
