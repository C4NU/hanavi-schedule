import { useEffect, useRef, useState } from 'react';
import styles from './ScheduleHeader.module.css';

type Option<T> = { value: T; label: string };

export default function ScheduleHeaderPicker<T extends string>({ label, options, value, onChange }: {
    label: string;
    options: readonly [Option<T>, Option<T>];
    value: T;
    onChange: (value: T) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const picker = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!expanded) return;
        const dismiss = (event: PointerEvent) => {
            if (event.target instanceof Node && !picker.current?.contains(event.target)) {
                setExpanded(false);
            }
        };
        document.addEventListener('pointerdown', dismiss);
        return () => document.removeEventListener('pointerdown', dismiss);
    }, [expanded]);

    return (
        <div
            ref={picker}
            role="group"
            aria-label={label}
            className={styles.picker}
            data-expanded={expanded}
            onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
            }}
            onKeyDown={event => {
                if (event.key !== 'Escape' || !expanded) return;
                event.stopPropagation();
                event.currentTarget.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
                setExpanded(false);
            }}
        >
            {options.map(option => {
                const selected = value === option.value;
                return (
                    <button
                        key={option.value}
                        type="button"
                        className={styles.pickerOption}
                        aria-pressed={selected}
                        aria-expanded={selected ? expanded : undefined}
                        aria-hidden={!expanded && !selected}
                        tabIndex={expanded || selected ? 0 : -1}
                        onClick={() => {
                            setExpanded(!expanded);
                            if (expanded && !selected) onChange(option.value);
                        }}
                    >
                        <span className={styles.pickerLabel}>{option.label}</span>
                    </button>
                );
            })}
        </div>
    );
}
