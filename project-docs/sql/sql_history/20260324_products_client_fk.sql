alter table public.products
  add column if not exists client_id bigint null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'products_client_id_fkey'
  ) then
    alter table public.products
      add constraint products_client_id_fkey
      foreign key (client_id) references public.clients(id);
  end if;
end
$$;

create index if not exists idx_products_client_id on public.products (client_id);

with uniquely_named_clients as (
  select name, min(id) as id
  from public.clients
  where del_yn = 'N'
  group by name
  having count(*) = 1
)
update public.products p
set client_id = uc.id
from uniquely_named_clients uc
where p.client_id is null
  and p.client = uc.name;

-- Verification queries:
-- 1) Products that could not be matched to an active client by name
-- select id, client, name1
-- from public.products
-- where del_yn = 'N' and client_id is null
-- order by id;
--
-- 2) Active client names that are duplicated and need cleanup
-- select name, count(*) as cnt, array_agg(id order by id) as client_ids
-- from public.clients
-- where del_yn = 'N'
-- group by name
-- having count(*) > 1
-- order by name;
