alter table public.documents
  add column if not exists supplier_biz_no text not null default '',
  add column if not exists supplier_name text not null default '',
  add column if not exists supplier_owner text not null default '',
  add column if not exists supplier_address text not null default '',
  add column if not exists supplier_business_type text not null default '',
  add column if not exists supplier_business_item text not null default '';

update public.documents
set
  supplier_biz_no = coalesce(nullif(supplier_biz_no, ''), '113 - 88 - 02729'),
  supplier_name = coalesce(nullif(supplier_name, ''), '디케이앤에이치'),
  supplier_owner = coalesce(nullif(supplier_owner, ''), '김 주 영'),
  supplier_address = coalesce(nullif(supplier_address, ''), '서울 동대문구 천호대로 21, 5층 507호'),
  supplier_business_type = coalesce(nullif(supplier_business_type, ''), '도매 및 소매업'),
  supplier_business_item = coalesce(nullif(supplier_business_item, ''), '식품용기류(플라스틱용기)')
where supplier_biz_no = ''
   or supplier_name = ''
   or supplier_owner = ''
   or supplier_address = ''
   or supplier_business_type = ''
   or supplier_business_item = '';
