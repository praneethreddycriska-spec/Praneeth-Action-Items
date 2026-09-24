-- Team members need to read community names/colors (for their assigned/permitted
-- action items and the Move To / community pickers), even though only the
-- admin can create, edit, or delete communities.
drop policy if exists "communities_admin_all" on public.communities;
create policy "communities_select_authenticated" on public.communities for select to authenticated using (true);
create policy "communities_admin_write" on public.communities for insert to authenticated with check (public.is_admin());
create policy "communities_admin_update" on public.communities for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "communities_admin_delete" on public.communities for delete to authenticated using (public.is_admin());
