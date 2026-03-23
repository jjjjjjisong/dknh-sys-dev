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

## 4. 기존 DB 업그레이드용 마이그레이션

아래 파일들은 이미 운영/개발 DB가 있는 상태에서 추가 적용할 때 사용합니다.

- `20260321_soft_delete_audit_columns.sql`
  - 공통 `del_yn`, `updated_at`, `updated_by` 컬럼 추가
- `20260321_document_supplier_fields.sql`
  - 문서 공급자 정보 컬럼 추가
- `20260321_document_status_migration.sql`
  - `documents`, `order_book` 상태 컬럼 `status` 추가 및 기존 `cancelled` 데이터 이관
- `20260321_documents_update_policies.sql`
  - `documents`, `document_items` update 정책 추가
- `20260321_order_book_shipped_status.sql`
  - `order_book` 출고상태 컬럼 추가
- `20260322_clients_identity_sync.sql`
  - `clients.id` 자동 생성(identity) 보정 및 시퀀스 재동기화
- `20260322_products_identity_sync.sql`
  - `products.id` 자동 생성 보정 및 시퀀스 재동기화

## 참고

- 통합형 파일(`accounts.sql`, `clients.sql`, `products.sql`, `documents.sql`, `order_book.sql`)도 유지하고 있습니다.
- 신규 운영 서버는 `01~06` + `90` 순서로 세팅하면 되고, 기존 서버는 필요한 마이그레이션만 추가로 실행하면 됩니다.
