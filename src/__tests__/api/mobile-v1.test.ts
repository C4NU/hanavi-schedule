import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSchedule, search, getMembers, getLinks } = vi.hoisted(() => ({
    getSchedule: vi.fn(), search: vi.fn(), getMembers: vi.fn(), getLinks: vi.fn(),
}));

vi.mock('@/utils/supabase', () => ({ getScheduleFromSupabase: getSchedule }));
vi.mock('@/lib/publicScheduleSearch', () => ({ searchPublicSchedule: search }));
vi.mock('@/lib/publicMobileMembers', () => ({
    getMobileMembers: getMembers,
    getMobileGroupLinks: getLinks,
}));

import { GET as readSchedule } from '@/app/api/mobile/v1/schedule/route';
import { GET as searchSchedule } from '@/app/api/mobile/v1/schedule/search/route';
import { GET as readMember } from '@/app/api/mobile/v1/members/[id]/route';
import { GET as readLinks } from '@/app/api/mobile/v1/settings/links/route';

const request = (path: string) => new Request(`https://schedule.example/api/mobile/v1${path}`);
const fixture = {
    scheduleId: 'schedule-1',
    weekRange: '11.23 - 11.29',
    weekStartDate: '2026-11-23',
    characters: [{ id: 'cherii', schedule: { MON: { eventId: 'event-1', time: '10:00' } } }],
    events: [{ id: 'event-1', type: 'collab', memberIds: ['cherii', 'nemu'] }],
    canonicalEventsStatus: 'available',
    privateField: 'internal',
};

beforeEach(() => vi.resetAllMocks());

describe('mobile v1 public schedule', () => {
    it('returns canonical events and the cell projection without requesting credentials', async () => {
        getSchedule.mockResolvedValue(fixture);
        const response = await readSchedule(request('/schedule'));
        const body = await response.json();
        expect(response.status).toBe(200);
        expect(body).toMatchObject({
            schemaVersion: 1,
            syncedAt: expect.any(String),
            data: {
                weekStartDate: '2026-11-23',
                characters: fixture.characters,
                events: fixture.events,
            },
        });
        expect(body.data).not.toHaveProperty('privateField');
        expect(getSchedule).toHaveBeenCalledWith(undefined, { strict: true });
    });

    it('validates week labels before querying', async () => {
        const response = await readSchedule(request('/schedule?week=11.23%20-%2012.19'));
        expect(response.status).toBe(400);
        expect(getSchedule).not.toHaveBeenCalled();
    });

    it('returns 404 for a missing week and 503 for an upstream outage', async () => {
        getSchedule.mockResolvedValueOnce(null).mockRejectedValueOnce(new Error('internal connection name'));
        const missing = await readSchedule(request('/schedule?week=12.28%20-%2001.03'));
        const unavailable = await readSchedule(request('/schedule'));
        expect(missing.status).toBe(404);
        expect(getSchedule).toHaveBeenNthCalledWith(1, '12.28 - 01.03', { strict: true });
        expect(unavailable.status).toBe(503);
        expect(unavailable.headers.get('Cache-Control')).toBe('no-store');
        expect(await unavailable.json()).toEqual({
            error: { code: 'UPSTREAM_UNAVAILABLE', message: expect.not.stringContaining('internal'), requestId: expect.any(String) },
        });
    });
});

describe('mobile v1 search, member and links', () => {
    it('uses the existing bounded public search', async () => {
        search.mockResolvedValue({ results: [], hasMore: false });
        expect((await searchSchedule(request('/schedule/search?q=%20'))).status).toBe(400);
        expect((await searchSchedule(request('/schedule/search?q=story'))).status).toBe(200);
        expect(search).toHaveBeenCalledExactlyOnceWith('story');
    });

    it('reports a missing member without returning private fields', async () => {
        getMembers.mockResolvedValue([]);
        const response = await readMember(request('/members/missing'), { params: Promise.resolve({ id: 'missing' }) });
        expect(response.status).toBe(404);
        expect(getMembers).toHaveBeenCalledExactlyOnceWith('missing');
    });

    it('returns the public links list in the versioned envelope', async () => {
        getLinks.mockResolvedValue([{ key: 'group_link_youtube', value: 'https://youtube.com/@hanavi' }]);
        const response = await readLinks();
        expect(await response.json()).toMatchObject({
            schemaVersion: 1,
            data: [{ key: 'group_link_youtube', value: 'https://youtube.com/@hanavi' }],
        });
    });
});
