# 개발 규칙 인덱스

이 폴더는 개발하면서 반복해서 확인해야 하는 세부 규칙을 주제별로 나눠 보관합니다.
상위 원칙은 [architecture.md](C:/sjji/dknh-sys/project-docs/architecture.md)를 보고, 실제 구현 전에는 아래 문서 중 해당 주제를 먼저 확인합니다.

문서 목록:
- [id-linking.md](C:/sjji/dknh-sys/project-docs/rules/id-linking.md)
  ID 기준 저장, 조회, 연결, 집계 규칙
- [product-structure.md](C:/sjji/dknh-sys/project-docs/rules/product-structure.md)
  `product_masters`와 `products` 역할 구분
- [code-master-boundaries.md](C:/sjji/dknh-sys/project-docs/rules/code-master-boundaries.md)
  공통코드, 마스터 데이터, 직접입력의 경계

문서 추가 원칙:
- `architecture.md`에는 최상위 원칙만 둡니다.
- 반복해서 참고할 세부 규칙만 이 폴더에 추가합니다.
- SQL 실행 절차나 운영 반영 절차는 기존 `project-docs/sql/` 또는 관련 문서에 둡니다.
