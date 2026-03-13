/**
 * 멤버 이름에 따른 맞춤형 다시보기 텍스트를 반환합니다.
 */
export function getReplayLabel(name: string): string {
    const mapping: { [key: string]: string } = {
        '체리': '다시보고팡',
        '엘라': '다시봐라',
        '네무': '다시보넴',
        '세나': '다시보세나',
        '미라이': '다시보자몽',
        '루비': '또바조',
        '이리야': '다시보기'
    };

    return mapping[name] || '다시보기';
}
