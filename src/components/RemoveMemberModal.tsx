"use client";

import { useState } from 'react';
import { CharacterSchedule } from '@/types/schedule';
import BaseModal from './BaseModal';
import controls from './ScheduleHeader.module.css';
import styles from './admin/AdminSchedule.module.css';

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
            title={isConfirming ? "멤버 삭제 확인" : "멤버 제거"}
            variant="sheet"
            focusCloseOnOpen
            maxWidth="400px"
        >
            <div className={styles.sheetBody}>
                {!isConfirming ? (
                    <>
                        <p className="text-sm text-gray-500">제거할 멤버를 선택해주세요.</p>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                            {characters.map(char => (
                                <button
                                    key={char.id}
                                    onClick={() => setSelectedId(char.id)}
                                    type="button"
                                    aria-pressed={selectedId === char.id}
                                    className={`${controls.button} ${styles.memberOption}`}
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
                                        <div aria-hidden="true" className="w-5 h-5 rounded-full bg-[var(--schedule-display-ink)] flex items-center justify-center">
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
                            className={`${controls.button} ${styles.primary}`}
                        >
                            다음 단계
                        </button>
                    </>
                ) : (
                    <div className="text-center space-y-4 py-2">
                        <div className={`${styles.fieldGroup} inline-block`}>
                            <img
                                src={`/api/proxy/image?url=${encodeURIComponent(selectedChar?.avatarUrl || '')}`}
                                alt={selectedChar?.name}
                                className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-sm"
                            />
                        </div>
                        <h3 className="text-lg font-bold text-gray-800">
                            정말로 <span className="text-[var(--schedule-display-ink)]">[{selectedChar?.name}]</span>님을 삭제하시겠습니까?
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            이 작업은 되돌릴 수 없으며,<br />
                            해당 멤버의 모든 스케줄 데이터가 영구적으로 삭제됩니다.
                        </p>
                        <div className={styles.actions}>
                            <button
                                onClick={() => setIsConfirming(false)}
                                className={controls.button}
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isSubmitting}
                                className={`${controls.button} ${styles.danger}`}
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
