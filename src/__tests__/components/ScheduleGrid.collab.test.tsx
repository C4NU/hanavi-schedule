// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleGrid from '@/components/ScheduleGrid';
import type { WeeklySchedule } from '@/types/schedule';

vi.mock('web-haptics', () => ({
    WebHaptics: class {
        trigger() {}
    },
    defaultPatterns: {},
}));

vi.mock('@/lib/supabaseClient', () => ({
    supabase: { auth: { getSession: vi.fn() } },
}));

function makeSchedule(): WeeklySchedule {
    const members = [
        ['cherii', '체리'],
        ['nemu', '네무'],
        ['sena', '세나'],
        ['mirai', '미라이'],
    ];
    return {
        weekRange: '08.24 - 08.30',
        characters: members.map(([id, name]) => ({
            id,
            name,
            colorTheme: id,
            colorBg: '#fff',
            colorBorder: '#ff8fab',
            avatarUrl: '',
            schedule: {
                SUN: { time: '', content: '', type: 'off' as const },
            },
        })),
    };
}

function makeSplitSchedule(): WeeklySchedule {
    const schedule = makeSchedule();
    schedule.characters[0].schedule.SUN = {
        time: '14:00+20:00',
        content: '첫 방송 + 두 번째 방송',
        type: 'stream',
    };
    return schedule;
}

describe('ScheduleGrid collaboration editor', () => {
    it('fans a Hanavi selection to every member without six repeated edits', async () => {
        const onCellUpdate = vi.fn();
        const onCollabUpdate = vi.fn();
        render(
            <ScheduleGrid
                data={makeSchedule()}
                isEditable
                onCellUpdate={onCellUpdate}
                onCollabUpdate={onCollabUpdate}
            />,
        );

        const selects = screen.getAllByRole('combobox');
        fireEvent.change(selects[6], { target: { value: 'collab_universe' } });
        await waitFor(() => expect(screen.getByText('적용')).toBeTruthy());
        fireEvent.click(screen.getByText('적용'));

        expect(onCellUpdate).not.toHaveBeenCalledWith('cherii', 'SUN', 'type', 'collab_universe');
        expect(onCollabUpdate).toHaveBeenCalledTimes(1);
        expect(onCollabUpdate.mock.calls[0][0]).toMatchObject({
            characterId: 'cherii',
            day: 'SUN',
            type: 'collab',
            participantIds: ['cherii', 'nemu', 'sena', 'mirai'],
        });
    });

    it('uses the full collaboration source while the grid is member-filtered', async () => {
        const full = makeSchedule();
        const onCollabUpdate = vi.fn();
        render(
            <ScheduleGrid
                data={{ ...full, characters: [full.characters[0]] }}
                collaborationCharacters={full.characters}
                isEditable
                onCollabUpdate={onCollabUpdate}
            />,
        );

        fireEvent.change(screen.getAllByRole('combobox')[6], { target: { value: 'collab_universe' } });
        await waitFor(() => expect(screen.getByText('적용')).toBeTruthy());
        fireEvent.click(screen.getByText('적용'));

        expect(onCollabUpdate).toHaveBeenCalledWith(expect.objectContaining({
            participantIds: ['cherii', 'nemu', 'sena', 'mirai'],
        }));
    });

    it('fans an existing canonical personal event out when HanaVi is selected', async () => {
        const data = makeSchedule();
        const eventId = '11111111-1111-4111-8111-111111111111';
        data.characters[0].schedule.SUN = {
            id: eventId,
            eventId,
            time: '14:00',
            content: '체리 개인 방송',
            type: 'stream',
            eventMemberIds: ['cherii'],
            parts: [{ id: eventId, time: '14:00', content: '체리 개인 방송', type: 'stream', eventMemberIds: ['cherii'] }],
        };
        const onCollabUpdate = vi.fn();
        render(<ScheduleGrid data={data} isEditable onCollabUpdate={onCollabUpdate} />);

        fireEvent.change(screen.getAllByRole('combobox')[6], { target: { value: 'collab_universe' } });
        await waitFor(() => expect(screen.getByText('적용')).toBeTruthy());
        fireEvent.click(screen.getByText('적용'));

        expect(onCollabUpdate).toHaveBeenCalledWith(expect.objectContaining({
            eventId,
            type: 'collab',
            participantIds: ['cherii', 'nemu', 'sena', 'mirai'],
        }));
    });

    it('opens the collaboration editor for the selected split subcell', async () => {
        const onCellUpdate = vi.fn();
        const onCollabUpdate = vi.fn();
        render(
            <ScheduleGrid
                data={makeSplitSchedule()}
                isEditable
                onCellUpdate={onCellUpdate}
                onCollabUpdate={onCollabUpdate}
            />,
        );

        const selects = screen.getAllByRole('combobox');
        // MON–SAT are six controls; Sunday is split into two controls.
        fireEvent.change(selects[7], { target: { value: 'collab_universe' } });
        await waitFor(() => expect(screen.getByText('적용')).toBeTruthy());
        fireEvent.click(screen.getByText('적용'));

        expect(onCellUpdate).not.toHaveBeenCalledWith('cherii', 'SUN', 'type', 'collab_universe');
        expect(onCollabUpdate).toHaveBeenCalledTimes(1);
        expect(onCollabUpdate.mock.calls[0][0]).toMatchObject({
            day: 'SUN',
            type: 'collab',
            participantIds: ['cherii', 'nemu', 'sena', 'mirai'],
            source: { time: '20:00', content: '두 번째 방송' },
        });
    });

    it('opens the collaboration editor for the clicked split subcell', async () => {
        const onCellUpdate = vi.fn();
        const onCollabUpdate = vi.fn();
        render(
            <ScheduleGrid
                data={makeSplitSchedule()}
                isEditable
                onCellUpdate={onCellUpdate}
                onCollabUpdate={onCollabUpdate}
            />,
        );

        fireEvent.click(screen.getAllByText('두 번째 방송')[0]);
        await waitFor(() => expect(screen.getByText('적용')).toBeTruthy());
        const typeLabel = screen.getByText('방송 타입');
        const modalSelect = typeLabel.parentElement?.querySelector('select');
        expect(modalSelect).toBeTruthy();
        fireEvent.change(modalSelect!, { target: { value: 'collab_universe' } });
        fireEvent.click(screen.getByText('적용'));

        expect(onCellUpdate).not.toHaveBeenCalledWith('cherii', 'SUN', 'type', 'collab_universe');
        expect(onCollabUpdate).toHaveBeenCalledTimes(1);
        expect(onCollabUpdate.mock.calls[0][0]).toMatchObject({
            day: 'SUN',
            type: 'collab',
            participantIds: ['cherii', 'nemu', 'sena', 'mirai'],
            source: { time: '20:00', content: '두 번째 방송' },
        });
    });
});
