alter table public.documents
  add column if not exists client_id bigint null,
  add column if not exists author_id text null;

alter table public.document_items
  add column if not exists product_id bigint null;

alter table public.order_book
  add column if not exists client_id bigint null,
  add column if not exists product_id bigint null,
  add column if not exists document_item_id bigint null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'documents_client_id_fkey'
  ) then
    alter table public.documents
      add constraint documents_client_id_fkey
      foreign key (client_id) references public.clients(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'documents_author_id_fkey'
  ) then
    alter table public.documents
      add constraint documents_author_id_fkey
      foreign key (author_id) references public.accounts(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'document_items_product_id_fkey'
  ) then
    alter table public.document_items
      add constraint document_items_product_id_fkey
      foreign key (product_id) references public.products(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_doc_id_fkey'
  ) then
    alter table public.order_book
      add constraint order_book_doc_id_fkey
      foreign key (doc_id) references public.documents(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_client_id_fkey'
  ) then
    alter table public.order_book
      add constraint order_book_client_id_fkey
      foreign key (client_id) references public.clients(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_product_id_fkey'
  ) then
    alter table public.order_book
      add constraint order_book_product_id_fkey
      foreign key (product_id) references public.products(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_document_item_id_fkey'
  ) then
    alter table public.order_book
      add constraint order_book_document_item_id_fkey
      foreign key (document_item_id) references public.document_items(id);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'order_book_from_doc_requires_doc_id_check'
  ) then
    alter table public.order_book
      add constraint order_book_from_doc_requires_doc_id_check
      check (from_doc = false or doc_id is not null);
  end if;
end
$$;

create index if not exists idx_documents_client_id on public.documents (client_id);
create index if not exists idx_documents_author_id on public.documents (author_id);
create index if not exists idx_document_items_product_id on public.document_items (product_id);
create index if not exists idx_order_book_client_id on public.order_book (client_id);
create index if not exists idx_order_book_product_id on public.order_book (product_id);
create index if not exists idx_order_book_document_item_id on public.order_book (document_item_id);

