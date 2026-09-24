import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import type { ActionItem, ActionStatus } from '@/types'
import { STATUS_LABELS, STATUS_ORDER } from '@/types'
import { useAddComment, useComments, useActivity, useUpdateActionItem, useDeleteActionItem } from '@/hooks/useActionItems'
import { useCommunities, useProfiles } from '@/hooks/useCommunities'
import { PriorityStars } from '@/components/PriorityStars'
import { useAuth } from '@/hooks/useAuth'

export function ActionDetailDrawer({ item, onClose }: { item: ActionItem | null; onClose: () => void }) {
  const { user } = useAuth()
  const [commentText, setCommentText] = useState('')
  const [actualOutput, setActualOutput] = useState(item?.actual_output ?? '')
  const { data: comments = [] } = useComments(item?.id ?? null)
  const { data: activity = [] } = useActivity(item?.id ?? null)
  const { data: communities = [] } = useCommunities()
  const { data: profiles = [] } = useProfiles()
  const update = useUpdateActionItem()
  const del = useDeleteActionItem()
  const addComment = useAddComment()

  if (!item) return null

  const patch = (fields: Partial<ActionItem>, activityLabel?: string) => {
    update.mutate({ id: item.id, ...fields, activity: activityLabel ? { type: 'edited', detail: activityLabel } : undefined })
  }

  return (
    <AnimatePresence>
      <motion.div key="overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/25" onClick={onClose} />
      <motion.div
        key="drawer"
        initial={{ x: 480 }} animate={{ x: 0 }} exit={{ x: 480 }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
        className="glass-strong fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col overflow-hidden rounded-l-3xl"
      >
        <div className="flex items-center justify-between border-b border-border/60 p-4">
          <input
            defaultValue={item.title}
            onBlur={(e) => e.target.value !== item.title && patch({ title: e.target.value }, 'title changed')}
            className="flex-1 bg-transparent text-base font-semibold outline-none"
          />
          <button onClick={onClose}><X size={18} /></button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={item.status}
              onChange={(e) => patch({ status: e.target.value as ActionStatus }, `status → ${e.target.value}`)}
              className="rounded-lg border border-border bg-white/70 px-2 py-1 text-xs dark:bg-white/5"
            >
              {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select
              value={item.community_id ?? ''}
              onChange={(e) => patch({ community_id: e.target.value || null }, 'community changed')}
              className="rounded-lg border border-border bg-white/70 px-2 py-1 text-xs dark:bg-white/5"
            >
              <option value="">No community</option>
              {communities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Priority</label>
            <PriorityStars value={item.priority} onChange={(v) => patch({ priority: v }, `priority → ${v}`)} size={16} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Deadline</label>
              <input
                type="datetime-local"
                defaultValue={item.deadline ? item.deadline.slice(0, 16) : ''}
                onBlur={(e) => patch({ deadline: e.target.value ? new Date(e.target.value).toISOString() : null }, 'deadline changed')}
                className="w-full rounded-lg border border-border bg-white/70 px-2 py-1.5 text-xs dark:bg-white/5"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Follow-up person</label>
              <select
                value={item.follow_up_person_id ?? ''}
                onChange={(e) => patch({ follow_up_person_id: e.target.value || null }, 'follow-up changed')}
                className="w-full rounded-lg border border-border bg-white/70 px-2 py-1.5 text-xs dark:bg-white/5"
              >
                <option value="">Unassigned</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Description</label>
            <textarea
              defaultValue={item.description ?? ''}
              onBlur={(e) => patch({ description: e.target.value }, 'description changed')}
              rows={2}
              className="w-full resize-none rounded-lg border border-border bg-white/70 px-2 py-1.5 text-xs dark:bg-white/5"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Expected output</label>
              <textarea
                defaultValue={item.expected_output ?? ''}
                onBlur={(e) => patch({ expected_output: e.target.value }, 'expected output changed')}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-white/70 px-2 py-1.5 text-xs dark:bg-white/5"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Actual output / result</label>
              <textarea
                value={actualOutput}
                onChange={(e) => setActualOutput(e.target.value)}
                onBlur={() => patch({ actual_output: actualOutput }, 'output recorded')}
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-white/70 px-2 py-1.5 text-xs dark:bg-white/5"
              />
            </div>
          </div>

          {/* Comments */}
          <div>
            <h4 className="mb-2 text-xs font-semibold">Comments</h4>
            <div className="mb-2 max-h-40 space-y-2 overflow-y-auto">
              {comments.map((c) => (
                <div key={c.id} className="rounded-lg bg-white/50 p-2 text-xs dark:bg-white/5">
                  <div className="mb-0.5 flex items-center justify-between">
                    <span className="font-medium">{c.user?.full_name ?? 'Someone'}</span>
                    <span className="text-[10px] text-muted-foreground">{format(new Date(c.created_at), 'MMM d, HH:mm')}</span>
                  </div>
                  <p>{c.body}</p>
                </div>
              ))}
              {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
            </div>
            <div className="flex gap-1.5">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && commentText.trim()) {
                    addComment.mutate({ actionItemId: item.id, body: commentText.trim() })
                    setCommentText('')
                  }
                }}
                placeholder={user ? 'Add a comment…' : 'Sign in to comment'}
                className="flex-1 rounded-lg border border-border bg-white/70 px-2 py-1.5 text-xs dark:bg-white/5"
              />
              <button
                onClick={() => { if (commentText.trim()) { addComment.mutate({ actionItemId: item.id, body: commentText.trim() }); setCommentText('') } }}
                className="rounded-lg bg-primary px-2 text-primary-foreground"
              ><Send size={14} /></button>
            </div>
          </div>

          {/* Activity */}
          <div>
            <h4 className="mb-2 text-xs font-semibold">Activity</h4>
            <div className="space-y-1.5 text-[11px] text-muted-foreground">
              {activity.map((a) => (
                <div key={a.id} className="flex justify-between">
                  <span>{a.user?.full_name ?? 'System'} · {a.action.replace('_', ' ')}{a.details?.detail ? `: ${a.details.detail}` : ''}</span>
                  <span>{format(new Date(a.created_at), 'MMM d, HH:mm')}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 p-3">
          <button
            onClick={() => { del.mutate(item.id); onClose() }}
            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <Trash2 size={13} /> Archive
          </button>
          {item.status !== 'completed' && (
            <button
              onClick={() => patch({ status: 'completed' }, 'marked completed')}
              className="rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white"
            >
              Mark Complete
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
