with ranked_products as (
  select
    p.*,
    row_number() over (
      partition by p.name1
      order by
        case when nullif(trim(p.name2), '') is not null then 0 else 1 end,
        p.updated_at desc,
        p.id desc
    ) as rn
  from public.products p
  where p.del_yn = 'N'
    and nullif(trim(p.name1), '') is not null
),
seed_rows as (
  select
    gubun,
    name1,
    coalesce(nullif(trim(name2), ''), name1) as name2
  from ranked_products
  where rn = 1
),
inserted as (
  insert into public.product_masters (
    gubun,
    name1,
    name2,
    del_yn,
    updated_by
  )
  select
    coalesce(nullif(trim(gubun), ''), '기타'),
    name1,
    name2,
    'N',
    'system'
  from seed_rows
  where not exists (
    select 1
    from public.product_masters pm
    where pm.del_yn = 'N'
      and pm.name1 = seed_rows.name1
  )
  returning id, name1
)
update public.products p
set product_master_id = pm.id
from public.product_masters pm
where p.del_yn = 'N'
  and nullif(trim(p.name1), '') is not null
  and p.product_master_id is null
  and pm.del_yn = 'N'
  and pm.name1 = p.name1;

-- Verification:
-- select id, name1, name2, gubun
-- from public.product_masters
-- where del_yn = 'N'
-- order by name1;
--
-- select id, client, name1, product_master_id
-- from public.products
-- where del_yn = 'N'
--   and product_master_id is null
-- order by client, name1;
