create or replace function private.is_softball_app_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = (select auth.uid())
      and lower(u.email) = 'joe.laird1@outlook.com'
  );
$$;

revoke all on function private.is_softball_app_admin() from public;
grant execute on function private.is_softball_app_admin() to authenticated;

drop policy if exists "tracker parents can create invitations"
  on public.softball_app_invitations;

drop policy if exists "tracker parents and invitees can view invitations"
  on public.softball_app_invitations;

drop policy if exists "tracker parents can delete invitations"
  on public.softball_app_invitations;

create policy "tracker admin can create invitations"
  on public.softball_app_invitations for insert to authenticated
  with check (
    (select private.is_softball_app_admin())
    and invited_by = (select auth.uid())
  );

create policy "tracker admin and invitees can view invitations"
  on public.softball_app_invitations for select to authenticated
  using (
    (select private.is_softball_app_admin())
    or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

create policy "tracker admin can delete invitations"
  on public.softball_app_invitations for delete to authenticated
  using ((select private.is_softball_app_admin()));

notify pgrst, 'reload schema';
