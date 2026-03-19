# Migration Status

이 문서는 `legacy-index.html` 기반 앱을 React + TypeScript + Vite 구조로 옮기는 작업의 현재 상태를 정리한 문서입니다.

## 현재 기준

- 작업 대상은 dev 환경입니다.
- 운영 환경은 건드리지 않습니다.
- Supabase는 dev 프로젝트 기준으로 연결합니다.
- `.env`, `.env.*` 는 Git에 올리지 않습니다.
- 현재 라우팅은 `HashRouter` 기반입니다.

## 현재 완료된 항목

### 1. 프로젝트 구조 전환

- Vite + React + TypeScript 프로젝트 생성
- 공통 레이아웃 구성
  - `AppShell`
  - `Sidebar`
  - `TopBar`
- 기본 페이지 라우팅 연결

주요 파일:

- [src/main.tsx](/C:/dknh-sys-main/dknh-sys-main/src/main.tsx)
- [src/app/App.tsx](/C:/dknh-sys-main/dknh-sys-main/src/app/App.tsx)
- [src/app/router.tsx](/C:/dknh-sys-main/dknh-sys-main/src/app/router.tsx)

### 2. Supabase 연결 분리

- Supabase client를 별도 파일로 분리
- 환경변수는 `import.meta.env` 기반으로 읽도록 구성

주요 파일:

- [src/api/supabase/client.ts](/C:/dknh-sys-main/dknh-sys-main/src/api/supabase/client.ts)
- [src/lib/env.ts](/C:/dknh-sys-main/dknh-sys-main/src/lib/env.ts)
- [.env.example](/C:/dknh-sys-main/dknh-sys-main/.env.example)

### 3. 납품처 관리

구현 상태:

- 목록 조회
- 검색
- 추가
- 수정
- 삭제

현재 방향:

- 오른쪽 상세 패널 제거
- 기존 HTML처럼 표 중심 화면으로 정리

주요 파일:

- [src/pages/MasterClientPage.tsx](/C:/dknh-sys-main/dknh-sys-main/src/pages/MasterClientPage.tsx)
- [src/api/clients.ts](/C:/dknh-sys-main/dknh-sys-main/src/api/clients.ts)
- [docs/sql/clients.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/clients.sql)

### 4. 품목 관리

구현 상태:

- 목록 조회
- 검색 / 필터
- 추가
- 수정
- 삭제

현재 방향:

- 오른쪽 상세 패널 제거
- 기존 HTML처럼 표 중심 화면으로 정리

주요 파일:

- [src/pages/MasterProductPage.tsx](/C:/dknh-sys-main/dknh-sys-main/src/pages/MasterProductPage.tsx)
- [src/api/products.ts](/C:/dknh-sys-main/dknh-sys-main/src/api/products.ts)
- [docs/sql/products.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/products.sql)

### 5. 문서 작성

구현 상태:

- 기본 정보 입력
- 납품처 선택
- 품목 행 추가 / 삭제
- 직접입력 품목
- 수량 / 단가 / 공급가액 / VAT 계산
- 저장
- 출고의뢰서 미리보기
- 거래명세서 미리보기
- 인쇄 / PDF 저장

현재 반영된 규칙:

- BOX / 파렛트는 소수점이 아니라 올림 정수 계산
- 저장 / 초기화 버튼은 하단 미리보기 버튼 라인에 배치
- 문서 출력 버튼은 미리보기 모달 내부에만 표시

주요 파일:

- [src/pages/DocCreatePage.tsx](/C:/dknh-sys-main/dknh-sys-main/src/pages/DocCreatePage.tsx)
- [src/api/documents.ts](/C:/dknh-sys-main/dknh-sys-main/src/api/documents.ts)
- [src/types/document.ts](/C:/dknh-sys-main/dknh-sys-main/src/types/document.ts)
- [docs/sql/documents.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/documents.sql)

### 6. 발행 이력

구현 상태:

- 목록 조회
- 검색 / 날짜 필터
- 상세 진입
- 상세 수정
- 수정 저장
- 거래취소 / 취소 해제
- 출고의뢰서 / 거래명세서 다시 미리보기

중요 변경:

- 상세 화면은 URL을 가집니다.
- 목록: `/doc-history`
- 상세: `/doc-history/:documentId`
- 뒤로 가기 시 목록으로 돌아오도록 정리함

현재 방향:

- 기존 HTML처럼 목록 화면과 상세 편집 화면을 전환하는 구조
- 오른쪽 사이드 상세 패널 제거

주요 파일:

- [src/pages/DocHistoryPage.tsx](/C:/dknh-sys-main/dknh-sys-main/src/pages/DocHistoryPage.tsx)
- [src/app/router.tsx](/C:/dknh-sys-main/dknh-sys-main/src/app/router.tsx)
- [src/api/documents.ts](/C:/dknh-sys-main/dknh-sys-main/src/api/documents.ts)

### 7. 수주대장

구현 상태:

- 목록 조회
- 검색 / 날짜 필터
- 문서 저장 시 `order_book` 자동 반영

아직 미구현:

- 직접 추가
- 수정
- 삭제
- 엑셀 저장

주요 파일:

- [src/pages/OrderBookPage.tsx](/C:/dknh-sys-main/dknh-sys-main/src/pages/OrderBookPage.tsx)
- [src/api/order-book.ts](/C:/dknh-sys-main/dknh-sys-main/src/api/order-book.ts)
- [docs/sql/order_book.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/order_book.sql)

## 스타일 작업 상태

전역 스타일은 기존 HTML과 더 비슷하게 맞추는 작업을 진행했습니다.

반영 내용:

- 기본 폰트: `Pretendard Variable` 기준으로 조정
- 기본 글자 크기: 13~13.5px 중심으로 축소
- 버튼 / 입력창 / 테이블 헤더 / 카드 여백을 원본에 가깝게 축소
- 전체적으로 둥근 느낌을 줄이고 밀도를 높임

관련 파일:

- [src/styles/globals.css](/C:/dknh-sys-main/dknh-sys-main/src/styles/globals.css)

롤백용 백업:

- [src/styles/globals.rollback-20260319.css](/C:/dknh-sys-main/dknh-sys-main/src/styles/globals.rollback-20260319.css)

롤백이 필요하면 이 파일 내용을 `globals.css`로 되돌리면 됩니다.

## 실행 / 검증

현재까지 여러 차례 아래 명령으로 검증했습니다.

```powershell
npm run build
```

로컬 실행은:

```powershell
npm run dev
```

## SQL 적용 파일

dev Supabase SQL Editor에서 전체 실행 기준으로 관리하는 파일:

- [docs/sql/clients.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/clients.sql)
- [docs/sql/products.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/products.sql)
- [docs/sql/documents.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/documents.sql)
- [docs/sql/order_book.sql](/C:/dknh-sys-main/dknh-sys-main/docs/sql/order_book.sql)

주의:

- 위 SQL은 dev 기준입니다.
- 운영 DB에는 그대로 적용하면 안 됩니다.

## 다음 작업 추천 순서

1. 페이지별 스타일 디테일 보정
- 발행 이력 상세 간격
- 버튼 위치
- 테이블 폭 / 정렬
- 모달 내부 여백

2. 수주대장 CRUD
- 직접 추가
- 수정
- 삭제

3. 원본 HTML과의 잔여 차이 정리
- 문구
- 컬럼 폭
- 입력 컨트롤 크기
- 인쇄 양식 세부 여백

## Git / 저장소 참고

- 현재 작업은 새 dev GitHub 저장소 기준으로 올림
- `.gitignore`는 `.env`, `.env.*`, `node_modules`, `dist` 등을 제외하도록 정리함

dev 저장소:

- [https://github.com/jjjjjjisong/dknh-sys-dev](https://github.com/jjjjjjisong/dknh-sys-dev)
