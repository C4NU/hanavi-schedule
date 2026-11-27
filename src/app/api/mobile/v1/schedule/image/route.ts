import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { GET as readPublicImage } from '@/app/api/proxy/image/route';
import { mobileError } from '@/lib/mobileApiResponse';
import { renderSchedulePng } from '@/lib/schedulePng';
import { getScheduleFromSupabase } from '@/utils/supabase';

async function loadAvatar(url: string): Promise<string | undefined> {
    if (!url.startsWith('https://')) return;
    try {
        const response = await readPublicImage(new Request(`https://hanavi.info/api/proxy/image?url=${encodeURIComponent(url)}`));
        const type = response.headers.get('content-type')?.split(';')[0];
        if (!response.ok || !type || !['image/png', 'image/jpeg', 'image/webp'].includes(type)) return;
        const bytes = await response.arrayBuffer();
        if (bytes.byteLength > 512 * 1024) return;
        return `data:${type};base64,${Buffer.from(bytes).toString('base64')}`;
    } catch {
        return;
    }
}

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const week = params.get('week') ?? '';
    const view = params.get('view') ?? 'member';
    const theme = params.get('theme') ?? 'v2';
    const memberIds = params.getAll('member');
    if (
        !/^\d{2}\.\d{2} - \d{2}\.\d{2}$/.test(week)
        || (view !== 'member' && view !== 'weekly')
        || (theme !== 'v2' && theme !== 'classic')
        || memberIds.length > 24
        || memberIds.some(id => !/^[a-zA-Z0-9_-]{1,80}$/.test(id))
    ) return mobileError('BAD_REQUEST', '유효한 주차, 보기, 스킨과 멤버를 선택해 주세요.');

    try {
        const schedule = await getScheduleFromSupabase(week, { strict: true });
        if (!schedule) return mobileError('NOT_FOUND', '요청한 주차의 시간표가 없습니다.');
        const selected = new Set(memberIds);
        const characters = schedule.characters.filter(char => selected.size === 0 || selected.has(char.id));
        if (characters.length === 0 || characters.length > 24) return mobileError('BAD_REQUEST', '멤버를 1~24명 선택해 주세요.');

        const avatarById = new Map<string, string>();
        const fontsDir = join(process.cwd(), 'src/app/fonts');
        const [font, numerals, heading, serif] = await Promise.all([
            readFile(join(fontsDir, 'Cafe24Ssurround.woff')),
            readFile(join(fontsDir, 'Hanavi-PNG-Numerals.ttf')),
            readFile(join(fontsDir, 'Hanavi-PNG-Heading.ttf')),
            readFile(join(fontsDir, 'ZEN-SERIF-Regular.ttf')),
            Promise.all(characters.map(async char => {
                const asset = await loadAvatar(char.avatarUrl);
                if (asset) avatarById.set(char.id, asset);
            })),
        ]);
        const result = renderSchedulePng({ ...schedule, characters }, {
            view, theme, font, extraFonts: { numerals, heading, serif }, avatarById,
        });
        const png = await result.arrayBuffer();
        return new Response(png, { headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=60, s-maxage=60',
            'Content-Disposition': `attachment; filename="hanavi-${week.replaceAll(' ', '')}.png"`,
        }});
    } catch (error) {
        console.error('[Schedule PNG] 렌더링 실패', error instanceof Error ? error.name : 'UnknownError');
        return mobileError('UPSTREAM_UNAVAILABLE', '시간표 이미지를 만들지 못했습니다.');
    }
}
