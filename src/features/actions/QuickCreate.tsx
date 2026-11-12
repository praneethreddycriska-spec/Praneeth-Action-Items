import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Mic, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateActionItem } from '@/hooks/useActionItems'
import { useCommunities, useProfiles } from '@/hooks/useCommunities'
import { useSpeechRecognition } from '@/features/voice/useSpeechRecognition'
import { parseSpokenActionWithGroq } from '@/lib/ai/groqParser'
import { PriorityStars } from '@/components/PriorityStars'
import type { AIActionExtraction, ActionStatus, Community, Profile } from '@/types'
import { toast } from 'sonner'

export function QuickCreate() {
  const [open, setOpen] = useState(false)
  const [presetStatus, setPresetStatus] = useState<ActionStatus | undefined>(undefined)
  const [params, setParams] = useSearchParams()

  useEffect(() => {
    if (params.get('new') !== '1') return
    const st = params.get('status') as ActionStatus | null
    setPresetStatus(st ?? undefined)
    setOpen(true)
    const next = new URLSearchParams(params)
    next.delete('new'); next.delete('status')
    setParams(next, { replace: true })
  }, [params, setParams])

  const [title, setTitle] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [priority, setPriority] = useState(5)
  const [deadline, setDeadline] = useState('')
  const [followUpId, setFollowUpId] = useState('')
  const [raisedBy, setRaisedBy] = useState('')
  const [aiPreview, setAiPreview] = useState<AIActionExtraction | null>(null)

  const { data: communities = [] } = useCommunities()
  const { data: profiles = [] } = useProfiles()
  const create = useCreateActionItem()
  const voice = useSpeechRecognition()
  const aiVoice = useSpeechRecognition()

  const reset = () => {
    setTitle(''); setCommunityId(''); setPriority(5); setDeadline(''); setFollowUpId(''); setRaisedBy(''); setAiPreview(null)
  }

  const submit = () => {
    if (!title.trim()) return
    create.mutate({
      title: title.trim(),
      status: presetStatus,
      community_id: communityId || null,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      follow_up_person_id: followUpId || null,
      requested_by_name: raisedBy.trim() || null,
    })
    toast.success('Action item created')
    reset()
    setOpen(false)
  }

  const [aiBusy, setAiBusy] = useState(false)
  const [aiSource, setAiSource] = useState<'groq' | 'local' | null>(null)

  const runAiParse = async (text: string) => {
    setAiBusy(true)
    const extraction = await parseSpokenActionWithGroq(text, communities as Community[], (profiles ?? []) as Profile[])
    setAiBusy(false)
    setAiSource(extraction.source)
    setAiPreview(extraction)
    setTitle(extraction.title)
    if (extraction.priority !== undefined) setPriority(extraction.priority)
    if (extraction.deadline) setDeadline(extraction.deadline.slice(0, 16))
    if (extraction.community) {
      const c = (communities as Community[]).find((x) => x.name === extraction.community)
      if (c) setCommunityId(c.id)
    }
    if (extraction.follow_up_person) {
      const p = (profiles ?? []).find((x: Profile) => x.full_name === extraction.follow_up_person)
      if (p) setFollowUpId(p.id)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full accent-gradient px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-95"
      >
        <Plus size={16} /> New action
      </button>
    )
  }

  return (
    <AnimatePresence>
      <div key="qc-backdrop" className="fixed inset-0 z-50 bg-black/50" onClick={() => { setOpen(false); reset() }} />
      <div key="qc-wrap" className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.97 }}
        className="glass-strong pointer-events-auto max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-[2rem] p-5"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">New action item</h3>
          <button onClick={() => { setOpen(false); reset() }}><X size={16} /></button>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => voice.listening ? voice.stop() : voice.start((text) => setTitle(text))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors ${voice.listening ? 'border-primary bg-primary/15 text-ink' : 'border-border bg-foreground/5 '}`}
          >
            <Mic size={14} /> {voice.listening ? 'Listening…' : 'Voice Note'}
          </button>
          <button
            onClick={() => aiVoice.listening ? aiVoice.stop() : aiVoice.start((text) => runAiParse(text))}
            disabled={aiBusy}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors disabled:opacity-60 ${aiVoice.listening ? 'border-primary bg-primary/15 text-ink' : 'border-primary/40 bg-primary/10 text-ink'}`}
          >
            <Sparkles size={14} /> {aiVoice.listening ? 'Listening…' : aiBusy ? 'Thinking…' : 'AI Create'}
          </button>
        </div>
        {!voice.supported && <p className="mb-2 text-[10px] text-muted-foreground">Voice input isn't supported in this browser — type instead.</p>}

        {aiPreview && (
          <div className="mb-3 rounded-xl border border-primary/30 bg-primary/10 p-2.5 text-xs">
            <p className="mb-1 font-semibold text-ink">
              AI understood ({Math.round(aiPreview.confidence * 100)}% confidence · {aiSource === 'groq' ? 'Groq' : 'local parser'})
            </p>
            <p>Review the fields below and adjust before creating.</p>
          </div>
        )}

        <div className="space-y-2.5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (required)"
            className="w-full rounded-xl border border-border bg-foreground/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 "
          />
          <input
            value={raisedBy}
            onChange={(e) => setRaisedBy(e.target.value)}
            placeholder="Raised by (who asked for this?)"
            className="w-full rounded-xl border border-border bg-foreground/5 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 "
          />
          <div className="flex gap-2">
            <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} className="flex-1 rounded-xl border border-border bg-foreground/5 px-2 py-2 text-xs ">
              <option value="">No community</option>
              {(communities as Community[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={followUpId} onChange={(e) => setFollowUpId(e.target.value)} className="flex-1 rounded-xl border border-border bg-foreground/5 px-2 py-2 text-xs ">
              <option value="">No follow-up</option>
              {(profiles ?? []).map((p: Profile) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-border bg-foreground/5 px-3 py-2 text-xs "
          />
          <div className="flex items-center justify-between rounded-xl border border-border bg-foreground/5 px-3 py-2 ">
            <span className="text-xs text-muted-foreground">Priority</span>
            <PriorityStars value={priority} onChange={setPriority} />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim()}
          className="mt-3 w-full rounded-full accent-gradient py-3 text-sm font-semibold disabled:opacity-50"
        >
          Create Action
        </button>
      </motion.div>
      </div>
    </AnimatePresence>
  )
}
