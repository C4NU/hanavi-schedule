"use client";

import { useRef } from 'react';
import { MenuIcon } from '../MobileScheduleMenu';
import controls from '../ScheduleHeader.module.css';
import styles from './AdminSideMenu.module.css';

const options = [
    { value: 'stream', label: '방송' },
    { value: 'off', label: '휴방' },
    { value: 'collab_external', label: '외부 합방' },
    { value: 'collab', label: '내부 합방' },
    { value: 'collab_universe', label: '하나비' },
];

function getActiveType(value: string) {
    if (value === 'collab_hanavi') return 'collab_universe';
    if (value === 'collab_maivi') return 'collab_external';
    return value;
}

export default function BroadcastTypePicker({ value, onChange }: {
    value: string;
    onChange: (value: string) => void;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const activeType = getActiveType(value);
    const label = options.find(option => option.value === activeType)?.label ?? '합방';

    return (
        <>
            <button
                className={`${controls.theme} ${styles.typeChip}`}
                type="button"
                aria-haspopup="dialog"
                aria-label={`방송 유형 변경 · ${label}`}
                onClick={event => {
                    event.stopPropagation();
                    dialogRef.current?.showModal();
                }}
            >
                <span>{label}</span>
                <MenuIcon name="edit" size={12} />
            </button>
            <dialog
                ref={dialogRef}
                aria-label="방송 유형"
                className={`${controls.theme} ${styles.typeDialog}`}
                onClick={event => {
                    event.stopPropagation();
                    if (event.target === event.currentTarget) dialogRef.current?.close();
                }}
            >
                <div className={styles.typePanel}>
                    <div className={styles.heading}>
                        <h2>방송 유형</h2>
                        <button className={`${controls.button} ${controls.iconButton}`} type="button" aria-label="닫기" onClick={() => dialogRef.current?.close()}>
                            <MenuIcon name="close" size={16} />
                        </button>
                    </div>
                    <div className={styles.typeOptions}>
                        {options.map(option => (
                            <button
                                key={option.value}
                                className={controls.button}
                                type="button"
                                aria-pressed={option.value === activeType}
                                onClick={() => {
                                    dialogRef.current?.close();
                                    if (option.value !== activeType) onChange(option.value);
                                }}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            </dialog>
        </>
    );
}
