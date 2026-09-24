-- Admin-managed organization/company list, selectable on the public form.
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_organizations_name on public.organizations(lower(name));

alter table public.organizations enable row level security;
-- Names aren't sensitive; public read lets the request form offer a dropdown.
create policy "organizations_select_public" on public.organizations for select to anon, authenticated using (true);
create policy "organizations_admin_write" on public.organizations for all to authenticated using (public.is_admin()) with check (public.is_admin());
