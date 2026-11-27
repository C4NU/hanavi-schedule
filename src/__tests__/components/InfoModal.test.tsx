// @vitest-environment jsdom

import React from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { SCHEDULE_RELEASE_VERSION } from '@/data/scheduleRelease';
import { afterEach, expect, it, vi } from 'vitest';
import InfoModal from '@/components/InfoModal';
import WhatsNewModal from '@/components/WhatsNewModal';

vi.mock('@/lib/supabaseClient', () => ({ supabase: {} }));

afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
});

it('keeps release notes out of the public usage guide', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
        json: async () => ({ email: 'contact@example.com' }),
    }));

    render(<InfoModal isOpen onClose={vi.fn()} />);
    await screen.findByRole('link', { name: 'contact@example.com' });

    expect(screen.queryByText(SCHEDULE_RELEASE_VERSION)).toBeNull();
});

it('shows release notes in a separate dialog', () => {
    render(<WhatsNewModal isOpen onClose={vi.fn()} />);

    const updates = screen.getByRole('dialog', { name: 'What’s New' });
    expect(within(updates).getByRole('heading', { name: SCHEDULE_RELEASE_VERSION })).toBeTruthy();
    expect(within(updates).getAllByRole('listitem').length).toBeGreaterThan(0);
});

it('walks through published changes in either direction and opens at the latest release', () => {
    const onClose = vi.fn();
    const { rerender } = render(<WhatsNewModal isOpen onClose={onClose} />);
    const previous = screen.getByRole<HTMLButtonElement>('button', { name: '이전 버전' });
    const next = screen.getByRole<HTMLButtonElement>('button', { name: '다음 버전' });
    expect(next.disabled).toBe(true);
    fireEvent.click(previous);
    expect(screen.getByRole('heading', { name: '2.1.1' })).toBeTruthy();
    fireEvent.click(previous);
    expect(screen.getByRole('heading', { name: '2.1.0' })).toBeTruthy();
    expect(previous.disabled).toBe(true);
    fireEvent.click(next);
    expect(screen.getByRole('heading', { name: '2.1.1' })).toBeTruthy();
    rerender(<WhatsNewModal isOpen={false} onClose={onClose} />);
    rerender(<WhatsNewModal isOpen onClose={onClose} />);
    expect(screen.getByRole('heading', { name: SCHEDULE_RELEASE_VERSION })).toBeTruthy();
});
