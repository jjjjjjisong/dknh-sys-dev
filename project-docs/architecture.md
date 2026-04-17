# DKH 업무관리시스템 아키텍처 가이드

## 1. 개요
DKH 업무관리시스템은 프론트엔드 애플리케이션과 Supabase(PostgreSQL 기반)를 중심으로 운영되는 업무 시스템입니다.
현재는 별도 전통적 백엔드 서버 없이 프론트엔드가 Supabase와 직접 통신하는 구조에 가깝습니다.

핵심 구성:
- 프론트엔드: React/Vite 기반 화면
- 데이터 저장소: Supabase PostgreSQL
- 인증 및 접근 제어: Supabase Auth / 정책
- 운영 문서 및 SQL: `project-docs/`

## 2. 최상위 원칙
- ID가 있는 데이터는 항상 ID를 기준으로 저장, 조회, 연결, 집계합니다.
- 화면 표시용 이름과 시스템 기준 키를 혼동하지 않습니다.
- 런타임 fallback보다 데이터 정합성과 명시적 검증을 우선합니다.
- 기존 기능을 깨는 변경보다 확장형 변경을 우선합니다.

## 3. 세부 규칙 문서
상세 규칙은 아래 문서를 우선 참고합니다.

- [rules/README.md](C:/sjji/dknh-sys/project-docs/rules/README.md)
  세부 규칙 문서 목록과 용도를 정리한 인덱스
- [rules/id-linking.md](C:/sjji/dknh-sys/project-docs/rules/id-linking.md)
  ID 기준 저장/조회/연결 규칙
- [rules/product-structure.md](C:/sjji/dknh-sys/project-docs/rules/product-structure.md)
  공통 품목과 거래처별 품목 역할 분리 규칙
- [rules/code-master-boundaries.md](C:/sjji/dknh-sys/project-docs/rules/code-master-boundaries.md)
  공통코드, 마스터 데이터, 직접입력 데이터의 경계 규칙
