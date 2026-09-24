import { supabase } from '@/lib/supabase/client'
import type { AIActionExtraction, Community, Profile } from '@/types'

/**
 * Calls the `ai_parse_action` Postgres RPC, which runs server-side inside
 * Supabase (SECURITY DEFINER) and holds the Groq API key in Vault — the key
 * never reaches the browser. Falls back to the local deterministic parser
 * (see localParser.ts) if the RPC is unavailable or errors.
 */
export async function parseSpokenActionWithGroq(
  rawText: string,
  communities: Community[],
  profiles: Profile[],
): Promise<AIActionExtraction & { source: 'groq' | 'local' }> {
  try {
    const { data, error } = await supabase.rpc('ai_parse_action', {
      p_transcript: rawText,
      p_communities: communities.map((c) => c.name),
      p_people: profiles.map((p) => p.full_name).filter(Boolean),
    })
    if (error) throw error

    const result = data as {
      title?: string
      community?: string | null
      priority?: number | null
      deadline?: string | null
      follow_up_person?: string | null
      expected_output?: string | null
      confidence?: number | string | null
    }

    if (!result?.title) throw new Error('empty extraction')

    return {
      title: result.title,
      community: result.community ?? undefined,
      priority: result.priority ?? undefined,
      deadline: result.deadline ?? null,
      follow_up_person: result.follow_up_person ?? undefined,
      expected_output: result.expected_output ?? undefined,
      confidence: Math.min(1, Math.max(0, Number(result.confidence ?? 0.7))),
      source: 'groq',
    }
  } catch {
    const { parseSpokenAction } = await import('./localParser')
    return { ...parseSpokenAction(rawText, communities, profiles), source: 'local' }
  }
}
