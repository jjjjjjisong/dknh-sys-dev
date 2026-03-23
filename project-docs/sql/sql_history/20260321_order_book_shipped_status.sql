alter table if exists public.order_book
  add column if not exists shipped_status text not null default '미출고';

update public.order_book
set shipped_status = '미출고'
where shipped_status is null
   or shipped_status = '';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'order_book_shipped_status_check'
  ) then
    alter table public.order_book
      add constraint order_book_shipped_status_check
      check (shipped_status in ('미출고', '출고'));
  end if;
end
$$;

create index if not exists idx_order_book_shipped_status on public.order_book (shipped_status);
