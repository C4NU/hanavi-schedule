// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

function selectHanaviInCell(index: number) {
    const button = screen.getAllByRole('button', { name: /^방송 유형 변경/ })[index];
    const dialog = button.parentElement!.querySelector('dialog')!;
    dialog.showModal = vi.fn(() => { dialog.setAttribute('open', ''); });
    dialog.close = vi.fn(() => { dialog.removeAttribute('open'); });

    fireEvent.click(button);
    const picker = screen.getByRole('dialog', { name: '방송 유형' });
    fireEvent.click(within(picker).getByRole('button', { name: '하나비' }));
}

it.each([false, true])('copies selected schedule text without cell styling (editable=%s)', async (isEditable) => {
    const data = makeSchedule();
    data.characters[0].schedule.SUN = {
        time: '14:00',
        content: '<span style="background-color: pink">방송 제목</span>',
        type: 'stream',
    };
    const { container } = render(<ScheduleGrid data={data} theme="v2" isEditable={isEditable} />);
    const grid = container.querySelector('[data-char-count]')!;
    const text = await within(grid as HTMLElement).findByText('방송 제목');
    const selection = document.getSelection()!;
    const range = document.createRange();
    range.selectNodeContents(text);
    selection.removeAllRanges();
    selection.addRange(range);

    const clipboardData = { setData: vi.fn() };
    const event = new Event('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboardData });
    // 브라우저가 본문을 선택하고 body에 copy 이벤트를 보내는 경로도 처리한다.
    fireEvent(document.body, event);

    expect(event.defaultPrevented).toBe(true);
    expect(clipboardData.setData.mock.calls).toEqual([['text/plain', '방송 제목']]);
    selection.removeAllRanges();
});

describe('ScheduleGrid collaboration editor', () => {
    it('joins matching collaboration cells in the v2 editor and keeps each member editable', () => {
        const schedule = makeSchedule();
        schedule.characters.forEach((char) => {
            char.schedule.SUN = {
                time: '14:00',
                content: '단체 방송',
                type: 'collab',
                eventId: 'group-event',
            };
        });
        const { container } = render(<ScheduleGrid data={schedule} theme="v2" isEditable />);

        const joinedCells = Array.from(container.querySelectorAll('[data-collab-segment]'));
        expect(joinedCells.map(cell => cell.getAttribute('data-collab-segment'))).toEqual(['first', 'middle', 'middle', 'last']);
        joinedCells.forEach(cell => {
            expect(within(cell as HTMLElement).getByDisplayValue('14:00')).toBeTruthy();
            expect(within(cell as HTMLElement).getByRole('button', { name: '셀 더보기' })).toBeTruthy();
        });
    });

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

        selectHanaviInCell(6);
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

        selectHanaviInCell(6);
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

        selectHanaviInCell(6);
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

        // MON–SAT are six controls; Sunday is split into two controls.
        selectHanaviInCell(7);
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
