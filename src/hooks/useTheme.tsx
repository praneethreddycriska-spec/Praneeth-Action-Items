import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { hexToHslTriplet, foregroundForHsl } from '@/lib/theme/color'

export type ThemeMode = 'light' | 'dark' | 'system'

const MODE_KEY = 'action-items-theme-mode'
const COLOR_KEY = 'action-items-theme-color'
const DEFAULT_COLOR = '#7C6CF6'

interface ThemeContextValue {
  mode: ThemeMode
  resolvedMode: 'light' | 'dark'
  accentColor: string
  setMode: (mode: ThemeMode) => void
  setAccentColor: (hex: string) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function readStoredMode(): ThemeMode {
  try {
    const v = localStorage.getItem(MODE_KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch { /* ignore */ }
  return 'system'
}

function readStoredColor(): string {
  try {
    return localStorage.getItem(COLOR_KEY) || DEFAULT_COLOR
  } catch {
    return DEFAULT_COLOR
  }
}

function applyAccentColor(hex: string) {
  const triplet = hexToHslTriplet(hex)
  const fg = foregroundForHsl(triplet)
  const root = document.documentElement.style
  root.setProperty('--primary', triplet)
  root.setProperty('--primary-foreground', fg)
  root.setProperty('--ring', triplet)
  // Accent stays a related-but-distinct hue for visual interest (shifted lightness).
  const [h, s] = triplet.split(' ')
  root.setProperty('--accent', `${h} ${s} 58%`)
}

function applyMode(mode: ThemeMode): 'light' | 'dark' {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const resolved = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  return resolved
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => readStoredMode())
  const [accentColor, setAccentColorState] = useState<string>(() => readStoredColor())
  const [resolvedMode, setResolvedMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    setResolvedMode(applyMode(mode))
    if (mode !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const listener = () => setResolvedMode(applyMode('system'))
    mq.addEventListener('change', listener)
    return () => mq.removeEventListener('change', listener)
  }, [mode])

  useEffect(() => {
    applyAccentColor(accentColor)
  }, [accentColor])

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m)
    try { localStorage.setItem(MODE_KEY, m) } catch { /* ignore */ }
  }, [])

  const setAccentColor = useCallback((hex: string) => {
    setAccentColorState(hex)
    try { localStorage.setItem(COLOR_KEY, hex) } catch { /* ignore */ }
  }, [])

  return (
    <ThemeContext.Provider value={{ mode, resolvedMode, accentColor, setMode, setAccentColor }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
