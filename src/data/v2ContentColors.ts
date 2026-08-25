/**
 * v2 테마 — 멤버별 일정 내용 텍스트 색상 (2026-08 시안 기준)
 * 멤버 ID 기준 매핑. 등록되지 않은 멤버는 colorBorder로 폴백한다.
 * 루비(ruvi)는 시안 확정 후 추가.
 */
export const V2_CONTENT_COLORS: Record<string, string> = {
    cherii: '#896E23',
    nemu: '#507AD4',
    senah: '#A8603D',
    mirai: '#8441A5',
    aella: '#6F6E7A',
};

export const V2_CONTENT_FALLBACK = '#4a4a4a';

export function getV2ContentColor(memberId: string, fallback?: string): string {
    return V2_CONTENT_COLORS[memberId] || fallback || V2_CONTENT_FALLBACK;
}
