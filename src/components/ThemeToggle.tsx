import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'

export function ThemeToggle() {
  const { resolvedMode, setMode } = useTheme()

  return (
    <button
      onClick={() => setMode(resolvedMode === 'dark' ? 'light' : 'dark')}
      className="glass rounded-xl p-2"
      aria-label={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      title={resolvedMode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {resolvedMode === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  )
}
