create table public.softball_sports (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references public.softball_families(id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  icon text not null default 'SP',
  display_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.softball_player_sports (
  player_id uuid not null references public.softball_players(id) on delete cascade,
  sport_id uuid not null references public.softball_sports(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (player_id, sport_id)
);

alter table public.softball_drill_templates
  add column sport_id uuid references public.softball_sports(id) on delete restrict;

alter table public.softball_practice_sessions
  add column sport_id uuid references public.softball_sports(id) on delete restrict;

insert into public.softball_sports (id, family_id, name, icon, display_order)
values
  ('10000000-0000-4000-8000-000000000001', null, 'Softball', 'SB', 10),
  ('10000000-0000-4000-8000-000000000002', null, 'Soccer', 'SC', 20),
  ('10000000-0000-4000-8000-000000000003', null, 'Basketball', 'BB', 30),
  ('10000000-0000-4000-8000-000000000004', null, 'Volleyball', 'VB', 40)
on conflict (id) do update
set name = excluded.name,
    icon = excluded.icon,
    display_order = excluded.display_order;

update public.softball_drill_templates
set sport_id = '10000000-0000-4000-8000-000000000001'
where sport_id is null;

update public.softball_practice_sessions
set sport_id = '10000000-0000-4000-8000-000000000001'
where sport_id is null;

insert into public.softball_player_sports (player_id, sport_id)
select id, '10000000-0000-4000-8000-000000000001'
from public.softball_players
on conflict do nothing;

alter table public.softball_drill_templates
  alter column sport_id set not null;

alter table public.softball_practice_sessions
  alter column sport_id set not null;

create index softball_sports_family_display_idx
  on public.softball_sports(family_id, display_order, name);

create unique index softball_sports_family_name_idx
  on public.softball_sports(coalesce(family_id, '00000000-0000-0000-0000-000000000000'), lower(name));

create index softball_player_sports_sport_idx
  on public.softball_player_sports(sport_id, player_id);

create index softball_drill_templates_sport_type_idx
  on public.softball_drill_templates(sport_id, practice_type);

create index softball_practice_sessions_sport_date_idx
  on public.softball_practice_sessions(sport_id, session_date desc);

insert into public.softball_drill_templates
  (id, family_id, sport_id, name, practice_type, editable)
values
  ('20000000-0000-4000-8000-000000000001', null, '10000000-0000-4000-8000-000000000002', 'Ball control', 'Ball Control', false),
  ('20000000-0000-4000-8000-000000000002', null, '10000000-0000-4000-8000-000000000002', 'Passing and shooting', 'Passing & Shooting', false),
  ('20000000-0000-4000-8000-000000000003', null, '10000000-0000-4000-8000-000000000003', 'Ball handling', 'Ball Handling', false),
  ('20000000-0000-4000-8000-000000000004', null, '10000000-0000-4000-8000-000000000003', 'Shooting', 'Shooting', false),
  ('20000000-0000-4000-8000-000000000005', null, '10000000-0000-4000-8000-000000000004', 'Passing and setting', 'Passing & Setting', false),
  ('20000000-0000-4000-8000-000000000006', null, '10000000-0000-4000-8000-000000000004', 'Serving', 'Serving', false)
on conflict (id) do update
set sport_id = excluded.sport_id,
    name = excluded.name,
    practice_type = excluded.practice_type;

insert into public.softball_drill_template_items (id, template_id, label, sort_order)
values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'toe taps', 10),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'inside-outside touches', 20),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 'dribble through cones', 30),
  ('30000000-0000-4000-8000-000000000004', '20000000-0000-4000-8000-000000000002', 'short passes', 10),
  ('30000000-0000-4000-8000-000000000005', '20000000-0000-4000-8000-000000000002', 'first touch and pass', 20),
  ('30000000-0000-4000-8000-000000000006', '20000000-0000-4000-8000-000000000002', 'shots on target', 30),
  ('30000000-0000-4000-8000-000000000007', '20000000-0000-4000-8000-000000000003', 'stationary dribbles', 10),
  ('30000000-0000-4000-8000-000000000008', '20000000-0000-4000-8000-000000000003', 'crossover reps', 20),
  ('30000000-0000-4000-8000-000000000009', '20000000-0000-4000-8000-000000000003', 'dribble through cones', 30),
  ('30000000-0000-4000-8000-000000000010', '20000000-0000-4000-8000-000000000004', 'form shooting', 10),
  ('30000000-0000-4000-8000-000000000011', '20000000-0000-4000-8000-000000000004', 'layups', 20),
  ('30000000-0000-4000-8000-000000000012', '20000000-0000-4000-8000-000000000004', 'free throws', 30),
  ('30000000-0000-4000-8000-000000000013', '20000000-0000-4000-8000-000000000005', 'forearm passing', 10),
  ('30000000-0000-4000-8000-000000000014', '20000000-0000-4000-8000-000000000005', 'setting reps', 20),
  ('30000000-0000-4000-8000-000000000015', '20000000-0000-4000-8000-000000000005', 'pass to target', 30),
  ('30000000-0000-4000-8000-000000000016', '20000000-0000-4000-8000-000000000006', 'toss practice', 10),
  ('30000000-0000-4000-8000-000000000017', '20000000-0000-4000-8000-000000000006', 'standing serves', 20),
  ('30000000-0000-4000-8000-000000000018', '20000000-0000-4000-8000-000000000006', 'serve to zones', 30)
on conflict (id) do update
set label = excluded.label,
    sort_order = excluded.sort_order;

delete from public.softball_badges
where code in ('tee_work_complete', 'soft_toss_complete', 'balanced_hitter');

update public.softball_badges
set title = 'Season Starter',
    description = 'Reached 25% of the season goal.'
where code = 'summer_grinder';

update public.softball_badges
set description = 'Reached 50% of the season goal.'
where code = 'halfway_there';

update public.softball_badges
set title = 'Season Goal Complete',
    description = 'Reached 100% of the season goal.'
where code = 'summer_goal_complete';

revoke all on table public.softball_sports, public.softball_player_sports from anon;

grant select, insert, update, delete on table
  public.softball_sports,
  public.softball_player_sports
to authenticated;

alter table public.softball_sports enable row level security;
alter table public.softball_player_sports enable row level security;

create policy "authenticated can select available softball sports"
  on public.softball_sports for select to authenticated
  using (
    family_id is null
    or exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_sports.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can insert custom sports"
  on public.softball_sports for insert to authenticated
  with check (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_sports.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can update custom sports"
  on public.softball_sports for update to authenticated
  using (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_sports.family_id
        and fm.user_id = (select auth.uid())
    )
  )
  with check (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_sports.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can delete custom sports"
  on public.softball_sports for delete to authenticated
  using (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_sports.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can select player sports"
  on public.softball_player_sports for select to authenticated
  using (
    exists (
      select 1
      from public.softball_players p
      join public.softball_family_members fm on fm.family_id = p.family_id
      where p.id = softball_player_sports.player_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can insert player sports"
  on public.softball_player_sports for insert to authenticated
  with check (
    exists (
      select 1
      from public.softball_players p
      join public.softball_family_members fm on fm.family_id = p.family_id
      join public.softball_sports s
        on s.id = softball_player_sports.sport_id
        and (s.family_id is null or s.family_id = p.family_id)
      where p.id = softball_player_sports.player_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can delete player sports"
  on public.softball_player_sports for delete to authenticated
  using (
    exists (
      select 1
      from public.softball_players p
      join public.softball_family_members fm on fm.family_id = p.family_id
      where p.id = softball_player_sports.player_id
        and fm.user_id = (select auth.uid())
    )
  );

notify pgrst, 'reload schema';
