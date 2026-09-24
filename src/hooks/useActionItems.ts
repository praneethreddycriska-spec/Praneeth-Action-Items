import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase/client'
import type { ActionItem, ActionStatus, ActivityType } from '@/types'

const SELECT = `*, community:communities(*), owner:profiles!action_items_owner_id_fkey(*), follow_up_person:profiles!action_items_follow_up_person_id_fkey(*)`

export function useActionItems() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['action_items'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_items')
        .select(SELECT)
        .is('archived_at', null)
        .order('sort_order', { ascending: true })
      if (error) throw error
      return data as unknown as ActionItem[]
    },
  })

  useEffect(() => {
    const channel = supabase
      .channel('action_items_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'action_items' }, () => {
        qc.invalidateQueries({ queryKey: ['action_items'] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [qc])

  return query
}

async function logActivity(actionItemId: string, type: ActivityType, detail?: string) {
  const { data: userData } = await supabase.auth.getUser()
  await supabase.from('action_item_activity').insert({
    action_item_id: actionItemId,
    actor_id: userData.user?.id ?? null,
    action: type,
    details: detail ? { detail } : {},
  })
}

export function useCreateActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: Partial<ActionItem> & { title: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { data, error } = await supabase
        .from('action_items')
        .insert({
          title: input.title,
          description: input.description ?? null,
          community_id: input.community_id ?? null,
          owner_id: input.owner_id ?? userData.user?.id ?? null,
          follow_up_person_id: input.follow_up_person_id ?? null,
          priority: input.priority ?? 5,
          status: input.status ?? 'todo',
          deadline: input.deadline ?? null,
          expected_output: input.expected_output ?? null,
          source_request_id: input.source_request_id ?? null,
          requested_by_name: input.requested_by_name ?? null,
          created_by: userData.user?.id,
          sort_order: Date.now(),
        })
        .select(SELECT)
        .single()
      if (error) throw error
      await logActivity(data.id, 'created')
      return data as unknown as ActionItem
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action_items'] }),
  })
}

export function useUpdateActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, activity, ...patch }: Partial<ActionItem> & { id: string; activity?: { type: ActivityType; detail?: string } }) => {
      if (patch.status === 'completed' && !patch.completed_at) patch.completed_at = new Date().toISOString()
      const { data, error } = await supabase.from('action_items').update(patch).eq('id', id).select(SELECT).single()
      if (error) throw error
      if (activity) await logActivity(id, activity.type, activity.detail)
      return data as unknown as ActionItem
    },
    onMutate: async (patch) => {
      await qc.cancelQueries({ queryKey: ['action_items'] })
      const prev = qc.getQueryData<ActionItem[]>(['action_items'])
      if (prev) {
        qc.setQueryData<ActionItem[]>(['action_items'], prev.map(i => i.id === patch.id ? { ...i, ...patch } : i))
      }
      return { prev }
    },
    onError: (_err, _patch, ctx) => {
      if (ctx?.prev) qc.setQueryData(['action_items'], ctx.prev)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action_items'] }),
  })
}

export function useMoveActionItem() {
  const update = useUpdateActionItem()
  return (id: string, status: ActionStatus, sort_order: number) =>
    update.mutate({ id, status, sort_order, activity: { type: 'status_changed', detail: status } })
}

/** "Move To" — reassigns owner and notifies the new owner. Praneet keeps global visibility via admin RLS. */
export function useMoveToOwner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ actionItem, newOwnerId, newOwnerName }: { actionItem: ActionItem; newOwnerId: string; newOwnerName: string }) => {
      const { error } = await supabase.from('action_items').update({ owner_id: newOwnerId }).eq('id', actionItem.id)
      if (error) throw error
      await logActivity(actionItem.id, 'owner_changed', `moved to ${newOwnerName}`)
      await supabase.from('notifications').insert({
        recipient_id: newOwnerId,
        action_item_id: actionItem.id,
        type: 'action_assigned',
        message: `You were assigned "${actionItem.title}"${actionItem.community?.name ? ` · ${actionItem.community.name}` : ''}`,
      })
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action_items'] }),
  })
}

export function useDeleteActionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('action_items').update({ archived_at: new Date().toISOString() }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['action_items'] }),
  })
}

export function useComments(actionItemId: string | null) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['comments', actionItemId],
    enabled: !!actionItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_item_comments')
        .select('*, user:profiles!action_item_comments_author_id_fkey(*)')
        .eq('action_item_id', actionItemId as string)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    },
  })

  useEffect(() => {
    if (!actionItemId) return
    const channel = supabase
      .channel(`comments_${actionItemId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'action_item_comments', filter: `action_item_id=eq.${actionItemId}` }, () => {
        qc.invalidateQueries({ queryKey: ['comments', actionItemId] })
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [actionItemId, qc])

  return query
}

export function useAddComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ actionItemId, body }: { actionItemId: string; body: string }) => {
      const { data: userData } = await supabase.auth.getUser()
      const { error } = await supabase.from('action_item_comments').insert({
        action_item_id: actionItemId, author_id: userData.user?.id, body,
      })
      if (error) throw error
      await logActivity(actionItemId, 'comment_added')
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['comments', vars.actionItemId] })
      qc.invalidateQueries({ queryKey: ['activity', vars.actionItemId] })
    },
  })
}

export function useActivity(actionItemId: string | null) {
  return useQuery({
    queryKey: ['activity', actionItemId],
    enabled: !!actionItemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_item_activity')
        .select('*, user:profiles!action_item_activity_actor_id_fkey(*)')
        .eq('action_item_id', actionItemId as string)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}
