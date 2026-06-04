create table public.softball_app_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null check (
    email = lower(trim(email))
    and length(email) > 3
  ),
  token uuid not null default gen_random_uuid() unique,
  invited_by uuid not null references auth.users(id) on delete cascade,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    (accepted_by is null and accepted_at is null)
    or (accepted_by is not null and accepted_at is not null)
  )
);

create unique index softball_app_invitations_pending_email_key
  on public.softball_app_invitations(lower(email))
  where accepted_at is null;

create index softball_app_invitations_invited_by_idx
  on public.softball_app_invitations(invited_by);

create index softball_app_invitations_accepted_by_idx
  on public.softball_app_invitations(accepted_by);

revoke all on table public.softball_app_invitations from anon;
grant select, insert, delete on table public.softball_app_invitations to authenticated;

alter table public.softball_app_invitations enable row level security;

create policy "tracker parents can create invitations"
  on public.softball_app_invitations for insert to authenticated
  with check (
    invited_by = (select auth.uid())
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.user_id = (select auth.uid())
    )
  );

create policy "tracker parents and invitees can view invitations"
  on public.softball_app_invitations for select to authenticated
  using (
    invited_by = (select auth.uid())
    or lower(email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

create policy "tracker parents can delete invitations"
  on public.softball_app_invitations for delete to authenticated
  using (invited_by = (select auth.uid()));

create or replace function private.has_softball_app_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    exists (
      select 1
      from public.softball_family_members fm
      where fm.user_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.softball_app_invitations invitation
      where lower(invitation.email) =
        lower(coalesce((select auth.jwt() ->> 'email'), ''))
    );
$$;

revoke all on function private.has_softball_app_access() from public;
grant execute on function private.has_softball_app_access() to authenticated;

create or replace function private.accept_softball_app_invitation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.softball_app_invitations invitation
  set accepted_by = new.user_id,
      accepted_at = now()
  where invitation.accepted_at is null
    and lower(invitation.email) = lower(coalesce((
      select email
      from auth.users
      where id = new.user_id
    ), ''));

  return new;
end;
$$;

revoke all on function private.accept_softball_app_invitation() from public;

drop trigger if exists accept_softball_app_invitation
  on public.softball_family_members;

create trigger accept_softball_app_invitation
after insert on public.softball_family_members
for each row execute function private.accept_softball_app_invitation();

drop policy if exists "parents can manage softball families"
  on public.softball_families;

create policy "parents can manage softball families"
  on public.softball_families for all to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_families.id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    private.has_softball_app_access()
    and (
      created_by = (select auth.uid())
      or exists (
        select 1
        from public.softball_family_members fm
        where fm.family_id = softball_families.id
          and fm.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "authenticated can select softball drill templates"
  on public.softball_drill_templates;

create policy "authenticated can select softball drill templates"
  on public.softball_drill_templates for select to authenticated
  using (
    private.has_softball_app_access()
    and (
      family_id is null
      or exists (
        select 1
        from public.softball_family_members fm
        where fm.family_id = softball_drill_templates.family_id
          and fm.user_id = (select auth.uid())
      )
    )
  );

drop policy if exists "authenticated can select softball drill template items"
  on public.softball_drill_template_items;

create policy "authenticated can select softball drill template items"
  on public.softball_drill_template_items for select to authenticated
  using (
    private.has_softball_app_access()
    and exists (
      select 1
      from public.softball_drill_templates dt
      where dt.id = softball_drill_template_items.template_id
        and (
          dt.family_id is null
          or exists (
            select 1
            from public.softball_family_members fm
            where fm.family_id = dt.family_id
              and fm.user_id = (select auth.uid())
          )
        )
    )
  );

drop policy if exists "authenticated can select softball badges"
  on public.softball_badges;

create policy "authenticated can select softball badges"
  on public.softball_badges for select to authenticated
  using (private.has_softball_app_access());

drop policy if exists "authenticated can select available softball sports"
  on public.softball_sports;

create policy "authenticated can select available softball sports"
  on public.softball_sports for select to authenticated
  using (
    private.has_softball_app_access()
    and (
      family_id is null
      or exists (
        select 1
        from public.softball_family_members fm
        where fm.family_id = softball_sports.family_id
          and fm.user_id = (select auth.uid())
      )
    )
  );

notify pgrst, 'reload schema';
