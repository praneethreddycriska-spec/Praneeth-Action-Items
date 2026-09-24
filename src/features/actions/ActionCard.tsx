import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MessageSquare, Check, User } from 'lucide-react'
import { format } from 'date-fns'
import type { ActionItem } from '@/types'
import { cn } from '@/lib/utils'
import { getDeadlineState, DEADLINE_STYLES } from '@/utils/deadline'
import { PriorityStars } from '@/components/PriorityStars'

export function ActionCard({ item, onOpen, onComplete }: { item: ActionItem; onOpen: () => void; onComplete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const deadlineState = getDeadlineState(item)
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        'glass group cursor-pointer rounded-2xl p-3 transition-shadow hover:shadow-lg',
        isDragging && 'opacity-50',
        item.priority >= 10 && 'ring-1 ring-red-500/40',
      )}
    >
      <div className="mb-1.5 flex items-center justify-between">
        <PriorityStars value={item.priority} size={11} />
        {item.status !== 'completed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete() }}
            className="rounded-full p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-emerald-500/15 hover:text-emerald-600 group-hover:opacity-100"
            title="Mark complete"
          >
            <Check size={14} />
          </button>
        )}
      </div>

      <p className={cn('mb-1.5 text-sm font-medium leading-snug', item.status === 'completed' && 'text-muted-foreground line-through')}>
        {item.title}
      </p>

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        {item.community && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ backgroundColor: `${item.community.color}22`, color: item.community.color }}>
            {item.community.name}
          </span>
        )}
        <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', DEADLINE_STYLES[deadlineState].className)}>
          {item.deadline ? format(new Date(item.deadline), 'MMM d') : DEADLINE_STYLES[deadlineState].label}
        </span>
      </div>

      {(item.follow_up_person || item.expected_output) && (
        <div className="space-y-0.5 border-t border-border/60 pt-1.5 text-[11px] text-muted-foreground">
          {item.follow_up_person && (
            <div className="flex items-center gap-1"><User size={10} /> {item.follow_up_person.full_name}</div>
          )}
          {item.expected_output && <p className="truncate">→ {item.expected_output}</p>}
        </div>
      )}

      <div className="mt-1.5 flex items-center gap-1 text-muted-foreground">
        <MessageSquare size={11} />
      </div>
    </div>
  )
}
