alter table public.product_masters
  add column if not exists ea_per_b integer null;

alter table public.product_masters
  add column if not exists box_per_p integer null;

alter table public.product_masters
  add column if not exists ea_per_p integer null;

alter table public.product_masters
  add column if not exists pallets_per_truck integer null;

alter table public.products
  add column if not exists receiver text not null default '';
