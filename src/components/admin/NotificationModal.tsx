"use client";

import React from 'react';
import { NotifyStatus } from '@/hooks/useNotification';

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

  const borderClass = {
    pending: 'border-yellow-400',
    sending: 'border-blue-400',
    sent: 'border-green-400',
    error: 'border-red-400',
  }[notifyStatus] ?? '';

  const emoji = {
    pending: '⏳',
    sending: '🚀',
    sent: '✅',
    error: '⚠️',
  }[notifyStatus] ?? '';

  const title = {
    pending: isNewRelease ? '신규 스케줄 공개 완료!' : '변경사항 저장 완료!',
    sending: '알림 전송 중...',
    sent: '전송 완료!',
    error: '오류 발생',
  }[notifyStatus] ?? '';

  return (
    <div className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className={`bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border-2 transform transition-all relative ${borderClass}`}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <span className="text-4xl animate-bounce">{emoji}</span>
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>

          <div className="text-gray-600 font-medium">
            {notifyStatus === 'pending' && (
              <>
                <p>약 {timeLeft}초 뒤에 {isNewRelease ? '스케줄 공개' : '스케줄 변경'} 알림이 전송됩니다.</p>
                <span className="text-xs text-gray-400 font-normal mt-1 block">
                  (추가 변경 시 타이머가 초기화됩니다)
                </span>
              </>
            )}
            {notifyStatus === 'sending' && <p>잠시만 기다려주세요.</p>}
            {notifyStatus === 'sent' && <p>모든 작업이 성공적으로 처리되었습니다.</p>}
          </div>

          {notifyStatus === 'pending' && (
            <div className="flex gap-3 w-full mt-2">
              <button
                onClick={onCancel}
                className="flex-1 py-2 px-4 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-bold transition-colors"
              >
                취소 (알림 X)
              </button>
              <button
                onClick={onSendNow}
                className="flex-1 py-2 px-4 rounded-xl bg-blue-500 text-white hover:bg-blue-600 font-bold shadow-md transition-colors"
              >
                지금 보내기
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
