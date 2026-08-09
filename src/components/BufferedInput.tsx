"use client";

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface BufferedInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur'> {
    value: string;
    onCommit: (value: string) => void;
    onBlurValue?: (value: string) => void;
    commitDelay?: number;
}

const BufferedInput = React.memo(function BufferedInput({
    value,
    onCommit,
    onBlurValue,
    commitDelay = 180,
    ...inputProps
}: BufferedInputProps) {
    const [localValue, setLocalValue] = useState({ source: value, draft: value });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isComposingRef = useRef(false);
    const draft = localValue.source === value ? localValue.draft : value;

    useEffect(() => () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }, []);

    useEffect(() => {
        if (localValue.source !== value && timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
        }
    }, [localValue.source, value]);

    const commit = useCallback((nextValue: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = null;

        if (nextValue !== value) {
            onCommit(nextValue);
        }
    }, [onCommit, value]);

    const scheduleCommit = useCallback((nextValue: string) => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => commit(nextValue), commitDelay);
    }, [commit, commitDelay]);

    return (
        <input
            {...inputProps}
            value={draft}
            onChange={(event) => {
                const nextValue = event.target.value;
                setLocalValue({ source: value, draft: nextValue });
                if (!isComposingRef.current) scheduleCommit(nextValue);
            }}
            onCompositionStart={() => {
                isComposingRef.current = true;
            }}
            onCompositionEnd={(event) => {
                isComposingRef.current = false;
                const nextValue = event.currentTarget.value;
                setLocalValue({ source: value, draft: nextValue });
                scheduleCommit(nextValue);
            }}
            onBlur={() => {
                commit(draft);
                onBlurValue?.(draft);
            }}
        />
    );
});

export default BufferedInput;
