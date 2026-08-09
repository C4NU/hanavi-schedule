// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import BufferedInput from '@/components/BufferedInput';

afterEach(() => {
    vi.useRealTimers();
});

describe('BufferedInput', () => {
    it('keeps Korean composition local and commits the completed value after the delay', () => {
        vi.useFakeTimers();
        const onCommit = vi.fn();
        const { getByRole } = render(<BufferedInput value="" onCommit={onCommit} />);
        const input = getByRole('textbox');

        fireEvent.compositionStart(input);
        fireEvent.change(input, { target: { value: 'ㅎ' } });
        fireEvent.change(input, { target: { value: '하' } });
        act(() => vi.advanceTimersByTime(500));
        expect(onCommit).not.toHaveBeenCalled();

        fireEvent.change(input, { target: { value: '한' } });
        fireEvent.compositionEnd(input, { currentTarget: { value: '한' } });
        act(() => vi.advanceTimersByTime(180));

        expect(onCommit).toHaveBeenCalledTimes(1);
        expect(onCommit).toHaveBeenCalledWith('한');
    });

    it('flushes the latest value to both callbacks on blur', () => {
        vi.useFakeTimers();
        const onCommit = vi.fn();
        const onBlurValue = vi.fn();
        const { getByRole } = render(
            <BufferedInput value="19" onCommit={onCommit} onBlurValue={onBlurValue} />,
        );
        const input = getByRole('textbox');

        fireEvent.change(input, { target: { value: '20' } });
        fireEvent.blur(input);

        expect(onCommit).toHaveBeenCalledWith('20');
        expect(onBlurValue).toHaveBeenCalledWith('20');
    });
});
