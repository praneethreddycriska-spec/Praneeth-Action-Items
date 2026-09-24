-- Action Item Management: initial schema
create extension if not exists "pgcrypto";

-- ========== updated_at trigger fn ==========
create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ========== profiles ==========
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  avatar_color text default '#7C6CF6',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated using (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (id = (select auth.uid()));

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== communities ==========
create table if not exists public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text not null default '#7C6CF6',
  icon text not null default 'Users',
  archived_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.communities enable row level security;

create policy "communities_select_authenticated" on public.communities
  for select to authenticated using (true);
create policy "communities_insert_authenticated" on public.communities
  for insert to authenticated with check (true);
create policy "communities_update_authenticated" on public.communities
  for update to authenticated using (true) with check (true);
create policy "communities_delete_authenticated" on public.communities
  for delete to authenticated using (true);

create trigger communities_set_updated_at before update on public.communities
  for each row execute function public.set_updated_at();

-- ========== community_members ==========
create table if not exists public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  created_at timestamptz not null default now(),
  unique (community_id, profile_id)
);

alter table public.community_members enable row level security;

create policy "community_members_select_authenticated" on public.community_members
  for select to authenticated using (true);
create policy "community_members_insert_authenticated" on public.community_members
  for insert to authenticated with check (true);
create policy "community_members_delete_authenticated" on public.community_members
  for delete to authenticated using (true);

create index if not exists idx_community_members_community on public.community_members(community_id);
create index if not exists idx_community_members_profile on public.community_members(profile_id);

-- ========== tags ==========
create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text not null default '#7C6CF6',
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;
create policy "tags_select_authenticated" on public.tags for select to authenticated using (true);
create policy "tags_insert_authenticated" on public.tags for insert to authenticated with check (true);
create policy "tags_delete_authenticated" on public.tags for delete to authenticated using (true);

-- ========== action_items ==========
create table if not exists public.action_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  community_id uuid references public.communities(id) on delete set null,
  owner_id uuid references public.profiles(id) on delete set null,
  follow_up_person_id uuid references public.profiles(id) on delete set null,
  priority smallint not null default 0 check (priority >= 0 and priority <= 10),
  status text not null default 'inbox' check (status in ('inbox','todo','in_progress','waiting','blocked','completed')),
  deadline timestamptz,
  start_date timestamptz,
  expected_output text,
  actual_output text,
  sort_order double precision not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  archived_at timestamptz,
  waiting_for_person_id uuid references public.profiles(id) on delete set null,
  waiting_expected_response_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.action_items enable row level security;

create policy "action_items_select_authenticated" on public.action_items
  for select to authenticated using (true);
create policy "action_items_insert_authenticated" on public.action_items
  for insert to authenticated with check (true);
create policy "action_items_update_authenticated" on public.action_items
  for update to authenticated using (true) with check (true);
create policy "action_items_delete_authenticated" on public.action_items
  for delete to authenticated using (true);

create trigger action_items_set_updated_at before update on public.action_items
  for each row execute function public.set_updated_at();

create index if not exists idx_action_items_community on public.action_items(community_id);
create index if not exists idx_action_items_owner on public.action_items(owner_id);
create index if not exists idx_action_items_follow_up on public.action_items(follow_up_person_id);
create index if not exists idx_action_items_status on public.action_items(status);
create index if not exists idx_action_items_priority on public.action_items(priority);
create index if not exists idx_action_items_deadline on public.action_items(deadline);
create index if not exists idx_action_items_created_at on public.action_items(created_at);

-- ========== action_item_tags ==========
create table if not exists public.action_item_tags (
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (action_item_id, tag_id)
);

alter table public.action_item_tags enable row level security;
create policy "action_item_tags_select_authenticated" on public.action_item_tags for select to authenticated using (true);
create policy "action_item_tags_insert_authenticated" on public.action_item_tags for insert to authenticated with check (true);
create policy "action_item_tags_delete_authenticated" on public.action_item_tags for delete to authenticated using (true);

-- ========== action_item_comments ==========
create table if not exists public.action_item_comments (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.action_item_comments enable row level security;
create policy "action_item_comments_select_authenticated" on public.action_item_comments for select to authenticated using (true);
create policy "action_item_comments_insert_authenticated" on public.action_item_comments for insert to authenticated with check (true);
create policy "action_item_comments_update_own" on public.action_item_comments for update to authenticated using (author_id = (select auth.uid())) with check (author_id = (select auth.uid()));
create policy "action_item_comments_delete_own" on public.action_item_comments for delete to authenticated using (author_id = (select auth.uid()));

create index if not exists idx_action_item_comments_item on public.action_item_comments(action_item_id);

create trigger action_item_comments_set_updated_at before update on public.action_item_comments
  for each row execute function public.set_updated_at();

-- ========== action_item_activity ==========
create table if not exists public.action_item_activity (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.action_item_activity enable row level security;
create policy "action_item_activity_select_authenticated" on public.action_item_activity for select to authenticated using (true);
create policy "action_item_activity_insert_authenticated" on public.action_item_activity for insert to authenticated with check (true);

create index if not exists idx_action_item_activity_item on public.action_item_activity(action_item_id);

-- ========== action_item_attachments ==========
create table if not exists public.action_item_attachments (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid not null references public.action_items(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

alter table public.action_item_attachments enable row level security;
create policy "action_item_attachments_select_authenticated" on public.action_item_attachments for select to authenticated using (true);
create policy "action_item_attachments_insert_authenticated" on public.action_item_attachments for insert to authenticated with check (true);
create policy "action_item_attachments_delete_authenticated" on public.action_item_attachments for delete to authenticated using (true);

create index if not exists idx_action_item_attachments_item on public.action_item_attachments(action_item_id);

-- ========== notifications ==========
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  action_item_id uuid references public.action_items(id) on delete cascade,
  type text not null,
  message text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "notifications_select_own" on public.notifications for select to authenticated using (recipient_id = (select auth.uid()));
create policy "notifications_insert_authenticated" on public.notifications for insert to authenticated with check (true);
create policy "notifications_update_own" on public.notifications for update to authenticated using (recipient_id = (select auth.uid())) with check (recipient_id = (select auth.uid()));
create policy "notifications_delete_own" on public.notifications for delete to authenticated using (recipient_id = (select auth.uid()));

create index if not exists idx_notifications_recipient on public.notifications(recipient_id, read);

-- ========== voice_notes ==========
create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  action_item_id uuid references public.action_items(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  transcript text not null,
  mode text not null default 'plain' check (mode in ('plain','ai')),
  parsed jsonb,
  created_at timestamptz not null default now()
);

alter table public.voice_notes enable row level security;
create policy "voice_notes_select_authenticated" on public.voice_notes for select to authenticated using (true);
create policy "voice_notes_insert_authenticated" on public.voice_notes for insert to authenticated with check (true);

create index if not exists idx_voice_notes_item on public.voice_notes(action_item_id);

-- ========== realtime ==========
alter publication supabase_realtime add table public.action_items;
alter publication supabase_realtime add table public.action_item_comments;
alter publication supabase_realtime add table public.notifications;
