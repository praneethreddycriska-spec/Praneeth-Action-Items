import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { Profile } from '@/types'

export function useTeamMembers() {
  return useQuery({
    queryKey: ['team_members'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('role', 'team_member').order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useAllAssignableProfiles() {
  return useQuery({
    queryKey: ['assignable_profiles'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('active', true).order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useInviteTeamMember() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { email: string; fullName: string; phone?: string; communityIds?: string[] }) => {
      const { data, error } = await supabase.rpc('admin_invite_team_member', {
        p_email: input.email,
        p_full_name: input.fullName,
        p_phone: input.phone || null,
        p_community_ids: input.communityIds ?? [],
      })
      if (error) throw error
      return data as { id: string; email: string; invite_link: string | null }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team_members'] }),
  })
}

export function useSetTeamMemberActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.rpc('admin_set_team_member_active', { p_user_id: id, p_active: active })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team_members'] }),
  })
}

export function useResetTeamMemberPassword() {
  return useMutation({
    mutationFn: async (email: string) => {
      const { data, error } = await supabase.rpc('admin_reset_team_member_password', { p_email: email })
      if (error) throw error
      return data as string
    },
  })
}

export function useMemberCommunities(profileId: string | null) {
  return useQuery({
    queryKey: ['member_communities', profileId],
    enabled: !!profileId,
    queryFn: async () => {
      const { data, error } = await supabase.from('community_members').select('community_id').eq('profile_id', profileId as string)
      if (error) throw error
      return data.map((r) => r.community_id as string)
    },
  })
}

export function useSetMemberCommunity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ profileId, communityId, member }: { profileId: string; communityId: string; member: boolean }) => {
      if (member) {
        const { error } = await supabase.from('community_members').insert({ profile_id: profileId, community_id: communityId })
        if (error) throw error
      } else {
        const { error } = await supabase.from('community_members').delete().eq('profile_id', profileId).eq('community_id', communityId)
        if (error) throw error
      }
    },
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['member_communities', vars.profileId] }),
  })
}
