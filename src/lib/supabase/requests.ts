import { supabase } from '@/lib/supabase/client'

export interface SubmitRequestInput {
  name: string
  email?: string
  phone?: string
  organization?: string
  location?: string
  requirement: string
  target?: string
  expected_output?: string
  deadline?: string | null
  start_date?: string | null
  additional_details?: string
}

export async function submitPublicRequest(input: SubmitRequestInput) {
  const { data, error } = await supabase.rpc('submit_public_request', {
    p_name: input.name,
    p_email: input.email || null,
    p_phone: input.phone || null,
    p_organization: input.organization || null,
    p_location: input.location || null,
    p_requirement: input.requirement,
    p_target: input.target || null,
    p_expected_output: input.expected_output || null,
    p_deadline: input.deadline || null,
    p_start_date: input.start_date || null,
    p_additional_details: input.additional_details || null,
  })
  if (error) throw error
  const row = Array.isArray(data) ? data[0] : data
  return row as { request_id: string; request_code: string }
}
