"use client";

import { useState, useEffect } from 'react';

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

export default function PushTester() {
    const [status, setStatus] = useState('');
    const [subStatus, setSubStatus] = useState('확인 중...');
    const [secret, setSecret] = useState('');

    useEffect(() => {
        checkSubscription();
    }, []);

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator)) {
            setSubStatus('Service Worker 미지원');
            return;
        }
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            setSubStatus('✅ 구독됨');
            console.log('Current Subscription:', subscription);
        } else {
            setSubStatus('❌ 구독 안 됨');
        }
    };

    const handleResubscribe = async () => {
        setStatus('재구독 시도 중...');
        try {
            const registration = await navigator.serviceWorker.ready;
            const existingSub = await registration.pushManager.getSubscription();
            if (existingSub) {
                await existingSub.unsubscribe();
            }

            const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) throw new Error('VAPID Key missing');

            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
            const newSub = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            // Send to backend
            await fetch('/api/push/subscribe', {
                method: 'POST',
                body: JSON.stringify(newSub),
                headers: { 'Content-Type': 'application/json' }
            });

            setStatus('재구독 완료! (DB 저장됨)');
            checkSubscription();
        } catch (e) {
            setStatus(`재구독 실패: ${e}`);
        }
    };

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
        if (!secret) {
            setStatus('Admin Secret을 입력해주세요.');
            return;
        }
        setStatus('서버 푸시 요청 중...');
        try {
            const res = await fetch('/api/push/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    secret: secret,
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
            <h3 className="font-bold mb-2">알림 심층 진단</h3>
            <div className="mb-2">
                구독 상태: <span className="font-bold">{subStatus}</span>
            </div>
            <div className="mb-4">
                <input
                    type="text"
                    placeholder="Admin Secret 입력"
                    className="border p-1 rounded w-full mb-1"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                />
            </div>
            <div className="mb-2 text-sm text-red-600 break-all">{status}</div>
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={sendLocalNotification}
                    className="px-3 py-2 bg-blue-500 text-white rounded text-sm"
                >
                    1. 로컬 알림
                </button>
                <button
                    onClick={handleResubscribe}
                    className="px-3 py-2 bg-purple-500 text-white rounded text-sm"
                >
                    2. 강제 재구독
                </button>
                <button
                    onClick={sendServerPush}
                    className="px-3 py-2 bg-green-500 text-white rounded text-sm"
                >
                    3. 서버 푸시 (Secret 필요)
                </button>
            </div>
        </div>
    );
}
