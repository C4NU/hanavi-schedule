import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildMemberPngScene, buildWeeklyPngScene, pngTitle, renderSchedulePng } from '@/lib/schedulePng';
import type { CharacterSchedule, ScheduleItem } from '@/types/schedule';

const collab: ScheduleItem = { eventId: 'shared', time: '19:00', content: '같이 방송', type: 'collab' };
const member = (id: string, name: string): CharacterSchedule => ({
    id, name, avatarUrl: '', colorTheme: 'pink', schedule: { MON: collab },
});
const characters = [member('one', '첫째'), member('two', '둘째')];

describe('공개 시간표 PNG', () => {
    it('두 보기에서 같은 합방을 한 번 그리며 선택한 멤버 이름 범위를 지킨다', () => {
        const scene = buildMemberPngScene(characters);
        expect(scene.blocks.filter(block => block.item.eventId === 'shared')).toHaveLength(1);
        expect(scene.profiles).toHaveLength(2);
        const weekly = buildWeeklyPngScene(characters);
        expect(weekly.blocks).toMatchObject([{ name: '첫째 · 둘째' }]);
        expect(buildWeeklyPngScene(characters.slice(1)).blocks).toMatchObject([{ name: '둘째' }]);
    });

    it('HTML 줄바꿈을 반영하고 좁은 방송 칸의 제목을 제한한다', () => {
        expect(pngTitle('첫 줄<br>둘째 줄', 220, 120, 18)).toEqual(['첫 줄', '둘째 줄']);
        expect(pngTitle('아주 긴 한글 제목', 52, 43, 12)[0]).toMatch(/…$/);
    });

    it.each([
        ['member', 'v2'], ['weekly', 'v2'], ['member', 'classic'], ['weekly', 'classic'],
    ] as const)('%s 보기의 %s 스킨을 같은 크기와 바이트로 렌더링한다', async (view, theme) => {
        const font = readFileSync('src/app/fonts/Cafe24Ssurround.woff');
        const input = { weekRange: '11.23 - 11.29', characters };
        const extraFonts = {
            numerals: readFileSync('src/app/fonts/Hanavi-PNG-Numerals.ttf'),
            heading: readFileSync('src/app/fonts/Hanavi-PNG-Heading.ttf'),
            serif: readFileSync('src/app/fonts/ZEN-SERIF-Regular.ttf'),
        };
        const options = { view, theme, font, extraFonts, avatarById: new Map<string, string>() };
        const render = async () => Buffer.from(await renderSchedulePng(input, options).arrayBuffer());
        const first = await render();
        expect(first.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
        expect(first.readUInt32BE(16)).toBe(1440);
        expect(await render()).toEqual(first);
    }, 20000);
});
