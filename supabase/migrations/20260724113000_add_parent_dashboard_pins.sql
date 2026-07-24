create table public.softball_parent_pins (
  family_id uuid primary key references public.softball_families(id) on delete cascade,
  pin_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.softball_parent_pins enable row level security;

revoke all on table public.softball_parent_pins from anon, authenticated;

create or replace function public.softball_parent_pin_is_set()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.softball_family_members as membership
    join public.softball_parent_pins as pin on pin.family_id = membership.family_id
    where membership.user_id = (select auth.uid())
  );
$$;

create or replace function public.set_softball_parent_pin(pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_family_id uuid;
begin
  if pin !~ '^[0-9]{4,8}$' then
    raise exception 'Parent PIN must contain 4 to 8 digits.';
  end if;

  select membership.family_id
  into active_family_id
  from public.softball_family_members as membership
  where membership.user_id = (select auth.uid())
  order by membership.created_at
  limit 1;

  if active_family_id is null then
    raise exception 'A family membership is required.';
  end if;

  insert into public.softball_parent_pins (family_id, pin_hash)
  values (
    active_family_id,
    extensions.crypt(pin, extensions.gen_salt('bf'))
  )
  on conflict (family_id) do nothing;

  return found;
end;
$$;

create or replace function public.verify_softball_parent_pin(pin text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select stored_pin.pin_hash = extensions.crypt(pin, stored_pin.pin_hash)
    from public.softball_family_members as membership
    join public.softball_parent_pins as stored_pin
      on stored_pin.family_id = membership.family_id
    where membership.user_id = (select auth.uid())
    order by membership.created_at
    limit 1
  ), false);
$$;

revoke execute on function public.softball_parent_pin_is_set() from public, anon;
revoke execute on function public.set_softball_parent_pin(text) from public, anon;
revoke execute on function public.verify_softball_parent_pin(text) from public, anon;

grant execute on function public.softball_parent_pin_is_set() to authenticated;
grant execute on function public.set_softball_parent_pin(text) to authenticated;
grant execute on function public.verify_softball_parent_pin(text) to authenticated;
