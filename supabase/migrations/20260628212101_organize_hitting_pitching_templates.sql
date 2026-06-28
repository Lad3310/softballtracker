-- Make kid-facing softball practice plans match the reorganized Hitting and Pitching guides.
-- Existing practice sessions are left unchanged; this only updates reusable drill templates.

insert into public.softball_drill_templates
  (id, family_id, sport_id, name, practice_type, editable)
select
  gen_random_uuid(),
  null,
  '10000000-0000-4000-8000-000000000001',
  'Hitting: hips-first work',
  'Hips-First Hitting',
  false
where not exists (
  select 1
  from public.softball_drill_templates
  where family_id is null
    and sport_id = '10000000-0000-4000-8000-000000000001'
    and practice_type = 'Hips-First Hitting'
);

insert into public.softball_drill_templates
  (id, family_id, sport_id, name, practice_type, editable)
select
  gen_random_uuid(),
  null,
  '10000000-0000-4000-8000-000000000001',
  'Pitching: 20-minute session',
  'Pitching Session',
  false
where not exists (
  select 1
  from public.softball_drill_templates
  where family_id is null
    and sport_id = '10000000-0000-4000-8000-000000000001'
    and practice_type in ('Pitching Session', 'Pitching Practice')
);

update public.softball_drill_templates
set practice_type = 'Hitting Practice'
where sport_id = '10000000-0000-4000-8000-000000000001'
  and practice_type = 'Game';

update public.softball_drill_templates
set practice_type = 'Soft Toss Timing'
where sport_id = '10000000-0000-4000-8000-000000000001'
  and practice_type = 'Side Soft Toss';

update public.softball_drill_templates
set practice_type = 'Pitching Session'
where sport_id = '10000000-0000-4000-8000-000000000001'
  and practice_type = 'Pitching Practice';

update public.softball_drill_templates
set name = case practice_type
  when 'Hitting Practice' then 'Hitting: regular swings'
  when 'Hips-First Hitting' then 'Hitting: hips-first work'
  when 'Tee Work' then 'Hitting: tee work station'
  when 'Soft Toss Timing' then 'Hitting: timing / soft toss'
  when 'Pitching Session' then 'Pitching: 20-minute session'
  else name
end
where sport_id = '10000000-0000-4000-8000-000000000001'
  and practice_type in (
    'Hitting Practice',
    'Hips-First Hitting',
    'Tee Work',
    'Soft Toss Timing',
    'Pitching Session'
  );

delete from public.softball_drill_template_items item
using public.softball_drill_templates template
where item.template_id = template.id
  and template.sport_id = '10000000-0000-4000-8000-000000000001'
  and template.practice_type in (
    'Hitting Practice',
    'Hips-First Hitting',
    'Tee Work',
    'Soft Toss Timing',
    'Pitching Session'
  );

with source_items(practice_type, label, sort_order) as (
  values
    ('Hitting Practice', 'grip and stance check', 10),
    ('Hitting Practice', 'dry swings: launch position', 20),
    ('Hitting Practice', 'step-and-swing load drill', 30),
    ('Hitting Practice', 'side soft toss: load, toss, swing', 40),
    ('Hitting Practice', 'side soft toss: game reps', 50),
    ('Hips-First Hitting', 'hips-first half turns', 10),
    ('Hips-First Hitting', 'step-and-swing load drill', 20),
    ('Hips-First Hitting', 'knob to knee', 30),
    ('Hips-First Hitting', 'hips-first tee challenge', 40),
    ('Hips-First Hitting', 'hold finish for one count', 50),
    ('Tee Work', 'tee setup check', 10),
    ('Tee Work', 'no-stride tee swings', 20),
    ('Tee Work', 'hips-first tee challenge', 30),
    ('Tee Work', 'inside/middle/outside tee', 40),
    ('Tee Work', 'high-low tee path', 50),
    ('Tee Work', 'finish hold', 60),
    ('Soft Toss Timing', 'dry swings: launch position', 10),
    ('Soft Toss Timing', 'no-stride tee swings', 20),
    ('Soft Toss Timing', 'side soft toss: load, toss, swing', 30),
    ('Soft Toss Timing', 'side soft toss: game reps', 40),
    ('Pitching Session', 'warm-up throws and relaxed circles', 10),
    ('Pitching Session', 'Power-Line Walk', 20),
    ('Pitching Session', 'Power-K Freeze', 30),
    ('Pitching Session', 'Walk-Through Pitch', 40),
    ('Pitching Session', 'Three-Zone Target Game', 50),
    ('Pitching Session', 'Finish & Field', 60)
),
target_templates as (
  select id, practice_type
  from public.softball_drill_templates
  where sport_id = '10000000-0000-4000-8000-000000000001'
    and practice_type in (
      'Hitting Practice',
      'Hips-First Hitting',
      'Tee Work',
      'Soft Toss Timing',
      'Pitching Session'
    )
)
insert into public.softball_drill_template_items
  (id, template_id, label, sort_order)
select
  gen_random_uuid(),
  target_templates.id,
  source_items.label,
  source_items.sort_order
from target_templates
join source_items using (practice_type);

notify pgrst, 'reload schema';
