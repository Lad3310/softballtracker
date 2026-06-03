do $$
begin
  create type public.softball_family_member_role as enum ('owner', 'parent');
exception
  when duplicate_object then null;
end $$;

create table public.softball_families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'My softball family' check (length(trim(name)) > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.softball_family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.softball_families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.softball_family_member_role not null default 'owner',
  created_at timestamptz not null default now(),
  unique (family_id, user_id)
);

alter table public.softball_players
  add column if not exists family_id uuid references public.softball_families(id) on delete cascade;

alter table public.softball_drill_templates
  add column if not exists family_id uuid references public.softball_families(id) on delete cascade;

alter table public.softball_app_settings
  drop constraint if exists softball_app_settings_pkey;

alter table public.softball_app_settings
  drop column if exists id;

alter table public.softball_app_settings
  add column id uuid default gen_random_uuid();

alter table public.softball_app_settings
  add column if not exists family_id uuid references public.softball_families(id) on delete cascade;

delete from public.softball_app_settings
where family_id is null;

alter table public.softball_app_settings
  alter column id set not null,
  alter column family_id set not null,
  add primary key (id);

create unique index if not exists softball_app_settings_family_id_key
  on public.softball_app_settings(family_id);

create index if not exists softball_families_created_by_idx
  on public.softball_families(created_by);

create index if not exists softball_family_members_user_id_idx
  on public.softball_family_members(user_id);

create index if not exists softball_family_members_family_id_idx
  on public.softball_family_members(family_id);

create index if not exists softball_players_family_display_idx
  on public.softball_players(family_id, display_order, name);

create index if not exists softball_drill_templates_family_type_idx
  on public.softball_drill_templates(family_id, practice_type);

grant usage on schema public to authenticated;

revoke select, insert, update, delete on table
  public.softball_players,
  public.softball_practice_sessions,
  public.softball_practice_session_drills,
  public.softball_drill_templates,
  public.softball_drill_template_items,
  public.softball_badges,
  public.softball_player_badges,
  public.softball_app_settings
from anon;

grant select, insert, update, delete on table
  public.softball_families,
  public.softball_family_members,
  public.softball_players,
  public.softball_practice_sessions,
  public.softball_practice_session_drills,
  public.softball_drill_templates,
  public.softball_drill_template_items,
  public.softball_player_badges,
  public.softball_app_settings
to authenticated;

grant select on table public.softball_badges to authenticated;

alter table public.softball_families enable row level security;
alter table public.softball_family_members enable row level security;
alter table public.softball_players enable row level security;
alter table public.softball_practice_sessions enable row level security;
alter table public.softball_practice_session_drills enable row level security;
alter table public.softball_drill_templates enable row level security;
alter table public.softball_drill_template_items enable row level security;
alter table public.softball_badges enable row level security;
alter table public.softball_player_badges enable row level security;
alter table public.softball_app_settings enable row level security;

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
    created_by = (select auth.uid())
    or exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_families.id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "parents can select own softball memberships"
  on public.softball_family_members for select to authenticated
  using (user_id = (select auth.uid()));

create policy "parents can join softball families they created"
  on public.softball_family_members for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.softball_families f
      where f.id = softball_family_members.family_id
        and f.created_by = (select auth.uid())
    )
  );

create policy "parents can update own softball membership"
  on public.softball_family_members for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "parents can delete own softball membership"
  on public.softball_family_members for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "softball family members can manage players"
  on public.softball_players for all to authenticated
  using (
    exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_players.family_id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_players.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can manage practice sessions"
  on public.softball_practice_sessions for all to authenticated
  using (
    exists (
      select 1
      from public.softball_players p
      join public.softball_family_members fm on fm.family_id = p.family_id
      where p.id = softball_practice_sessions.player_id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.softball_players p
      join public.softball_family_members fm on fm.family_id = p.family_id
      where p.id = softball_practice_sessions.player_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can manage practice session drills"
  on public.softball_practice_session_drills for all to authenticated
  using (
    exists (
      select 1
      from public.softball_practice_sessions ps
      join public.softball_players p on p.id = ps.player_id
      join public.softball_family_members fm on fm.family_id = p.family_id
      where ps.id = softball_practice_session_drills.session_id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.softball_practice_sessions ps
      join public.softball_players p on p.id = ps.player_id
      join public.softball_family_members fm on fm.family_id = p.family_id
      where ps.id = softball_practice_session_drills.session_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "authenticated can select softball drill templates"
  on public.softball_drill_templates for select to authenticated
  using (
    family_id is null
    or exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_drill_templates.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can manage drill templates"
  on public.softball_drill_templates for all to authenticated
  using (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_drill_templates.family_id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_drill_templates.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "authenticated can select softball drill template items"
  on public.softball_drill_template_items for select to authenticated
  using (
    exists (
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

create policy "softball family members can manage drill template items"
  on public.softball_drill_template_items for all to authenticated
  using (
    exists (
      select 1
      from public.softball_drill_templates dt
      join public.softball_family_members fm on fm.family_id = dt.family_id
      where dt.id = softball_drill_template_items.template_id
        and dt.family_id is not null
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.softball_drill_templates dt
      join public.softball_family_members fm on fm.family_id = dt.family_id
      where dt.id = softball_drill_template_items.template_id
        and dt.family_id is not null
        and fm.user_id = (select auth.uid())
    )
  );

create policy "authenticated can select softball badges"
  on public.softball_badges for select to authenticated using (true);

create policy "softball family members can manage player badges"
  on public.softball_player_badges for all to authenticated
  using (
    exists (
      select 1
      from public.softball_players p
      join public.softball_family_members fm on fm.family_id = p.family_id
      where p.id = softball_player_badges.player_id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.softball_players p
      join public.softball_family_members fm on fm.family_id = p.family_id
      where p.id = softball_player_badges.player_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can manage app settings"
  on public.softball_app_settings for all to authenticated
  using (
    exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_app_settings.family_id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_app_settings.family_id
        and fm.user_id = (select auth.uid())
    )
  );

-- If you already collected family data before this auth migration, preserve it by
-- creating a family/member row for your parent account and assigning the old rows:
--
-- update public.softball_players
-- set family_id = '<your-family-id>'
-- where family_id is null;
--
-- insert into public.softball_app_settings (family_id, require_parent_approval)
-- values ('<your-family-id>', true)
-- on conflict (family_id) do nothing;
