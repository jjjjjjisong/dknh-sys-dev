-- Document / order_book status migration
-- ST00 = 정상
-- ST01 = 거래취소

alter table if exists public.documents
  add column if not exists status text not null default 'ST00';

alter table if exists public.order_book
  add column if not exists status text not null default 'ST00';

update public.documents
set status = case
  when coalesce(cancelled, false) = true then 'ST01'
  else 'ST00'
end
where status is null
   or status = ''
   or status not in ('ST00', 'ST01');

update public.order_book
set status = case
  when coalesce(cancelled, false) = true then 'ST01'
  else 'ST00'
end
where status is null
   or status = ''
   or status not in ('ST00', 'ST01');

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_status_check'
  ) then
    alter table public.documents
      add constraint documents_status_check
      check (status in ('ST00', 'ST01'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_status_check'
  ) then
    alter table public.order_book
      add constraint order_book_status_check
      check (status in ('ST00', 'ST01'));
  end if;
end
$$;

create index if not exists idx_documents_status on public.documents (status);
create index if not exists idx_order_book_status on public.order_book (status);
