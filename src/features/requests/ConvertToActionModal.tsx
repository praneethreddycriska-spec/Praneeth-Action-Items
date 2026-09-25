import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { toast } from 'sonner'
import type { RequestRecord } from '@/types'
import { useCommunities, useProfiles } from '@/hooks/useCommunities'
import { useCreateActionItem } from '@/hooks/useActionItems'
import { useUpdateRequest } from '@/hooks/useRequests'
import { useAuth } from '@/hooks/useAuth'
import { PriorityStars } from '@/components/PriorityStars'

export function ConvertToActionModal({ request, onClose }: { request: RequestRecord; onClose: () => void }) {
  const { profile } = useAuth()
  const { data: communities = [] } = useCommunities()
  const { data: profiles = [] } = useProfiles()
  const createAction = useCreateActionItem()
  const updateRequest = useUpdateRequest()

  const [title, setTitle] = useState(request.requirement.slice(0, 120))
  const [communityId, setCommunityId] = useState(request.community_id ?? '')
  const [priority, setPriority] = useState(5)
  const [ownerId, setOwnerId] = useState(profile?.id ?? '')
  const [followUpId, setFollowUpId] = useState('')
  const [deadline, setDeadline] = useState(request.deadline ? request.deadline.slice(0, 16) : '')

  const submit = async () => {
    if (!title.trim()) return
    const action = await createAction.mutateAsync({
      title: title.trim(),
      description: request.additional_details ?? undefined,
      community_id: communityId || null,
      priority,
      owner_id: ownerId || null,
      follow_up_person_id: followUpId || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      expected_output: request.expected_output ?? undefined,
      source_request_id: request.id,
      requested_by_name: request.name_snapshot,
    })
    await updateRequest.mutateAsync({
      id: request.id,
      status: 'converted',
      community_id: communityId || null,
      converted_at: new Date().toISOString(),
    })
    toast.success(`Action item created from ${request.request_code}`)
    onClose()
    return action
  }

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96, y: 10 }}
        className="glass-strong fixed left-1/2 top-1/2 z-[60] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-3xl p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Convert to Action Item</h3>
            <p className="text-[11px] text-muted-foreground">From {request.request_code} · {request.name_snapshot}</p>
          </div>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="mb-3 rounded-xl bg-secondary/50 p-2.5 text-xs">
          <p className="font-medium">Requirement</p>
          <p className="text-muted-foreground">{request.requirement}</p>
          {request.target && <p className="mt-1"><span className="font-medium">Target:</span> <span className="text-muted-foreground">{request.target}</span></p>}
        </div>

        <div className="space-y-2.5">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Action title" className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5" />

          <div className="rounded-xl border border-border bg-white/50 px-3 py-2 text-xs text-muted-foreground dark:bg-white/5">
            Raised by: <span className="font-medium text-foreground">{request.name_snapshot}</span>
          </div>

          <div className="flex gap-2">
            <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} className="flex-1 rounded-xl border border-border bg-white/70 px-2 py-2 text-xs dark:bg-white/5">
              <option value="">No community</option>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="flex-1 rounded-xl border border-border bg-white/70 px-2 py-2 text-xs dark:bg-white/5">
              <option value="">No owner</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>

          <div className="flex gap-2">
            <select value={followUpId} onChange={(e) => setFollowUpId(e.target.value)} className="flex-1 rounded-xl border border-border bg-white/70 px-2 py-2 text-xs dark:bg-white/5">
              <option value="">No follow-up</option>
              {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
            <input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="flex-1 rounded-xl border border-border bg-white/70 px-2 py-2 text-xs dark:bg-white/5" />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-white/50 px-3 py-2 dark:bg-white/5">
            <span className="text-xs text-muted-foreground">Priority</span>
            <PriorityStars value={priority} onChange={setPriority} />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim() || createAction.isPending}
          className="mt-4 w-full rounded-xl accent-gradient py-2.5 text-sm font-semibold shadow-md disabled:opacity-50"
        >
          {createAction.isPending ? 'Creating…' : 'Create Action Item'}
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
