# Status Ownership Guide

이 문서는 현재 시스템에서 어떤 상태값을 어느 테이블이 책임지는지 정리한 기준 문서입니다.
앞으로 조회, 집계, 수정, 결재 기능은 이 기준을 따릅니다.

## 1. documents.status

- 역할: 문서 자체의 유효 상태
- 원본 테이블: `documents`
- 값:
  - `ST00`: 정상
  - `ST01`: 거래취소

### 사용 원칙

- 문서가 취소되었는지 판단할 때는 `documents.status`를 기준으로 봅니다.
- 발행이력 화면의 취소 상태 표시도 이 값을 기준으로 합니다.
- 문서에서 생성된 `order_book` 행은 이 값을 동기화해서 따라가지만, 원본은 `documents.status`입니다.

## 2. order_book.status

- 역할: 수주대장 행의 유효 상태
- 원본 테이블: `order_book`
- 값:
  - `ST00`: 정상
  - `ST01`: 거래취소

### 사용 원칙

- 수주대장 화면에서 취소 여부는 `order_book.status`를 기준으로 봅니다.
- 문서 연동 행(`from_doc = true`)은 문서 취소/해제 시 `documents.status`와 같이 동기화됩니다.
- 직접 생성한 수주대장 행도 자체적으로 이 값을 가질 수 있습니다.

## 3. order_book.shipped_status

- 역할: 실제 업무 처리 상태
- 원본 테이블: `order_book`
- 값:
  - `미출고`
  - `출고`

### 사용 원칙

- 실제 업무 진행 상태의 원본은 `order_book.shipped_status`입니다.
- 대시보드의 `오늘의 할일`, `지연 건수`, `입고예정건수`는 모두 이 값을 기준으로 계산합니다.
- 발행이력은 출력/원본 문서이고, 실제 처리 상태 판단은 하지 않습니다.

## 4. documents.approval_status

- 역할: 문서 결재 요약 상태
- 원본 테이블: `approvals`를 따르되, 문서 조회 편의를 위해 `documents`에 캐시로 보관
- 대표 값:
  - `draft`
  - `pending`
  - `in_review`
  - `approved`
  - `rejected`
  - `cancelled`

### 사용 원칙

- 문서 목록에서 빠르게 상태를 보여주거나 필터링할 때는 `documents.approval_status`를 사용할 수 있습니다.
- 하지만 결재 흐름의 실제 원본 상태는 `approvals.status`입니다.

## 5. approvals.status

- 역할: 결재 요청 전체의 실제 상태
- 원본 테이블: `approvals`
- 대표 값:
  - `pending`
  - `in_review`
  - `approved`
  - `rejected`
  - `cancelled`

### 사용 원칙

- 결재 시스템의 실제 원본 상태는 `approvals.status`입니다.
- `documents.approval_status`는 조회용 요약/캐시로 간주합니다.
- 둘이 함께 존재할 경우, 정합성 기준은 항상 `approvals.status`입니다.

## 6. approval_steps.status

- 역할: 단계별 결재 상태
- 원본 테이블: `approval_steps`
- 대표 값:
  - `waiting`
  - `pending`
  - `approved`
  - `rejected`
  - `skipped`
  - `cancelled`

### 사용 원칙

- 4단계 결재선의 각 단계 진행 여부는 `approval_steps.status`를 기준으로 봅니다.
- 현재 몇 단계가 진행 중인지 판단할 때는 `approvals.current_step`와 함께 사용합니다.

## 7. del_yn

- 역할: soft delete 상태
- 원본 테이블: 각 테이블별 자체 보유
- 값:
  - `N`: 활성
  - `Y`: 삭제

### 사용 원칙

- 모든 조회, 집계, 유니크 인덱스, 백필 SQL은 `del_yn = 'N'`를 기본 전제로 작성합니다.
- 물리 삭제 대신 soft delete를 우선 사용합니다.

## 8. 실무 적용 원칙

### 조회 기준

- 문서 유효 상태: `documents.status`
- 실제 업무 상태: `order_book.shipped_status`
- 결재 실제 상태: `approvals.status`
- 결재 단계 상태: `approval_steps.status`

### 집계 기준

- 대시보드 업무 집계: `order_book`
- 문서 출력/발행이력 표시: `documents`, `document_items`

### 연결 기준

- 연결용 기준은 항상 `id` 계열 컬럼을 우선합니다.
  - 예: `document_item_id`, `client_id`, `product_id`
- 텍스트 컬럼은 표시용 스냅샷으로 간주합니다.

## 9. 앞으로의 개발 원칙

1. 상태 판단 로직을 추가할 때는 먼저 이 문서의 원본 테이블을 확인합니다.
2. 동일한 의미의 상태를 다른 테이블에 추가할 때는 원본/캐시 여부를 먼저 정합니다.
3. 대시보드나 리스트에서 상태를 보여줄 때도, 업무 상태는 `order_book.shipped_status`를 우선합니다.
4. 결재 기능 고도화 시 문서 쪽 상태는 `approvals`를 기준으로 동기화합니다.
