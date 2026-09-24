import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import type { RequestRecord, RequestStatus } from '@/types'
import { REQUEST_STATUS_LABELS } from '@/types'
import { useRequests } from '@/hooks/useRequests'
import { RequestDetailDrawer } from '@/features/requests/RequestDetailDrawer'
import { ConvertToActionModal } from '@/features/requests/ConvertToActionModal'
import { cn } from '@/lib/utils'

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
  const [selected, setSelected] = useState<RequestRecord | null>(null)
  const [converting, setConverting] = useState<RequestRecord | null>(null)

  const filtered = useMemo(() => (tab === 'all' ? requests : requests.filter((r) => r.status === tab)), [requests, tab])

  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">Requests</h1>
          <p className="text-xs text-muted-foreground">{requests.length} total · {requests.filter((r) => r.status === 'new').length} new</p>
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
              <p className="mb-1 text-sm font-semibold">{r.name_snapshot}</p>
              <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{r.requirement}</p>
              {r.target && <p className="mb-1 truncate text-[11px] text-muted-foreground">Target: {r.target}</p>}
              <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                <span>{format(new Date(r.created_at), 'MMM d, HH:mm')}</span>
                {r.deadline && <span>Due {format(new Date(r.deadline), 'MMM d')}</span>}
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
