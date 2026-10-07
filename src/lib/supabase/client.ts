import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anonKey) {
  throw new Error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY env vars')
}

// Same-origin proxy (/sb) so ISPs that block *.supabase.co can't break the app.
const baseUrl = typeof window !== 'undefined' ? `${window.location.origin}/sb` : url

export const supabase = createClient(baseUrl, anonKey, {
  auth: { persistSession: true, autoRefreshToken: true },
})

// Reads the user from the locally stored session (no network round trip, unlike auth.getUser()).
export const getCurrentUser = async () => ({
  data: { user: (await supabase.auth.getSession()).data.session?.user ?? null },
})
