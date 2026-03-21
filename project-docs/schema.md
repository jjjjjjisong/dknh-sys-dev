# DKH 시스템 DB 명세

이 문서는 DKH 시스템이 사용하는 Supabase PostgreSQL 테이블 구조를 정리한 문서입니다.
운영/개발 초기 세팅 시에는 `project-docs/sql` 폴더의 SQL 파일을 기준으로 테이블을 생성합니다.

---

## 공통 운영 규칙

모든 주요 테이블은 아래 공통 컬럼을 사용합니다.

| 컬럼명 | 타입 | 기본값 | 설명 |
| :--- | :--- | :--- | :--- |
| `created_at` | `timestamptz` | `now()` | 최초 생성 일시 |
| `updated_at` | `timestamptz` | `now()` | 최근 수정 일시 |
| `updated_by` | `text` | `''` | 최근 수정 계정 정보 |
| `del_yn` | `text` | `'N'` | 소프트 삭제 여부. `N`은 사용, `Y`는 삭제 처리 |

적용 대상:
- `accounts`
- `clients`
- `products`
- `documents`
- `document_items`
- `order_book`

운영 규칙:
- 화면에서 삭제해도 DB에서는 실제 삭제하지 않습니다.
- 삭제 시 `del_yn = 'Y'`로 변경합니다.
- 일반 조회는 `del_yn = 'N'`만 대상으로 합니다.
- 수정/삭제/상태변경 시 `updated_at`, `updated_by`를 갱신합니다.

상태 코드 규칙:
- `ST00` = 정상
- `ST01` = 거래취소

---

## 1. 테이블 `clients`
거래처/납품처 마스터입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | identity | PRIMARY KEY | 거래처 고유 ID |
| `created_at` | `timestamptz` | `now()` | - | 생성 일시 |
| `updated_at` | `timestamptz` | `now()` | - | 최근 수정 일시 |
| `updated_by` | `text` | `''` | - | 최근 수정 계정 |
| `del_yn` | `text` | `'N'` | CHECK (`Y`, `N`) | 삭제 여부 |
| `name` | `text` | - | NOT NULL | 거래처명 |
| `manager` | `text` | `''` | - | 담당자 |
| `tel` | `text` | `''` | - | 연락처 |
| `addr` | `text` | `''` | - | 주소 |
| `time` | `text` | `''` | - | 입고 시간 |
| `lunch` | `text` | `''` | - | 점심 시간 |
| `note` | `text` | `''` | - | 특이사항 |
| `active` | `boolean` | `true` | - | 사용 여부 |

---

## 2. 테이블 `products`
품목 마스터입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | identity | PRIMARY KEY | 품목 고유 ID |
| `created_at` | `timestamptz` | `now()` | - | 생성 일시 |
| `updated_at` | `timestamptz` | `now()` | - | 최근 수정 일시 |
| `updated_by` | `text` | `''` | - | 최근 수정 계정 |
| `del_yn` | `text` | `'N'` | CHECK (`Y`, `N`) | 삭제 여부 |
| `no` | `integer` | - | NOT NULL | 품목 관리 번호 |
| `gubun` | `text` | - | NOT NULL | 품목 구분 |
| `client` | `text` | - | NOT NULL | 거래처명 |
| `name1` | `text` | - | NOT NULL | 품목명 |
| `name2` | `text` | `''` | - | 거래명세서용 품목명 |
| `supplier` | `text` | `''` | - | 공급처 |
| `cost_price` | `numeric` | `null` | - | 원가 |
| `sell_price` | `numeric` | `null` | - | 판매 단가 |
| `ea_per_b` | `integer` | `null` | - | BOX 당 EA |
| `box_per_p` | `integer` | `null` | - | 파렛트 당 BOX |
| `ea_per_p` | `integer` | `null` | - | 파렛트 당 EA |
| `pallets_per_truck` | `integer` | `null` | - | 차량 당 파렛트 수 |

---

## 3. 테이블 `documents`
발급 문서 헤더 이력입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | 문서 ID |
| `created_at` | `timestamptz` | `now()` | - | 생성 일시 |
| `updated_at` | `timestamptz` | `now()` | - | 최근 수정 일시 |
| `updated_by` | `text` | `''` | - | 최근 수정 계정 |
| `del_yn` | `text` | `'N'` | CHECK (`Y`, `N`) | 삭제 여부 |
| `issue_no` | `text` | - | NOT NULL | 발급번호 |
| `client` | `text` | - | NOT NULL | 납품처 |
| `manager` | `text` | `''` | - | 담당자 |
| `manager_tel` | `text` | `''` | - | 담당자 연락처 |
| `receiver` | `text` | `''` | - | 수신처 |
| `supplier_biz_no` | `text` | `''` | - | 공급자 등록번호 |
| `supplier_name` | `text` | `''` | - | 공급자 상호 |
| `supplier_owner` | `text` | `''` | - | 공급자 성명 |
| `supplier_address` | `text` | `''` | - | 공급자 사업장주소 |
| `supplier_business_type` | `text` | `''` | - | 공급자 업태 |
| `supplier_business_item` | `text` | `''` | - | 공급자 종목 |
| `order_date` | `date` | `null` | - | 발주일자 |
| `arrive_date` | `date` | `null` | - | 입고일자 |
| `delivery_addr` | `text` | `''` | - | 납품주소 |
| `remark` | `text` | `''` | - | 비고 |
| `request_note` | `text` | `''` | - | 요청사항 |
| `total_supply` | `numeric` | `0` | - | 공급가액 합계 |
| `total_vat` | `numeric` | `0` | - | 부가세 합계 |
| `total_amount` | `numeric` | `0` | - | 총금액 |
| `author` | `text` | `''` | - | 작성자 |
| `status` | `text` | `'ST00'` | CHECK (`ST00`, `ST01`) | 문서 상태 |

---

## 4. 테이블 `document_items`
문서 하위 품목 이력입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `bigint` | identity | PRIMARY KEY | 품목 행 ID |
| `document_id` | `uuid` | - | FK(`documents.id`) | 소속 문서 ID |
| `created_at` | `timestamptz` | `now()` | - | 생성 일시 |
| `updated_at` | `timestamptz` | `now()` | - | 최근 수정 일시 |
| `updated_by` | `text` | `''` | - | 최근 수정 계정 |
| `del_yn` | `text` | `'N'` | CHECK (`Y`, `N`) | 삭제 여부 |
| `seq` | `integer` | - | NOT NULL | 품목 순번 |
| `name1` | `text` | - | NOT NULL | 품목명 |
| `name2` | `text` | `''` | - | 거래명세서용 품목명 |
| `gubun` | `text` | `'기타'` | - | 품목 구분 |
| `qty` | `integer` | `0` | - | 수량 |
| `unit_price` | `numeric` | `0` | - | 단가 |
| `supply` | `numeric` | `0` | - | 공급가액 |
| `vat` | `boolean` | `true` | - | VAT 포함 여부 |
| `order_date` | `date` | `null` | - | 개별 발주일자 |
| `arrive_date` | `date` | `null` | - | 개별 입고일자 |
| `item_note` | `text` | `''` | - | 품목 비고 |
| `ea_per_b` | `integer` | `null` | - | BOX 당 EA |
| `box_per_p` | `integer` | `null` | - | 파렛트 당 BOX |
| `custom_pallet` | `numeric` | `null` | - | 수동 파렛트 값 |
| `custom_box` | `numeric` | `null` | - | 수동 박스 값 |

---

## 5. 테이블 `order_book`
수주대장입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `uuid` | `gen_random_uuid()` | PRIMARY KEY | 수주 행 ID |
| `created_at` | `timestamptz` | `now()` | - | 생성 일시 |
| `updated_at` | `timestamptz` | `now()` | - | 최근 수정 일시 |
| `updated_by` | `text` | `''` | - | 최근 수정 계정 |
| `del_yn` | `text` | `'N'` | CHECK (`Y`, `N`) | 삭제 여부 |
| `doc_id` | `uuid` | `null` | - | 연결 문서 ID |
| `issue_no` | `text` | `''` | - | 발급번호 |
| `date` | `date` | `null` | - | 발주일자 |
| `deadline` | `date` | `null` | - | 입고 예정일 |
| `client` | `text` | `''` | - | 납품처 |
| `product` | `text` | `''` | - | 품목명 |
| `qty` | `integer` | `0` | - | 수량 |
| `note` | `text` | `''` | - | 비고 |
| `receipt` | `text` | `''` | - | 수령/처리 상태 |
| `status` | `text` | `'ST00'` | CHECK (`ST00`, `ST01`) | 수주 상태 |
| `from_doc` | `boolean` | `false` | - | 문서 연동 여부 |

---

## 6. 테이블 `accounts`
로그인 및 계정 관리용 테이블입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| `id` | `text` | - | PRIMARY KEY | 로그인 ID |
| `created_at` | `timestamptz` | `now()` | - | 생성 일시 |
| `updated_at` | `timestamptz` | `now()` | - | 최근 수정 일시 |
| `updated_by` | `text` | `''` | - | 최근 수정 계정 |
| `del_yn` | `text` | `'N'` | CHECK (`Y`, `N`) | 삭제 여부 |
| `password` | `text` | - | NOT NULL | 비밀번호 |
| `name` | `text` | - | NOT NULL | 이름 |
| `rank` | `text` | `''` | - | 직급 |
| `tel` | `text` | `''` | - | 연락처 |
| `email` | `text` | `''` | - | 이메일 |
| `role` | `text` | `'user'` | CHECK (`admin`, `user`) | 권한 |

---

## 참고

- 초기 테이블 생성은 `project-docs/sql/accounts.sql`, `project-docs/sql/clients.sql`, `project-docs/sql/products.sql`, `project-docs/sql/documents.sql`, `project-docs/sql/order_book.sql`을 기준으로 합니다.
- 기존 DB의 공통 감사 컬럼 반영은 `project-docs/sql/20260321_soft_delete_audit_columns.sql`을 실행합니다.
- 기존 DB의 상태 컬럼 반영은 `project-docs/sql/20260321_document_status_migration.sql`을 실행합니다.
