import { useState } from 'react'
import { Plus, Mic, Sparkles, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCreateActionItem } from '@/hooks/useActionItems'
import { useCommunities, useProfiles } from '@/hooks/useCommunities'
import { useSpeechRecognition } from '@/features/voice/useSpeechRecognition'
import { parseSpokenAction } from '@/lib/ai/localParser'
import { PriorityStars } from '@/components/PriorityStars'
import type { AIActionExtraction, Community, Profile } from '@/types'
import { toast } from 'sonner'

export function QuickCreate() {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [communityId, setCommunityId] = useState('')
  const [priority, setPriority] = useState(5)
  const [deadline, setDeadline] = useState('')
  const [followUpId, setFollowUpId] = useState('')
  const [aiPreview, setAiPreview] = useState<AIActionExtraction | null>(null)

  const { data: communities = [] } = useCommunities()
  const { data: profiles = [] } = useProfiles()
  const create = useCreateActionItem()
  const voice = useSpeechRecognition()
  const aiVoice = useSpeechRecognition()

  const reset = () => {
    setTitle(''); setCommunityId(''); setPriority(5); setDeadline(''); setFollowUpId(''); setAiPreview(null)
  }

  const submit = () => {
    if (!title.trim()) return
    create.mutate({
      title: title.trim(),
      community_id: communityId || null,
      priority,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      follow_up_person_id: followUpId || null,
    })
    toast.success('Action item created')
    reset()
    setOpen(false)
  }

  const runAiParse = (text: string) => {
    const extraction = parseSpokenAction(text, communities as Community[], (profiles ?? []) as Profile[])
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
        className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-3.5 py-2 text-sm font-semibold text-white shadow-md shadow-violet-500/25 transition-transform active:scale-95"
      >
        <Plus size={16} /> New Action
      </button>
    )
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.97 }}
        className="glass-strong absolute right-4 top-16 z-50 w-96 rounded-2xl p-4"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">New action item</h3>
          <button onClick={() => { setOpen(false); reset() }}><X size={16} /></button>
        </div>

        <div className="mb-3 flex gap-2">
          <button
            onClick={() => voice.listening ? voice.stop() : voice.start((text) => setTitle(text))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors ${voice.listening ? 'border-sky-400 bg-sky-500/10 text-sky-600' : 'border-border bg-white/50 dark:bg-white/5'}`}
          >
            <Mic size={14} /> {voice.listening ? 'Listening…' : 'Voice Note'}
          </button>
          <button
            onClick={() => aiVoice.listening ? aiVoice.stop() : aiVoice.start((text) => runAiParse(text))}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl border py-2 text-xs font-medium transition-colors ${aiVoice.listening ? 'border-fuchsia-400 bg-fuchsia-500/10 text-fuchsia-600' : 'border-violet-300/60 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 text-violet-600'}`}
          >
            <Sparkles size={14} /> {aiVoice.listening ? 'Listening…' : 'AI Create'}
          </button>
        </div>
        {!voice.supported && <p className="mb-2 text-[10px] text-muted-foreground">Voice input isn't supported in this browser — type instead.</p>}

        {aiPreview && (
          <div className="mb-3 rounded-xl border border-violet-300/50 bg-violet-500/5 p-2.5 text-xs">
            <p className="mb-1 font-semibold text-violet-600">AI understood ({Math.round(aiPreview.confidence * 100)}% confidence)</p>
            <p>Review the fields below and adjust before creating.</p>
          </div>
        )}

        <div className="space-y-2.5">
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title (required)"
            className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 dark:bg-white/5"
          />
          <div className="flex gap-2">
            <select value={communityId} onChange={(e) => setCommunityId(e.target.value)} className="flex-1 rounded-xl border border-border bg-white/70 px-2 py-2 text-xs dark:bg-white/5">
              <option value="">No community</option>
              {(communities as Community[]).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select value={followUpId} onChange={(e) => setFollowUpId(e.target.value)} className="flex-1 rounded-xl border border-border bg-white/70 px-2 py-2 text-xs dark:bg-white/5">
              <option value="">No follow-up</option>
              {(profiles ?? []).map((p: Profile) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
            </select>
          </div>
          <input
            type="datetime-local"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-xs dark:bg-white/5"
          />
          <div className="flex items-center justify-between rounded-xl border border-border bg-white/50 px-3 py-2 dark:bg-white/5">
            <span className="text-xs text-muted-foreground">Priority</span>
            <PriorityStars value={priority} onChange={setPriority} />
          </div>
        </div>

        <button
          onClick={submit}
          disabled={!title.trim()}
          className="mt-3 w-full rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 py-2.5 text-sm font-semibold text-white shadow-md disabled:opacity-50"
        >
          Create Action
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
