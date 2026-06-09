create or replace function private.has_softball_app_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_softball_app_admin());
$$;

drop policy if exists "tracker admin and invitees can view invitations"
  on public.softball_app_invitations;

drop policy if exists "tracker admin can view invitations"
  on public.softball_app_invitations;

create policy "tracker admin can view invitations"
  on public.softball_app_invitations for select to authenticated
  using ((select private.is_softball_app_admin()));

notify pgrst, 'reload schema';
