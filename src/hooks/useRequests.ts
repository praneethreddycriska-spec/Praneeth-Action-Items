import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { ActionItem, RequestRecord, RequestStatus } from '@/types'

const SELECT = `*, community:communities(*), requester:requesters(*)`

export function useRequests() {

  const query = useQuery({
    queryKey: ['requests'],
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('requests')
        .select(SELECT)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as unknown as RequestRecord[]
    },
  })


  return query
}

export function useUpdateRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<RequestRecord> & { id: string }) => {
      const { data, error } = await supabase.from('requests').update(patch).eq('id', id).select(SELECT).single()
      if (error) throw error
      return data as unknown as RequestRecord
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['requests'] }),
  })
}

export function useSetRequestStatus() {
  const update = useUpdateRequest()
  return (id: string, status: RequestStatus) => {
    const extra: Partial<RequestRecord> = { status }
    if (status === 'completed') extra.completed_at = new Date().toISOString()
    update.mutate({ id, ...extra })
  }
}

export function useLinkedActionItems(requestId: string | null) {
  return useQuery({
    queryKey: ['linked_actions', requestId],
    enabled: !!requestId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_items')
        .select('*, community:communities(*), owner:profiles!action_items_owner_id_fkey(*), follow_up_person:profiles!action_items_follow_up_person_id_fkey(*)')
        .eq('source_request_id', requestId as string)
      if (error) throw error
      return data as unknown as ActionItem[]
    },
  })
}
