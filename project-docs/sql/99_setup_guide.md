# SQL Setup Guide

Fresh production setup order:

1. `00_extensions.sql`
2. `01_accounts.sql`
3. `02_clients.sql`
4. `03_products.sql`
5. `08_product_masters.sql`
6. `04_documents.sql`
7. `05_order_book.sql`
8. `90_policies.sql`

Or run this single file in Supabase SQL Editor:

- `00_full_production_setup.sql`

Product / document relational hardening:

- 신규 환경: `00_full_production_setup.sql` 또는 기본 순서 실행
- 기존 운영 구조 보강: `07_relational_hardening.sql`
- 기존 데이터 `product_id` 백필: `20260413_document_items_product_id_backfill.sql`
- 품목 상위/하위 구조 추가: `08_product_masters.sql`
- 기존 품목을 공통 품목으로 묶기: `20260416_product_masters_backfill.sql`
- import 후 identity/sequence 정렬: `20260413_identity_sequence_reset.sql`
- 상세 가이드: `product-id-rollout.md`

Notes:

- Old migration and history scripts were moved to `project-docs/sql/sql_history`.
- The files in this folder are the current baseline for a brand-new environment.
- `04_documents.sql` includes `document_items` and the active unique indexes:
  - `uq_documents_active_issue_no`
  - `uq_document_items_active_document_id_seq`
- `01_accounts.sql` inserts a default `admin` account if it does not already exist.
