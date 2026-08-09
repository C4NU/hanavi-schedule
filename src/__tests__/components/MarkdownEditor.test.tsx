// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarkdownEditor from '@/components/MarkdownEditor';

afterEach(() => {
    vi.useRealTimers();
});

describe('MarkdownEditor Korean IME handling', () => {
    it('does not publish intermediate composition and commits the completed value once', () => {
        vi.useFakeTimers();
        const onChange = vi.fn();
        const { container } = render(<MarkdownEditor value="" onChange={onChange} />);
        const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;

        fireEvent.compositionStart(editor);
        editor.innerHTML = 'ㅎ';
        fireEvent.input(editor);
        editor.innerHTML = '하';
        fireEvent.input(editor);
        act(() => vi.advanceTimersByTime(500));

        expect(onChange).not.toHaveBeenCalled();

        editor.innerHTML = '한';
        fireEvent.compositionEnd(editor);
        act(() => vi.advanceTimersByTime(180));

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('한');
    });

    it('flushes a pending edit when focus leaves the editor', () => {
        vi.useFakeTimers();
        const onChange = vi.fn();
        const onBlur = vi.fn();
        const { container } = render(
            <MarkdownEditor value="" onChange={onChange} onBlur={onBlur} />,
        );
        const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;

        editor.innerHTML = '저장할 내용';
        fireEvent.input(editor);
        fireEvent.blur(editor);

        expect(onChange).toHaveBeenCalledTimes(1);
        expect(onChange).toHaveBeenCalledWith('저장할 내용');
        expect(onBlur).toHaveBeenCalledTimes(1);
    });
});
