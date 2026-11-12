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

function parseTriplet(triplet: string): [number, number, number] {
  const [h, sat, l] = triplet.split(' ')
  return [Number(h), Number(sat.replace('%', '')), Number(l.replace('%', ''))]
}

function relativeLuminance(triplet: string): number {
  const [h, sPct, lPct] = parseTriplet(triplet)
  const s = sPct / 100
  const l = lPct / 100
  const k = (n: number) => (n + h / 30) % 12
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  const lin = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
  return 0.2126 * lin(f(0)) + 0.7152 * lin(f(8)) + 0.0722 * lin(f(4))
}

/** Picks a readable foreground (near-black or near-white) using real luminance, so bright colors like lime get dark text. */
export function foregroundForHsl(triplet: string): string {
  return relativeLuminance(triplet) > 0.28 ? '230 30% 10%' : '0 0% 100%'
}

/** Accent color used for text/icons. On light backgrounds bright accents are darkened so they stay readable. */
export function primaryTextFor(triplet: string, mode: 'light' | 'dark'): string {
  if (mode === 'dark') return triplet
  const [h, s, l] = parseTriplet(triplet)
  return `${h} ${s}% ${Math.min(l, 32)}%`
}

export const ACCENT_PRESETS: { name: string; hex: string }[] = [
  { name: 'Lime', hex: '#C8F145' },
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
