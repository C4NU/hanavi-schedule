// @vitest-environment jsdom

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarkdownEditor, { getToolbarPosition } from '@/components/MarkdownEditor';

afterEach(() => {
    vi.useRealTimers();
});

describe('MarkdownEditor Korean IME handling', () => {
    it('does not render a toolbar position from a non-finite selection rectangle', () => {
        expect(getToolbarPosition({ bottom: Number.NaN, left: 20, width: 40 })).toBeNull();
        expect(getToolbarPosition({ bottom: 20, left: Number.POSITIVE_INFINITY, width: 40 })).toBeNull();
    });

    it('positions the toolbar below a valid selection rectangle', () => {
        expect(getToolbarPosition({ bottom: 30, left: 20, width: 40 })).toEqual({
            top: 35,
            left: -10,
        });
    });

    it('shows formatting controls for a valid selection inside the editor', () => {
        const onChange = vi.fn();
        const { container } = render(<MarkdownEditor value="selected text" onChange={onChange} />);
        const editor = container.querySelector('[contenteditable="true"]') as HTMLDivElement;
        const anchorNode = editor.firstChild;

        vi.spyOn(window, 'getSelection').mockReturnValue({
            anchorNode,
            isCollapsed: false,
            rangeCount: 1,
            getRangeAt: () => ({
                getBoundingClientRect: () => ({ bottom: 30, left: 20, width: 40 }),
            }),
        } as unknown as Selection);

        act(() => document.dispatchEvent(new Event('selectionchange')));

        expect(screen.getByTitle('Bold')).toBeTruthy();
        vi.restoreAllMocks();
    });

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
