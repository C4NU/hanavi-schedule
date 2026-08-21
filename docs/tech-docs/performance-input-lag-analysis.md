# 성능 분석 보고서: 키 입력 지연(Input Lag) 및 렌더링 병목 진단

본 문서는 최근 하나비 주간 일정표 서비스에서 발생한 키 입력 지연(Input Lag) 증상에 대한 정밀 분석 결과와 해결 방안을 기술합니다.

---

## 1. 개요 및 증상 요약
* **증상**: 관리자 페이지에서 스케줄을 편집하거나 텍스트를 입력할 때 타이핑 반응이 느려지고 끊기는 입력 렉 발생.
* **배포 이력 확인**: 2026년 5월 25일(최종 커밋: `d7366ed`) 이후로 소스코드 배포는 없었음.
* **판단**: Vercel의 서버 하드웨어 문제나 호스팅 네트워크 이슈와는 **100% 무관**함. (키 입력 및 화면 반영 연산은 브라우저 CPU 메인 스레드 상에서 JavaScript가 처리하는 영역)
* **근본 원인**: 누적된 데이터(Supabase 테이블 레코드 증가)와 React의 상태 변경에 따른 **비효율적인 전체 리렌더링** 구조가 결합되어 발생한 클라이언트 사이드 성능 병목.

---

## 2. 병목 원인 분석 (상세)

### 2.1. 프론트엔드 React 리렌더링 병목 (95%)
가장 결정적인 입력 렉의 주 원인입니다.

#### ① 최상위 상태 공유로 인한 연쇄 리렌더링
* **위치**: `src/app/admin/page.tsx`
* **동작**: 관리자가 시간(`time`), 컨텐츠(`content`), 카테고리(`category`) 등 텍스트 필드를 1글자 입력할 때마다 `onChange` 이벤트가 최상위 상태인 `editSchedule`을 업데이트 (`setEditSchedule`)합니다.
* **문제**: React 상태 변경 시 해당 상태를 참조하고 있는 최상위 컴포넌트와 그 하위에 속한 `ScheduleGrid`, 수십 개의 `ScheduleCell`, 그리고 카드 형태의 7종 학생증 `StudentIDCard`가 1글자를 타이핑할 때마다 통째로 리렌더링(Re-render)됩니다.

#### ② 하위 컴포넌트의 메모이제이션(Memoization) 부재
* **위치**: `src/components/ScheduleCell.tsx`
* **문제**: `ScheduleCell` 컴포넌트는 `React.memo`로 감싸져 있지 않은 일반 함수형 컴포넌트입니다. 본인의 텍스트 값이 바뀌지 않은 나머지 모든 멤버의 셀(일주일 기준 70개 이상)이 매 입력마다 가상 DOM 비교 및 재평가 과정을 거칩니다.

#### ③ 매 렌더링마다 재생성되는 의존성 배열로 인한 useMemo 무력화
* **위치**: `src/components/ScheduleGrid.tsx`
* **문제**: `filteredData`가 렌더링 시점에 구조 분해 할당(`{ ...data, characters: ... }`)을 통해 매번 새로운 객체 참조(Reference)로 생성됩니다.
  ```typescript
  const filteredData = {
      ...data,
      characters: data.characters.filter(c => activeSelectedChars.has(c.id))
  };
  ```
  이로 인해 하위에 있는 `collabGroups`와 `skipCells`를 계산하는 `useMemo`의 의존성인 `filteredData.characters` 레퍼런스가 매번 변경되어, **사실상 메모이제이션이 작동하지 않고 매 타이핑마다 비싼 합방 그룹 연산을 수행**합니다.

---

### 2.2. 데이터베이스 설계 관점 (5%)
사용자 의견처럼 메모 기능의 사용 빈도가 낮고 실제 데이터 건수가 적다면 현재 타이핑 렉의 직접적인 주요 원인은 아닙니다. 다만, 데이터가 점차 쌓이면서 API 로딩 자체를 늘어지게 만들 수 있는 병목 포인트가 발견되었습니다.

#### ① `schedule_item_memos` 테이블 인덱스 부재
* **위치**: [20260330_create_schedule_item_memos.sql](file:///Users/canu/Development/Web/Project%20Hanavi/hanavi_schedule/supabase/migrations/20260330_create_schedule_item_memos.sql)
* **문제**: 외래키인 `schedule_item_id`에 인덱스(Index)가 생성되어 있지 않습니다.
* **영향**: Supabase 조회 시 `in('schedule_item_id', itemIds)` 조건을 검색할 때, 테이블이 비어있거나 데이터가 0건이라도 데이터베이스는 매치되는 데이터가 없는지 확인하기 위해 전체 테이블을 스캔(Full Table Scan)해야 합니다. 현재는 데이터가 거의 없어 부하가 없으나, 서비스 누적 시간이 길어지면 주간 데이터를 불러오는 초기 로딩 성능에 악영향을 미칠 수 있습니다.

---

## 3. 단계별 해결 방안 (로드맵)

### 1단계: 프론트엔드 입력부 최적화 (즉시 조치 가능)
매 글자마다 최상위 상태를 갱신하지 않고, 사용자 타이핑과 화면 그리기를 차단(Blocking)하지 않는 구조로 변경합니다.
* **로컬 상태 분리**: `ScheduleCell` 내의 인풋과 `MarkdownEditor`가 자체 로컬 `useState`로 값을 가지고 있도록 변경하고, 사용자가 입력을 마치고 포커스를 해제할 때(`onBlur`) 또는 타이핑이 멈춘 시점(Debounce)에만 상위 상태(`editSchedule`)를 업데이트하도록 제어합니다.
* **컴포넌트 메모이제이션**: `ScheduleCell`과 `StudentIDCard`에 `React.memo`를 적용하여 부모가 렌더링되어도 변경되지 않은 셀은 다시 그리지 않도록 차단합니다.
* **useMemo 레퍼런스 최적화**: `filteredData.characters`가 매 렌더링마다 새로운 레퍼런스로 평가되는 구조를 개선하고 `collabGroups` 계산 로직의 불필요한 재연산을 방지합니다.

### 2단계: 데이터베이스 쿼리 최적화
* **외래키 인덱스 추가**: `schedule_item_memos` 테이블의 `schedule_item_id` 컬럼에 대한 단일 B-Tree 인덱스를 생성하여 데이터 누적에 따른 쿼리 스캔 부하를 사전에 예방합니다.
  ```sql
  CREATE INDEX IF NOT EXISTS schedule_item_memos_schedule_item_id_idx 
  ON public.schedule_item_memos (schedule_item_id);
  ```
