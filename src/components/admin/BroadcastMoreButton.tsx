"use client";

import { useRef } from 'react';
import { MenuIcon } from '../MobileScheduleMenu';
import controls from '../ScheduleHeader.module.css';
import styles from './AdminSideMenu.module.css';

export default function BroadcastMoreButton({ onAdd, onEditLink, hasLink }: {
    onAdd?: () => void;
    onEditLink: () => void;
    hasLink: boolean;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const choose = (action: () => void) => {
        dialogRef.current?.close();
        action();
    };

    return (
        <>
            <button
                type="button"
                className={`${controls.theme} ${styles.moreChip}`}
                data-linked={hasLink || undefined}
                aria-label={hasLink ? '셀 더보기 · 다시보기 연결됨' : '셀 더보기'}
                aria-haspopup="dialog"
                title={hasLink ? '다시보기 연결됨' : '셀 더보기'}
                onClick={event => {
                    event.stopPropagation();
                    dialogRef.current?.showModal();
                }}
            >
                <MenuIcon name="more" size={14} />
            </button>
            <dialog
                ref={dialogRef}
                className={`${controls.theme} ${styles.typeDialog}`}
                aria-label="셀 더보기"
                onClick={event => {
                    event.stopPropagation();
                    if (event.target === event.currentTarget) dialogRef.current?.close();
                }}
            >
                <div className={styles.typePanel}>
                    <div className={styles.heading}>
                        <h2>셀 더보기</h2>
                        <button type="button" aria-label="닫기" className={`${controls.button} ${controls.iconButton}`} onClick={() => dialogRef.current?.close()}>
                            <MenuIcon name="close" size={16} />
                        </button>
                    </div>
                    <div className={styles.typeOptions}>
                        {onAdd && <button type="button" className={controls.button} onClick={() => choose(onAdd)}>방송 추가</button>}
                        <button type="button" className={controls.button} onClick={() => choose(onEditLink)}>
                            {hasLink ? '다시보기 링크 수정' : '다시보기 링크 연결'}
                        </button>
                    </div>
                </div>
            </dialog>
        </>
    );
}
