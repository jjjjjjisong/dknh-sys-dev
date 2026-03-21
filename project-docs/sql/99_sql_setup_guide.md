# SQL 세팅 가이드

운영 서버를 처음 세팅할 때는 아래 순서로 실행하면 됩니다.

## 1. 공통 확장
- `00_extensions.sql`

## 2. 테이블 생성
- `01_create_accounts_table.sql`
- `02_create_clients_table.sql`
- `03_create_products_table.sql`
- `04_create_documents_table.sql`
- `05_create_document_items_table.sql`
- `06_create_order_book_table.sql`

## 3. 공통 정책
- `90_common_policies.sql`

## 4. 기존 DB에만 추가로 실행할 파일

아래는 새 서버 초기 생성에는 보통 필요 없고, 기존 DB 업그레이드 시 사용합니다.

- `20260321_soft_delete_audit_columns.sql`
  - `del_yn`, `updated_at`, `updated_by` 추가
- `20260321_document_supplier_fields.sql`
  - 문서 공급자 정보 컬럼 추가
- `20260321_document_status_migration.sql`
  - `documents`, `order_book` 상태 컬럼 `status` 추가 및 기존 `cancelled` 데이터 마이그레이션
- `20260321_documents_update_policies.sql`
  - 기존 환경에 `documents`, `document_items` update 정책만 별도 추가

## 참고

- 기존 통합형 파일(`accounts.sql`, `clients.sql`, `products.sql`, `documents.sql`, `order_book.sql`)도 그대로 유지됩니다.
- 앞으로 운영 초기 세팅은 이 정리본 기준으로 진행하면 됩니다.
