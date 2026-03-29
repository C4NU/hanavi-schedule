"use client";

import { useState } from 'react';
import { CharacterSchedule } from '@/types/schedule';
import BaseModal from './BaseModal';

interface RemoveMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    characters: CharacterSchedule[];
    onRemove: (id: string) => Promise<void>;
}

export default function RemoveMemberModal({ isOpen, onClose, characters, onRemove }: RemoveMemberModalProps) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [isConfirming, setIsConfirming] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleDelete = async () => {
        if (!selectedId) return;

        if (!isConfirming) {
            setIsConfirming(true);
            return;
        }

        setIsSubmitting(true);
        try {
            await onRemove(selectedId);
            setIsConfirming(false);
            setSelectedId(null);
            onClose();
        } catch (error) {
            console.error('Failed to remove member:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Selected character info
    const selectedChar = characters.find(c => c.id === selectedId);

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={() => {
                setIsConfirming(false);
                onClose();
            }}
            title={isConfirming ? "⚠️ 멤버 삭제 확인" : "🗑 멤버 제거"}
            maxWidth="400px"
        >
            <div className="space-y-4">
                {!isConfirming ? (
                    <>
                        <p className="text-sm text-gray-500">제거할 멤버를 선택해주세요.</p>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                            {characters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => setSelectedId(char.id)}
                                    className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all
                                        ${selectedId === char.id
                                            ? 'border-red-500 bg-red-50 ring-4 ring-red-50'
                                            : 'border-gray-100 hover:bg-gray-50'}
                                    `}
                                >
                                    <img
                                        src={`/api/proxy/image?url=${encodeURIComponent(char.avatarUrl)}`}
                                        alt={char.name}
                                        className="w-10 h-10 rounded-full object-cover bg-gray-100"
                                    />
                                    <div className="text-left flex-1">
                                        <div className="font-bold text-gray-800 text-sm">{char.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">{char.id}</div>
                                    </div>
                                    {selectedId === char.id && (
                                        <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                                            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>
                        <button
                            onClick={() => setIsConfirming(true)}
                            disabled={!selectedId}
                            className="w-full py-4 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 transition-all shadow-lg shadow-red-100 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            다음 단계
                        </button>
                    </>
                ) : (
                    <div className="text-center space-y-4 py-2 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="bg-red-50 p-4 rounded-2xl border border-red-100 inline-block mb-2">
                            <img
                                src={`/api/proxy/image?url=${encodeURIComponent(selectedChar?.avatarUrl || '')}`}
                                alt={selectedChar?.name}
                                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm"
                            />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">
                            정말로 <span className="text-red-500">[{selectedChar?.name}]</span>님을 삭제하시겠습니까?
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            이 작업은 되돌릴 수 없으며,<br />
                            해당 멤버의 모든 스케줄 데이터가 영구적으로 삭제됩니다.
                        </p>
                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setIsConfirming(false)}
                                className="flex-1 py-3 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold shadow-lg shadow-red-100 hover:bg-red-600 transition-all disabled:opacity-50"
                            >
                                {isSubmitting ? '삭제 중...' : '확인 및 삭제'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
}
