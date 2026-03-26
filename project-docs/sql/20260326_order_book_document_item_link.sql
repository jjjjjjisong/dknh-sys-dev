alter table public.order_book
  add column if not exists document_item_id bigint null;

create index if not exists idx_order_book_document_item_id
  on public.order_book (document_item_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'order_book_document_item_id_fkey'
  ) then
    alter table public.order_book
      add constraint order_book_document_item_id_fkey
      foreign key (document_item_id) references public.document_items(id);
  end if;
end
$$;

with ranked_items as (
  select
    di.id as document_item_id,
    di.document_id,
    di.seq,
    di.arrive_date,
    row_number() over (
      partition by di.document_id
      order by coalesce(di.seq, 0), di.id
    ) as rn
  from public.document_items di
  where di.del_yn = 'N'
),
ranked_order_book as (
  select
    ob.id as order_book_id,
    ob.doc_id,
    row_number() over (
      partition by ob.doc_id
      order by ob.created_at, ob.id
    ) as rn
  from public.order_book ob
  where ob.del_yn = 'N'
    and ob.from_doc = true
    and ob.doc_id is not null
),
matched as (
  select
    ob.order_book_id,
    di.document_item_id,
    di.arrive_date
  from ranked_order_book ob
  join ranked_items di
    on di.document_id = ob.doc_id
   and di.rn = ob.rn
)
update public.order_book ob
set
  document_item_id = matched.document_item_id,
  deadline = coalesce(matched.arrive_date, ob.deadline)
from matched
where ob.id = matched.order_book_id
  and (
    ob.document_item_id is distinct from matched.document_item_id
    or ob.deadline is distinct from coalesce(matched.arrive_date, ob.deadline)
  );
