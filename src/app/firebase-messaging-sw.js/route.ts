// 이전 앱 번들이 이 URL을 다시 등록해도 캐시와 푸시 처리를 함께 유지한다.
export function GET() {
  return new Response("importScripts('/sw.js');", {
    headers: {
      'Content-Type': 'application/javascript',
      'Cache-Control': 'no-store',
    },
  });
}
