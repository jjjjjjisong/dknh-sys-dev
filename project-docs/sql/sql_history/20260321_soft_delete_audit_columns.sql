-- Soft delete + audit column migration
-- Apply after the base table creation scripts.

alter table if exists public.accounts
  add column if not exists del_yn text not null default 'N',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by text not null default '';

alter table if exists public.clients
  add column if not exists del_yn text not null default 'N',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by text not null default '';

alter table if exists public.products
  add column if not exists del_yn text not null default 'N',
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists updated_by text not null default '';

alter table if exists public.documents
  add column if not exists del_yn text not null default 'N',
  add column if not exists updated_by text not null default '';

alter table if exists public.document_items
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists del_yn text not null default 'N',
  add column if not exists updated_by text not null default '';

alter table if exists public.order_book
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists del_yn text not null default 'N',
  add column if not exists updated_by text not null default '';

update public.accounts
set
  del_yn = coalesce(nullif(del_yn, ''), 'N'),
  updated_at = coalesce(updated_at, created_at, now()),
  updated_by = coalesce(nullif(updated_by, ''), 'system');

update public.clients
set
  del_yn = coalesce(nullif(del_yn, ''), 'N'),
  updated_at = coalesce(updated_at, created_at, now()),
  updated_by = coalesce(nullif(updated_by, ''), 'system');

update public.products
set
  del_yn = coalesce(nullif(del_yn, ''), 'N'),
  updated_at = coalesce(updated_at, created_at, now()),
  updated_by = coalesce(nullif(updated_by, ''), 'system');

update public.documents
set
  del_yn = coalesce(nullif(del_yn, ''), 'N'),
  updated_at = coalesce(updated_at, created_at, now()),
  updated_by = coalesce(nullif(updated_by, ''), coalesce(nullif(author, ''), 'system'));

update public.document_items
set
  del_yn = coalesce(nullif(del_yn, ''), 'N'),
  created_at = coalesce(created_at, now()),
  updated_at = coalesce(updated_at, created_at, now()),
  updated_by = coalesce(nullif(updated_by, ''), 'system');

update public.order_book
set
  del_yn = coalesce(nullif(del_yn, ''), 'N'),
  updated_at = coalesce(updated_at, created_at, now()),
  updated_by = coalesce(nullif(updated_by, ''), 'system');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'accounts_del_yn_check'
  ) then
    alter table public.accounts
      add constraint accounts_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'clients_del_yn_check'
  ) then
    alter table public.clients
      add constraint clients_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_del_yn_check'
  ) then
    alter table public.products
      add constraint products_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'documents_del_yn_check'
  ) then
    alter table public.documents
      add constraint documents_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'document_items_del_yn_check'
  ) then
    alter table public.document_items
      add constraint document_items_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_book_del_yn_check'
  ) then
    alter table public.order_book
      add constraint order_book_del_yn_check
      check (del_yn in ('Y', 'N'));
  end if;
end $$;

create index if not exists idx_accounts_del_yn on public.accounts (del_yn);
create index if not exists idx_clients_del_yn on public.clients (del_yn);
create index if not exists idx_products_del_yn on public.products (del_yn);
create index if not exists idx_documents_del_yn on public.documents (del_yn);
create index if not exists idx_document_items_del_yn on public.document_items (del_yn);
create index if not exists idx_order_book_del_yn on public.order_book (del_yn);

create index if not exists idx_accounts_updated_at on public.accounts (updated_at desc);
create index if not exists idx_clients_updated_at on public.clients (updated_at desc);
create index if not exists idx_products_updated_at on public.products (updated_at desc);
create index if not exists idx_documents_updated_at_v2 on public.documents (updated_at desc);
create index if not exists idx_document_items_updated_at on public.document_items (updated_at desc);
create index if not exists idx_order_book_updated_at on public.order_book (updated_at desc);
