-- Public-facing AI assist: helps a requester phrase their submission, never
-- invents facts, and never touches internal fields (community/priority/owner).
create or replace function public.ai_structure_request(p_text text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_key text;
  v_system text;
  v_body jsonb;
  v_response extensions.http_response;
  v_content text;
begin
  if coalesce(trim(p_text), '') = '' then
    raise exception 'text is required';
  end if;

  select decrypted_secret into v_key from vault.decrypted_secrets where name = 'groq_api_key' limit 1;
  if v_key is null then
    raise exception 'groq_api_key not configured';
  end if;

  v_system := 'A person is describing something they need help with, in their own rough words. '
    || 'Rewrite it into strict JSON with these keys only: '
    || 'requirement (string, what they need, concise), '
    || 'target (string or null, what they are trying to achieve), '
    || 'expected_output (string or null, what result they expect), '
    || 'additional_details (string or null, any other relevant detail they mentioned). '
    || 'Use ONLY information present in their text. Do not invent facts, dates, names, or requirements '
    || 'they did not state. If something is not mentioned, use null for that field. '
    || 'Return ONLY the JSON object, no prose, no markdown fences.';

  v_body := jsonb_build_object(
    'model', 'openai/gpt-oss-20b',
    'temperature', 0.1,
    'response_format', jsonb_build_object('type', 'json_object'),
    'messages', jsonb_build_array(
      jsonb_build_object('role', 'system', 'content', v_system),
      jsonb_build_object('role', 'user', 'content', p_text)
    )
  );

  select * into v_response
  from extensions.http((
    'POST',
    'https://api.groq.com/openai/v1/chat/completions',
    array[extensions.http_header('Authorization', 'Bearer ' || v_key)],
    'application/json',
    v_body::text
  )::extensions.http_request);

  if v_response.status <> 200 then
    raise exception 'groq request failed (status %): %', v_response.status, v_response.content;
  end if;

  v_content := (v_response.content::jsonb) -> 'choices' -> 0 -> 'message' ->> 'content';
  return v_content::jsonb;
end;
$$;

revoke all on function public.ai_structure_request(text) from public;
grant execute on function public.ai_structure_request(text) to anon, authenticated;
