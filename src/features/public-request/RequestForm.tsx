import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { requestFormSchema, type RequestFormValues } from './schema'
import { submitPublicRequest } from '@/lib/supabase/requests'
import { supabase } from '@/lib/supabase/client'
import type { Organization } from '@/types'

const OTHER_ORG = '__other__'

const EMPTY: RequestFormValues = {
  name: '', email: '', phone: '', organization: '', location: '',
  requirement: '', target: '', expected_output: '', deadline: '', start_date: '', additional_details: '',
  urgency: '', dependencies: '', important_instructions: '', reference_links: '',
}

export function RequestForm() {
  const [values, setValues] = useState<RequestFormValues>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof RequestFormValues, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [rawIdea, setRawIdea] = useState('')
  const [showAiHelper, setShowAiHelper] = useState(false)
  const [result, setResult] = useState<{ request_code: string } | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [orgSelection, setOrgSelection] = useState('')
  const [orgOther, setOrgOther] = useState('')

  useEffect(() => {
    supabase.from('organizations').select('*').order('name').then(({ data }) => {
      if (data) setOrganizations(data as Organization[])
    })
  }, [])

  const set = <K extends keyof RequestFormValues>(key: K, value: RequestFormValues[K]) =>
    setValues((v) => ({ ...v, [key]: value }))

  const runAiHelper = async () => {
    if (!rawIdea.trim()) return
    setAiBusy(true)
    try {
      const { data, error } = await supabase.rpc('ai_structure_request', { p_text: rawIdea.trim() })
      if (error) throw error
      const r = data as { requirement?: string; target?: string; expected_output?: string; additional_details?: string }
      if (r.requirement) set('requirement', r.requirement)
      if (r.target) set('target', r.target)
      if (r.expected_output) set('expected_output', r.expected_output)
      if (r.additional_details) set('additional_details', r.additional_details)
    } catch {
      // AI assist failed — keep the user's raw text so nothing is lost.
      set('requirement', rawIdea.trim())
    } finally {
      setAiBusy(false)
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = requestFormSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof RequestFormValues, string>> = {}
      for (const issue of parsed.error.issues) fieldErrors[issue.path[0] as keyof RequestFormValues] = issue.message
      setErrors(fieldErrors)
      const firstKey = parsed.error.issues[0]?.path[0] as string | undefined
      const firstField = firstKey ? document.querySelector<HTMLElement>(`[name="${firstKey}"]`) : null
      if (firstField) {
        firstField.scrollIntoView({ behavior: 'smooth', block: 'center' })
        firstField.focus()
      }
      toast.error('Please fill in the required fields highlighted below')
      return
    }
    setErrors({})
    setSubmitError(null)
    setSubmitting(true)
    try {
      const res = await submitPublicRequest({
        ...parsed.data,
        deadline: parsed.data.deadline ? new Date(parsed.data.deadline).toISOString() : null,
        start_date: parsed.data.start_date ? new Date(parsed.data.start_date).toISOString() : null,
      })
      setResult(res)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Something went wrong — please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (result) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        className="glass-strong mx-auto max-w-md rounded-3xl p-8 text-center"
      >
        <CheckCircle2 className="mx-auto mb-3 text-emerald-500" size={44} />
        <h2 className="mb-1 text-xl font-semibold">Request Submitted Successfully</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Your requirement has been received successfully. Please keep your Request ID for reference.
        </p>
        <div className="mb-4 rounded-2xl bg-primary/10 py-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Request ID</p>
          <p className="text-lg font-bold text-primary">{result.request_code}</p>
        </div>
        <button
          onClick={() => { setResult(null); setValues(EMPTY); setRawIdea(''); setShowAiHelper(false); setOrgSelection(''); setOrgOther('') }}
          className="rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 px-4 py-2 text-sm font-semibold text-white"
        >
          Submit another request
        </button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-strong mx-auto max-w-xl rounded-3xl p-6 sm:p-8">
      <h1 className="mb-1 text-2xl font-semibold">Submit Your Requirement</h1>
      <p className="mb-6 text-sm text-muted-foreground">Tell us what you need, your target, and any important deadline or details.</p>

      {!showAiHelper ? (
        <button
          type="button"
          onClick={() => setShowAiHelper(true)}
          className="mb-6 flex items-center gap-1.5 rounded-xl border border-violet-300/60 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 px-3 py-2 text-xs font-medium text-violet-600"
        >
          <Sparkles size={14} /> Help me describe my requirement
        </button>
      ) : (
        <div className="mb-6 rounded-2xl border border-violet-300/50 bg-violet-500/5 p-3">
          <label className="mb-1 block text-xs font-medium text-violet-700">Just describe it in your own words</label>
          <textarea
            value={rawIdea}
            onChange={(e) => setRawIdea(e.target.value)}
            rows={3}
            placeholder="e.g. I don't know exactly how to explain what I need…"
            className="mb-2 w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5"
          />
          <button
            type="button"
            onClick={runAiHelper}
            disabled={aiBusy || !rawIdea.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-violet-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
          >
            {aiBusy ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
            {aiBusy ? 'Structuring…' : 'Fill in the fields below'}
          </button>
          <p className="mt-2 text-[10px] text-muted-foreground">This only fills the fields below — nothing is submitted yet. Review and edit before submitting.</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-5">
        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Personal Information</legend>
          <Field label="Full Name" required error={errors.name}>
            <input name="name" value={values.name} onChange={(e) => set('name', e.target.value)} className={inputClass} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Email" required error={errors.email}>
              <input name="email" type="email" value={values.email} onChange={(e) => set('email', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Phone / WhatsApp">
              <input type="tel" inputMode="tel" value={values.phone} onChange={(e) => set('phone', e.target.value)} className={inputClass} />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Organization / Company">
              <select
                value={orgSelection}
                onChange={(e) => {
                  const v = e.target.value
                  setOrgSelection(v)
                  if (v === OTHER_ORG) {
                    set('organization', orgOther)
                  } else {
                    set('organization', v)
                  }
                }}
                className={inputClass}
              >
                <option value="">None</option>
                {organizations.map((o) => <option key={o.id} value={o.name}>{o.name}</option>)}
                <option value={OTHER_ORG}>Other (type below)</option>
              </select>
              {orgSelection === OTHER_ORG && (
                <input
                  value={orgOther}
                  onChange={(e) => { setOrgOther(e.target.value); set('organization', e.target.value) }}
                  placeholder="Your organization / company name"
                  className={`${inputClass} mt-2`}
                />
              )}
            </Field>
            <Field label="Location">
              <input value={values.location} onChange={(e) => set('location', e.target.value)} className={inputClass} />
            </Field>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requirement</legend>
          <Field label="What do you need?" required error={errors.requirement}>
            <textarea name="requirement" value={values.requirement} onChange={(e) => set('requirement', e.target.value)} rows={3} className={inputClass} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target</legend>
          <Field label="What are you trying to achieve?" required error={errors.target}>
            <input name="target" value={values.target} onChange={(e) => set('target', e.target.value)} className={inputClass} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Expected Outcome</legend>
          <Field label="What result are you expecting?">
            <textarea value={values.expected_output} onChange={(e) => set('expected_output', e.target.value)} rows={2} className={inputClass} />
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Preferred deadline">
              <input type="date" value={values.deadline} onChange={(e) => set('deadline', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Preferred start date">
              <input type="date" value={values.start_date} onChange={(e) => set('start_date', e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Field label="How urgent is this?">
            <select value={values.urgency} onChange={(e) => set('urgency', e.target.value as RequestFormValues['urgency'])} className={inputClass}>
              <option value="">Not specified</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </Field>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Additional Information</legend>
          <Field label="Additional notes">
            <textarea value={values.additional_details} onChange={(e) => set('additional_details', e.target.value)} rows={2} className={inputClass} />
          </Field>
          <Field label="Dependencies">
            <textarea value={values.dependencies} onChange={(e) => set('dependencies', e.target.value)} rows={2} placeholder="Anything this depends on, or that needs to happen first" className={inputClass} />
          </Field>
          <Field label="Important instructions">
            <textarea value={values.important_instructions} onChange={(e) => set('important_instructions', e.target.value)} rows={2} className={inputClass} />
          </Field>
          <Field label="Reference links">
            <input value={values.reference_links} onChange={(e) => set('reference_links', e.target.value)} placeholder="Links to designs, docs, examples…" className={inputClass} />
          </Field>
        </fieldset>

        {submitError && <p className="text-sm text-destructive">{submitError}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/30 transition-transform active:scale-[0.99] disabled:opacity-60"
        >
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </motion.div>
  )
}

const inputClass = 'w-full rounded-xl border border-border bg-white/70 px-3 py-2.5 text-sm outline-none ring-primary/40 focus:ring-2 dark:bg-white/5'

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-foreground/80">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      {children}
      {error && <span className="mt-1 block text-[11px] text-destructive">{error}</span>}
    </label>
  )
}
