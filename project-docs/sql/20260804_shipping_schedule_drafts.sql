create table if not exists public.shipping_schedule_drafts (
  order_book_id uuid primary key references public.order_book(id) on delete cascade,
  schedule_date date not null,
  dispatch text not null default '',
  note text not null default '',
  updated_at timestamptz not null default now(),
  updated_by text not null default ''
);

create index if not exists idx_shipping_schedule_drafts_date
  on public.shipping_schedule_drafts (schedule_date);

alter table public.shipping_schedule_drafts enable row level security;

grant usage on schema public to anon, authenticated, service_role;

grant select, insert, update, delete
  on table public.shipping_schedule_drafts
  to anon, authenticated, service_role;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shipping_schedule_drafts'
      and policyname = 'shipping_schedule_drafts_select_anon'
  ) then
    create policy shipping_schedule_drafts_select_anon
      on public.shipping_schedule_drafts
      for select
      to anon
      using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shipping_schedule_drafts'
      and policyname = 'shipping_schedule_drafts_insert_anon'
  ) then
    create policy shipping_schedule_drafts_insert_anon
      on public.shipping_schedule_drafts
      for insert
      to anon
      with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'shipping_schedule_drafts'
      and policyname = 'shipping_schedule_drafts_update_anon'
  ) then
    create policy shipping_schedule_drafts_update_anon
      on public.shipping_schedule_drafts
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
