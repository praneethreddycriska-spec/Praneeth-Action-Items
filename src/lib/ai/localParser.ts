import type { AIActionExtraction, Community, Profile } from '@/types'

const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

function nextWeekday(target: number, from: Date): Date {
  const d = new Date(from)
  const diff = (target - d.getDay() + 7) % 7 || 7
  d.setDate(d.getDate() + diff)
  return d
}

function parseDeadline(text: string): string | null {
  const now = new Date()
  const lower = text.toLowerCase()

  if (/\btoday\b/.test(lower)) return endOfDay(now).toISOString()
  if (/\btomorrow\b/.test(lower)) return endOfDay(addDays(now, 1)).toISOString()
  if (/\bnext week\b/.test(lower)) return endOfDay(addDays(now, 7)).toISOString()

  for (let i = 0; i < WEEKDAYS.length; i++) {
    const re = new RegExp(`\\b(next\\s+)?${WEEKDAYS[i]}\\b`)
    const m = lower.match(re)
    if (m) {
      let d = nextWeekday(i, now)
      if (m[1]) d = addDays(d, 7)
      return endOfDay(d).toISOString()
    }
  }

  const inDays = lower.match(/\bin\s+(\d+)\s+days?\b/)
  if (inDays) return endOfDay(addDays(now, parseInt(inDays[1], 10))).toISOString()

  const byDate = lower.match(/\b(?:by|on)\s+(\w+\s+\d{1,2}(?:st|nd|rd|th)?)\b/)
  if (byDate) {
    const parsed = new Date(`${byDate[1]} ${now.getFullYear()}`)
    if (!isNaN(parsed.getTime())) return endOfDay(parsed).toISOString()
  }

  return null
}

function addDays(d: Date, n: number) {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function endOfDay(d: Date) {
  const r = new Date(d)
  r.setHours(17, 0, 0, 0)
  return r
}

function parsePriority(text: string): number | undefined {
  const lower = text.toLowerCase()
  const explicit = lower.match(/\bpriority\s+(\d{1,2})\b/) ?? lower.match(/\b(\d{1,2})\s*\/\s*10\b/)
  if (explicit) return Math.min(10, Math.max(0, parseInt(explicit[1], 10)))
  if (/\b(critical|urgent|asap|emergency)\b/.test(lower)) return 10
  if (/\bhigh priority\b/.test(lower)) return 8
  if (/\blow priority\b/.test(lower)) return 2
  return undefined
}

function parseCommunity(text: string, communities: Community[]): string | undefined {
  const lower = text.toLowerCase()
  const under = lower.match(/\bunder\s+([a-z0-9 ]+?)(?:,|\.|$| priority| deadline| follow)/)
  const candidates = [under?.[1]?.trim(), ...communities.map((c) => c.name.toLowerCase())]
  for (const c of communities) {
    if (candidates.some((cand) => cand && (cand === c.name.toLowerCase() || lower.includes(c.name.toLowerCase())))) {
      return c.name
    }
  }
  return undefined
}

function parseFollowUp(text: string, profiles: Profile[]): string | undefined {
  const lower = text.toLowerCase()
  const m = lower.match(/\bfollow[\s-]?up (?:with\s+)?([a-z]+)\b/) ?? lower.match(/\bassign(?:ed)? to\s+([a-z]+)\b/)
  const name = m?.[1]
  if (name) {
    const match = profiles.find((p) => p.full_name?.toLowerCase().includes(name))
    if (match) return match.full_name ?? undefined
  }
  return undefined
}

function stripKnownPhrases(text: string): string {
  return text
    .replace(/\b(today|tomorrow|next week)\b/gi, '')
    .replace(/\b(next\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/gi, '')
    .replace(/\bin\s+\d+\s+days?\b/gi, '')
    .replace(/\bpriority\s+\d{1,2}\b/gi, '')
    .replace(/\b\d{1,2}\s*\/\s*10\b/gi, '')
    .replace(/\b(critical|urgent|asap|emergency|high priority|low priority)\b/gi, '')
    .replace(/\bunder\s+[a-z0-9 ]+?(?=,|\.|$)/gi, '')
    .replace(/\bfollow[\s-]?up (?:with\s+)?[a-z]+\b/gi, '')
    .replace(/\bassign(?:ed)? to\s+[a-z]+\b/gi, '')
    .replace(/\bmake it\b/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s,.-]+|[\s,.-]+$/g, '')
    .trim()
}

/**
 * Deterministic local parser — no external API required.
 * Extension point: if XAI_API_KEY is configured server-side, swap this for a
 * Grok-backed extractor returning the same AIActionExtraction shape.
 */
export function parseSpokenAction(rawText: string, communities: Community[], profiles: Profile[]): AIActionExtraction {
  const deadline = parseDeadline(rawText)
  const priority = parsePriority(rawText)
  const community = parseCommunity(rawText, communities)
  const follow_up_person = parseFollowUp(rawText, profiles)
  let title = stripKnownPhrases(rawText)
  title = title.replace(/^(create|add)\s+(a\s+)?(task|action item|action)\s*(to|for)?\s*/i, '')
  title = title.charAt(0).toUpperCase() + title.slice(1)

  let confidence = 0.4
  if (title.length > 3) confidence += 0.2
  if (deadline) confidence += 0.15
  if (priority !== undefined) confidence += 0.1
  if (community) confidence += 0.1
  if (follow_up_person) confidence += 0.05

  return {
    title: title || rawText,
    community,
    priority,
    deadline,
    follow_up_person,
    confidence: Math.min(1, confidence),
  }
}
