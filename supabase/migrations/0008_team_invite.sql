-- Team member invites, done server-side so the service-role key never
-- reaches the browser and Praneet never sees anyone's password.
create or replace function public.admin_invite_team_member(
  p_email text,
  p_full_name text,
  p_phone text default null,
  p_community_ids uuid[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_service_key text;
  v_project_url text := 'https://cmiyphvjbczfafpcyvcq.supabase.co';
  v_existing uuid;
  v_body jsonb;
  v_response extensions.http_response;
  v_new_user jsonb;
  v_user_id uuid;
  v_link_body jsonb;
  v_link_response extensions.http_response;
  v_action_link text;
  v_community_id uuid;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if coalesce(trim(p_email), '') = '' or coalesce(trim(p_full_name), '') = '' then
    raise exception 'name and email are required';
  end if;

  select id into v_existing from public.profiles where lower(email) = lower(trim(p_email));
  if v_existing is not null then
    raise exception 'User already exists.';
  end if;

  select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'supabase_service_role_key' limit 1;
  if v_service_key is null then
    raise exception 'service role key not configured';
  end if;

  v_body := jsonb_build_object(
    'email', trim(p_email),
    'email_confirm', true,
    'password', encode(gen_random_bytes(18), 'base64'),
    'user_metadata', jsonb_build_object('full_name', trim(p_full_name))
  );

  select * into v_response from extensions.http((
    'POST', v_project_url || '/auth/v1/admin/users',
    array[extensions.http_header('apikey', v_service_key), extensions.http_header('Authorization', 'Bearer ' || v_service_key)],
    'application/json', v_body::text
  )::extensions.http_request);

  if v_response.status <> 200 then
    raise exception 'failed to create user (status %): %', v_response.status, v_response.content;
  end if;

  v_new_user := v_response.content::jsonb;
  v_user_id := (v_new_user->>'id')::uuid;

  insert into public.profiles (id, full_name, email, phone, role, active)
  values (v_user_id, trim(p_full_name), trim(p_email), nullif(trim(p_phone), ''), 'team_member', true)
  on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone, role = 'team_member';

  foreach v_community_id in array p_community_ids loop
    insert into public.community_members (community_id, profile_id, role)
    values (v_community_id, v_user_id, 'member')
    on conflict (community_id, profile_id) do nothing;
  end loop;

  v_link_body := jsonb_build_object('type', 'recovery', 'email', trim(p_email));
  select * into v_link_response from extensions.http((
    'POST', v_project_url || '/auth/v1/admin/generate_link',
    array[extensions.http_header('apikey', v_service_key), extensions.http_header('Authorization', 'Bearer ' || v_service_key)],
    'application/json', v_link_body::text
  )::extensions.http_request);

  if v_link_response.status = 200 then
    v_action_link := (v_link_response.content::jsonb ->> 'action_link');
  end if;

  return jsonb_build_object('id', v_user_id, 'email', trim(p_email), 'invite_link', v_action_link);
end;
$$;

revoke all on function public.admin_invite_team_member(text, text, text, uuid[]) from public;
grant execute on function public.admin_invite_team_member(text, text, text, uuid[]) to authenticated;

-- Deactivate / reactivate (admin only; never deletes auth identity).
create or replace function public.admin_set_team_member_active(p_user_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  update public.profiles set active = p_active where id = p_user_id and role = 'team_member';
end;
$$;

grant execute on function public.admin_set_team_member_active(uuid, boolean) to authenticated;

-- Regenerate a password-reset link for an existing team member (admin only, never shows the password).
create or replace function public.admin_reset_team_member_password(p_email text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_service_key text;
  v_project_url text := 'https://cmiyphvjbczfafpcyvcq.supabase.co';
  v_link_response extensions.http_response;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'supabase_service_role_key' limit 1;

  select * into v_link_response from extensions.http((
    'POST', v_project_url || '/auth/v1/admin/generate_link',
    array[extensions.http_header('apikey', v_service_key), extensions.http_header('Authorization', 'Bearer ' || v_service_key)],
    'application/json', jsonb_build_object('type', 'recovery', 'email', trim(p_email))::text
  )::extensions.http_request);

  if v_link_response.status <> 200 then
    raise exception 'failed to generate reset link (status %)', v_link_response.status;
  end if;

  return v_link_response.content::jsonb ->> 'action_link';
end;
$$;

grant execute on function public.admin_reset_team_member_password(text) to authenticated;
