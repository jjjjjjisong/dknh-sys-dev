alter table public.approvals enable row level security;
alter table public.approval_steps enable row level security;
alter table public.approval_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approvals' and policyname = 'approvals_select_anon'
  ) then
    create policy approvals_select_anon on public.approvals for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approvals' and policyname = 'approvals_insert_anon'
  ) then
    create policy approvals_insert_anon on public.approvals for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approvals' and policyname = 'approvals_update_anon'
  ) then
    create policy approvals_update_anon on public.approvals for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approval_steps' and policyname = 'approval_steps_select_anon'
  ) then
    create policy approval_steps_select_anon on public.approval_steps for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approval_steps' and policyname = 'approval_steps_insert_anon'
  ) then
    create policy approval_steps_insert_anon on public.approval_steps for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approval_steps' and policyname = 'approval_steps_update_anon'
  ) then
    create policy approval_steps_update_anon on public.approval_steps for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approval_events' and policyname = 'approval_events_select_anon'
  ) then
    create policy approval_events_select_anon on public.approval_events for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approval_events' and policyname = 'approval_events_insert_anon'
  ) then
    create policy approval_events_insert_anon on public.approval_events for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'approval_events' and policyname = 'approval_events_update_anon'
  ) then
    create policy approval_events_update_anon on public.approval_events for update to anon using (true) with check (true);
  end if;
end
$$;
