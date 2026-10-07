import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, getCurrentUser } from '@/lib/supabase/client'

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
      const { data: userData } = await getCurrentUser()
      const { error } = await supabase.from('system_settings').upsert({ key, value, updated_by: userData.user?.id, updated_at: new Date().toISOString() })
      if (error) throw error
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ['system_settings', vars.key] })
      const previous = qc.getQueryData(['system_settings', vars.key])
      qc.setQueryData(['system_settings', vars.key], vars.value)
      return { previous }
    },
    onError: (_e, vars, ctx) => qc.setQueryData(['system_settings', vars.key], ctx?.previous),
    onSettled: (_d, _e, vars) => qc.invalidateQueries({ queryKey: ['system_settings', vars.key] }),
  })
}
