create or replace function private.has_softball_app_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_softball_app_admin())
    or exists (
      select 1
      from public.softball_family_members fm
      where fm.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.softball_app_invitations invitation
      where invitation.accepted_at is null
        and lower(invitation.email) =
          lower(coalesce((select auth.jwt() ->> 'email'), ''))
    );
$$;

revoke all on function private.has_softball_app_access() from public;
grant execute on function private.has_softball_app_access() to authenticated;

drop policy if exists "tracker admin can view invitations"
  on public.softball_app_invitations;

drop policy if exists "tracker admin and invitees can view invitations"
  on public.softball_app_invitations;

create policy "tracker admin and invitees can view invitations"
  on public.softball_app_invitations for select to authenticated
  using (
    (select private.is_softball_app_admin())
    or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

notify pgrst, 'reload schema';
