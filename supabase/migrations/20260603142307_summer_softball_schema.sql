create extension if not exists pgcrypto with schema extensions;

do $$
begin
  create type public.player_handedness as enum ('L', 'R', 'switch');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.practice_session_status as enum ('pending', 'approved', 'rejected');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.hitting_side as enum ('L', 'R', 'both');
exception
  when duplicate_object then null;
end $$;

create table public.players (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  display_order integer not null default 0,
  handedness public.player_handedness not null default 'R',
  weekly_goal_minutes integer not null default 90 check (weekly_goal_minutes > 0),
  summer_goal_minutes integer not null default 1200 check (summer_goal_minutes > 0),
  summer_start_date date not null default '2026-06-01',
  summer_end_date date not null default '2026-08-31',
  created_at timestamptz not null default now(),
  check (summer_end_date >= summer_start_date)
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  practice_type text not null check (length(trim(practice_type)) > 0),
  minutes integer not null check (minutes > 0),
  feeling text,
  focus_tag text,
  notes text,
  status public.practice_session_status not null default 'pending',
  approved_by text,
  approved_at timestamptz,
  rejected_reason text,
  hitting_side public.hitting_side,
  session_date date not null,
  created_at timestamptz not null default now(),
  check (
    (status = 'approved' and rejected_reason is null)
    or (status = 'rejected' and approved_at is null)
    or (status = 'pending' and approved_at is null and rejected_reason is null)
  )
);

create table public.practice_session_drills (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  drill_label text not null check (length(trim(drill_label)) > 0),
  completed boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.drill_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) > 0),
  practice_type text not null check (length(trim(practice_type)) > 0),
  editable boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.drill_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.drill_templates(id) on delete cascade,
  label text not null check (length(trim(label)) > 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (length(trim(code)) > 0),
  title text not null check (length(trim(title)) > 0),
  description text not null,
  icon text not null,
  created_at timestamptz not null default now()
);

create table public.player_badges (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  week_key text,
  created_at timestamptz not null default now(),
  unique nulls not distinct (player_id, badge_id, week_key)
);

create table public.app_settings (
  id boolean primary key default true check (id),
  require_parent_approval boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index players_display_order_idx on public.players(display_order, name);
create index practice_sessions_player_date_idx on public.practice_sessions(player_id, session_date desc);
create index practice_sessions_status_idx on public.practice_sessions(status);
create index practice_session_drills_session_idx on public.practice_session_drills(session_id);
create index drill_template_items_template_sort_idx on public.drill_template_items(template_id, sort_order);
create index player_badges_player_idx on public.player_badges(player_id);

insert into public.app_settings (id, require_parent_approval)
values (true, true)
on conflict (id) do nothing;

with inserted_templates as (
  insert into public.drill_templates (name, practice_type, editable)
  values
    ('Preset hitting', 'Game', false),
    ('Preset tee', 'Tee Work', false),
    ('Preset timing', 'Side Soft Toss', false),
    ('Preset fielding', 'Fielding', false)
  on conflict do nothing
  returning id, name
)
insert into public.drill_template_items (template_id, label, sort_order)
select inserted_templates.id, item.label, item.sort_order
from inserted_templates
join (
  values
    ('Preset hitting', 'dry swings: launch position', 10),
    ('Preset hitting', 'no-stride tee swings', 20),
    ('Preset hitting', 'regular tee swings', 30),
    ('Preset hitting', 'inside pitch tee', 40),
    ('Preset hitting', 'side soft toss: load, toss, swing', 50),
    ('Preset hitting', 'side soft toss: game reps', 60),
    ('Preset tee', 'dry swings: launch position', 10),
    ('Preset tee', 'no-stride tee swings', 20),
    ('Preset tee', 'regular tee swings', 30),
    ('Preset tee', 'inside pitch tee', 40),
    ('Preset timing', 'dry swings: launch position', 10),
    ('Preset timing', 'no-stride tee swings', 20),
    ('Preset timing', 'side soft toss: load, toss, swing', 30),
    ('Preset timing', 'side soft toss: game reps', 40),
    ('Preset fielding', 'ground balls', 10),
    ('Preset fielding', 'fly balls', 20),
    ('Preset fielding', 'throwing mechanics', 30),
    ('Preset fielding', 'catching practice', 40)
) as item(template_name, label, sort_order)
  on item.template_name = inserted_templates.name;

insert into public.badges (code, title, description, icon)
values
  ('ninety_minute_week', '90 Minute Week', 'Practiced at least 90 approved minutes in one Monday-start week.', '90'),
  ('three_day_streak', '3 Day Streak', 'Logged approved practice on 3 consecutive New York calendar days.', '3'),
  ('five_day_streak', '5 Day Streak', 'Logged approved practice on 5 consecutive New York calendar days.', '5'),
  ('tee_work_complete', 'Tee Work Complete', 'Logged Tee Work 3 times in one Monday-start week.', 'TEE'),
  ('soft_toss_complete', 'Soft Toss Complete', 'Logged Side Soft Toss 3 times in one Monday-start week.', 'ST'),
  ('balanced_hitter', 'Balanced Hitter', 'A switch hitter logged both left and right reps in one approved session.', 'LR'),
  ('summer_grinder', 'Summer Grinder', 'Reached 25% of the summer goal.', '25'),
  ('halfway_there', 'Halfway There', 'Reached 50% of the summer goal.', '50'),
  ('summer_goal_complete', 'Summer Goal Complete', 'Reached 100% of the summer goal.', '100')
on conflict (code) do update
set title = excluded.title,
    description = excluded.description,
    icon = excluded.icon;

grant usage on schema public to anon;
grant select, insert, update, delete on table
  public.players,
  public.practice_sessions,
  public.practice_session_drills,
  public.drill_templates,
  public.drill_template_items,
  public.badges,
  public.player_badges,
  public.app_settings
to anon;

alter table public.players enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.practice_session_drills enable row level security;
alter table public.drill_templates enable row level security;
alter table public.drill_template_items enable row level security;
alter table public.badges enable row level security;
alter table public.player_badges enable row level security;
alter table public.app_settings enable row level security;

create policy "anon can select players"
  on public.players for select to anon using (true);
create policy "anon can insert players"
  on public.players for insert to anon with check (true);
create policy "anon can update players"
  on public.players for update to anon using (true) with check (true);
create policy "anon can delete players"
  on public.players for delete to anon using (true);

create policy "anon can select practice sessions"
  on public.practice_sessions for select to anon using (true);
create policy "anon can insert practice sessions"
  on public.practice_sessions for insert to anon with check (true);
create policy "anon can update practice sessions"
  on public.practice_sessions for update to anon using (true) with check (true);
create policy "anon can delete practice sessions"
  on public.practice_sessions for delete to anon using (true);

create policy "anon can select practice session drills"
  on public.practice_session_drills for select to anon using (true);
create policy "anon can insert practice session drills"
  on public.practice_session_drills for insert to anon with check (true);
create policy "anon can update practice session drills"
  on public.practice_session_drills for update to anon using (true) with check (true);
create policy "anon can delete practice session drills"
  on public.practice_session_drills for delete to anon using (true);

create policy "anon can select drill templates"
  on public.drill_templates for select to anon using (true);
create policy "anon can insert drill templates"
  on public.drill_templates for insert to anon with check (true);
create policy "anon can update drill templates"
  on public.drill_templates for update to anon using (true) with check (true);
create policy "anon can delete drill templates"
  on public.drill_templates for delete to anon using (true);

create policy "anon can select drill template items"
  on public.drill_template_items for select to anon using (true);
create policy "anon can insert drill template items"
  on public.drill_template_items for insert to anon with check (true);
create policy "anon can update drill template items"
  on public.drill_template_items for update to anon using (true) with check (true);
create policy "anon can delete drill template items"
  on public.drill_template_items for delete to anon using (true);

create policy "anon can select badges"
  on public.badges for select to anon using (true);
create policy "anon can insert badges"
  on public.badges for insert to anon with check (true);
create policy "anon can update badges"
  on public.badges for update to anon using (true) with check (true);
create policy "anon can delete badges"
  on public.badges for delete to anon using (true);

create policy "anon can select player badges"
  on public.player_badges for select to anon using (true);
create policy "anon can insert player badges"
  on public.player_badges for insert to anon with check (true);
create policy "anon can update player badges"
  on public.player_badges for update to anon using (true) with check (true);
create policy "anon can delete player badges"
  on public.player_badges for delete to anon using (true);

create policy "anon can select app settings"
  on public.app_settings for select to anon using (true);
create policy "anon can insert app settings"
  on public.app_settings for insert to anon with check (id);
create policy "anon can update app settings"
  on public.app_settings for update to anon using (id) with check (id);
create policy "anon can delete app settings"
  on public.app_settings for delete to anon using (id);
