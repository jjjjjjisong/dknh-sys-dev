# Product Client FK

## Goal

Move product-to-client linkage away from client name text only and add a foreign key based on `clients.id`.

## Added column

- `products.client_id bigint null references clients(id)`

The existing `products.client` text column is intentionally kept for now.

## Why keep both for now

- Existing data may already store client names only
- Some rows may not match cleanly if client names were edited or duplicated
- We can migrate safely first, then tighten rules after cleanup

## Migration behavior

[`20260324_products_client_fk.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/sql_history/20260324_products_client_fk.sql)

- adds `client_id`
- creates the FK constraint
- fills `client_id` only when the client name maps to exactly one active client
- leaves unmatched or ambiguous rows as `null`

## Recommended checks after running

```sql
select id, client, client_id, name1
from public.products
where del_yn = 'N'
order by id;
```

```sql
select id, client, name1
from public.products
where del_yn = 'N' and client_id is null
order by id;
```

```sql
select name, count(*) as cnt, array_agg(id order by id) as client_ids
from public.clients
where del_yn = 'N'
group by name
having count(*) > 1
order by name;
```

## Next step

After null or duplicate cases are cleaned up, we can update the app logic to save `client_id` as the main link and optionally make `products.client_id` required.
