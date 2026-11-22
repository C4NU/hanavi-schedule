// @vitest-environment jsdom

import React from 'react';
import { cleanup, render, screen, within } from '@testing-library/react';
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

    expect(screen.queryByText('2.1.0')).toBeNull();
});

it('shows release notes in a separate dialog', () => {
    render(<WhatsNewModal isOpen onClose={vi.fn()} />);

    const updates = screen.getByRole('dialog', { name: 'What’s New' });
    expect(within(updates).getByRole('heading', { name: '2.1.0' })).toBeTruthy();
    expect(within(updates).getAllByRole('listitem').length).toBeGreaterThan(0);
});
