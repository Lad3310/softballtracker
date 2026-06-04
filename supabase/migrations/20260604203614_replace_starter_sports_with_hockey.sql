-- Replace unused starter sports while preserving Softball and family-created sports.
delete from public.softball_drill_templates
where sport_id in (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

delete from public.softball_sports
where id in (
  '10000000-0000-4000-8000-000000000002',
  '10000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000004'
);

insert into public.softball_sports (id, family_id, name, icon, display_order)
values ('10000000-0000-4000-8000-000000000005', null, 'Hockey', 'HK', 20)
on conflict (id) do update
set family_id = excluded.family_id,
    name = excluded.name,
    icon = excluded.icon,
    display_order = excluded.display_order;

insert into public.softball_drill_templates
  (id, family_id, sport_id, name, practice_type, editable)
values
  (
    '20000000-0000-4000-8000-000000000007',
    null,
    '10000000-0000-4000-8000-000000000005',
    'Stickhandling',
    'Stickhandling',
    false
  ),
  (
    '20000000-0000-4000-8000-000000000008',
    null,
    '10000000-0000-4000-8000-000000000005',
    'Shooting',
    'Shooting',
    false
  )
on conflict (id) do update
set family_id = excluded.family_id,
    sport_id = excluded.sport_id,
    name = excluded.name,
    practice_type = excluded.practice_type,
    editable = excluded.editable;

insert into public.softball_drill_template_items (id, template_id, label, sort_order)
values
  (
    '30000000-0000-4000-8000-000000000019',
    '20000000-0000-4000-8000-000000000007',
    'stationary puck control',
    10
  ),
  (
    '30000000-0000-4000-8000-000000000020',
    '20000000-0000-4000-8000-000000000007',
    'forehand and backhand touches',
    20
  ),
  (
    '30000000-0000-4000-8000-000000000021',
    '20000000-0000-4000-8000-000000000007',
    'stickhandle through cones',
    30
  ),
  (
    '30000000-0000-4000-8000-000000000022',
    '20000000-0000-4000-8000-000000000008',
    'wrist shots',
    10
  ),
  (
    '30000000-0000-4000-8000-000000000023',
    '20000000-0000-4000-8000-000000000008',
    'backhand shots',
    20
  ),
  (
    '30000000-0000-4000-8000-000000000024',
    '20000000-0000-4000-8000-000000000008',
    'shoot to targets',
    30
  )
on conflict (id) do update
set template_id = excluded.template_id,
    label = excluded.label,
    sort_order = excluded.sort_order;

notify pgrst, 'reload schema';
