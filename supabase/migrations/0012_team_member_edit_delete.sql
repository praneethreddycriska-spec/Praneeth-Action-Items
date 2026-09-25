-- Full team member CRUD: edit profile fields, and permanently delete
-- (removes the Supabase Auth identity; profiles/community_members/
-- notifications cascade, action_items references are preserved with
-- owner/follow-up/created-by set to null via existing FK ON DELETE SET NULL).
create or replace function public.admin_update_team_member(
  p_user_id uuid,
  p_full_name text,
  p_phone text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;
  if coalesce(trim(p_full_name), '') = '' then
    raise exception 'name is required';
  end if;

  update public.profiles
  set full_name = trim(p_full_name),
      phone = nullif(trim(coalesce(p_phone, '')), '')
  where id = p_user_id and role = 'team_member';

  if not found then
    raise exception 'team member not found';
  end if;
end;
$$;

grant execute on function public.admin_update_team_member(uuid, text, text) to authenticated;

create or replace function public.admin_delete_team_member(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_service_key text;
  v_project_url text := 'https://cmiyphvjbczfafpcyvcq.supabase.co';
  v_response extensions.http_response;
  v_role text;
begin
  if not public.is_admin() then
    raise exception 'admin access required';
  end if;

  select role into v_role from public.profiles where id = p_user_id;
  if v_role is distinct from 'team_member' then
    raise exception 'only team members can be deleted this way';
  end if;

  select decrypted_secret into v_service_key from vault.decrypted_secrets where name = 'supabase_service_role_key' limit 1;
  if v_service_key is null then
    raise exception 'service role key not configured';
  end if;

  select * into v_response from extensions.http((
    'DELETE', v_project_url || '/auth/v1/admin/users/' || p_user_id::text,
    array[extensions.http_header('apikey', v_service_key), extensions.http_header('Authorization', 'Bearer ' || v_service_key)],
    'application/json', null
  )::extensions.http_request);

  if v_response.status not in (200, 204) then
    raise exception 'failed to delete user (status %): %', v_response.status, v_response.content;
  end if;
  -- auth.users delete cascades to profiles -> community_members/notifications;
  -- action_items.owner_id/follow_up_person_id/created_by are set null (ON DELETE SET NULL).
end;
$$;

grant execute on function public.admin_delete_team_member(uuid) to authenticated;
