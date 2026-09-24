import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PriorityStars({ value, onChange, size = 14 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  const critical = value >= 10
  return (
    <div className={cn('flex items-center gap-0.5', onChange && 'cursor-pointer')}>
      {Array.from({ length: 10 }).map((_, i) => {
        const filled = i < value
        return (
          <button
            key={i}
            type="button"
            disabled={!onChange}
            onClick={() => onChange?.(i + 1 === value ? i : i + 1)}
            className={cn(!onChange && 'pointer-events-none')}
          >
            <Star
              size={size}
              className={cn(
                filled ? (critical ? 'fill-red-500 text-red-500' : 'fill-amber-400 text-amber-400') : 'text-muted-foreground/30',
              )}
            />
          </button>
        )
      })}
      {critical && <span className="ml-1 rounded-full bg-red-500/15 px-1.5 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">CRITICAL</span>}
    </div>
  )
}
