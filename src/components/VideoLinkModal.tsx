"use client";

import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

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
            title="🎥 다시보기 링크 연결"
            maxWidth="400px"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">다시보기 동영상 URL 입력</label>
                    <input
                        type="text"
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:border-blue-400 outline-none text-sm font-mono transition-all"
                        placeholder="https://ci.me/... 또는 https://youtu.be/..."
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        autoFocus
                    />
                </div>
                
                <div className="flex gap-3">
                    <button 
                        type="button" 
                        className="flex-1 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                        onClick={onClose}
                    >
                        취소
                    </button>
                    <button 
                        type="submit" 
                        className="flex-1 py-3.5 bg-blue-500 text-white rounded-xl font-bold shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all"
                    >
                        링크 저장
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};

export default VideoLinkModal;
