/**
 * v2 테마 방송 셀의 멤버별 색상. 지정하지 않은 색상은 기존 멤버 색상을 사용한다.
 */
export const V2_CELL_COLOR_OVERRIDES: Partial<Record<string, { background?: string; time?: string; content?: string }>> = {
    cherii: { background: '#F3E7B2', time: '#CBA736', content: '#665703' },
    nemu: { time: '#7AA4F7' },
    mirai: { background: '#E0C6FA', time: '#BB79E5' },
    aella: { time: '#9592A4' },
    ruvi: { background: '#F3ACB2', time: '#E45C6E', content: '#A14354' },
};

export const V2_CONTENT_COLORS: Record<string, string> = {
    nemu: '#507AD4',
    senah: '#A8603D',
    mirai: '#8441A5',
    aella: '#6F6E7A',
};

export const V2_CONTENT_FALLBACK = '#4a4a4a';
export const V2_COLLAB_ACCENT = {
    color: '#ff4d88',
    gradient: 'linear-gradient(180deg, #ffffff 0%, #ff8fab 100%)',
};

export function getV2ContentColor(memberId: string, fallback?: string): string {
    return V2_CELL_COLOR_OVERRIDES[memberId]?.content || V2_CONTENT_COLORS[memberId] || fallback || V2_CONTENT_FALLBACK;
}

export function getV2BroadcastGradient(memberId: string, background?: string, collab = false) {
    if (collab) return V2_COLLAB_ACCENT.gradient;
    const memberBackground = V2_CELL_COLOR_OVERRIDES[memberId]?.background || background;
    const start = memberBackground && /^#[0-9a-f]{6}$/i.test(memberBackground) ? memberBackground : '#ffe3ec';
    return `linear-gradient(180deg, ${start} 0%, #ffffff 100%)`;
}
