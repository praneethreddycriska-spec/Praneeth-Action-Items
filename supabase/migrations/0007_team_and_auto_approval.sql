-- Team accounts, community-based access, auto-approval, and role-aware RLS.

-- ========== profiles: role ==========
alter table public.profiles add column if not exists role text not null default 'team_member' check (role in ('super_admin', 'team_member'));
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists active boolean not null default true;

update public.profiles set role = 'super_admin' where id = 'ecc20793-488c-42d8-a3fb-b4f69640eaae';

-- Replace is_admin() to check role instead of the old admin_users table, but
-- keep admin_users around (still referenced) — is_admin() now checks either.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'super_admin'
  ) or exists (
    select 1 from public.admin_users where id = auth.uid()
  );
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role from public.profiles where id = auth.uid()), 'anonymous');
$$;

grant execute on function public.current_role() to authenticated;

-- ========== community_members RLS: team members can see their own memberships ==========
drop policy if exists "community_members_admin_all" on public.community_members;
create policy "community_members_admin_all" on public.community_members for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "community_members_select_own" on public.community_members for select to authenticated using (profile_id = auth.uid());

-- ========== system_settings ==========
create table if not exists public.system_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.system_settings enable row level security;
create policy "system_settings_select_authenticated" on public.system_settings for select to authenticated using (true);
create policy "system_settings_admin_write" on public.system_settings for all to authenticated using (public.is_admin()) with check (public.is_admin());

insert into public.system_settings (key, value) values ('auto_approval_enabled', 'false'::jsonb) on conflict (key) do nothing;
insert into public.system_settings (key, value) values ('default_owner_id', to_jsonb('ecc20793-488c-42d8-a3fb-b4f69640eaae'::text)) on conflict (key) do nothing;

-- ========== requests: new fields ==========
alter table public.requests add column if not exists start_date timestamptz;
alter table public.requests add column if not exists urgency text check (urgency in ('low', 'medium', 'high', 'critical'));
alter table public.requests add column if not exists dependencies text;
alter table public.requests add column if not exists important_instructions text;
alter table public.requests add column if not exists reference_links text;
alter table public.requests add column if not exists auto_approved boolean not null default false;
alter table public.requests add column if not exists converted_to_action boolean not null default false;
alter table public.requests add column if not exists approved_at timestamptz;

-- ========== action_items: assignment visibility depends on owner/community ==========
drop policy if exists "action_items_admin_all" on public.action_items;
create policy "action_items_admin_all" on public.action_items for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "action_items_select_assigned_or_member" on public.action_items for select to authenticated using (
  owner_id = auth.uid()
  or follow_up_person_id = auth.uid()
  or (community_id is not null and exists (
    select 1 from public.community_members cm where cm.community_id = action_items.community_id and cm.profile_id = auth.uid()
  ))
);
create policy "action_items_update_assigned" on public.action_items for update to authenticated using (
  owner_id = auth.uid() or follow_up_person_id = auth.uid()
) with check (
  owner_id = auth.uid() or follow_up_person_id = auth.uid()
);

-- Team members can read/write comments & activity & outputs on actions they can see.
drop policy if exists "action_item_comments_admin_all" on public.action_item_comments;
create policy "action_item_comments_admin_all" on public.action_item_comments for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "action_item_comments_member_rw" on public.action_item_comments for all to authenticated using (
  exists (select 1 from public.action_items ai where ai.id = action_item_comments.action_item_id and (ai.owner_id = auth.uid() or ai.follow_up_person_id = auth.uid()))
) with check (
  exists (select 1 from public.action_items ai where ai.id = action_item_comments.action_item_id and (ai.owner_id = auth.uid() or ai.follow_up_person_id = auth.uid()))
);

drop policy if exists "action_item_activity_admin_all" on public.action_item_activity;
create policy "action_item_activity_admin_all" on public.action_item_activity for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "action_item_activity_member_rw" on public.action_item_activity for all to authenticated using (
  exists (select 1 from public.action_items ai where ai.id = action_item_activity.action_item_id and (ai.owner_id = auth.uid() or ai.follow_up_person_id = auth.uid()))
) with check (
  exists (select 1 from public.action_items ai where ai.id = action_item_activity.action_item_id and (ai.owner_id = auth.uid() or ai.follow_up_person_id = auth.uid()))
);

-- profiles: team members are visible to everyone authenticated (needed for Move To / assignment pickers).
drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles_admin_write" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- notifications already admin_all + select/update own via recipient_id; team members need those too.
drop policy if exists "notifications_admin_all" on public.notifications;
create policy "notifications_admin_all" on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "notifications_select_own" on public.notifications for select to authenticated using (recipient_id = auth.uid());
create policy "notifications_update_own" on public.notifications for update to authenticated using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- ========== auto-approval: convert request -> action item ==========
create or replace function public.urgency_to_priority(p_urgency text)
returns integer
language sql
immutable
as $$
  select case p_urgency
    when 'critical' then 10
    when 'high' then 8
    when 'medium' then 5
    when 'low' then 2
    else 5
  end;
$$;

create or replace function public.auto_convert_request(p_request_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_req public.requests%rowtype;
  v_default_owner uuid;
  v_action_id uuid;
begin
  select * into v_req from public.requests where id = p_request_id;
  if not found then
    raise exception 'request not found';
  end if;

  select (value #>> '{}')::uuid into v_default_owner from public.system_settings where key = 'default_owner_id';

  insert into public.action_items (
    title, description, community_id, owner_id, priority, status,
    deadline, start_date, expected_output, source_request_id, requested_by_name,
    created_by, sort_order
  ) values (
    left(v_req.requirement, 120),
    concat_ws(E'\n\n',
      v_req.additional_details,
      case when v_req.dependencies is not null then 'Dependencies: ' || v_req.dependencies else null end,
      case when v_req.important_instructions is not null then 'Instructions: ' || v_req.important_instructions else null end,
      case when v_req.reference_links is not null then 'References: ' || v_req.reference_links else null end
    ),
    null,
    v_default_owner,
    public.urgency_to_priority(v_req.urgency),
    'todo',
    v_req.deadline,
    v_req.start_date,
    v_req.expected_output,
    v_req.id,
    v_req.name_snapshot,
    v_default_owner,
    extract(epoch from now())
  )
  returning action_items.id into v_action_id;

  update public.requests
  set status = 'converted', auto_approved = true, converted_to_action = true,
      converted_at = now(), approved_at = now()
  where requests.id = p_request_id;

  insert into public.action_item_activity (action_item_id, actor_id, action, details)
  values (v_action_id, null, 'created', jsonb_build_object('detail', 'auto-approved from ' || v_req.request_code));

  insert into public.notifications (recipient_id, action_item_id, type, message)
  select id, v_action_id, 'auto_approved_request',
    'Auto-approved ' || v_req.request_code || ' from ' || v_req.name_snapshot || ' → "' || left(v_req.requirement, 80) || '"'
  from public.admin_users
  union
  select id, v_action_id, 'auto_approved_request',
    'Auto-approved ' || v_req.request_code || ' from ' || v_req.name_snapshot || ' → "' || left(v_req.requirement, 80) || '"'
  from public.profiles where role = 'super_admin';

  return v_action_id;
end;
$$;

-- Trigger: after a public request is inserted, auto-convert if enabled.
create or replace function public.maybe_auto_convert_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
begin
  select coalesce((value #>> '{}')::boolean, false) into v_enabled
  from public.system_settings where key = 'auto_approval_enabled';

  if v_enabled then
    perform public.auto_convert_request(new.id);
  end if;

  return new;
end;
$$;

drop trigger if exists requests_maybe_auto_convert on public.requests;
create trigger requests_maybe_auto_convert after insert on public.requests
  for each row execute function public.maybe_auto_convert_request();

-- Admin-triggered manual approve/convert (kept for symmetry / re-use by the app).
grant execute on function public.auto_convert_request(uuid) to authenticated;

alter publication supabase_realtime add table public.system_settings;
alter publication supabase_realtime add table public.profiles;
