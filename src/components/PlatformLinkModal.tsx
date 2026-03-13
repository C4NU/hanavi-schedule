import React from 'react';
import styles from './PlatformLinkModal.module.css';
import { CharacterSchedule } from '@/types/schedule';

interface PlatformLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: CharacterSchedule | null;
}

const PlatformLinkModal: React.FC<PlatformLinkModalProps> = ({ isOpen, onClose, character }) => {
    if (!isOpen || !character) return null;

    const platforms = [
        {
            id: 'chzzk',
            name: 'Chzzk',
            label: '씨미',
            url: character.chzzkUrl?.startsWith('http') ? character.chzzkUrl : `https://chzzk.naver.com/${character.chzzkUrl}`,
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" />
                    <path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z" />
                </svg>
            ),
            color: '#00FFA3',
            show: !!character.chzzkUrl
        },
        {
            id: 'youtube',
            name: 'YouTube',
            label: 'Youtube',
            url: character.youtubeChannelId?.startsWith('http') ? character.youtubeChannelId : `https://www.youtube.com/channel/${character.youtubeChannelId}`,
            icon: (
                <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                </svg>
            ),
            color: '#FF0000',
            show: !!character.youtubeChannelId
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
        }
    ];

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={onClose}>&times;</button>
                
                <div className={styles.content}>
                    <div className={styles.profileSection}>
                        <div 
                            className={styles.avatar}
                            style={{
                                backgroundImage: `url(${character.avatarUrl.startsWith('http')
                                    ? `/api/proxy/image?url=${encodeURIComponent(character.avatarUrl)}`
                                    : character.avatarUrl
                                })`,
                                borderColor: character.colorBorder || 'var(--primary-color)'
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
                                    style={{ '--hover-color': platform.color } as React.CSSProperties}
                                >
                                    <div className={styles.iconWrapper}>
                                        {platform.icon}
                                    </div>
                                    <span className={styles.platformLabel}>
                                        <span className={styles.charName}>{character.name}</span> {platform.label}
                                    </span>
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
