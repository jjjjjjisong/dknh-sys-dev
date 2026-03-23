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
