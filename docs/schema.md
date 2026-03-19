# DKH 업무관리시스템 DB 명세서 (Supabase PostgreSQL)

본 문서는 `index.html` 기능과 연동되는 Supabase 데이터베이스 테이블 구조 및 제약조건, 변경 시 유의사항에 대해 기록한 문서입니다. 테이블 형태가 변경될 때마다 이 문서를 지속적으로 업데이트해야 합니다.

---

## 1. 테이블: `clients` (거래처/납품처 마스터)
납품처 정보의 기본 데이터를 담습니다.
| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `bigint` | 자동증가 | PRIMARY KEY | 각 납품처 고유 식별자 |
| **created_at** | `timestamptz` | `now()` | - | 레코드 생성 날짜 및 시간 |
| **name** | `text` | - | NOT NULL | 납품처(클라이언트) 명칭 (예: ㈜맘스터치) |
| **manager** | `text` | - | - | 각 클라이언트 담당자 (미정일 시 비워둠) |
| **tel** | `text` | - | - | 담당자 연락처 (미정일 시 비워둠) |
| **addr** | `text` | - | - | 배송지 기본 주소 (미정일 시 비워둠) |
| **time** | `text` | - | - | 기본 운영 시간 (예: 09:00~17:00) |
| **lunch** | `text` | - | - | 점심 시간 (예: 12:30~13:30) |
| **note** | `text` | - | - | 특이요청사항 (예: 9시부터 순서대로 하차) |
| **active** | `boolean` | `true` | - | 활성화 여부 (현재 미사용이나 데이터 보존 목적) |

---

## 2. 테이블: `products` (품목 마스터)
출고의뢰서에 실리는 각 납품처별 제품/품목 데이터입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `bigint` | 자동증가 | PRIMARY KEY | 취급 품목 고유 식별자 |
| **created_at** | `timestamptz` | `now()` | - | 레코드 생성 날짜 및 시간 |
| **no** | `integer` | - | NOT NULL | 품목 고유 관리 번호(순번) |
| **gubun** | `text` | - | NOT NULL | 품목 구분 (예: 컵, 뚜껑, 스트로우, 컵홀더, 기타) |
| **client** | `text` | - | NOT NULL | 이 품목을 납품하는 클라이언트 명 (`clients.name`과 매핑됨) |
| **name1** | `text` | - | NOT NULL | 품목명1 (주요 품목명) |
| **name2** | `text` | - | - | 품목명2 (보조 품목명 혹은 대체 명칭) |
| **supplier** | `text` | - | - | 공급업체 (예: 동국, 팔도) |
| **cost_price** | `numeric` | - | - | 원가 (단가 계산 참고용) |
| **sell_price** | `numeric` | - | - | 판매 단가 (문서 저장 시 기본값으로 설정됨) |
| **ea_per_b** | `integer` | - | - | 1 BOX당 들어갈 개수 (자동계산 기준값) |
| **box_per_p** | `integer` | - | - | 1 파렛트(P)당 들어갈 BOX 개수 (자동계산 기준값) |
| **ea_per_p** | `integer` | - | - | 1 파렛트(P)에 들어갈 총 Ea 수량 |
| **pallets_per_truck** | `integer` | - | - | 1대(차) 트럭 당 들어갈 파렛트 수 |

---

## 3. 테이블: `documents` (발급 문서 헤더 이력)
출고의뢰서/거래명세서가 발행될 때 메인(문서 1건 전체) 정보를 담습니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `uuid` | `uuid_generate_v4()` | PRIMARY KEY | 문서 식별자 (난수 생성 UUID) |
| **created_at** | `timestamptz` | `now()` | - | 오리지널 파일 저장 날짜/시간 (최초 발급일 및 저장 시간) |
| **updated_at** | `timestamptz` | - | - | 수정이 일어났을 때 기록될 갱신일 (이력 표시용) |
| **issue_no** | `text` | - | NOT NULL | 문서 발급번호(순차적, 예: 26001, 26002) |
| **client** | `text` | - | NOT NULL | 대상 납품처 |
| **manager** | `text` | - | - | 작성 시 담당자명 스냅샷 |
| **manager_tel** | `text` | - | - | 작성 시 담당자 전화번호 스냅샷 |
| **receiver** | `text` | - | - | 수신자 (예: 세인테크 귀하) |
| **order_date** | `date` | - | - | 발주일자 |
| **arrive_date** | `date` | - | - | 입고일자(도착일) |
| **delivery_addr** | `text` | - | - | 납품장소 |
| **remark** | `text` | - | - | 공통 비고 (참고사항) |
| **request_note** | `text` | - | - | 추가 요청사항 (예외 조건 등) |
| **total_supply** | `numeric` | `0` | - | 공급가액 총합 (하위 품목들의 supply 총합) |
| **total_vat** | `numeric` | `0` | - | 부가세 총합 (공급가액 총합 * 0.1) |
| **total_amount** | `numeric` | `0` | - | 전체 총합 (공급가액 + 부가세) |
| **author** | `text` | - | - | 문서를 기록한 작성자 혹은 계정명 |
| **cancelled** | `boolean` | `false` | - | 문서를 취소 처리했는지 여부 표시 (true면 수량 합산에서 회피) |

---

## 4. 테이블: `document_items` (문서 별 입력 품목 내역 기록)
`documents` 테이블의 (1:N 연관) 하위 아이템 내역 기록. 수기 입력(수정/직접입력)이 포함되어 있습니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `bigint` | 자동증가 | PRIMARY KEY | 각 품목 레코드의 고유 식별자 |
| **document_id** | `uuid` | - | FOREIGN KEY(`documents.id`) ON DELETE CASCADE | 어느 발급 문서에 소속된 내역인지 참조 |
| **seq** | `integer` | - | NOT NULL | 한 문서 내에서의 품목 입력 순서 배치값 |
| **name1** | `text` | - | NOT NULL | 품목 명칭1 (제품 마스터 스냅샷 혹은 수작업 타이핑) |
| **name2** | `text` | - | - | 품목 명칭2 (제품 마스터 스냅샷 혹은 수작업 타이핑) |
| **gubun** | `text` | - | - | 품목 구분 (컵, 기타 등) |
| **qty** | `integer` | `0` | - | 요청/입력 수량 |
| **unit_price** | `numeric` | `0` | - | 입력 단가 (제품 마스터 혹은 직접 수정한 단가 스냅샷) |
| **supply** | `numeric` | `0` | - | 이 제품 라인의 공급가액 계산값 |
| **vat** | `boolean` | `true` | - | 해당 내역이 VAT가 부과된 청구 대상인지 여부 (체크박스 상태) |
| **order_date** | `date` | - | - | 아이템별 수동 조작 발주 날짜 (문서 날짜와 별도로 덮어썼을 시) |
| **arrive_date** | `date` | - | - | 아이템별 수동 조작 입고 날짜 (문서 날짜와 별도로 덮어썼을 시) |
| **item_note** | `text` | - | - | 하위 품목마다 기록된 세부 비고 내용 |
| **ea_per_b** | `integer` | - | - | 이 항목 연산에 사용된 1BOX당 조각 수 (제품 마스터를 따오거나 수동 입력함) |
| **box_per_p** | `integer` | - | - | 이 항목 연산에 사용된 1파렛트당 BOX 수 (제품 마스터를 따오거나 수동 입력함) |

---

## 5. 테이블: `order_book` (수주대장)
출고 문서가 만들어질 때 또는 수동으로 입고/일정 등을 파악하기 위해 적히는 단일 항목 대장입니다.

| 컬럼명 | 타입 | 기본값 | 제약조건 | 설명 |
| :--- | :--- | :--- | :--- | :--- |
| **id** | `bigint` | 자동증가 | PRIMARY KEY | 고유 식별 ID |
| **created_at** | `timestamptz` | `now()` | - | 수주 등록 시각 |
| **issue_no** | `text` | - | - | 포함된 문서의 식별 번호 (예: 26001, null 가능. 독립적 수주건의 경우) |
| **date** | `date` | - | - | 접수/발주 일자 |
| **deadline** | `date` | - | - | 납기 예정일/입고 일자 |
| **client** | `text` | - | - | 대상 거래처 |
| **product** | `text` | - | - | 대상 제품 품목명 (`document_items.name1` 매핑됨) |
| **qty** | `integer` | `0` | - | 수량 (총 Ea) |
| **note** | `text` | - | - | 요구사항 및 비고 |
| **receipt** | `text` | - | - | 처리/입금 등 진행 단계 정보 (수기 변경) |
| **cancelled** | `boolean` | `false` | - | 문서를 취소할 시 연계하여 취소 상태 표시로 토글 (`documents` 와 일치화 됨) |
| **doc_id** | `uuid` | - | FOREIGN KEY(`documents.id`) ON DELETE CASCADE | 어떤 발급 문서에서 파생된 수주 목록인지 명시 |
| **from_doc** | `boolean` | `false` | - | 문서 추가 버튼을 눌렀을 때 생성된(true) 것인지 수기로 수주대장 버튼을 눌렀는지(false) 구분 값 |

---

> 이 문서는 `index.html` 내의 저장 코드와 `seed_data.sql` 구조의 변경이 있을 경우 함께 업데이트되어야 합니다.
