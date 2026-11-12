import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Search, Inbox, Sparkles, CheckCircle2, Mail, Phone, Star, ExternalLink } from 'lucide-react'
import { isThisWeek } from 'date-fns'
import type { RequestRecord, RequestStatus } from '@/types'
import { REQUEST_STATUS_LABELS } from '@/types'
import { useRequests } from '@/hooks/useRequests'
import { Skeleton, CountUp } from '@/components/motion'
import { RequestDetailDrawer } from '@/features/requests/RequestDetailDrawer'
import { ConvertToActionModal } from '@/features/requests/ConvertToActionModal'
import { cn } from '@/lib/utils'
import { formatSmartDate } from '@/utils/deadline'

const STATUS_TABS: (RequestStatus | 'all')[] = ['all', 'new', 'under_review', 'accepted', 'converted', 'in_progress', 'waiting', 'completed', 'rejected']

const STATUS_DOT: Record<RequestStatus, string> = {
  new: 'bg-sky-400', under_review: 'bg-amber-400', accepted: 'bg-lime-400', converted: 'bg-emerald-400',
  in_progress: 'bg-indigo-400', waiting: 'bg-orange-400', completed: 'bg-emerald-300', rejected: 'bg-red-400', archived: 'bg-zinc-400',
}

const STAGE: Record<RequestStatus, number> = {
  new: 10, under_review: 30, accepted: 50, converted: 70, in_progress: 80, waiting: 75, completed: 100, rejected: 100, archived: 100,
}

function initialsOf(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function StatChip({ icon: Icon, value, label, badge }: { icon: typeof Inbox; value: number; label: string; badge?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="glass flex h-10 w-10 items-center justify-center rounded-full"><Icon size={16} /></span>
      <div>
        <div className="flex items-center gap-1.5">
          <CountUp value={value} className="text-lg font-semibold leading-none" />
          {badge && <span className="rounded-full accent-gradient px-1.5 py-0.5 text-[10px] font-bold leading-none">{badge}</span>}
        </div>
        <span className="text-[11px] text-muted-foreground">{label}</span>
      </div>
    </div>
  )
}

export default function RequestsPage() {
  const { data: requests = [], isLoading } = useRequests()
  const [tab, setTab] = useState<RequestStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<'newest' | 'deadline'>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = requests.find((r) => r.id === selectedId) ?? null
  const setSelected = (r: RequestRecord | null) => setSelectedId(r?.id ?? null)
  const [converting, setConverting] = useState<RequestRecord | null>(null)
  const [params, setParams] = useSearchParams()
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (params.get('focus') !== 'search') return
    searchRef.current?.focus()
    const next = new URLSearchParams(params); next.delete('focus'); setParams(next, { replace: true })
  }, [params, setParams])

  const stats = useMemo(() => ({
    total: requests.filter((r) => r.status !== 'archived').length,
    week: requests.filter((r) => isThisWeek(new Date(r.created_at))).length,
    fresh: requests.filter((r) => r.status === 'new').length,
    converted: requests.filter((r) => ['converted', 'in_progress', 'waiting', 'completed'].includes(r.status)).length,
  }), [requests])

  const filtered = useMemo(() => {
    let list = tab === 'all' ? requests.filter((r) => r.status !== 'archived') : requests.filter((r) => r.status === tab)
    const q = search.trim().toLowerCase()
    if (q) {
      list = list.filter((r) =>
        r.request_code.toLowerCase().includes(q) ||
        r.name_snapshot.toLowerCase().includes(q) ||
        (r.email_snapshot ?? '').toLowerCase().includes(q) ||
        (r.phone_snapshot ?? '').toLowerCase().includes(q) ||
        (r.organization ?? '').toLowerCase().includes(q) ||
        r.requirement.toLowerCase().includes(q) ||
        (r.target ?? '').toLowerCase().includes(q) ||
        (r.expected_output ?? '').toLowerCase().includes(q),
      )
    }
    return [...list].sort((a, b) => (sort === 'deadline'
      ? (a.deadline ? new Date(a.deadline).getTime() : Infinity) - (b.deadline ? new Date(b.deadline).getTime() : Infinity)
      : new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
  }, [requests, tab, search, sort])

  return (
    <div className="h-full overflow-y-auto px-3 pb-6 md:px-6">
      <div className="mb-4 flex flex-wrap items-center gap-x-7 gap-y-3">
        <h1 className="text-[30px] font-light leading-[1.02] tracking-tight md:text-[38px]">
          Request <br className="hidden md:block" />Directory
        </h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <StatChip icon={Inbox} value={stats.total} label="Requests in your book" badge={stats.week ? `+${stats.week} this week` : undefined} />
          <StatChip icon={Sparkles} value={stats.fresh} label="Awaiting review" />
          <StatChip icon={CheckCircle2} value={stats.converted} label="Became action items" />
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="glass flex w-full items-center gap-2 rounded-full px-3.5 py-2 sm:w-72">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, company, requirement…"
            className="w-full min-w-0 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="glass no-scrollbar flex max-w-full items-center gap-0.5 overflow-x-auto rounded-full p-1">
          {STATUS_TABS.map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors',
                tab === s ? 'bg-foreground/15 text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {s === 'all' ? 'All' : REQUEST_STATUS_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <select value={sort} onChange={(e) => setSort(e.target.value as 'newest' | 'deadline')} className="glass rounded-full py-2 pl-3.5 text-xs font-medium" aria-label="Sort requests">
            <option value="newest">Newest first</option>
            <option value="deadline">Soonest deadline</option>
          </select>
          <a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 rounded-full accent-gradient px-4 py-2 text-xs font-semibold transition-transform hover:scale-[1.03] active:scale-95">
            <ExternalLink size={13} /> Request form
          </a>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{[0, 1, 2, 3].map((n) => <Skeleton key={n} className="h-52" />)}</div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((r, idx) => {
            const starred = r.urgency === 'high' || r.urgency === 'critical'
            const pct = STAGE[r.status]
            return (
              <div
                key={r.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelected(r)}
                onKeyDown={(e) => { if (e.key === 'Enter') setSelected(r) }}
                style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }}
                className="glass lift animate-fade-up cursor-pointer rounded-[1.8rem] p-4 text-left"
              >
                <div className="mb-3 flex items-start justify-between">
                  <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(40_30%_90%)] text-sm font-bold text-[hsl(30_12%_12%)]">{initialsOf(r.name_snapshot)}</span>
                  <span className={cn('flex h-7 w-7 items-center justify-center rounded-full', starred ? 'accent-gradient' : 'bg-foreground/10 text-muted-foreground')} title={r.urgency ? `Urgency: ${r.urgency}` : 'No urgency set'}>
                    <Star size={13} className={starred ? 'fill-current' : ''} />
                  </span>
                </div>
                <p className="truncate text-[15px] font-semibold" title={r.name_snapshot}>{r.name_snapshot}</p>
                <p className="mb-3 truncate text-[11px] text-muted-foreground">
                  {[r.request_code, r.organization, r.location].filter(Boolean).join(' · ')}
                </p>
                <p className="mb-3 line-clamp-2 min-h-[2rem] text-xs text-muted-foreground">{r.requirement}</p>

                <div className="mb-3 grid grid-cols-2 gap-2 rounded-2xl bg-foreground/5 p-2.5">
                  <div>
                    <p className="text-[10px] text-muted-foreground">Submitted</p>
                    <p className="text-xs font-semibold">{formatSmartDate(r.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">Deadline</p>
                    <p className="text-xs font-semibold">{r.deadline ? formatSmartDate(r.deadline) : '—'}</p>
                  </div>
                </div>

                <div className="mb-3 flex items-center gap-2">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10">
                    <div className={cn('h-full rounded-full transition-all duration-700', r.status === 'rejected' ? 'bg-red-400' : 'bg-primary')} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-semibold text-muted-foreground">{pct}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-medium">
                    <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[r.status])} />
                    {REQUEST_STATUS_LABELS[r.status]}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {r.email_snapshot && (
                      <a href={`mailto:${r.email_snapshot}`} onClick={(e) => e.stopPropagation()} title={r.email_snapshot} className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 transition hover:bg-foreground/20"><Mail size={13} /></a>
                    )}
                    {r.phone_snapshot && (
                      <a href={`tel:${r.phone_snapshot}`} onClick={(e) => e.stopPropagation()} title={r.phone_snapshot} className="flex h-7 w-7 items-center justify-center rounded-full bg-foreground/10 transition hover:bg-foreground/20"><Phone size={13} /></a>
                    )}
                  </span>
                </div>
              </div>
            )
          })}
          {filtered.length === 0 && <p className="glass col-span-full rounded-3xl p-8 text-center text-sm text-muted-foreground">No requests in this view.</p>}
        </div>
      )}

      <RequestDetailDrawer
        request={selected}
        onClose={() => setSelected(null)}
        onConvert={() => { if (selected) { setConverting(selected); setSelected(null) } }}
      />
      {converting && <ConvertToActionModal request={converting} onClose={() => setConverting(null)} />}
    </div>
  )
}
