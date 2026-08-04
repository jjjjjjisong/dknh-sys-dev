grant usage on schema public to anon, authenticated, service_role;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'accounts',
    'clients',
    'suppliers',
    'products',
    'documents',
    'document_items',
    'order_book',
    'product_masters',
    'approvals',
    'approval_steps',
    'approval_events',
    'mcee_press_releases',
    'mcee_crawl_keywords',
    'daily_sales_notes',
    'monthly_summary_notes',
    'shipping_schedule_drafts',
    'price_change_logs'
  ]
  loop
    if to_regclass(format('public.%I', table_name)) is not null then
      execute format(
        'grant select, insert, update, delete on table public.%I to anon, authenticated, service_role',
        table_name
      );
    end if;
  end loop;
end
$$;

grant usage, select
  on all sequences in schema public
  to anon, authenticated, service_role;
