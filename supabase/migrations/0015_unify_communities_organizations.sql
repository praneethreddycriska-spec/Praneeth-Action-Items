-- Communities are now the single list of organizations/companies.
-- The public request form reads its "Organization" options from here, so adding
-- a community in the admin panel makes it selectable on the form automatically.
-- (public.organizations is no longer used by the app; left in place, not dropped.)

create or replace function public.list_public_organizations()
returns table (id uuid, name text)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.name
  from public.communities c
  where c.archived_at is null
  order by lower(c.name)
$$;

revoke all on function public.list_public_organizations() from public;
grant execute on function public.list_public_organizations() to anon, authenticated;
