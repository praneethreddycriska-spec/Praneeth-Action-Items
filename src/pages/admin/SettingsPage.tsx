import { Sparkles } from 'lucide-react'
import { useSystemSetting, useSetSystemSetting } from '@/hooks/useSystemSettings'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { data: autoApproval = false, isLoading } = useSystemSetting<boolean>('auto_approval_enabled', false)
  const setSetting = useSetSystemSetting()

  const toggle = () => {
    setSetting.mutate(
      { key: 'auto_approval_enabled', value: !autoApproval },
      { onSuccess: () => toast.success(`Auto approval turned ${!autoApproval ? 'ON' : 'OFF'}`) },
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>

      <div className="glass max-w-xl rounded-2xl p-4">
        <div className="mb-1 flex items-center gap-2">
          <Sparkles size={16} className="text-violet-500" />
          <h2 className="text-sm font-semibold">Auto Approval</h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          When ON, every public request is automatically converted into an action item the instant it's submitted
          (using safe defaults — Unassigned community, you as owner, priority derived from the requester's urgency).
          When OFF, new requests wait in the Requests queue for you to review and convert manually.
        </p>

        <button
          onClick={toggle}
          disabled={isLoading || setSetting.isPending}
          className={`relative h-8 w-16 rounded-full transition-colors ${autoApproval ? 'bg-emerald-500' : 'bg-secondary'}`}
        >
          <span
            className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${autoApproval ? 'translate-x-9' : 'translate-x-1'}`}
          />
        </button>
        <span className="ml-3 align-middle text-sm font-medium">{autoApproval ? 'ON' : 'OFF'}</span>
      </div>
    </div>
  )
}
