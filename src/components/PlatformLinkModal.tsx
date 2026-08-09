"use client";

import React from 'react';
import { CharacterSchedule } from '@/types/schedule';
import { useHaptics } from '@/hooks/useHaptics';
import { getReplayLabel } from '@/utils/character';
import styles from './PlatformLinkModal.module.css';

interface PlatformLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: CharacterSchedule | null;
}

const PlatformLinkModal: React.FC<PlatformLinkModalProps> = ({ isOpen, onClose, character }) => {
    const { trigger } = useHaptics();

    if (!character || !isOpen) return null;

    const platforms = [
        {
            id: 'cime',
            name: '씨미',
            label: '씨미',
            url: character.cimeUrl 
                ? character.cimeUrl 
                : (character.chzzkUrl ? `https://chzzk.naver.com/live/${character.chzzkUrl}` : undefined),
            icon: (
                <img
                    src="/assets/icons/CIME-Icon-PP.png"
                    alt="Cime"
                    className="w-full h-full object-contain"
                />
            ),
            color: '#8956fb',
            show: !!(character.cimeUrl || character.chzzkUrl)
        },
        {
            id: 'twitter',
            name: 'X',
            label: 'X',
            url: character.twitterUrl,
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
            ),
            color: '#000000',
            show: !!character.twitterUrl
        },
        {
            id: 'youtube',
            name: 'Youtube',
            label: 'Youtube',
            url: character.youtubeUrl,
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            ),
            color: '#FF0000',
            show: !!character.youtubeUrl
        },
        {
            id: 'youtube_replay',
            name: 'Youtube 다시보기',
            label: getReplayLabel(character.name),
            url: character.youtubeReplayUrl,
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
            ),
            color: '#FF0000',
            show: !!character.youtubeReplayUrl
        }
    ];

    const themeColor = character.colorBorder || character.colorBg;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div 
                className={styles.modal} 
                onClick={(e) => e.stopPropagation()}
                style={{ '--hover-color': themeColor } as any}
            >
                <button className={styles.closeButton} onClick={onClose}>&times;</button>
                
                <div className={styles.content}>
                    {/* Left: Profile Section */}
                    <div className={styles.profileSection}>
                        <div 
                            className={styles.avatar} 
                            style={{ 
                                backgroundImage: `url(/api/proxy/image?url=${encodeURIComponent(character.avatarUrl)})`,
                                borderColor: themeColor
                            }}
                        />
                        <div className={styles.profileInfo}>
                            <h2 className={styles.name}>{character.name}</h2>
                            
                            {character.birthday && (
                                <div className={styles.birthdayInfo}>
                                    <span className={styles.infoIcon}>🎂</span>
                                    <span className={styles.infoText}>{character.birthday}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Link Section */}
                    <div className={styles.linkSection}>
                        <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest">Official Channels</h3>
                        <div className={styles.linkList}>
                            {platforms.filter(p => p.show).map((platform) => (
                                <a
                                    key={platform.id}
                                    href={platform.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.linkItem}
                                    data-platform={platform.id}
                                    onClick={() => trigger()}
                                >
                                    <div className={styles.linkIconWrapper}>
                                        <div className={styles.svgIcon}>{platform.icon}</div>
                                    </div>
                                    <div className="flex-1">
                                        <div className="text-[10px] text-gray-400 font-bold leading-tight">{platform.name}</div>
                                        <div className={styles.platformLabel}>{platform.label}</div>
                                    </div>
                                    <div className={styles.externalIcon}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                            <polyline points="15 3 21 3 21 9" />
                                            <line x1="10" y1="14" x2="21" y2="3" />
                                        </svg>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PlatformLinkModal;
