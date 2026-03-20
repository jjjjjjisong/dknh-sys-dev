# DKH 업무관리시스템 아키텍처 및 규칙 가이드

## 1. 개요
DKH 업무관리시스템은 서버리스 기반의 웹 애플리케이션으로, HTML/CSS/JavaScript 단일 파일(`index.html`)을 기반으로 동작하는 SPA(Single Page Application) 형식입니다. 데이터는 백엔드 서비스인 Supabase(PostgreSQL 기반)에 실시간으로 저장 및 관리되며, 네트워크 오프라인이나 초기 로딩을 대비해 브라우저의 `localStorage`를 fallback 캐시로 활용합니다.

## 2. 파일 및 디렉터리 구조
- `index.html`: 시스템의 모든 UI, 로직, 스타일 및 Supabase 연동 코드가 포함된 코어 파일.
- `docs/`: 시스템 명세 문서 보관소. 
  - `architecture.md`: 현재 파일 (시스템 아키텍처 및 코딩 규칙)
  - `schema.md`: 데이터베이스 테이블 구조 및 제약조건
- `seed_data.sql`: (초기 구축용) Supabase PostgreSQL 테이블 생성 및 원시 데이터 입력 스크립트.

## 3. 핵심 아키텍처 (SPA 라우팅)
- **Hash Based Routing**: 페이지 이동(메뉴 탭 전환 등)은 모두 `window.location.hash`를 변경하여 이루어집니다. `hashchange` 이벤트를 통해 URL이 변경될 때마다 화면에 표시되는 `#page-*` 요소를 교체합니다.
- **장점**: 브라우저의 뒤로가기/앞으로가기 히스토리와 완벽하게 연동되며, 특정 페이지를 URL(예: `/#doc-history`)로 바로 접근하거나 북마크할 수 있습니다.
- **상세 뷰**: 발행이력 상세조회와 같은 서브 진입 역시 `/#doc-detail-{docId}` 형태의 해시를 통해 지원합니다.

## 4. 데이터 플로우 및 영속성 (Data Layer)
*   **Supabase 직접 연결**: `@supabase/supabase-js` 클라이언트를 CDN으로 불러와서 직접 통신합니다. (API키, URL 하드코딩)
*   **Initialization (초기화)**: 로그인 성공 직후 `loadAllData()` 함수가 호출되어 Supabase에서 `clients`, `products`, `documents`, `document_items`, `order_book` 등을 한 번에 모두 가져옵니다 (Memory Cache).
*   **CRUD 로직**: 
    - 데이터를 추가/수정/삭제 할 때 우선 `db.from().insert/update/delete()` 방식으로 **Supabase DB에 즉시 반영**합니다.
    - DB 응답이 성공적으로 오면, 자바스크립트의 로컬 배열(Memory Cache)을 갱신하고(`render...()`) 화면을 다시 그립니다.
*   **Fallback**: 예외 상황(네트워크 단절 등)으로 데이터를 불러오지 못하면 `localStorage`에 임시 저장된 이전 데이터를 로드합니다 (안정성 확보).

## 5. 코딩 시 주의사항 및 규칙
1.  **전역 변수(상태) 의존성**: `products`, `clients`, `history`, `orderBook` 등은 전역 배열 객체로 존재합니다. 함수 구현 시 이 전역 상태를 직접 참조하거나 조작하여 렌더링에 반영합니다.
2.  **직접 DOM 조작 지양 (라우팅 관련)**: 탭이나 페이지를 이동할 때 요소의 `.classList.add('active')`를 코드 중간에 흩뿌려놓지 마세요. 무조건 `window.location.hash`를 변경하여 `renderPage()` 함수가 일괄 처리하게끔 위임해야 합니다.
3.  **UI 템플릿**: 목록형 UI(예: 품목 목록, 거래명세서 품목 입력 등)는 `.innerHTML`에 ES6 Template Literal(백틱 ``)을 이용해 문자열로 렌더 조작을 수행합니다. 수정 시 `idx` (배열의 인덱스)나 `id`를 인자로 넘기는 `onclick` / `onchange` 이벤트를 주의 깊게 연동해야 합니다.
4.  **반응형(RWD)**: 데스크톱 버전을 중심으로 설계되었으나, `flex` 래퍼와 `action-bar`, 모달 창은 모바일 환경에서도 어느 정도 시인성을 잃지 않도록 `@media` 쿼리 또는 비율(`%`, `fr`)을 이용해 작성되어 있습니다.
