alter table public.document_items
  add column if not exists product_id bigint null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'document_items_product_id_fkey'
  ) then
    alter table public.document_items
      add constraint document_items_product_id_fkey
      foreign key (product_id) references public.products(id);
  end if;
end
$$;

create index if not exists idx_document_items_product_id
  on public.document_items (product_id);

with candidate_products as (
  select
    di.id as document_item_id,
    p.id as product_id,
    row_number() over (
      partition by di.id
      order by p.id desc
    ) as rn,
    count(*) over (
      partition by di.id
    ) as match_count
  from public.document_items di
  join public.documents d
    on d.id = di.document_id
  join public.products p
    on p.del_yn = 'N'
   and (
      (d.client_id is not null and p.client_id = d.client_id)
      or (
        d.client_id is null
        and nullif(trim(d.client), '') is not null
        and p.client = d.client
      )
   )
   and p.name1 = di.name1
  where di.del_yn = 'N'
    and di.product_id is null
),
resolved as (
  select document_item_id, product_id
  from candidate_products
  where rn = 1
    and match_count = 1
)
update public.document_items di
set product_id = resolved.product_id
from resolved
where di.id = resolved.document_item_id
  and di.product_id is null;

update public.order_book ob
set product_id = di.product_id
from public.document_items di
where ob.document_item_id = di.id
  and ob.del_yn = 'N'
  and di.del_yn = 'N'
  and ob.product_id is distinct from di.product_id;

-- Verification:
-- select id, document_id, name1, product_id
-- from public.document_items
-- where del_yn = 'N'
-- order by document_id, seq;
--
-- select di.id, d.issue_no, d.client, di.name1
-- from public.document_items di
-- join public.documents d on d.id = di.document_id
-- where di.del_yn = 'N'
--   and di.product_id is null
-- order by d.created_at desc, di.seq;
