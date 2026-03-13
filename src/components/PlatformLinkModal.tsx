import React from 'react';
import styles from './PlatformLinkModal.module.css';
import { CharacterSchedule } from '@/types/schedule';
import { useHaptics } from '@/hooks/useHaptics';

interface PlatformLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: CharacterSchedule | null;
}

const PlatformLinkModal: React.FC<PlatformLinkModalProps> = ({ isOpen, onClose, character }) => {
    const { trigger } = useHaptics();

    if (!isOpen || !character) return null;

    const platforms = [
        {
            id: 'cime',
            name: '씨미',
            label: '씨미',
            url: character.chzzkUrl ? `https://chzzk.naver.com/live/${character.chzzkUrl}` : undefined,
            icon: (
                <img
                    src="/assets/icons/CIME-Icon-PP.png"
                    alt="Cime"
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                />
            ),
            color: '#8956fb',
            show: !!character.chzzkUrl
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
            label: '다시보기',
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

    return (
        <div className={styles.overlay} onClick={() => { trigger(); onClose(); }}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={() => { trigger(); onClose(); }}>&times;</button>

                <div className={styles.content}>
                    <div className={styles.profileSection}>
                        <div
                            className={styles.avatar}
                            style={{
                                backgroundImage: `url(${character.avatarUrl.startsWith('http')
                                    ? `/api/proxy/image?url=${encodeURIComponent(character.avatarUrl)}`
                                    : character.avatarUrl
                                    })`,
                                borderColor: 'white'
                            }}
                        />
                        <h2 className={styles.name}>{character.name}</h2>
                    </div>

                    <div className={styles.linkSection}>
                        <p className={styles.description}>플랫폼을 선택해 주세요</p>
                        <div className={styles.linkList}>
                            {platforms.filter(p => p.show).map((platform) => (
                                <a
                                    key={platform.id}
                                    href={platform.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.linkItem}
                                    onClick={() => trigger()}
                                    data-platform={platform.id}
                                    style={{ '--hover-color': platform.color } as React.CSSProperties}
                                >
                                    <div className={styles.linkIconWrapper}>
                                        <div className={styles.svgIcon}>{platform.icon}</div>
                                    </div>
                                    <span className={styles.platformLabel}>
                                        <span className={styles.charName}>{character.name}</span> {platform.label}
                                    </span>
                                    <div className={styles.externalIcon}>
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M7 17l10-10M7 7h10v10" />
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
