"use client";

import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';

interface YouTubeLinkModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (url: string) => void;
    initialUrl?: string;
}

const YouTubeLinkModal: React.FC<YouTubeLinkModalProps> = ({ isOpen, onClose, onSave, initialUrl = '' }) => {
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
            title="📺 유튜브 링크 연결"
            maxWidth="400px"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-2">다시보기 동영상 URL 입력</label>
                    <input
                        type="text"
                        className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-200 focus:border-red-400 outline-none text-sm font-mono transition-all"
                        placeholder="https://youtu.be/..."
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
                        className="flex-1 py-3.5 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-600 transition-all"
                    >
                        링크 저장
                    </button>
                </div>
            </form>
        </BaseModal>
    );
};

export default YouTubeLinkModal;
