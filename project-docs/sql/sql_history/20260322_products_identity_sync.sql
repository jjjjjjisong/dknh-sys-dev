create sequence if not exists public.products_id_seq;

alter sequence public.products_id_seq owned by public.products.id;

alter table public.products
  alter column id set default nextval('public.products_id_seq');

select setval(
  'public.products_id_seq',
  coalesce((select max(id) from public.products), 0) + 1,
  false
);
