# Current Progress (main branch)

현재 브랜치에서 진행 중이거나 완료된 작업을 기록합니다.

## 멤버 상태 관리 기능 (활동/졸업)
- [x] 데이터베이스 스키마 확장 (Supabase Migration)
- [x] 데이터 타입 및 유틸리티 업데이트
- [x] 멤버 관리 UI 개선 (상태 변경 및 졸업일 설정)
- [x] 스케줄표 노출 로직 수정 (졸업 멤버 필터링 - 과거 기록 보존 로직 개선)
- [x] 기술 문서 작성 (`tech-docs/member-status.md`)
- [x] 씨미로 링크 교체
- [x] 프사 교체
- [x] push notification 버그 해결
- [x] 0.1.0 버전 릴리즈 문서 및 사용자 가이드 작성
- [x] 졸업 멤버 노출 버그 수정 (`graduation_date` 미기입 시 예외 처리)

## 리팩토링 및 아키텍처 개선
- [x] **ScheduleGrid 리팩토링 및 하드코딩 제거**
    - [x] 하위 컴포넌트 분리 (`FilterPanel`, `CharacterCell`, `ScheduleCell`)
    - [x] `supabase.ts` 내 하드코딩된 멤버 기본 설정 제거 및 DB 연동
    - [x] `parser.ts` 내 유효하지 않은 하드코딩 데이터 정리

## 개발 예정
- [ ] 네이버 팬카페 링크 연결

