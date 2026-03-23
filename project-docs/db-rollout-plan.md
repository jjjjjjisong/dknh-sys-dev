# DB Rollout Plan

## Scope

This rollout covers the remaining DB hardening work after the approval engine setup:

- add FK-ready relation columns for `documents`, `document_items`, `order_book`
- harden account authentication columns for production migration
- safely remove old `document_approval_*` tables if they are empty

`clients.name` duplication is intentionally allowed and is not restricted by this plan.

## Existing DB

Run these in order on the current database:

1. [`20260324_documents_orderbook_relations.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/sql_history/20260324_documents_orderbook_relations.sql)
2. [`20260324_accounts_auth_hardening.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/sql_history/20260324_accounts_auth_hardening.sql)
3. [`20260324_approval_legacy_cleanup.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/sql_history/20260324_approval_legacy_cleanup.sql)

Optional if not already applied earlier:

4. [`20260324_products_client_fk.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/sql_history/20260324_products_client_fk.sql)

## Fresh Server Setup

For a new production database, run the usual base setup files and then additionally run:

1. [`06_approvals.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/06_approvals.sql)
2. [`07_relational_hardening.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/07_relational_hardening.sql)
3. [`08_account_auth_hardening.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/08_account_auth_hardening.sql)
4. [`90_policies.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/90_policies.sql)
5. [`91_approval_policies.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/91_approval_policies.sql)

Optional:

6. [`20260324_products_client_fk.sql`](/C:/Users/soose/OneDrive/바탕%20화면/Project/dknh-sys-dev/project-docs/sql/sql_history/20260324_products_client_fk.sql)

## Important Notes

- `documents.client_id`, `documents.author_id`, `document_items.product_id`, `order_book.client_id`, `order_book.product_id` are introduced as nullable on purpose.
- Existing text columns such as `documents.client`, `products.client`, and `order_book.product` are still useful as snapshot/display data and are not removed.
- `accounts.password` is still present for backward compatibility. The new auth columns are preparation for moving to hashed passwords; app login logic must be upgraded before dropping legacy plain text usage.
- `approvals.target_id` remains text for cross-module flexibility, so target existence must still be validated in application logic.
