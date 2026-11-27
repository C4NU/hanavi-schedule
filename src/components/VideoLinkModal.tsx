"use client";

import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import controls from './ScheduleHeader.module.css';
import styles from './admin/AdminSchedule.module.css';

interface VideoLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string, alternateUrl: string) => void;
    initialUrl?: string;
    initialAlternateUrl?: string;
}

const VideoLinkModal: React.FC<VideoLinkModalProps> = ({ isOpen, onClose, onSave, initialUrl = '', initialAlternateUrl = '' }) => {
    const [url, setUrl] = useState(initialUrl);

    const [alternateUrl, setAlternateUrl] = useState(initialAlternateUrl);

    useEffect(() => {
        if (isOpen) {
            setUrl(initialUrl);
            setAlternateUrl(initialAlternateUrl);
        }
    }, [isOpen, initialUrl, initialAlternateUrl]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(url.trim(), alternateUrl.trim());
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
                        type="url" pattern="https://.+"
                        inputMode="url"
                        placeholder="https://ci.me/… 또는 https://youtu.be/…"
                        value={url}
                        onChange={event => setUrl(event.target.value)}
                        autoFocus
                    />
                </label>
                <label className={styles.field}>
                    추가 다시보기 URL
                    <input
                        type="url"
                        pattern="https://.+"
                        inputMode="url"
                        placeholder="https://ci.me/… 또는 https://youtu.be/…"
                        value={alternateUrl}
                        onChange={event => setAlternateUrl(event.target.value)}
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
