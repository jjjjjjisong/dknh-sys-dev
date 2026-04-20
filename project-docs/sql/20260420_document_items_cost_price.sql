alter table public.document_items
  add column if not exists cost_price numeric null;

comment on column public.document_items.cost_price is
  '문서 작성 당시의 입고단가 스냅샷';
