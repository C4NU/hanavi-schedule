// @vitest-environment jsdom

import React from 'react';
import { fireEvent, render, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleCell from '@/components/ScheduleCell';
import type { CharacterSchedule, ScheduleItem } from '@/types/schedule';

vi.mock('@/components/MarkdownEditor', () => ({ default: () => null }));

const char: CharacterSchedule = {
    id: 'cherii',
    name: '체리',
    avatarUrl: '',
    colorTheme: 'cherii',
    schedule: {},
};

it('관리자 휴방 셀은 저장된 시간이 있어도 OFFLINE만 표시하고 방송으로 전환할 수 있다', () => {
    const onCellUpdate = vi.fn();
    const props = {
        char,
        day: 'MON',
        index: 0,
        isEditable: true,
        theme: 'v2' as const,
        handleOpenLinkModal: vi.fn(),
        trigger: vi.fn(),
        touchStart: null,
        touchEnd: null,
        minSwipeDistance: 30,
        onCellUpdate,
    };
    const { container, getByText, queryByRole, getByRole, queryByText, rerender } = render(
        <ScheduleCell {...props} item={{ type: 'off', time: '10:00', content: '휴방' }} />,
    );
    expect(getByText('OFFLINE')).toBeTruthy();
    expect(queryByRole('textbox')).toBeNull();
    expect(queryByRole('button', { name: '＋' })).toBeNull();

    const dialog = container.querySelector('dialog')!;
    dialog.showModal = vi.fn(() => { dialog.setAttribute('open', ''); });
    dialog.close = vi.fn(() => { dialog.removeAttribute('open'); });
    fireEvent.click(getByRole('button', { name: '방송 유형 변경 · 휴방' }));
    const choices = within(getByRole('dialog', { name: '방송 유형' }));
    expect(choices.getByRole('button', { name: '휴방' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(choices.getByRole('button', { name: '방송' }));
    expect(onCellUpdate).toHaveBeenCalledWith('cherii', 'MON', 'type', 'stream');
    rerender(<ScheduleCell {...props} item={{ type: 'stream', time: '10:00', content: '' }} />);
    expect(queryByText('OFFLINE')).toBeNull();
    expect(getByRole('textbox')).toBeTruthy();
});

describe('신규 시간표 셀의 메모 배지', () => {
    it.each([[0, null], [1, '1'], [9, '9'], [10, '9+']])(
        '메모 %i개일 때 표시값은 %s이다',
        (count, label) => {
            const item: ScheduleItem = {
                time: '10:00',
                content: '',
                memos: Array.from({ length: count }, (_, index) => ({
                    id: String(index),
                    schedule_item_id: 'broadcast',
                    content: '방송 메모',
                    created_at: '2026-11-20T00:00:00Z',
                })),
            };
            const onMemoClick = vi.fn();
            const onDetailClick = vi.fn();
            const { queryByRole } = render(
                <ScheduleCell
                    char={char}
                    day="MON"
                    index={0}
                    item={item}
                    theme="v2"
                    handleOpenLinkModal={vi.fn()}
                    trigger={vi.fn()}
                    touchStart={null}
                    touchEnd={null}
                    minSwipeDistance={30}
                    onMemoClick={onMemoClick}
                    onDetailClick={onDetailClick}
                />,
            );
            const badge = queryByRole('button', { name: `메모 ${count}개 보기` });
            expect(badge?.textContent ?? null).toBe(label);
            if (badge) {
                fireEvent.click(badge);
                expect(onMemoClick).toHaveBeenCalledWith(item, char.id);
                expect(onDetailClick).not.toHaveBeenCalled();
            }
        },
    );
});
