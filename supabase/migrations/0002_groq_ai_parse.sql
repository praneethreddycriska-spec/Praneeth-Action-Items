-- AI Action Mic: server-side Groq call, key never leaves the database.
-- Requires the `http` extension and the 'groq_api_key' secret in Supabase Vault
-- (see: select vault.create_secret('gsk_...', 'groq_api_key');)

create or replace function public.ai_parse_action(
  p_transcript text,
  p_communities text[] default '{}',
  p_people text[] default '{}'
)
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
  v_result jsonb;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  select decrypted_secret into v_key
  from vault.decrypted_secrets
  where name = 'groq_api_key'
  limit 1;

  if v_key is null then
    raise exception 'groq_api_key not configured';
  end if;

  v_system := 'You extract a single actionable task from a spoken sentence and return ONLY strict JSON '
    || 'with these keys: title (string, required, concise imperative phrase), '
    || 'community (string or null, must exactly match one of the provided community names or be null), '
    || 'priority (integer 0-10 or null; 10 means critical/urgent/asap), '
    || 'deadline (ISO 8601 date-time string or null, resolve relative dates like "tomorrow" or "next Friday" against the current date '
    || to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS') || '), '
    || 'follow_up_person (string or null, must exactly match one of the provided people or be null), '
    || 'expected_output (string or null, what "done" looks like if stated), '
    || 'confidence (number 0-1). '
    || 'Known communities: ' || coalesce(array_to_string(p_communities, ', '), '') || '. '
    || 'Known people: ' || coalesce(array_to_string(p_people, ', '), '') || '. '
    || 'Return ONLY the JSON object, no prose, no markdown fences.';

  v_body := jsonb_build_object(
    'model', 'openai/gpt-oss-20b',
    'temperature', 0.1,
    'response_format', jsonb_build_object('type', 'json_object'),
    'messages', jsonb_build_array(
      jsonb_build_object('role', 'system', 'content', v_system),
      jsonb_build_object('role', 'user', 'content', p_transcript)
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
  v_result := v_content::jsonb;

  return v_result;
end;
$$;

revoke all on function public.ai_parse_action(text, text[], text[]) from public;
grant execute on function public.ai_parse_action(text, text[], text[]) to authenticated;
