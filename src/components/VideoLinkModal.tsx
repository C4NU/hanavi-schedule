"use client";

import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import controls from './ScheduleHeader.module.css';
import styles from './admin/AdminSchedule.module.css';

interface VideoLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string) => void;
    initialUrl?: string;
}

const VideoLinkModal: React.FC<VideoLinkModalProps> = ({ isOpen, onClose, onSave, initialUrl = '' }) => {
    const [url, setUrl] = useState(initialUrl);

    useEffect(() => {
        if (isOpen) {
            setUrl(initialUrl || '');
        }
    }, [isOpen, initialUrl]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(url);
        onClose();
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="다시보기 링크 연결"
            variant="sheet"
            maxWidth="400px"
        >
            <form onSubmit={handleSubmit} className={styles.sheetBody}>
                <label className={styles.field}>
                    다시보기 동영상 URL
                    <input
                        type="text"
                        inputMode="url"
                        placeholder="https://ci.me/… 또는 https://youtu.be/…"
                        value={url}
                        onChange={event => setUrl(event.target.value)}
                        autoFocus
                    />
                </label>
                <div className={styles.actions}>
                    <button type="button" className={controls.button} onClick={onClose}>취소</button>
                    <button type="submit" className={`${controls.button} ${styles.primary}`}>링크 저장</button>
                </div>
            </form>
        </BaseModal>
    );
};

export default VideoLinkModal;
