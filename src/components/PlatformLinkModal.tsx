"use client";

import React from 'react';
import { CharacterSchedule } from '@/types/schedule';
import { useHaptics } from '@/hooks/useHaptics';
import { getReplayLabel } from '@/utils/character';
import BaseModal from './BaseModal';

interface PlatformLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    character: CharacterSchedule | null;
}

const PlatformLinkModal: React.FC<PlatformLinkModalProps> = ({ isOpen, onClose, character }) => {
    const { trigger } = useHaptics();

    if (!character) return null;

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
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={`${character.name} 채널 링크`}
            maxWidth="400px"
        >
            <div className="flex flex-col items-center mb-6 pt-2">
                <div 
                    className="w-24 h-24 rounded-full p-1 mb-4 shadow-lg"
                    style={{ background: `linear-gradient(135deg, ${themeColor}, #ffffff)` }}
                >
                    <img
                        src={`/api/proxy/image?url=${encodeURIComponent(character.avatarUrl)}`}
                        alt={character.name}
                        className="w-full h-full rounded-full object-cover border-4 border-white"
                    />
                </div>
                <h2 className="text-xl font-bold text-gray-800">{character.name}</h2>
                <p className="text-xs text-gray-400 mt-1 uppercase tracking-widest font-bold">Official Channels</p>
            </div>

            <div className="space-y-3 pb-2">
                {platforms.filter(p => p.show).map((platform) => (
                    <a
                        key={platform.id}
                        href={platform.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex items-center p-4 bg-gray-50 hover:bg-white rounded-2xl border border-gray-100 hover:border-gray-200 hover:shadow-md transition-all duration-300"
                        onClick={() => trigger()}
                    >
                        <div 
                            className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm transition-transform group-hover:scale-110"
                            style={{ backgroundColor: platform.color }}
                        >
                            <div className="w-6 h-6">{platform.icon}</div>
                        </div>
                        <div className="ml-4 flex-1">
                            <div className="text-xs text-gray-400 font-bold mb-0.5">{platform.name}</div>
                            <div className="text-sm font-bold text-gray-800">{platform.label} 바로가기</div>
                        </div>
                        <div className="text-gray-300 group-hover:text-gray-500 transition-colors">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                        </div>
                    </a>
                ))}
            </div>
        </BaseModal>
    );
};

export default PlatformLinkModal;
