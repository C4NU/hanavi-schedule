"use client";

import type { NotifyStatus } from '@/hooks/useNotification';
import BaseModal from '../BaseModal';
import controls from '../ScheduleHeader.module.css';
import styles from './AdminSchedule.module.css';

interface NotificationModalProps {
  notifyStatus: NotifyStatus;
  isModalVisible: boolean;
  isNewRelease: boolean;
  timeLeft: number;
  onClose: () => void;
  onCancel: () => void;
  onSendNow: () => void;
}

export default function NotificationModal({
  notifyStatus,
  isModalVisible,
  isNewRelease,
  timeLeft,
  onClose,
  onCancel,
  onSendNow,
}: NotificationModalProps) {
  if (notifyStatus === 'idle' || !isModalVisible) return null;

  const notice = isNewRelease ? '신규 일정 공개 알림' : '일정 변경 알림';
  const title = {
    pending: isNewRelease ? '신규 일정 공개 완료' : '변경사항 저장 완료',
    sending: '알림 발송 중',
    sent: '알림 발송 완료',
    error: '알림 발송 실패',
  }[notifyStatus];
  const message = {
    sending: `${notice}을 보내고 있어요.`,
    sent: `${notice}을 보냈어요.`,
    error: '일정은 저장됐지만 알림을 보내지 못했어요.',
  };

  return (
    <BaseModal isOpen onClose={onClose} title={title} variant="sheet" maxWidth="440px" focusCloseOnOpen>
      <div className={styles.sheetBody}>
        {notifyStatus === 'pending' ? (
          <>
            <div className={styles.notificationCountdown}>
              <strong role="timer" aria-label="자동 발송까지 남은 시간">{timeLeft}초</strong>
              <p>대기 시간이 끝나면 {notice}을 보냅니다.</p>
            </div>
            <p>추가 변경사항을 저장하면 대기 시간이 60초로 다시 시작돼요. 시트를 닫아도 발송 대기는 계속됩니다.</p>
            <div className={styles.actions}>
              <button type="button" className={controls.button} onClick={onCancel}>알림 취소</button>
              <button type="button" className={`${controls.button} ${styles.primary}`} onClick={onSendNow}>즉시 발송</button>
            </div>
          </>
        ) : (
          <p role={notifyStatus === 'error' ? 'alert' : 'status'}>{message[notifyStatus]}</p>
        )}
      </div>
    </BaseModal>
  );
}
