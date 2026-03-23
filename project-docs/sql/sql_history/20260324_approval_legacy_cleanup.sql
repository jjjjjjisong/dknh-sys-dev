do $$
declare
  approvals_exists boolean;
  steps_exists boolean;
  events_exists boolean;
  approvals_count bigint := 0;
  steps_count bigint := 0;
  events_count bigint := 0;
begin
  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_approvals'
  ) into approvals_exists;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_approval_steps'
  ) into steps_exists;

  select exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'document_approval_events'
  ) into events_exists;

  if approvals_exists then
    execute 'select count(*) from public.document_approvals' into approvals_count;
  end if;

  if steps_exists then
    execute 'select count(*) from public.document_approval_steps' into steps_count;
  end if;

  if events_exists then
    execute 'select count(*) from public.document_approval_events' into events_count;
  end if;

  if approvals_exists and steps_exists and events_exists
     and approvals_count = 0 and steps_count = 0 and events_count = 0 then
    drop table public.document_approval_events;
    drop table public.document_approval_steps;
    drop table public.document_approvals;
  else
    raise notice 'Legacy approval tables were kept. approvals=%, steps=%, events=%', approvals_count, steps_count, events_count;
  end if;
end
$$;

