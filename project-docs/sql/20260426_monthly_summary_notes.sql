create table if not exists public.monthly_summary_notes (
  year_month text not null,
  client_id bigint not null references public.clients(id),
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default '',
  primary key (year_month, client_id)
);

alter table public.monthly_summary_notes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monthly_summary_notes'
      and policyname = 'monthly_summary_notes_select_anon'
  ) then
    create policy monthly_summary_notes_select_anon
      on public.monthly_summary_notes
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monthly_summary_notes'
      and policyname = 'monthly_summary_notes_insert_anon'
  ) then
    create policy monthly_summary_notes_insert_anon
      on public.monthly_summary_notes
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'monthly_summary_notes'
      and policyname = 'monthly_summary_notes_update_anon'
  ) then
    create policy monthly_summary_notes_update_anon
      on public.monthly_summary_notes
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
