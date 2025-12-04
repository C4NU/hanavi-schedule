"use client";

import { useState } from 'react';

export default function PushTester() {
    const [status, setStatus] = useState('');

    const sendLocalNotification = () => {
        if (!('Notification' in window)) {
            setStatus('이 브라우저는 알림을 지원하지 않습니다.');
            return;
        }

        if (Notification.permission === 'granted') {
            try {
                new Notification('[테스트] 로컬 알림', {
                    body: '이 알림이 보이면 권한은 정상입니다!',
                    icon: '/icon-192x192.png'
                });
                setStatus('로컬 알림 전송 시도함');
            } catch (e) {
                setStatus(`로컬 알림 에러: ${e}`);
            }
        } else {
            setStatus(`권한 상태: ${Notification.permission}`);
        }
    };

    const sendServerPush = async () => {
        setStatus('서버 푸시 요청 중...');
        try {
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: 'your_admin_secret_key', // 하드코딩된 비밀키 (테스트용)
                    title: '서버 푸시 테스트',
                    body: '서버에서 보낸 알림입니다!'
                })
            });
            const data = await res.json();
            setStatus(`서버 응답: ${JSON.stringify(data)}`);
        } catch (e) {
            setStatus(`서버 요청 에러: ${e}`);
        }
    };

    return (
        <div className="p-4 m-4 bg-gray-100 rounded-lg border border-gray-300">
            <h3 className="font-bold mb-2">알림 테스트 패널</h3>
            <div className="mb-2 text-sm text-red-600 break-all">{status}</div>
            <div className="flex gap-2">
                <button
                    onClick={sendLocalNotification}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
                >
                    1. 로컬 알림 테스트
                </button>
                <button
                    onClick={sendServerPush}
                    className="px-3 py-2 bg-green-500 text-white rounded text-sm"
                >
                    2. 서버 푸시 테스트
                </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
                * 로컬 알림이 안 되면 아이패드 설정 문제<br />
                * 로컬은 되는데 서버 푸시가 안 되면 구독/서버 문제
            </p>
        </div>
    );
}
