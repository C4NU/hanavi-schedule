# v1.5.0 Current Progress

현재 브랜치에서 개발 완료된 기능 및 개발 예정인 기능들에 대한 기록입니다.

## 완료된 항목 (Refactoring & UX Phase 1)
- [x] **Toast UI 도입**: `sonner` 라이브러리를 활용한 `ToastProvider` 컴포넌트 생성.
- [x] **반응형 알림 위치 설정**: 모바일 환경(하단 중앙), 데스크탑 환경(우상단)으로 설정.
- [x] **Legacy alert() 제거**: 프로젝트 전반의 `alert()` 호출부를 `toast.success()`, `toast.error()`로 교체.
- [x] **BaseModal 고도화**: 애니메이션, 접근성(`aria-modal`), 닫기 버튼, 오버레이/Esc 키 닫기 등 공통 사양 구현.
- [x] **InfoModal 리팩토링**: 새로운 `BaseModal` 기반으로 레이아웃 및 애니메이션 개선.
- [x] **AddMemberModal 리팩토링**: 새로운 `BaseModal` 기반으로 레이아웃 통합.
- [x] **EditMemberModal 리팩토링**: 새로운 `BaseModal` 기반으로 레이아웃 통합.
- [x] **주간 시간표(Weekly) 개선**: 시작 시간 변경(8시) 및 텍스트 크기 불균형/상속 이슈 해결.
- [x] **모바일 레이아웃 최적화**: 하단 여백 제거 및 Safe Area 대응.
- [x] **주간 통합 UI 고도화**: 시간 축 제거, 셀 내부 시간 표시, 모바일 콤팩트 뷰(7요일 통합) 및 자유 드래그 지원.
- [x] **일요일 스케줄 최적화**: 일요일 합방(병합) 기능 구현 및 PNG 내보내기 그림자 이슈 해결.
- [x] **PNG 내보내기 오류 수정**: 일요일 스케줄 병합(span) 적용 시 PNG 변환 과정에서 CSS grid 설정이 초기화되어 레이아웃이 깨지던 현상 수정.

## 진행 중인 항목
- [/] **공통 모달 컴포넌트 고도화 (Phase 2)**: 나머지 모든 모달 컴포넌트를 `BaseModal`로 교체 중.

## 예정된 항목
- [ ] `RemoveMemberModal` 리팩토링
- [ ] `AdminInfoModal` 리팩토링
- [ ] `RegularHolidayModal` 리팩토링
- [ ] `PlatformLinkModal` 리팩토링 (검침 필요)
- [ ] `YouTubeLinkModal` 리팩토링 (검침 필요)
- [ ] 최종 검증 및 빌드 테스트
