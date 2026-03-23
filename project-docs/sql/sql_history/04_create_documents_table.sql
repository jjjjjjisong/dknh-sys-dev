create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  issue_no text not null,
  client text not null,
  manager text not null default '',
  manager_tel text not null default '',
  receiver text not null default '',
  supplier_biz_no text not null default '',
  supplier_name text not null default '',
  supplier_owner text not null default '',
  supplier_address text not null default '',
  supplier_business_type text not null default '',
  supplier_business_item text not null default '',
  order_date date null,
  arrive_date date null,
  delivery_addr text not null default '',
  remark text not null default '',
  request_note text not null default '',
  total_supply numeric not null default 0,
  total_vat numeric not null default 0,
  total_amount numeric not null default 0,
  author text not null default '',
  status text not null default 'ST00',
  del_yn text not null default 'N',
  updated_by text not null default '',
  constraint documents_status_check check (status in ('ST00', 'ST01')),
  constraint documents_del_yn_check check (del_yn in ('Y', 'N'))
);

create index if not exists idx_documents_created_at on public.documents (created_at desc);
create index if not exists idx_documents_issue_no on public.documents (issue_no);
create index if not exists idx_documents_status on public.documents (status);
create index if not exists idx_documents_del_yn on public.documents (del_yn);
create index if not exists idx_documents_updated_at_v2 on public.documents (updated_at desc);
