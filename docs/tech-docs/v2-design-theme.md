# v2.0.0 디자인 테마 시스템 — 신규 시간표 디자인 스펙

> 상태: 계획 확정 (2026-08-25)
> 시안: 2026-08 신규 주간 스케줄표 이미지 (멤버×요일 매트릭스, 파스텔 핑크)

## 1. 개요

v2.0.0에서 시간표에 **테마 시스템**을 도입한다. 기존 디자인(`classic`)과 신규 디자인(`v2`)을
사용자가 선택해 사용할 수 있게 하며, member 뷰(매트릭스)·weekly 뷰(시간축) 모두 테마를 지원한다.

- 뷰 전환(member/weekly)은 기존대로 유지 — 테마와 직교하는 개념
- 테마 선택은 localStorage에 영구 저장
- 앱(Expo) 포팅은 2.0.0 이후 별도 작업 (LTS 안정화 우선)

## 2. 시안 분석

### 2.1 레이아웃 (member 뷰 기준)

```
[WEEKLY SCHEDULE pill 배지]
▶ 하나비 유니버스 주간 스케줄표   8.24 ~ 8.30
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│  *  │ MON │ TUE │ WED │ THU │ FRI │ SAT │ SUN │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│채리  │카드 │카드 │OFF  │카드 │카드 │OFF  │(빈) │
│네무  │카드 │OFF  │카드 │카드 │OFF  │카드 │카드 │
│ ...  │     │     │     │     │     │     │█████│← 합방 통합셀
└─────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
   A WORLD WHERE DREAMING GIRLS ENCOUNTER ... (푸터 캡션)
```

- 기존 member 뷰와 동일한 매트릭스 골격 (corner cell + 7열 + 멤버 행) → **스킨 교체 방식**
- 좌측 멤버 셀: 스퀘클 아바타 + 좌상단 이름 배지 오버레이 (멤버 대표색 pill)
- 요일 헤더: 핑크 uppercase + wide letter-spacing, 코너는 `*` 장식 문자
- 배경: 파스텔 핑크 gradient + 워터마크/필기체 장식 (은은하게)
- 푸터: 영문 브랜드 캡션 중앙 정렬

### 2.2 셀 상태 4종

| 상태 | 스타일 |
|---|---|
| 방송 | 멤버색 **세로 gradient**(상단 colorBg → 하단 흰색), 시간 대형 볼드(colorBorder색), `▸ 내용` 2줄 clamp |
| 빈 내용 | gradient 카드만 표시 (텍스트 없음) — 내용 미기재 기본 셀 |
| OFFLINE | 멤버색 무관 회색 카드 + 중앙 "OFFLINE" |
| 합방 | **최상단 참여자 행에서 참여자 행을 세로로 통합한 단일 셀**, 진한 핑크 + 흰색 텍스트 |

### 2.3 디자인 토큰 (시안 추정값 — 구현 시 시각 보정)

```
배경        #fff7f9 → #ffe9f0 gradient
배지/타이틀  핑크 #f472a6 계열 / 날짜 #f8b8cd
요일 헤더    #f5a8c2, letter-spacing 0.2em
카드        linear-gradient(to bottom, colorBg, #fff), radius 14px, 부드러운 shadow
시간 텍스트  colorBorder (멤버색), ~28px 볼드
내용 텍스트  #4a4a4a, ▸ 프리필스, 2줄 clamp
OFFLINE     bg #e3e3e3 / text #9b9b9b, 중앙 정렬
합방        진한 핑크 gradient (#ff8fab → #ff5c8a 계열) + 흰색 텍스트
푸터 캡션    #f2a0bd, uppercase, 소형
```

멤버 대표색은 기존 `characters.color_bg`/`color_border`를 그대로 사용 → **스키마 변경 없음**,
신규 멤버 추가 시 자동 대응 (목데이터 폴백 금지 규칙과 부합).

## 3. 확정 결정사항 (2026-08-25 확정)

1. **시간축(weekly) 뷰 유지** — member/weekly 뷰 전환 유지, 양쪽 모두 테마 지원
2. **빈 연핑크 카드** = 내용 미기재 기본 셀 (gradient 카드만 렌더)
3. **합방 병합 규칙** — 최상단 참여 멤버 행 앵커, 참여자 행 세로 통합, 시각적으로 이어진 단일 블록.
    개인 다방송은 기존 n분열 유지. (기존 `collabGroups`/`skipCells` 로직과 동일 규칙 → 스타일만 교체)
4. **칩 완전 이관** — v2 테마 셀에서 메모/다시보기/카테고리 칩 제거, 상세 시트(클릭 → 중앙 시트)로 이관.
    classic 테마는 기존 표현 유지.
5. **반응형** — 기존 프레임 유지(데스크톱 7열 매트릭스 / 모바일 요일 스와이프) + 스킨 교체
6. **앱 포팅** — 2.0.0 이후 (백로그)
7. **WYSIWYG** — 관리자 화면도 동일 테마 렌더링 파이프라인 공유

## 4. 구현 계획

### 단계 1 — 테마 상태 인프라
- `theme: 'classic' | 'v2'` prop을 page → ScheduleGrid → WeeklyTimetable 전달
- page.tsx에서 useState + localStorage(`hanavi_schedule_theme`) 영구 저장
- 그리드 컨테이너에 `data-theme` 속성 → CSS 스코프 기반 오버라이드

### 단계 2 — Member 뷰 v2 스킨
- 헤더: 배지 + ▶ 타이틀 + 날짜 인라인 (기존 컨트롤은 유지·재배치)
- 요일 헤더/코너/멤버 셀(이름 배지 오버레이)
- ScheduleCell: gradient 카드, 시간 대형 타이포, ▸ 내용, OFFLINE/빈내용/합방 스타일
- 합방 통합 셀: 기존 rowspan 로직 유지 + 핑크 스킨
- 푸터 캡션 + 배경 장식
- v2에서 칩 미렌더 (classic 분기 유지)

### 단계 3 — Weekly 뷰 v2 스킨
- 시간축 구조 유지, 블록/헤더/배경을 v2 디자인 언어로

### 단계 4 — 관리자 WYSIWYG 확인
- admin page도 동일 테마 적용 확인 (편집 UI는 유지)

### 단계 5 — 검증
- `tsc --noEmit` 0 / `npm test` 통과 / `npm run lint` 에러 0
- member/weekly × classic/v2 × 데스크톱/모바일 스크린샷 검증
- 합방 주차(일요일 단체 방송) 렌더링 확인

## 5. 주의사항

- **합방 3곳 휴리스틱**: ScheduleGrid/WeeklyTimetable/PersonalScheduleModal의 병합 규칙이 상이 —
    v2 스킨 적용 시 세 곳을 함께 확인 (AGENTS.md 규칙)
- **다방송 combined 파싱**: 반드시 `utils/time.ts` split/join 헬퍼 경유 (재구현 금지)
- **HTML 컨텐츠**: `DOMPurify.sanitize` 없이 dangerouslySetInnerHTML 금지
- **내보내기(exporting) 경로**: `div[data-exporting="true"]` 오버라이드가 존재 — v2 테마에서도 PNG 내보내기
    레이아웃이 깨지지 않는지 확인
- **weekRange 포맷**: 시안은 `8.24 ~ 8.30` — 기존 포맷과 다르면 v2 헤더에서만 변환 표시
