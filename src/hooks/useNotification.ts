"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type NotifyStatus = 'idle' | 'pending' | 'sending' | 'sent' | 'error';

export interface NotificationState {
  notifyStatus: NotifyStatus;
  isNewRelease: boolean;
  timeLeft: number;
  isModalVisible: boolean;
  setIsModalVisible: (v: boolean) => void;
  setIsNewRelease: (v: boolean) => void;
  setNotifyStatus: (v: NotifyStatus) => void;
  setTimeLeft: (v: number) => void;
  sendNotification: () => Promise<void>;
  cancelNotification: () => void;
}

export function useNotification(): NotificationState {
  const [notifyStatus, setNotifyStatus] = useState<NotifyStatus>('idle');
  const [isNewRelease, setIsNewRelease] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const notifyTimerRef = useRef<NodeJS.Timeout | null>(null);
  // Keep isNewRelease in a ref so sendNotification can read the latest value
  const isNewReleaseRef = useRef(isNewRelease);
  useEffect(() => { isNewReleaseRef.current = isNewRelease; }, [isNewRelease]);

  const sendNotification = useCallback(async () => {
    setNotifyStatus('sending');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const res = await fetch('/api/push/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          title: isNewReleaseRef.current ? '신규 스케줄 공개 📢' : '스케줄 업데이트 📢',
          body: isNewReleaseRef.current
            ? '새로운 주간 스케줄이 공개되었습니다! 확인해보세요 ✨'
            : '일정이 변경되었습니다! 확인해보세요 ✨'
        })
      });

      if (res.ok) {
        setNotifyStatus('sent');
        setTimeout(() => setNotifyStatus('idle'), 5000);
      } else {
        setNotifyStatus('error');
      }
    } catch {
      setNotifyStatus('error');
    }
  }, []);

  useEffect(() => {
    return () => {
      if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (timeLeft > 0 && notifyStatus === 'pending') {
      const timer = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0 && notifyStatus === 'pending') {
      sendNotification();
    }
  }, [timeLeft, notifyStatus, sendNotification]);

  const cancelNotification = useCallback(() => {
    if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current);
    setNotifyStatus('idle');
    setTimeLeft(0);
  }, []);

  return {
    notifyStatus,
    isNewRelease,
    timeLeft,
    isModalVisible,
    setIsModalVisible,
    setIsNewRelease,
    setNotifyStatus,
    setTimeLeft,
    sendNotification,
    cancelNotification,
  };
}
