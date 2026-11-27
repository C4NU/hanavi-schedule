// 최신 공개 버전을 먼저 둔다. 공개 안내와 관리자 빌드 정보가 같은 버전을 쓴다.
export const SCHEDULE_RELEASES = [
    {
        version: '2.2.0',
        changes: [
            '연결된 방송은 씨미와 YouTube에서 다시 볼 수 있어요.',
            '신규 스킨의 방송 카드에 멤버 색을 적용하고, 주간 통합의 시간표 배경과 하단 여백을 다듬었어요.',
            '멤버별·주간 통합 시간표를 기기 화면 크기와 관계없이 같은 PNG로 저장할 수 있어요.',
        ],
    },
    {
        version: '2.1.1',
        changes: [
            '방송 제목으로 지난 시간표를 찾을 수 있어요.',
            '모바일에서 주차와 요일을 바꾸기 쉽도록 메뉴와 버튼을 다듬었어요.',
            '관리자 편집 시트와 저장 후 업데이트 알림의 디자인을 맞췄어요.',
        ],
    },
    {
        version: '2.1.0',
        changes: [
            '합방에 멤버를 추가해도 기존 멤버의 합류 시간이 유지됩니다.',
            '공개 시간표의 필터와 이미지 저장 버튼을 다듬었습니다.',
            '관리자 편집 화면의 글꼴과 셀 배치를 공개 시간표에 맞췄습니다.',
            '시간표에서 방송 내용을 복사하면 배경색 없이 붙여넣을 수 있습니다.',
        ],
    },
] as const;

export const SCHEDULE_RELEASE_VERSION = SCHEDULE_RELEASES[0].version;

export const SCHEDULE_BUILD_ID = process.env.NEXT_PUBLIC_SCHEDULE_BUILD_ID
    || (process.env.NODE_ENV === 'development' ? '로컬 개발' : '미제공');
