create extension if not exists "pgcrypto";

create table if not exists public.order_book (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  doc_id uuid null,
  issue_no text not null default '',
  date date null,
  deadline date null,
  client text not null default '',
  product text not null default '',
  qty integer not null default 0,
  note text not null default '',
  receipt text not null default '',
  status text not null default 'ST00',
  shipped_status text not null default '미출고',
  from_doc boolean not null default false,
  del_yn text not null default 'N',
  updated_by text not null default ''
);

alter table public.order_book add column if not exists created_at timestamptz not null default now();
alter table public.order_book add column if not exists updated_at timestamptz not null default now();
alter table public.order_book add column if not exists doc_id uuid null;
alter table public.order_book add column if not exists issue_no text not null default '';
alter table public.order_book add column if not exists date date null;
alter table public.order_book add column if not exists deadline date null;
alter table public.order_book add column if not exists client text not null default '';
alter table public.order_book add column if not exists product text not null default '';
alter table public.order_book add column if not exists qty integer not null default 0;
alter table public.order_book add column if not exists note text not null default '';
alter table public.order_book add column if not exists receipt text not null default '';
alter table public.order_book add column if not exists status text not null default 'ST00';
alter table public.order_book add column if not exists shipped_status text not null default '미출고';
alter table public.order_book add column if not exists from_doc boolean not null default false;
alter table public.order_book add column if not exists del_yn text not null default 'N';
alter table public.order_book add column if not exists updated_by text not null default '';

update public.order_book
set
  status = coalesce(nullif(status, ''), 'ST00'),
  shipped_status = coalesce(nullif(shipped_status, ''), '미출고'),
  del_yn = coalesce(nullif(del_yn, ''), 'N'),
  updated_at = coalesce(updated_at, created_at, now()),
  updated_by = coalesce(nullif(updated_by, ''), 'system')
where status is null
   or status = ''
   or shipped_status is null
   or shipped_status = ''
   or del_yn is null
   or del_yn = ''
   or updated_at is null
   or updated_by is null
   or updated_by = '';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_book_status_check'
  ) then
    alter table public.order_book
      add constraint order_book_status_check
      check (status in ('ST00', 'ST01'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_shipped_status_check'
  ) then
    alter table public.order_book
      add constraint order_book_shipped_status_check
      check (shipped_status in ('미출고', '출고'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_del_yn_check'
  ) then
    alter table public.order_book
      add constraint order_book_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;
end
$$;

create index if not exists idx_order_book_created_at on public.order_book (created_at desc);
create index if not exists idx_order_book_date on public.order_book (date desc);
create index if not exists idx_order_book_client on public.order_book (client);
create index if not exists idx_order_book_doc_id on public.order_book (doc_id);
create index if not exists idx_order_book_status on public.order_book (status);
create index if not exists idx_order_book_shipped_status on public.order_book (shipped_status);
create index if not exists idx_order_book_del_yn on public.order_book (del_yn);
create index if not exists idx_order_book_updated_at on public.order_book (updated_at desc);

alter table public.order_book enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_select_anon'
  ) then
    create policy order_book_select_anon on public.order_book for select to anon using (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_insert_anon'
  ) then
    create policy order_book_insert_anon on public.order_book for insert to anon with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_update_anon'
  ) then
    create policy order_book_update_anon on public.order_book for update to anon using (true) with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_delete_anon'
  ) then
    create policy order_book_delete_anon on public.order_book for delete to anon using (true);
  end if;
end
$$;
