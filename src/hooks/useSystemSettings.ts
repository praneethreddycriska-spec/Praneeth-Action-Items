import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'

export function useSystemSetting<T>(key: string, fallback: T) {
  const query = useQuery({
    queryKey: ['system_settings', key],
    queryFn: async () => {
      const { data, error } = await supabase.from('system_settings').select('value').eq('key', key).maybeSingle()
      if (error) throw error
      return (data?.value ?? fallback) as T
    },
  })
  return query
}

export function useSetSystemSetting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('system_settings').upsert({ key, value, updated_by: userData.user?.id, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['system_settings', vars.key] }),
  })
}
