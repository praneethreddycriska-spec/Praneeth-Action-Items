/** Converts a #rrggbb hex color to an "H S% L%" triplet, matching the format
 * every CSS variable in index.css expects (consumed as hsl(var(--primary))). */
export function hexToHslTriplet(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

/** Picks a readable foreground (near-black or near-white) for a given "H S% L%" triplet. */
export function foregroundForHsl(triplet: string): string {
  const l = Number(triplet.split(' ')[2]?.replace('%', ''))
  return l > 65 ? '230 30% 12%' : '0 0% 100%'
}

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Violet', hex: '#7C6CF6' },
  { name: 'Indigo', hex: '#6366F1' },
  { name: 'Blue', hex: '#3B82F6' },
  { name: 'Cyan', hex: '#06B6D4' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Amber', hex: '#F59E0B' },
  { name: 'Orange', hex: '#F97316' },
  { name: 'Rose', hex: '#F43F5E' },
  { name: 'Pink', hex: '#EC4899' },
  { name: 'Fuchsia', hex: '#D946EF' },
]
