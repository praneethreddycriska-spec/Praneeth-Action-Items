import { motion, AnimatePresence } from 'framer-motion'
import { format } from 'date-fns'
import { X } from 'lucide-react'
import type { RequestRecord, RequestStatus } from '@/types'
import { REQUEST_STATUS_LABELS } from '@/types'
import { useLinkedActionItems, useUpdateRequest } from '@/hooks/useRequests'
import { PriorityStars } from '@/components/PriorityStars'
import { STATUS_LABELS } from '@/types'

const STATUS_OPTIONS: RequestStatus[] = ['new', 'under_review', 'accepted', 'converted', 'in_progress', 'waiting', 'completed', 'rejected', 'archived']

export function RequestDetailDrawer({ request, onClose, onConvert }: { request: RequestRecord | null; onClose: () => void; onConvert: () => void }) {
  const { data: linkedActions = [] } = useLinkedActionItems(request?.id ?? null)
  const update = useUpdateRequest()

  if (!request) return null

  return (
    <AnimatePresence>
      <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/25" onClick={onClose} />
      <motion.div
        key="drawer"
        initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="glass-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-hidden rounded-l-3xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <div>
            <p className="text-[11px] font-medium uppercase text-muted-foreground">{request.request_code}</p>
            <h3 className="text-base font-semibold">{request.name_snapshot}</h3>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="flex items-center gap-2">
            <select
              value={request.status}
              onChange={(e) => update.mutate({ id: request.id, status: e.target.value as RequestStatus })}
              className="rounded-lg border border-border bg-white/70 px-2 py-1 text-xs dark:bg-white/5"
            >
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{REQUEST_STATUS_LABELS[s]}</option>)}
            </select>
            {request.status === 'new' || request.status === 'under_review' || request.status === 'accepted' ? (
              <button onClick={onConvert} className="rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3 py-1 text-xs font-semibold text-white">
                Convert to Action
              </button>
            ) : null}
          </div>

          <section>
            <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Requester</h4>
            <div className="space-y-0.5 text-sm">
              <p>{request.name_snapshot}</p>
              {request.email_snapshot && <p className="text-muted-foreground">{request.email_snapshot}</p>}
              {request.phone_snapshot && <p className="text-muted-foreground">{request.phone_snapshot}</p>}
              {request.organization && <p className="text-muted-foreground">{request.organization}</p>}
              {request.location && <p className="text-muted-foreground">{request.location}</p>}
            </div>
          </section>

          <section>
            <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Requirement</h4>
            <p className="text-sm">{request.requirement}</p>
          </section>

          {request.target && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Target</h4>
              <p className="text-sm">{request.target}</p>
            </section>
          )}

          {request.expected_output && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Expected Output</h4>
              <p className="text-sm">{request.expected_output}</p>
            </section>
          )}

          <section>
            <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Timeline</h4>
            <p className="text-sm">Submitted: {format(new Date(request.created_at), 'MMM d, yyyy HH:mm')}</p>
            {request.deadline && <p className="text-sm">Deadline: {format(new Date(request.deadline), 'MMM d, yyyy')}</p>}
          </section>

          {request.additional_details && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Additional Details</h4>
              <p className="text-sm">{request.additional_details}</p>
            </section>
          )}

          {linkedActions.length > 0 && (
            <section>
              <h4 className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">Linked Action Items</h4>
              <div className="space-y-1.5">
                {linkedActions.map((a) => (
                  <div key={a.id} className="rounded-lg bg-white/50 p-2 text-xs dark:bg-white/5">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{a.title}</span>
                      <span className="text-[10px] uppercase text-muted-foreground">{STATUS_LABELS[a.status]}</span>
                    </div>
                    <PriorityStars value={a.priority} size={10} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
