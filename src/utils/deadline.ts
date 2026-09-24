import type { ActionItem, DeadlineState } from '@/types'

const DAY_MS = 24 * 60 * 60 * 1000

export function getDeadlineState(item: Pick<ActionItem, 'deadline' | 'status'>): DeadlineState {
  if (item.status === 'completed') return 'completed'
  if (!item.deadline) return 'none'
  const now = Date.now()
  const due = new Date(item.deadline).getTime()
  const diff = due - now
  if (diff < 0) return 'overdue'
  if (diff < DAY_MS) return 'today'
  if (diff < 2 * DAY_MS) return 'tomorrow'
  if (diff < 3 * DAY_MS) return 'soon3'
  if (diff < 7 * DAY_MS) return 'soon7'
  return 'future'
}

export function isOverdue(item: Pick<ActionItem, 'deadline' | 'status'>): boolean {
  return getDeadlineState(item) === 'overdue'
}

export function daysOverdue(item: Pick<ActionItem, 'deadline'>): number {
  if (!item.deadline) return 0
  return Math.max(0, Math.floor((Date.now() - new Date(item.deadline).getTime()) / DAY_MS))
}

export const DEADLINE_STYLES: Record<DeadlineState, { label: string; className: string }> = {
  overdue: { label: 'Overdue', className: 'text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/30' },
  today: { label: 'Due today', className: 'text-orange-600 dark:text-orange-400 bg-orange-500/10 border-orange-500/30' },
  tomorrow: { label: 'Due tomorrow', className: 'text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
  soon3: { label: 'Due soon', className: 'text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  soon7: { label: 'This week', className: 'text-sky-600 dark:text-sky-400 bg-sky-500/10 border-sky-500/30' },
  future: { label: 'Upcoming', className: 'text-slate-600 dark:text-slate-300 bg-slate-500/10 border-slate-500/30' },
  none: { label: 'No deadline', className: 'text-slate-400 bg-slate-500/5 border-slate-500/20' },
  completed: { label: 'Completed', className: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30' },
}

/** Urgency score used for suggested sort ordering (does not overwrite manual priority). */
export function urgencyScore(item: ActionItem): number {
  const state = getDeadlineState(item)
  const overdueWeight = state === 'overdue' ? 1000 + daysOverdue(item) * 5 : 0
  const proximityWeight: Record<DeadlineState, number> = {
    overdue: 0, today: 500, tomorrow: 300, soon3: 200, soon7: 100, future: 20, none: 0, completed: -1000,
  }
  const followUpWeight = item.follow_up_person_id ? 10 : 0
  return overdueWeight + proximityWeight[state] + item.priority * 15 + followUpWeight
}

export function sortByUrgency(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => urgencyScore(b) - urgencyScore(a))
}
