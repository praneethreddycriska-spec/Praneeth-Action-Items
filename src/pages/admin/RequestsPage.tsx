import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import type { RequestRecord, RequestStatus } from '@/types'
import { REQUEST_STATUS_LABELS } from '@/types'
import { useRequests } from '@/hooks/useRequests'
import { RequestDetailDrawer } from '@/features/requests/RequestDetailDrawer'
import { ConvertToActionModal } from '@/features/requests/ConvertToActionModal'
import { cn } from '@/lib/utils'
import { formatSmartDate } from '@/utils/deadline'

const STATUS_TABS: (RequestStatus | 'all')[] = ['all', 'new', 'under_review', 'accepted', 'converted', 'in_progress', 'waiting', 'completed', 'rejected']

const STATUS_TONE: Record<RequestStatus, string> = {
  new: 'bg-sky-500/15 text-sky-600',
  under_review: 'bg-amber-500/15 text-amber-600',
  accepted: 'bg-violet-500/15 text-violet-600',
  converted: 'bg-emerald-500/15 text-emerald-600',
  in_progress: 'bg-indigo-500/15 text-indigo-600',
  waiting: 'bg-orange-500/15 text-orange-600',
  completed: 'bg-emerald-500/20 text-emerald-700',
  rejected: 'bg-red-500/15 text-red-600',
  archived: 'bg-slate-500/15 text-slate-600',
}

export default function RequestsPage() {
  const { data: requests = [], isLoading } = useRequests()
  const [tab, setTab] = useState<RequestStatus | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<RequestRecord | null>(null)
  const [converting, setConverting] = useState<RequestRecord | null>(null)

  const filtered = useMemo(() => {
    let list = tab === 'all' ? requests : requests.filter((r) => r.status === tab)
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
    return list
  }, [requests, tab, search])

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Requests</h1>
          <p className="text-xs text-muted-foreground">{requests.length} total · {requests.filter((r) => r.status === 'new').length} new</p>
        </div>
        <div className="glass flex items-center gap-1.5 rounded-xl px-2.5 py-1.5">
          <Search size={14} className="text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, phone, requirement…"
            className="w-56 bg-transparent text-xs outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      <div className="glass mb-4 flex flex-wrap gap-1 rounded-xl p-1">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => setTab(s)}
            className={cn(
              'rounded-lg px-2.5 py-1 text-xs font-medium transition-colors',
              tab === s ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5',
            )}
          >
            {s === 'all' ? 'All' : REQUEST_STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading requests…</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <button key={r.id} onClick={() => setSelected(r)} className="glass rounded-2xl p-3.5 text-left">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-medium uppercase text-muted-foreground">{r.request_code}</span>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_TONE[r.status])}>{REQUEST_STATUS_LABELS[r.status]}</span>
              </div>
              <p className="mb-1 truncate text-sm font-semibold" title={r.name_snapshot}>{r.name_snapshot}</p>
              <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{r.requirement}</p>
              {r.target && <p className="mb-1 truncate text-[11px] text-muted-foreground">Target: {r.target}</p>}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{formatSmartDate(r.created_at, true)}</span>
                {r.deadline && <span>Due {formatSmartDate(r.deadline)}</span>}
              </div>
            </button>
          ))}
          {filtered.length === 0 && <p className="text-sm text-muted-foreground">No requests in this view.</p>}
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
