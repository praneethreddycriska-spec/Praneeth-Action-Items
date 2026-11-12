import { useMemo, useState } from 'react'
import { Plus, Copy, Power, KeyRound, X, Pencil, Trash2, Users2, UserCheck, AlarmClock } from 'lucide-react'
import { toast } from 'sonner'
import {
  useTeamMembers, useInviteTeamMember, useSetTeamMemberActive, useResetTeamMemberPassword,
  useMemberCommunities, useSetMemberCommunity, useUpdateTeamMember, useDeleteTeamMember,
} from '@/hooks/useTeam'
import { useCommunities } from '@/hooks/useCommunities'
import { useActionItems } from '@/hooks/useActionItems'
import { getDeadlineState } from '@/utils/deadline'
import type { Profile } from '@/types'
import { Avatar } from '@/components/Avatar'
import { CountUp } from '@/components/motion'

export default function TeamPage() {
  const { data: members = [] } = useTeamMembers()
  const { data: items = [] } = useActionItems()
  const invite = useInviteTeamMember()
  const setActive = useSetTeamMemberActive()
  const resetPassword = useResetTeamMemberPassword()
  const [isReset, setIsReset] = useState(false)
  const deleteMember = useDeleteTeamMember()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [inviteLink, setInviteLink] = useState<string | null>(null)
  const [invitedName, setInvitedName] = useState<string | null>(null)
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)
  const [inviteLinkError, setInviteLinkError] = useState<string | null>(null)
  const [managingAccess, setManagingAccess] = useState<Profile | null>(null)
  const [editing, setEditing] = useState<Profile | null>(null)
  const [deleting, setDeleting] = useState<Profile | null>(null)

  const stats = useMemo(() => {
    const map = new Map<string, { open: number; completed: number; overdue: number }>()
    for (const item of items) {
      const key = item.owner_id ?? 'none'
      if (!map.has(key)) map.set(key, { open: 0, completed: 0, overdue: 0 })
      const s = map.get(key)!
      if (item.status === 'completed') s.completed++
      else s.open++
      if (getDeadlineState(item) === 'overdue') s.overdue++
    }
    return map
  }, [items])

  const submitInvite = async () => {
    if (!name.trim() || !email.trim()) return
    try {
      const res = await invite.mutateAsync({ email: email.trim(), fullName: name.trim(), phone: phone.trim() || undefined })
      setInviteLink(res.invite_link)
      setInviteLinkError(res.invite_link_error)
      setInvitedName(name.trim())
      setInvitedEmail(email.trim())
      toast.success(`${name} invited`)
      setName(''); setEmail(''); setPhone('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to invite team member')
    }
  }

  const retryLink = async () => {
    if (!invitedEmail) return
    try {
      const link = await resetPassword.mutateAsync(invitedEmail)
      setInviteLink(link)
      setInviteLinkError(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Still failed to generate a link')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteMember.mutateAsync(deleting.id)
      toast.success(`${deleting.full_name} removed`)
      setDeleting(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to remove team member')
    }
  }

  return (
    <div className="h-full overflow-y-auto px-3 pb-8 md:px-6">
      <div className="mb-5 flex flex-wrap items-center gap-x-7 gap-y-3">
        <h1 className="text-[30px] font-light leading-[1.02] tracking-tight md:text-[38px]">Team <br className="hidden md:block" />Directory</h1>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          {[
            { icon: Users2, value: members.length, label: 'Members in your team' },
            { icon: UserCheck, value: members.filter((m) => m.active).length, label: 'Active' },
            { icon: AlarmClock, value: Array.from(stats.values()).reduce((a, x) => a + x.overdue, 0), label: 'Overdue across team' },
          ].map(({ icon: Icon, value, label }) => (
            <div key={label} className="flex items-center gap-2.5">
              <span className="glass flex h-10 w-10 items-center justify-center rounded-full"><Icon size={16} /></span>
              <div><CountUp value={value} className="block text-lg font-semibold leading-none" /><span className="text-[11px] text-muted-foreground">{label}</span></div>
            </div>
          ))}
        </div>
        <button
          onClick={() => { setIsReset(false); setOpen(true) }}
          className="ml-auto flex items-center gap-1.5 rounded-full accent-gradient px-4 py-2.5 text-sm font-semibold transition-transform hover:scale-[1.03] active:scale-95"
        ><Plus size={15} /> Add team member</button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {members.map((m, idx) => {
          const s = stats.get(m.id) ?? { open: 0, completed: 0, overdue: 0 }
          const total = s.open + s.completed
          const pct = total ? Math.round((s.completed / total) * 100) : 0
          return (
            <div key={m.id} style={{ animationDelay: `${Math.min(idx, 10) * 40}ms` }} className={`glass lift animate-fade-up rounded-[1.8rem] p-4 ${m.active ? '' : 'opacity-60'}`}>
              <div className="mb-3 flex items-start justify-between">
                <Avatar name={m.full_name} size={48} />
                <span className={`flex items-center gap-1.5 rounded-full bg-foreground/10 px-2.5 py-1 text-[11px] font-medium`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${m.active ? 'bg-emerald-400' : 'bg-zinc-400'}`} />
                  {m.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="truncate text-[15px] font-semibold">{m.full_name}</p>
              <p className="truncate text-[11px] text-muted-foreground">{m.email}</p>
              <p className="mb-3 truncate text-[11px] text-muted-foreground">{m.phone ?? ' '}</p>

              <div className="mb-3 grid grid-cols-3 gap-2 rounded-2xl bg-foreground/5 p-2.5 text-center">
                <div><p className="text-sm font-semibold">{s.open}</p><p className="text-[10px] text-muted-foreground">Open</p></div>
                <div><p className={`text-sm font-semibold ${s.overdue ? 'text-red-400' : ''}`}>{s.overdue}</p><p className="text-[10px] text-muted-foreground">Overdue</p></div>
                <div><p className="text-sm font-semibold">{s.completed}</p><p className="text-[10px] text-muted-foreground">Done</p></div>
              </div>

              <div className="mb-3 flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-foreground/10"><div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${pct}%` }} /></div>
                <span className="text-[10px] font-semibold text-muted-foreground">{pct}%</span>
              </div>

              <div className="flex items-center gap-1.5">
                <button onClick={() => setManagingAccess(m)} className="flex-1 rounded-full bg-foreground/10 px-2 py-1.5 text-[11px] font-medium transition hover:bg-foreground/20">Communities</button>
                <button onClick={() => setEditing(m)} title="Edit" aria-label="Edit" className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 transition hover:bg-foreground/20"><Pencil size={13} /></button>
                <button
                  onClick={async () => {
                    try {
                      const link = await resetPassword.mutateAsync(m.email ?? '')
                      setIsReset(true); setInvitedName(m.full_name); setInvitedEmail(m.email ?? null); setInviteLink(link); setOpen(true)
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : 'Failed to generate reset link — wait a minute and try again')
                    }
                  }}
                  title="Reset password"
                  aria-label="Reset password"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 transition hover:bg-foreground/20"
                ><KeyRound size={13} /></button>
                <button
                  onClick={() => setActive.mutate({ id: m.id, active: !m.active })}
                  title={m.active ? 'Deactivate' : 'Reactivate'}
                  aria-label={m.active ? 'Deactivate' : 'Reactivate'}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-foreground/10 transition hover:bg-foreground/20"
                ><Power size={13} /></button>
                <button onClick={() => setDeleting(m)} title="Delete" aria-label="Delete" className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/15 text-red-400 transition hover:bg-red-500/25"><Trash2 size={13} /></button>
              </div>
            </div>
          )
        })}
        {members.length === 0 && <p className="glass col-span-full rounded-3xl p-8 text-center text-sm text-muted-foreground">No team members yet — add one above.</p>}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => { setOpen(false); setInviteLink(null); setInviteLinkError(null); setInvitedName(null); setInvitedEmail(null) }}>
          <div className="glass-strong w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{isReset && inviteLink ? 'Password reset link' : 'Add Team Member'}</h3>
              <button onClick={() => { setOpen(false); setInviteLink(null); setInviteLinkError(null); setInvitedName(null); setInvitedEmail(null) }}><X size={16} /></button>
            </div>

            {inviteLink ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {isReset ? `Share this one-time link with ${invitedName ?? 'the team member'} so they can set a new password.` : 'Account created. Share this one-time link so they can set their own password — we never see or store it.'}
                </p>
                <div className="flex items-center gap-1.5 rounded-lg border border-border bg-white/60 p-2 text-[11px] dark:bg-white/5">
                  <span className="flex-1 select-all break-all">{inviteLink}</span>
                  <button onClick={() => { navigator.clipboard?.writeText(inviteLink).then(() => toast.success('Copied'), () => toast.error('Copy blocked — select the link and copy it manually')) }}><Copy size={13} /></button>
                </div>
                <button onClick={() => { setOpen(false); setInviteLink(null); setInvitedName(null); setInvitedEmail(null); setIsReset(false) }} className="w-full rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground">Done</button>
              </div>
            ) : invitedEmail ? (
              <div className="space-y-3">
                <p className="text-xs">
                  <span className="font-medium">{invitedName}</span>'s account was created successfully, but generating
                  their password-setup link failed{inviteLinkError ? ` (${inviteLinkError})` : ''}. This is usually a
                  temporary email rate limit — wait a minute and try again, or use the key icon on their card later.
                </p>
                <div className="flex gap-2">
                  <button onClick={retryLink} disabled={resetPassword.isPending} className="flex-1 rounded-xl bg-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                    {resetPassword.isPending ? 'Retrying…' : 'Try again'}
                  </button>
                  <button onClick={() => { setOpen(false); setInvitedName(null); setInvitedEmail(null); setInviteLinkError(null) }} className="flex-1 rounded-xl bg-secondary py-2 text-sm font-medium">Close</button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5" />
                <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (optional)" className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5" />
                <button
                  onClick={submitInvite}
                  disabled={!name.trim() || !email.trim() || invite.isPending}
                  className="w-full rounded-xl accent-gradient py-2.5 text-sm font-semibold disabled:opacity-50"
                >
                  {invite.isPending ? 'Creating…' : 'Create account'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {managingAccess && <CommunityAccessModal member={managingAccess} onClose={() => setManagingAccess(null)} />}
      {editing && <EditMemberModal member={editing} onClose={() => setEditing(null)} />}

      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setDeleting(null)}>
          <div className="glass-strong w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h3 className="mb-2 text-sm font-semibold">Remove {deleting.full_name}?</h3>
            <p className="mb-4 text-xs text-muted-foreground">
              This permanently deletes their login. Action items they owned or followed up on are kept, but become
              unassigned. This can't be undone.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setDeleting(null)} className="flex-1 rounded-xl bg-secondary py-2 text-sm font-medium">Cancel</button>
              <button
                onClick={confirmDelete}
                disabled={deleteMember.isPending}
                className="flex-1 rounded-xl bg-destructive py-2 text-sm font-semibold text-destructive-foreground disabled:opacity-50"
              >
                {deleteMember.isPending ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EditMemberModal({ member, onClose }: { member: Profile; onClose: () => void }) {
  const [name, setName] = useState(member.full_name ?? '')
  const [phone, setPhone] = useState(member.phone ?? '')
  const update = useUpdateTeamMember()

  const save = async () => {
    if (!name.trim()) return
    try {
      await update.mutateAsync({ id: member.id, fullName: name.trim(), phone: phone.trim() || undefined })
      toast.success('Updated')
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="glass-strong w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Edit team member</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="space-y-2.5">
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Phone</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full rounded-xl border border-border bg-white/70 px-3 py-2 text-sm outline-none dark:bg-white/5" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10px] font-medium uppercase text-muted-foreground">Email</span>
            <input value={member.email ?? ''} disabled className="w-full rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground outline-none" />
          </label>
        </div>
        <button
          onClick={save}
          disabled={!name.trim() || update.isPending}
          className="mt-4 w-full rounded-xl accent-gradient py-2.5 text-sm font-semibold disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </div>
  )
}

function CommunityAccessModal({ member, onClose }: { member: Profile; onClose: () => void }) {
  const { data: communities = [] } = useCommunities()
  const { data: memberCommunityIds = [] } = useMemberCommunities(member.id)
  const setMember = useSetMemberCommunity()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="glass-strong w-full max-w-sm rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">{member.full_name}'s communities</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        <div className="space-y-2">
          {communities.map((c) => {
            const checked = memberCommunityIds.includes(c.id)
            return (
              <label key={c.id} className="flex items-center gap-2 rounded-lg bg-white/50 px-3 py-2 text-sm dark:bg-white/5">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setMember.mutate({ profileId: member.id, communityId: c.id, member: e.target.checked })}
                />
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.color }} />
                {c.name}
              </label>
            )
          })}
          {communities.length === 0 && <p className="text-xs text-muted-foreground">No communities yet.</p>}
        </div>
      </div>
    </div>
  )
}
