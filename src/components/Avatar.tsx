import { cn } from '@/lib/utils'

export function Avatar({ name, size = 28, className }: { name?: string | null; size?: number; className?: string }) {
  const initials = (name ?? '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <span
      title={name ?? ''}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-[hsl(40_30%_90%)] font-semibold text-[hsl(30_12%_12%)] ring-2 ring-black/20', className)}
    >
      {initials}
    </span>
  )
}

export function AvatarStack({ names, size = 28 }: { names: (string | null | undefined)[]; size?: number }) {
  const list = names.filter(Boolean) as string[]
  if (list.length === 0) return null
  return (
    <span className="flex items-center">
      {list.slice(0, 3).map((n, i) => (
        <Avatar key={n + i} name={n} size={size} className={i > 0 ? '-ml-2' : ''} />
      ))}
    </span>
  )
}
