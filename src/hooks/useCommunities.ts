import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Community } from '@/types'

export function useCommunities() {
  return useQuery({
    queryKey: ['communities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('communities')
        .select('*')
        .is('archived_at', null)
        .order('name')
      if (error) throw error
      return data as Community[]
    },
  })
}

export function useCreateCommunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; description?: string; color?: string; icon?: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('communities')
        .insert({ ...input, created_by: userData.user?.id })
        .select()
        .single()
      if (error) throw error
      return data as Community
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communities'] }),
  })
}

export function useUpdateCommunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<Community> & { id: string }) => {
      const { data, error } = await supabase.from('communities').update(patch).eq('id', id).select().single()
      if (error) throw error
      return data as Community
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communities'] }),
  })
}

export function useArchiveCommunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('communities').update({ archived_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['communities'] }),
  })
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data
    },
  })
}
