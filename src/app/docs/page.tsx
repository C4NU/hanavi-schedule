import type { Metadata } from 'next';
import Link from 'next/link';
import spec from '../../../public/openapi/mobile-v1.json';
import styles from './page.module.css';

export const metadata: Metadata = {
    title: '공개 API 문서 | 하나비 스케줄',
    description: '하나비 스케줄 공개 REST API의 요청 형식과 응답 예시입니다.',
};

const basePath = spec.servers[0].url;
const origin = 'https://hanavi-schedule.vercel.app';
const specPath = '/openapi/mobile-v1.json';
const syncedAt = '2026-11-27T00:00:00.000Z';
const member = { id: 'cherii', name: '체리' };

const readExamples = {
    '/schedule': {
        label: '주차 시간표',
        args: "-G --data-urlencode 'week=11.23 - 11.29'",
        detail: 'week는 MM.DD - MM.DD 형식입니다. 생략하면 최신 활성 주차를 조회합니다. 날짜와 방송 시각의 기준은 KST입니다.',
        data: { scheduleId: '00000000-0000-4000-8000-000000000001', weekRange: '11.23 - 11.29', weekStartDate: '2026-11-23', characters: [] },
    },
    '/schedule/search': {
        label: '지난 일정 검색',
        args: "-G --data-urlencode 'q=스토리텔러'",
        detail: 'q는 1~80자입니다. 공개 방송 제목을 검색하며 최대 40건을 반환합니다.',
        data: {
            results: [{
                id: '3bd4995b-65f9-5d57-baaf-828fe4c68c37',
                title: '스토리텔러',
                members: ['체리'],
                date: '2026-11-23',
                weekStart: '2026-11-23',
                dayIndex: 0,
            }],
            hasMore: false,
        },
    },
    '/members': {
        label: '멤버 목록',
        detail: '현재 활성 멤버를 조회합니다.',
        data: [member],
    },
    '/members/{id}': {
        label: '멤버 상세',
        examplePath: '/members/cherii',
        detail: '멤버 목록의 id를 경로에 넣습니다.',
        data: member,
    },
    '/settings/links': {
        label: '공식 그룹 링크',
        detail: '공개 링크 목록을 조회합니다. 설정된 링크가 없으면 빈 배열을 반환합니다.',
        data: [],
    },
    '/schedule/image': {
        label: '시간표 PNG',
        args: "-G --data-urlencode 'week=11.23 - 11.29' --data-urlencode 'view=member'",
        output: ' -o schedule.png',
        detail: 'week는 필수입니다. view는 member 또는 weekly, theme은 v2 또는 classic입니다. member에 멤버 ID를 넣어 필터링할 수 있고, 여러 명은 같은 파라미터를 반복합니다.',
        response: 'HTTP 200\nContent-Type: image/png\nCache-Control: public, max-age=60, s-maxage=60',
    },
} satisfies Record<string, {
    label: string;
    detail: string;
    args?: string;
    examplePath?: string;
    output?: string;
    data?: unknown;
    response?: string;
}>;

const readRoutes = [
    '/schedule', '/schedule/search', '/members', '/members/{id}', '/settings/links', '/schedule/image',
] as const satisfies ReadonlyArray<keyof typeof readExamples>;

const writeOperations = [
    { path: '/schedule/memos', method: 'POST', operation: spec.paths['/schedule/memos'].post },
    { path: '/push/subscription', method: 'PUT', operation: spec.paths['/push/subscription'].put },
    { path: '/push/subscription', method: 'DELETE', operation: spec.paths['/push/subscription'].delete },
] as const;

const anchor = (path: string) => path.slice(1).replace('/{id}', '-id').replaceAll('/', '-');

function renderExample(path: typeof readRoutes[number]) {
    const example = readExamples[path];
    const args = 'args' in example ? ` ${example.args}` : '';
    const output = 'output' in example ? example.output : '';
    const examplePath = 'examplePath' in example ? example.examplePath : path;
    return {
        request: `curl${args} '${origin}${basePath}${examplePath}'${output}`,
        response: 'response' in example
            ? example.response
            : JSON.stringify({ schemaVersion: 1, syncedAt, data: example.data }, null, 2),
    };
}

export default function ApiDocsPage() {
    return (
        <div className={styles.page}>
            <header className={styles.top}>
                <nav className={styles.topInner} aria-label="사이트 탐색">
                    <div className={styles.breadcrumb}>
                        <Link href="/">하나비 스케줄</Link>
                        <span aria-hidden="true">/</span>
                        <span>공개 API</span>
                    </div>
                    <a href={specPath} className={styles.specLink}>OpenAPI JSON</a>
                </nav>
            </header>
            <div className={styles.layout}>
                <nav className={styles.index} aria-label="API 목차">
                    <details open>
                        <summary>목차</summary>
                        <div className={styles.indexLinks}>
                            <a href="#start">시작하기</a>
                            <ul aria-label="공개 조회">
                                {readRoutes.map(path => (
                                    <li key={path}><a href={`#${anchor(path)}`}>{readExamples[path].label}</a></li>
                                ))}
                            </ul>
                            <a href="#write">제보·기기 구독</a>
                            <a href="#errors">오류 응답</a>
                        </div>
                    </details>
                </nav>
                <main className={styles.main} id="start">
                    <div className={styles.intro}>
                        <h1>하나비 공개 API</h1>
                        <p>주간 시간표, 지난 방송, 멤버 프로필을 조회할 수 있습니다.</p>
                    </div>
                    <dl className={styles.contract}>
                        <div><dt>기본 경로</dt><dd><code>{basePath}</code></dd></div>
                        <div><dt>버전</dt><dd><code>{spec.info.version}</code> · JSON <code>schemaVersion: 1</code></dd></div>
                        <div><dt>인증</dt><dd>조회 요청에 API 키나 로그인이 필요하지 않습니다.</dd></div>
                        <div><dt>캐시</dt><dd>JSON은 <code>no-store</code>입니다. PNG 성공 응답은 60초 동안 캐시할 수 있습니다.</dd></div>
                    </dl>
                    <p className={styles.note}>JSON 성공 응답의 <code>syncedAt</code>은 서버가 응답을 만든 UTC 시각입니다. 응답 예시는 주요 필드만 보여줍니다. 호환되지 않는 응답 형식은 경로 버전을 올려 구분합니다.</p>

                    {readRoutes.map(path => {
                        const { request, response } = renderExample(path);
                        const statuses = Object.keys(spec.paths[path].get.responses);
                        return (
                            <section key={path} id={anchor(path)} className={styles.section}>
                                <h2>{readExamples[path].label}</h2>
                                <p className={styles.route}><span>GET</span> <code>{`${basePath}${path}`}</code></p>
                                <p>{readExamples[path].detail}</p>
                                {path === '/schedule/image' && <p className={styles.note}>이 경로는 하나비 스케줄 2.2.0부터 사용할 수 있습니다.</p>}
                                <div className={styles.examples}>
                                    <div className={styles.example}><h3>요청 예시</h3><pre><code>{request}</code></pre></div>
                                    <div className={styles.example}><h3>응답 예시</h3><pre><code>{response}</code></pre></div>
                                </div>
                                <p className={styles.note}>응답 상태 <code>{statuses.join(' · ')}</code></p>
                            </section>
                        );
                    })}

                    <section id="write" className={styles.section}>
                        <h2>제보·기기 구독</h2>
                        <p>공개 시간표 제보에는 로그인 없이 대상과 요청 ID를 보냅니다. 기기 구독에는 설치별 Bearer 키가 필요하며, 모바일 푸시가 활성화된 환경에서 사용할 수 있습니다.</p>
                        <ul className={styles.writes}>
                            {writeOperations.map(({ path, method, operation }) => (
                                <li key={method}>
                                    <p className={styles.route}><span>{method}</span> <code>{`${basePath}${path}`}</code></p>
                                    <p>{operation.summary} · <code>{Object.keys(operation.responses).join(' · ')}</code></p>
                                </li>
                            ))}
                        </ul>
                        <p>본문과 인증 형식은 <a href={specPath}>OpenAPI JSON</a>에서 확인할 수 있습니다.</p>
                    </section>

                    <section id="errors" className={styles.section}>
                        <h2>오류 응답</h2>
                        <p>잘못된 요청은 400, 공개 결과가 없으면 404, 상위 서버 장애는 503을 반환합니다. 429를 받으면 <code>Retry-After</code>만큼 기다린 뒤 재시도합니다.</p>
                        <pre><code>{JSON.stringify({
                            error: { code: 'BAD_REQUEST', message: '주차를 MM.DD - MM.DD 형식으로 입력해 주세요.', requestId: '00000000-0000-4000-8000-000000000002' },
                        }, null, 2)}</code></pre>
                    </section>
                </main>
            </div>
        </div>
    );
}
