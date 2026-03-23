alter table public.accounts enable row level security;
alter table public.clients enable row level security;
alter table public.products enable row level security;
alter table public.documents enable row level security;
alter table public.document_items enable row level security;
alter table public.order_book enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'accounts_select_anon'
  ) then
    create policy accounts_select_anon on public.accounts for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'accounts_insert_anon'
  ) then
    create policy accounts_insert_anon on public.accounts for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'accounts_update_anon'
  ) then
    create policy accounts_update_anon on public.accounts for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'accounts' and policyname = 'accounts_delete_anon'
  ) then
    create policy accounts_delete_anon on public.accounts for delete to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_select_anon'
  ) then
    create policy clients_select_anon on public.clients for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_insert_anon'
  ) then
    create policy clients_insert_anon on public.clients for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_update_anon'
  ) then
    create policy clients_update_anon on public.clients for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'clients' and policyname = 'clients_delete_anon'
  ) then
    create policy clients_delete_anon on public.clients for delete to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'products_select_anon'
  ) then
    create policy products_select_anon on public.products for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'products_insert_anon'
  ) then
    create policy products_insert_anon on public.products for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'products_update_anon'
  ) then
    create policy products_update_anon on public.products for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'products' and policyname = 'products_delete_anon'
  ) then
    create policy products_delete_anon on public.products for delete to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_select_anon'
  ) then
    create policy documents_select_anon on public.documents for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_insert_anon'
  ) then
    create policy documents_insert_anon on public.documents for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'documents' and policyname = 'documents_update_anon'
  ) then
    create policy documents_update_anon on public.documents for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_items' and policyname = 'document_items_select_anon'
  ) then
    create policy document_items_select_anon on public.document_items for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_items' and policyname = 'document_items_insert_anon'
  ) then
    create policy document_items_insert_anon on public.document_items for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'document_items' and policyname = 'document_items_update_anon'
  ) then
    create policy document_items_update_anon on public.document_items for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_select_anon'
  ) then
    create policy order_book_select_anon on public.order_book for select to anon using (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_insert_anon'
  ) then
    create policy order_book_insert_anon on public.order_book for insert to anon with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_update_anon'
  ) then
    create policy order_book_update_anon on public.order_book for update to anon using (true) with check (true);
  end if;

  if not exists (
    select 1 from pg_policies where schemaname = 'public' and tablename = 'order_book' and policyname = 'order_book_delete_anon'
  ) then
    create policy order_book_delete_anon on public.order_book for delete to anon using (true);
  end if;
end
$$;
