-- documents / document_items update policies for anon

alter table public.documents enable row level security;
alter table public.document_items enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'documents'
       and policyname = 'documents_update_anon'
  ) then
    create policy documents_update_anon
      on public.documents
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'document_items'
       and policyname = 'document_items_update_anon'
  ) then
    create policy document_items_update_anon
      on public.document_items
      for update
      to anon
      using (true)
      with check (true);
  end if;
end
$$;
