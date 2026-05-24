# 개인 스케줄 카드 이미지(PNG) 저장 기술 명세서

개인별 스케줄 모달에서 사용자가 현재 주차의 개인 스케줄을 고화질 PNG 이미지로 내보낼 수 있도록 하는 기능과 가로/세로 모드 지원에 대한 기술적 구현 상세를 기록합니다.

## 1. 개요
사용자는 개인 스케줄 모달(`PersonalScheduleModal`) 내에서 자신만의 방송 일정을 카드 형태로 생성할 수 있습니다. 생성된 카드는 `modern-screenshot` 라이브러리를 활용하여 사용자의 브라우저 환경에서 직접 PNG 이미지 파일로 변환 및 다운로드됩니다.

## 2. 이미지 규격 및 방향 (Orientation)
가로모드(Landscape)와 세로모드(Portrait)의 두 가지 레이아웃 규격을 지원합니다.

*   **가로모드 (Landscape)**: 1000px × 562px (약 16:9 비율)
*   **세로모드 (Portrait)**: 562px × 1000px (약 9:16 비율)

### 프리뷰 스케일링 엔진
모달 내부에서 가로/세로 카드가 화면 바깥으로 깨지지 않고 적절히 맞춰지도록 `ResizeObserver`를 활용하여 실시간 배율을 연산합니다.
```typescript
const cardWidth = orientation === 'landscape' ? 1000 : 562;
const cardHeight = orientation === 'landscape' ? 562 : 1000;

const scaleX = (containerWidth - 32) / cardWidth;
const scaleY = (containerHeight - 32) / cardHeight;
setScale(Math.min(1, scaleX, scaleY));
```

## 3. 테마별 레이아웃 대응 방식
가로모드는 수평 Flex 배치를 사용하고, 세로모드는 **상단에 분할 타이틀과 프로필/학생증 카드(우측 정렬), 하단에 시간표/리스트/그리드 일정표**를 배치하여 효율적인 공간 분할과 뛰어난 가독성을 보장합니다.

### 디자인 1: 학생증 + 에타 시간표
*   **가로모드**: 왼쪽 에타 시간표(Flex-1) + 오른쪽 학생증 카드(390px 고정)
*   **세로모드 (Portrait)**:
    *   **상단 영역 (185px 고정으로 위로 올림)**: 
        *   **좌측 (텍스트 간소화 및 중앙 정렬)**: 불필요한 캐릭터 이름 및 영문 일정 텍스트를 제거하고, **"HANAVI"** 대형 타이포그래피와 그 아래 주차 날짜 배지를 가로 중앙 정렬(`items-center justify-center text-center`)하여 깔끔하게 배치.
        *   **우측**: 학생증 카드(370px × 230px)가 가로 폭 밖으로 잘리지 않도록 `w-[267px] h-[172px]` 크기의 wrapper div 내부에 `absolute top-1 right-0 scale-[0.72] origin-top-right`로 배치하여 텍스트와의 사이 여백을 늘리고 우측 잘림을 방지하며 가로 폭 끝 정렬을 유지.
    *   **하단 영역 (나머지 공간)**: 에타 시간표가 가로 562px 폭을 가득 채우며 렌더링.
*   **시간표 시간 축 높이(hourHeight) 동적 지정**: 
    *   가로모드: `28px` (14시간 범위 = 392px)
    *   세로모드: `48px` (14시간 범위 = 672px)로 넓혀 세로 공간을 균형 있게 채우고 가독성을 강화.
    *   세로모드 시 일정 텍스트 폰트 크기를 `11px`로 상향 조정 (가로모드는 `8.5px`).

### 디자인 2: 파스텔 리스트 테마
*   **가로모드**: 왼쪽 요일 리스트 + 오른쪽 기울어진 프로필 액자(360px)
*   **세로모드 (Portrait)**:
    *   **상단 영역 (240px 고정)**:
        *   **좌측 (텍스트 간소화 및 프로필 높이 일치)**: 캐릭터 이름과 SCHEDULE 배지를 제거하고, 디자인 1과 동일한 크기의 **"HANAVI"** 대형 폰트와 그 아래 주차 날짜 배지를 가로 중앙 정렬(`items-center justify-center text-center`)하여 `h-[240px]` 높이 내에서 배치. 이를 통해 우측 프로필 카드(`h-[240px]`)와 완벽하게 상하단 끝선을 정렬.
        *   **우측**: 프로필 액자 크기를 `w-[180px] h-[240px]`로 축소하고 수평 배치.
    *   **하단 영역 (나머지 공간)**: 7일 요일 리스트가 하단을 가득 채움.

### 디자인 3: 파스텔 그리드 테마
*   **가로모드**: 왼쪽 2열 그리드 요일 카드 + 오른쪽 역방향 기울어진 프로필 액자(360px)
*   **세로모드 (Portrait)**:
    *   **상단 영역 (240px 고정)**: 디자인 2와 동일하게 좌측 "HANAVI" 및 날짜 배지의 중앙 정렬 배치로 교체하여 프로필 카드와 높이 통일 및 헤더 레이아웃 일관성 유지.
    *   **하단 영역 (나머지 공간)**: 2열 그리드 요일 카드가 하단을 꽉 채움.
    *   **그리드 내부 상자 높이 균일화 (가로, 세로 공통)**: 텍스트 내용의 유무나 길이에 영향을 받지 않도록 요일별 카드의 높이를 고정 적용. 월~토 카드의 경우 가로모드 `h-[74px]`, 세로모드 `h-[86px]`로 고정하고, 일요일 카드의 경우 가로모드 `h-[42px]`, 세로모드 `h-[50px]` 및 `py-0`으로 고정하여 완벽하게 정돈된 그리드 레이아웃을 형성.

## 4. 내보내기 안정성 (Shadow & Filter Bug Fix)
`modern-screenshot` 또는 `html-to-image`와 같은 라이브러리는 CSS의 `box-shadow`나 `filter` 속성이 들어가 있을 때 SVG/Canvas 렌더링 엔진 내부 한계로 인해 그림자 잔상이 남거나 까맣게 뭉개지는 결함(Glitch)이 있습니다.

이를 방지하기 위해 PNG 저장 실행 시(`handleExport`), 원본 DOM 대신 복제본 DOM(Clone)을 생성한 뒤 하위 모든 요소의 그림자와 필터를 제거하는 헬퍼 함수를 재귀적으로 호출합니다.
```typescript
const stripShadowsAndFilters = (el: HTMLElement) => {
    el.style.boxShadow = 'none';
    el.style.filter = 'none';
    el.style.setProperty('--tw-shadow', 'none');
    el.style.setProperty('--tw-shadow-colored', 'none');
    el.style.setProperty('box-shadow', 'none', 'important');
    el.style.setProperty('filter', 'none', 'important');
    
    Array.from(el.children).forEach(child => {
        stripShadowsAndFilters(child as HTMLElement);
    });
};
```
또한, 내보내기 시 투명 배경 누락으로 인한 텍스트 뭉개짐을 피하기 위해 `domToPng` 옵션에 `backgroundColor: '#ffffff'`와 고화질 2배율(`scale: 2`)을 명시하여 출력 퀄리티를 최적화했습니다.
