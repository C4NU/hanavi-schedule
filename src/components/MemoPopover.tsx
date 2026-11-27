import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ScheduleMemo } from '@/types/schedule';
import { addMemoToSupabase } from '@/utils/supabase';
import { toast } from 'sonner';
import BaseModal from './BaseModal';
import headerStyles from './ScheduleHeader.module.css';
import styles from './ScheduleGrid.module.css';

interface MemoPopoverProps {
    scheduleItemId: string;
    eventId?: string;
    memos: ScheduleMemo[];
    mode: 'list' | 'write';
    onMemoAdded: () => void;
    onClose: () => void;
}

const MemoPopover: React.FC<MemoPopoverProps> = ({
    scheduleItemId, eventId, memos, mode, onMemoAdded, onClose
}) => {
    const [newMemo, setNewMemo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMemo.trim()) return;

        const target = eventId ? { eventId } : { scheduleItemId };
        if (!eventId && !scheduleItemId) {
            toast.error('내용이 없는 스케줄에는 제보를 등록할 수 없습니다. 관리자가 먼저 내용을 입력해야 합니다.');
            return;
        }

        setIsSubmitting(true);
        const result = await addMemoToSupabase(target, newMemo.trim());
        setIsSubmitting(false);

        if (result.success) {
            setNewMemo('');
            onMemoAdded();
            toast.success('제보가 등록되었습니다. ✨');
        } else {
            toast.error('제보 등록 실패: ' + result.error);
        }
    };

    if (typeof document === 'undefined') return null;

    return createPortal(
        <BaseModal isOpen onClose={onClose} title={mode === 'list' ? '스케줄 메모' : '실시간 스케줄 제보'} variant="sheet" maxWidth="400px">
          {mode === 'list' ? (
            <div className={styles.memoList}>
                {memos.length === 0 ? (
                    <p className={styles.noMemos}>아직 등록된 제보가 없어요.</p>
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
          ) : (
          <>
            <form onSubmit={handleSubmit} className={styles.memoForm}>
                <input
                    type="text"
                    value={newMemo}
                    onChange={(e) => setNewMemo(e.target.value)}
                    aria-label="변동 사항"
                    placeholder="예: 8시로 연기"
                    className={styles.memoInput}
                    maxLength={100}
                    disabled={isSubmitting}
                />
                <button
                    type="submit"
                    className={`${headerStyles.button} ${styles.memoSubmitBtn}`}
                    disabled={isSubmitting || !newMemo.trim()}
                >
                    {isSubmitting ? '등록 중' : '제보'}
                </button>
            </form>

            <p className={styles.memoNotice}>
                비방, 욕설 등 부적절한 내용은 삭제될 수 있습니다.
            </p>
          </>
          )}
        </BaseModal>,
        document.body
    );
};

export default MemoPopover;
