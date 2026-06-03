drop policy if exists "softball family members can manage drill templates"
  on public.softball_drill_templates;

drop policy if exists "softball family members can manage drill template items"
  on public.softball_drill_template_items;

create policy "softball family members can insert drill templates"
  on public.softball_drill_templates for insert to authenticated
  with check (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_drill_templates.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can update drill templates"
  on public.softball_drill_templates for update to authenticated
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

create policy "softball family members can delete drill templates"
  on public.softball_drill_templates for delete to authenticated
  using (
    family_id is not null
    and exists (
      select 1
      from public.softball_family_members fm
      where fm.family_id = softball_drill_templates.family_id
        and fm.user_id = (select auth.uid())
    )
  );

create policy "softball family members can insert drill template items"
  on public.softball_drill_template_items for insert to authenticated
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

create policy "softball family members can update drill template items"
  on public.softball_drill_template_items for update to authenticated
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

create policy "softball family members can delete drill template items"
  on public.softball_drill_template_items for delete to authenticated
  using (
    exists (
      select 1
      from public.softball_drill_templates dt
      join public.softball_family_members fm on fm.family_id = dt.family_id
      where dt.id = softball_drill_template_items.template_id
        and dt.family_id is not null
        and fm.user_id = (select auth.uid())
    )
  );

create index if not exists softball_player_badges_badge_idx
  on public.softball_player_badges(badge_id);
