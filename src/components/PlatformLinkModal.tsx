"use client";

import React from 'react';
import { CharacterSchedule } from '@/types/schedule';
import { useHaptics } from '@/hooks/useHaptics';
import { getReplayLabel } from '@/utils/character';
import BaseModal from './BaseModal';
import { MenuIcon } from './MobileScheduleMenu';
import styles from './PlatformLinkModal.module.css';

interface PlatformLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: CharacterSchedule | null;
}

const PlatformLinkModal: React.FC<PlatformLinkModalProps> = ({ isOpen, onClose, character }) => {
    const { trigger } = useHaptics();

    if (!character || !isOpen) return null;

    const cimeIcon = (
        <img
            src="/assets/icons/CIME-Icon-PP.png"
            alt=""
            className="w-full h-full object-contain"
        />
    );

    // 치지직 URL 정규화: 전체 URL이면 그대로 활용, 채널 ID면 라이브 경로 조립
    const chzzkLiveUrl = (() => {
        if (!character.chzzkUrl) return undefined;
        if (character.chzzkUrl.startsWith('http')) return `${character.chzzkUrl.replace(/\/$/, '')}/live`;
        return `https://chzzk.naver.com/live/${character.chzzkUrl}`;
    })();

    const platforms = [
        // 씨미 보유 멤버: 프로필 / 생방송 분리
        ...(character.cimeUrl
            ? [
                {
                    id: 'cime_profile',
                    name: '씨미 프로필',
                    label: '씨미 프로필',
                    url: character.cimeUrl,
                    icon: cimeIcon,
                    show: true
                },
                {
                    id: 'cime_live',
                    name: '씨미 생방송',
                    label: '생방송 바로가기',
                    url: `${character.cimeUrl.replace(/\/$/, '')}/live`,
                    icon: cimeIcon,
                    show: true
                }
            ]
            : [
                // 씨미 미보유 멤버: 치지직 생방송 폴백
                {
                    id: 'chzzk_live',
                    name: '치지직 생방송',
                    label: '생방송 바로가기',
                    url: chzzkLiveUrl,
                    icon: (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M4 3h16a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-5.6l-4.4 4v-4H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2zm6 4v6l5-3-5-3z" />
                        </svg>
                    ),
                    show: !!chzzkLiveUrl
                }
            ]),
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
            show: !!character.youtubeReplayUrl
        }
    ];

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="공식 채널"
            maxWidth="560px"
            variant="sheet"
            mobileAccentHeader
            accent={{ color: character.colorBorder, background: character.colorBg }}
            aside={
                <div className={styles.profile}>
                    {character.avatarUrl && (
                        <img
                            src={`/api/proxy/image?url=${encodeURIComponent(character.avatarUrl)}`}
                            alt=""
                            className={styles.avatar}
                            style={{ borderColor: character.colorBorder || character.colorBg }}
                        />
                    )}
                    <div className={styles.identity}>
                        <h3 className={styles.name}>{character.name}</h3>
                        {character.birthday && (
                            <span className={styles.birthday}>
                                <MenuIcon name="calendar" size={14} />
                                {character.birthday}
                            </span>
                        )}
                    </div>
                </div>
            }
        >
            <div className={styles.links}>
                {platforms.filter(platform => platform.show).map(platform => (
                    <a
                        key={platform.id}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.linkItem}
                        data-platform={platform.id}
                        onClick={() => trigger()}
                    >
                        <span className={styles.brandIcon} aria-hidden="true">{platform.icon}</span>
                        <span className={styles.linkLabel}>
                            <span>{platform.label}</span>
                            {platform.name !== platform.label && <small>{platform.name}</small>}
                        </span>
                        <span className={styles.externalIcon}><MenuIcon name="link" size={16} /></span>
                    </a>
                ))}
            </div>
        </BaseModal>
    );
};

export default PlatformLinkModal;
