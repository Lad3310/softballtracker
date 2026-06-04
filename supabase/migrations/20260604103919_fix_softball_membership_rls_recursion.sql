create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;

-- Bypass family RLS for the creator check so membership inserts cannot recurse.
create or replace function private.is_softball_family_creator(target_family_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.softball_families
    where id = target_family_id
      and created_by = (select auth.uid())
  );
$$;

revoke all on function private.is_softball_family_creator(uuid) from public;
grant execute on function private.is_softball_family_creator(uuid) to authenticated;

drop policy if exists "parents can join softball families they created"
  on public.softball_family_members;

create policy "parents can join softball families they created"
  on public.softball_family_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and private.is_softball_family_creator(family_id)
  );
