import { Sparkles, Palette, Sun, Moon, Monitor, Check } from 'lucide-react'
import { useSystemSetting, useSetSystemSetting } from '@/hooks/useSystemSettings'
import { useTheme, type ThemeMode } from '@/hooks/useTheme'
import { ACCENT_PRESETS } from '@/lib/theme/color'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { data: autoApproval = false, isLoading } = useSystemSetting<boolean>('auto_approval_enabled', false)
  const setSetting = useSetSystemSetting()
  const { mode, setMode, accentColor, setAccentColor } = useTheme()

  const toggle = () => {
    setSetting.mutate(
      { key: 'auto_approval_enabled', value: !autoApproval },
      { onSuccess: () => toast.success(`Auto approval turned ${!autoApproval ? 'ON' : 'OFF'}`) },
    )
  }

  const modes: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Monitor },
  ]

  return (
    <div className="h-full overflow-y-auto p-4">
      <h1 className="mb-4 text-lg font-semibold">Settings</h1>

      <div className="grid max-w-xl grid-cols-1 gap-4">
        <div className="glass rounded-2xl p-4">
          <div className="mb-1 flex items-center gap-2">
            <Palette size={16} className="text-violet-500" />
            <h2 className="text-sm font-semibold">Appearance</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Choose a light, dark, or system-matched theme, and pick any accent color for the whole app.
          </p>

          <label className="mb-1.5 block text-[10px] font-medium uppercase text-muted-foreground">Theme</label>
          <div className="mb-4 glass flex items-center gap-0.5 rounded-xl p-1">
            {modes.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                onClick={() => setMode(value)}
                className={cn(
                  'flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors',
                  mode === value ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:bg-white/40 dark:hover:bg-white/5',
                )}
              >
                <Icon size={13} /> {label}
              </button>
            ))}
          </div>

          <label className="mb-1.5 block text-[10px] font-medium uppercase text-muted-foreground">Accent color</label>
          <div className="mb-3 flex flex-wrap gap-2">
            {ACCENT_PRESETS.map((preset) => (
              <button
                key={preset.hex}
                onClick={() => setAccentColor(preset.hex)}
                title={preset.name}
                className="relative h-9 w-9 rounded-full ring-2 ring-offset-2 ring-offset-background transition-transform hover:scale-110"
                style={{ backgroundColor: preset.hex, ['--tw-ring-color' as string]: accentColor.toLowerCase() === preset.hex.toLowerCase() ? preset.hex : 'transparent' }}
              >
                {accentColor.toLowerCase() === preset.hex.toLowerCase() && (
                  <Check size={15} className="absolute inset-0 m-auto text-white drop-shadow" />
                )}
              </button>
            ))}
            <label className="relative flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/40 text-muted-foreground">
              <Sparkles size={14} />
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                title="Custom color"
              />
            </label>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: accentColor }} />
            {accentColor.toUpperCase()}
          </div>
        </div>

        <div className="glass rounded-2xl p-4">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles size={16} className="text-violet-500" />
            <h2 className="text-sm font-semibold">Auto Approval</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            When ON, every public request is automatically converted into an action item the instant it's submitted
            (using safe defaults — Unassigned community, you as owner, priority derived from the requester's urgency).
            When OFF, new requests wait in the Requests queue for you to review and convert manually.
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggle}
              disabled={isLoading || setSetting.isPending}
              aria-pressed={autoApproval}
              className={`relative inline-flex h-8 w-16 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${autoApproval ? 'bg-emerald-500' : 'bg-secondary'}`}
            >
              <span
                className={`absolute left-1 h-6 w-6 rounded-full bg-white shadow transition-transform ${autoApproval ? 'translate-x-8' : 'translate-x-0'}`}
              />
            </button>
            <span className="text-sm font-medium">{autoApproval ? 'ON' : 'OFF'}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
