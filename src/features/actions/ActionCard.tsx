import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Check, Star } from 'lucide-react'
import { format } from 'date-fns'
import type { ActionItem } from '@/types'
import { cn } from '@/lib/utils'
import { getDeadlineState, daysOverdue } from '@/utils/deadline'
import { AvatarStack } from '@/components/Avatar'

export function ActionCard({
  item, index = 0, tone = 'blue', onOpen, onComplete,
}: { item: ActionItem; index?: number; tone?: 'blue' | 'olive' | 'rust' | 'slate'; onOpen: () => void; onComplete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const state = getDeadlineState(item)
  const style = { transform: CSS.Transform.toString(transform), transition, animationDelay: `${Math.min(index, 8) * 45}ms` }
  const sub = [item.community?.name, item.requested_by_name ? `by ${item.requested_by_name}` : null].filter(Boolean).join(' · ')

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onOpen}
      className={cn(
        `kcol-${tone} kcard lift-soft animate-fade-up group cursor-pointer rounded-[1.4rem] p-3.5`,
        isDragging && 'scale-[1.03] opacity-70 shadow-2xl',
        item.priority >= 10 && 'ring-1 ring-red-400/60',
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="kcard-sub text-[11px] font-medium">
          {item.deadline ? `Due ${format(new Date(item.deadline), 'MMM d')}` : 'No deadline'}
          {state === 'overdue' && <span className="kchip ml-1.5 rounded-full px-1.5 py-0.5 font-semibold">{daysOverdue(item)}d late</span>}
        </p>
        {item.status !== 'completed' && (
          <button
            onClick={(e) => { e.stopPropagation(); onComplete() }}
            onPointerDown={(e) => e.stopPropagation()}
            className="kchip flex h-6 w-6 shrink-0 items-center justify-center rounded-full opacity-60 transition hover:opacity-100 group-hover:opacity-100"
            title="Mark complete"
            aria-label="Mark complete"
          >
            <Check size={13} />
          </button>
        )}
      </div>

      <p className={cn('mb-0.5 line-clamp-2 text-[15px] font-semibold leading-snug', item.status === 'completed' && 'line-through opacity-70')}>
        {item.title}
      </p>
      {sub && <p className="kcard-sub mb-3 truncate text-[11px]">{sub}</p>}

      <div className="mt-3 flex items-end justify-between">
        <div className="flex items-center gap-1.5 text-lg font-semibold leading-none">
          <Star size={14} className={cn(item.priority >= 10 ? 'fill-red-400 text-red-400' : 'fill-current opacity-80')} />
          {item.priority}<span className="kcard-sub text-xs font-medium">/10</span>
        </div>
        <AvatarStack names={[item.follow_up_person?.full_name, item.owner?.full_name !== item.follow_up_person?.full_name ? item.owner?.full_name : null]} size={26} />
      </div>
    </div>
  )
}
