/**
 * 문자열에서 모든 HTML 태그를 제거하는 유틸리티 함수입니다.
 */
export function stripHtml(html: string): string {
    if (!html) return '';
    // <[^>]*>? 형식의 모든 정규표현식 매칭 항목(HTML 태그)을 빈 문자열로 치환
    return html.replace(/<[^>]*>?/gm, '').trim();
}
