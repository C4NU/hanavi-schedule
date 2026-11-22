"use client";

import React, { useEffect } from 'react';
import styles from './BaseModal.module.css';
import headerStyles from './ScheduleHeader.module.css';

interface BaseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: React.ReactNode;
    children: React.ReactNode;
    aside?: React.ReactNode;
    maxWidth?: string;
    variant?: 'sheet';
    focusCloseOnOpen?: boolean;
    accent?: { color?: string; background?: string; gradient?: string };
}

const BaseModal: React.FC<BaseModalProps> = ({ isOpen, onClose, title, children, aside, maxWidth = '500px', variant, accent, focusCloseOnOpen }) => {
    
    // Lock scroll then open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            const handleEsc = (e: KeyboardEvent) => {
                if (e.key === 'Escape') onClose();
            };
            window.addEventListener('keydown', handleEsc);
            return () => {
                document.body.style.overflow = 'unset';
                window.removeEventListener('keydown', handleEsc);
            };
        }
    }, [isOpen, onClose]);

    if (!isOpen) return null;
    const overlayClass = variant === 'sheet'
        ? `${styles.overlay} ${styles.sheet} ${headerStyles.theme}${accent ? ` ${styles.accentSheet}` : ''}`
        : styles.overlay;
    const accentStyle = accent && {
        '--sheet-accent': accent.color || 'var(--color-primary)',
        '--sheet-accent-bg': accent.background || 'var(--control-well)',
        '--sheet-accent-gradient': accent.gradient,
    } as React.CSSProperties;

    return (
        <div className={overlayClass} style={accentStyle} onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <div 
                className={aside ? `${styles.modal} ${styles.split}` : styles.modal}
                style={{ maxWidth }} 
                onClick={(e) => e.stopPropagation()}
            >
                <div className={styles.header}>
                    <h2 id="modal-title" className={styles.title}>{title}</h2>
                    <button 
                        onClick={onClose} 
                        className={variant === 'sheet' ? `${styles.closeButton} ${headerStyles.sheetClose}` : styles.closeButton}
                        aria-label="모달 닫기"
                        autoFocus={focusCloseOnOpen}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                {aside && <div className={styles.aside}>{aside}</div>}
                <div className={styles.content}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default BaseModal;
