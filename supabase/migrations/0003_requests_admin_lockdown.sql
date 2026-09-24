-- Public request intake + single-admin (Praneet) lockdown.

-- ========== admin_users ==========
create table if not exists public.admin_users (
  id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;
create policy "admin_users_select_self" on public.admin_users for select to authenticated using (id = auth.uid());

-- Praneet is the sole admin.
insert into public.admin_users (id)
values ('ecc20793-488c-42d8-a3fb-b4f69640eaae')
on conflict (id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where id = auth.uid());
$$;

grant execute on function public.is_admin() to anon, authenticated;

-- ========== requesters ==========
create table if not exists public.requesters (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  phone text,
  organization text,
  location text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_requesters_email on public.requesters(lower(email)) where email is not null;
create index if not exists idx_requesters_phone on public.requesters(phone) where phone is not null;

drop trigger if exists requesters_set_updated_at on public.requesters;
create trigger requesters_set_updated_at before update on public.requesters
  for each row execute function public.set_updated_at();

alter table public.requesters enable row level security;
-- Public can create a requester record (needed to submit a request) but cannot read others' data.
create policy "requesters_insert_public" on public.requesters for insert to anon, authenticated with check (true);
create policy "requesters_select_admin" on public.requesters for select to authenticated using (public.is_admin());
create policy "requesters_update_admin" on public.requesters for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ========== requests ==========
create sequence if not exists public.request_code_seq start 1;

create table if not exists public.requests (
  id uuid primary key default gen_random_uuid(),
  request_code text not null unique default (
    'REQ-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.request_code_seq')::text, 5, '0')
  ),
  requester_id uuid references public.requesters(id) on delete set null,
  name_snapshot text not null,
  email_snapshot text,
  phone_snapshot text,
  organization text,
  location text,
  requirement text not null,
  target text,
  expected_output text,
  deadline timestamptz,
  start_date timestamptz,
  additional_details text,
  status text not null default 'new' check (status in ('new','under_review','accepted','converted','in_progress','waiting','completed','rejected','archived')),
  community_id uuid references public.communities(id) on delete set null,
  source text not null default 'public' check (source in ('public','manual')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  converted_at timestamptz,
  completed_at timestamptz,
  archived_at timestamptz
);

create index if not exists idx_requests_code on public.requests(request_code);
create index if not exists idx_requests_requester on public.requests(requester_id);
create index if not exists idx_requests_status on public.requests(status);
create index if not exists idx_requests_community on public.requests(community_id);
create index if not exists idx_requests_deadline on public.requests(deadline);
create index if not exists idx_requests_created_at on public.requests(created_at);

drop trigger if exists requests_set_updated_at on public.requests;
create trigger requests_set_updated_at before update on public.requests
  for each row execute function public.set_updated_at();

-- Force safe defaults on public inserts so an anonymous submitter cannot set
-- internal workflow fields (status, community, converted/completed markers).
create or replace function public.enforce_public_request_defaults()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.status := 'new';
    new.source := 'public';
    new.community_id := null;
    new.converted_at := null;
    new.completed_at := null;
    new.archived_at := null;
  end if;
  return new;
end;
$$;

drop trigger if exists requests_enforce_public_defaults on public.requests;
create trigger requests_enforce_public_defaults before insert on public.requests
  for each row execute function public.enforce_public_request_defaults();

alter table public.requests enable row level security;
create policy "requests_insert_public" on public.requests for insert to anon, authenticated with check (true);
create policy "requests_select_admin" on public.requests for select to authenticated using (public.is_admin());
create policy "requests_update_admin" on public.requests for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Narrow, explicit public status lookup (foundation for /request-status; not yet exposed in UI).
create or replace function public.get_request_public_status(p_code text)
returns table (request_code text, status text, submitted_at timestamptz, deadline timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select request_code, status, created_at, deadline
  from public.requests
  where request_code = p_code;
$$;

grant execute on function public.get_request_public_status(text) to anon, authenticated;

-- ========== action_items: link to source request + who raised it ==========
alter table public.action_items add column if not exists source_request_id uuid references public.requests(id) on delete set null;
alter table public.action_items add column if not exists requested_by_name text;
create index if not exists idx_action_items_source_request on public.action_items(source_request_id);

-- ========== lock down existing "any authenticated user" policies to admin-only ==========
-- (Single-admin model: Praneet is the only authenticated user with real access.)
drop policy if exists "communities_select_authenticated" on public.communities;
drop policy if exists "communities_insert_authenticated" on public.communities;
drop policy if exists "communities_update_authenticated" on public.communities;
drop policy if exists "communities_delete_authenticated" on public.communities;
create policy "communities_admin_all" on public.communities for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "action_items_select_authenticated" on public.action_items;
drop policy if exists "action_items_insert_authenticated" on public.action_items;
drop policy if exists "action_items_update_authenticated" on public.action_items;
drop policy if exists "action_items_delete_authenticated" on public.action_items;
create policy "action_items_admin_all" on public.action_items for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "action_item_comments_select_authenticated" on public.action_item_comments;
drop policy if exists "action_item_comments_insert_authenticated" on public.action_item_comments;
drop policy if exists "action_item_comments_update_own" on public.action_item_comments;
drop policy if exists "action_item_comments_delete_own" on public.action_item_comments;
drop policy if exists "comments_all_authenticated" on public.action_item_comments;
create policy "action_item_comments_admin_all" on public.action_item_comments for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "action_item_activity_select_authenticated" on public.action_item_activity;
drop policy if exists "action_item_activity_insert_authenticated" on public.action_item_activity;
drop policy if exists "activity_all_authenticated" on public.action_item_activity;
create policy "action_item_activity_admin_all" on public.action_item_activity for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "action_item_attachments_select_authenticated" on public.action_item_attachments;
drop policy if exists "action_item_attachments_insert_authenticated" on public.action_item_attachments;
drop policy if exists "action_item_attachments_delete_authenticated" on public.action_item_attachments;
drop policy if exists "attachments_all_authenticated" on public.action_item_attachments;
create policy "action_item_attachments_admin_all" on public.action_item_attachments for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "tags_select_authenticated" on public.tags;
drop policy if exists "tags_insert_authenticated" on public.tags;
drop policy if exists "tags_delete_authenticated" on public.tags;
create policy "tags_admin_all" on public.tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "action_item_tags_select_authenticated" on public.action_item_tags;
drop policy if exists "action_item_tags_insert_authenticated" on public.action_item_tags;
create policy "action_item_tags_admin_all" on public.action_item_tags for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "community_members_select_authenticated" on public.community_members;
drop policy if exists "community_members_insert_authenticated" on public.community_members;
drop policy if exists "community_members_delete_authenticated" on public.community_members;
create policy "community_members_admin_all" on public.community_members for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "voice_notes_all_authenticated" on public.voice_notes;
drop policy if exists "voice_notes_select_authenticated" on public.voice_notes;
drop policy if exists "voice_notes_insert_authenticated" on public.voice_notes;
create policy "voice_notes_admin_all" on public.voice_notes for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
drop policy if exists "notifications_insert_authenticated" on public.notifications;
create policy "notifications_admin_all" on public.notifications for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Notify admin when a public request is created.
create or replace function public.notify_admin_new_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (recipient_id, action_item_id, type, message)
  select id, null, 'new_request', 'New request ' || new.request_code || ' from ' || new.name_snapshot
  from public.admin_users;
  return new;
end;
$$;

drop trigger if exists requests_notify_admin on public.requests;
create trigger requests_notify_admin after insert on public.requests
  for each row execute function public.notify_admin_new_request();

alter publication supabase_realtime add table public.requests;
