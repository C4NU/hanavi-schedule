import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '@/app/api/mobile/v1/schedule/memos/route';

const { readSchedule, submit } = vi.hoisted(() => ({ readSchedule: vi.fn(), submit: vi.fn() }));
vi.mock('@/utils/supabase', () => ({ getScheduleFromSupabase: readSchedule }));
vi.mock('@/lib/mobileScheduleMemo', async (original) => ({
    ...await original<typeof import('@/lib/mobileScheduleMemo')>(),
    submitPublicMobileMemo: submit,
}));

const event = '06471001-0cab-4bed-8f07-7cb5403d27e2';
const legacy = 'a769a603-c918-49bd-a40b-bab197450cd1';
const input = {
    week: '11.23 - 11.29', requestId: 'c9822b7e-8bb2-4cf6-8bee-90abed323d28',
    target: { kind: 'event', id: event }, content: '  변경 공지  ',
};
const makeRequest = (data: unknown) => new Request('https://schedule.example/api/mobile/v1/schedule/memos', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
});

beforeEach(() => {
    vi.resetAllMocks();
    readSchedule.mockResolvedValue({ scheduleId: 'week-id', weekRange: input.week, characters: [{
        schedule: { MON: { type: 'stream', parts: [{ id: event }] }, TUE: { id: legacy, type: 'stream' } },
    }] });
});

describe('공개 모바일 메모 등록', () => {
    it('공개 정규 이벤트 또는 옛 방송의 대상과 다듬은 본문을 저장한다', async () => {
        submit.mockResolvedValue({ outcome: 'created', memo: { id: 'memo' } });
        const response = await POST(makeRequest(input));
        expect(response.status).toBe(201);
        expect(await response.json()).toMatchObject({ schemaVersion: 1, data: { id: 'memo' } });
        expect(submit).toHaveBeenCalledWith({ ...input, content: '변경 공지' }, expect.any(Request), 'week-id');
        expect((await POST(makeRequest({ ...input, target: { kind: 'legacy', id: legacy } }))).status).toBe(201);
    });

    it('비공개 대상과 다른 주차에는 기록하지 않는다', async () => {
        const unavailable = await POST(makeRequest({ ...input, target: { kind: 'legacy', id: event } }));
        const differentWeek = await POST(makeRequest({ ...input, week: '11.16 - 11.22' }));
        expect([unavailable.status, differentWeek.status]).toEqual([404, 404]);
        expect(submit).not.toHaveBeenCalled();
    });

    it('긴 본문과 초과 요청을 DB 조회 전에 거절한다', async () => {
        expect((await POST(makeRequest({ ...input, content: '가'.repeat(101) }))).status).toBe(400);
        expect((await POST(makeRequest({ ...input, content: 'x'.repeat(3000) }))).status).toBe(413);
        expect(readSchedule).not.toHaveBeenCalled();
    });

    it('응답을 잃은 재시도와 제한 응답을 구분한다', async () => {
        submit.mockResolvedValueOnce({ outcome: 'existing', memo: { id: 'memo' } })
            .mockResolvedValueOnce({ outcome: 'rate_limited' });
        expect((await POST(makeRequest(input))).status).toBe(200);
        const limited = await POST(makeRequest(input));
        expect(limited.status).toBe(429);
        expect(limited.headers.get('Retry-After')).toBe('600');
    });
});
