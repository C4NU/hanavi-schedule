"use client";

import React, { useState } from 'react';
import { ScheduleMemo } from '@/types/schedule';
import { addMemoToSupabase } from '@/utils/supabase';
import { toast } from 'sonner';
import styles from './ScheduleGrid.module.css';

interface MemoPopoverProps {
    scheduleItemId: string;
    memos: ScheduleMemo[];
    onMemoAdded: () => void;
    onClose: () => void;
    charId: string;
}

const MemoPopover: React.FC<MemoPopoverProps> = ({ 
    scheduleItemId, memos, onMemoAdded, onClose, charId 
}) => {
    const [newMemo, setNewMemo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemo.trim()) return;

        setIsSubmitting(true);
        const result = await addMemoToSupabase(scheduleItemId, newMemo.trim());
        setIsSubmitting(false);

        if (result.success) {
            setNewMemo('');
            onMemoAdded();
            toast.success('제보가 등록되었습니다. ✨');
        } else {
            toast.error('제보 등록 실패: ' + result.error);
        }
    };

    return (
        <div className={styles.memoPopoverBackdrop} onClick={onClose}>
            <div className={styles.memoPopoverContent} onClick={(e) => e.stopPropagation()}>
                <div className={styles.memoPopoverHeader}>
                    <h3>실시간 스케줄 제보 📢</h3>
                    <button className={styles.memoCloseBtn} onClick={onClose}>&times;</button>
                </div>
                
                <div className={styles.memoList}>
                    {memos.length === 0 ? (
                        <p className={styles.noMemos}>아직 등록된 제보가 없습니다.<br/>첫 소식을 알려주세요! ✨</p>
                    ) : (
                        memos.map((memo) => (
                            <div key={memo.id} className={styles.memoItem}>
                                <div className={styles.memoContent}>{memo.content}</div>
                                <div className={styles.memoTime}>
                                    {new Date(memo.created_at).toLocaleString('ko-KR', {
                                        month: 'short',
                                        day: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <form onSubmit={handleSubmit} className={styles.memoForm}>
                    <input
                        type="text"
                        value={newMemo}
                        onChange={(e) => setNewMemo(e.target.value)}
                        placeholder="변동 사항을 입력해주세요 (예: 8시로 연기)"
                        className={styles.memoInput}
                        maxLength={100}
                        disabled={isSubmitting}
                    />
                    <button 
                        type="submit" 
                        className={styles.memoSubmitBtn}
                        disabled={isSubmitting || !newMemo.trim()}
                    >
                        {isSubmitting ? '...' : '제보'}
                    </button>
                </form>
                
                <p className={styles.memoNotice}>
                    * 비방, 욕설 등 부적절한 내용은 삭제될 수 있습니다.
                </p>
            </div>
        </div>
    );
};

export default MemoPopover;
