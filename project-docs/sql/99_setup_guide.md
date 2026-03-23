# SQL Setup Guide

Fresh production setup order:

1. `00_extensions.sql`
2. `01_accounts.sql`
3. `02_clients.sql`
4. `03_products.sql`
5. `04_documents.sql`
6. `05_order_book.sql`
7. `90_policies.sql`

Or run this single file in Supabase SQL Editor:

- `00_full_production_setup.sql`

Notes:

- Old migration and history scripts were moved to `project-docs/sql/sql_history`.
- The files in this folder are the current baseline for a brand-new environment.
- `04_documents.sql` includes `document_items` and the active unique indexes:
  - `uq_documents_active_issue_no`
  - `uq_document_items_active_document_id_seq`
- `01_accounts.sql` inserts a default `admin` account if it does not already exist.
