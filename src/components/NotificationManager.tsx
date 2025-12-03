"use client";

import { useEffect, useRef, useState } from 'react';
import { useSchedule } from '@/hooks/useSchedule';

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

export default function NotificationManager() {
    const { schedule } = useSchedule();
    const lastScheduleRef = useRef<string>('');
    const isFirstMount = useRef(true);
    const [showPermissionModal, setShowPermissionModal] = useState(false);

    useEffect(() => {
        // Check if notifications are supported
        if (!('Notification' in window)) {
            console.log('This browser does not support desktop notification');
            return;
        }

        // Check if permission is default (not asked yet)
        if (Notification.permission === 'default') {
            setShowPermissionModal(true);
        } else if (Notification.permission === 'granted') {
            // Ensure service worker is registered and subscribed
            registerServiceWorker();
        }
    }, []);

    const registerServiceWorker = async () => {
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('Service Worker registered');

                // Check if already subscribed
                const subscription = await registration.pushManager.getSubscription();
                if (!subscription) {
                    await subscribeUser(registration);
                }
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    };

    const subscribeUser = async (registration: ServiceWorkerRegistration) => {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error('VAPID Public Key is missing');
            return;
        }

        try {
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });

            console.log('User is subscribed:', subscription);

            // Send subscription to backend
            await fetch('/api/push/subscribe', {
                method: 'POST',
                body: JSON.stringify(subscription),
                headers: {
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            console.error('Failed to subscribe the user: ', error);
        }
    };

    const handlePermissionRequest = async () => {
        const permission = await Notification.requestPermission();
        setShowPermissionModal(false);
        if (permission === 'granted') {
            registerServiceWorker();
            new Notification('알림 설정 완료', {
                body: '이제 스케줄 업데이트 알림을 받을 수 있습니다!',
                icon: '/icon-192x192.png'
            });
        }
    };

    useEffect(() => {
        if (!schedule) return;

        const currentScheduleStr = JSON.stringify(schedule);

        if (isFirstMount.current) {
            lastScheduleRef.current = currentScheduleStr;
            isFirstMount.current = false;
            return;
        }

        if (lastScheduleRef.current && lastScheduleRef.current !== currentScheduleStr) {
            // Schedule has changed
            const oldSchedule = JSON.parse(lastScheduleRef.current);
            const newSchedule = schedule;
            let notificationTitle = '하나비 스케줄 업데이트';
            let notificationBody = '스케줄이 업데이트되었습니다. 확인해보세요!';

            // 1. Check if Week Range Changed
            if (oldSchedule.weekRange !== newSchedule.weekRange) {
                notificationTitle = '새로운 주간 스케줄 도착! 📅';
                notificationBody = `${newSchedule.weekRange} 주간 스케줄이 공개되었습니다.`;
            } else {
                // 2. Check for Specific Character Changes
                const changedCharacters: string[] = [];

                newSchedule.characters.forEach((newChar: any) => {
                    const oldChar = oldSchedule.characters.find((c: any) => c.id === newChar.id);
                    if (!oldChar) return;

                    // Compare schedule items
                    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
                    const hasChanged = days.some(day => {
                        const oldItem = oldChar.schedule[day];
                        const newItem = newChar.schedule[day];

                        // Compare content and time
                        // Treat undefined/null as empty string/object for comparison
                        const oldContent = oldItem?.content || '';
                        const newContent = newItem?.content || '';
                        const oldTime = oldItem?.time || '';
                        const newTime = newItem?.time || '';

                        return oldContent !== newContent || oldTime !== newTime;
                    });

                    if (hasChanged) {
                        changedCharacters.push(newChar.name);
                    }
                });

                if (changedCharacters.length === 1) {
                    notificationTitle = `${changedCharacters[0]} 스케줄 변경 🔔`;
                    notificationBody = `${changedCharacters[0]}님의 스케줄이 변경되었습니다.`;
                } else if (changedCharacters.length > 1) {
                    notificationTitle = '스케줄 업데이트 🔔';
                    notificationBody = `${changedCharacters.join(', ')}님의 스케줄이 변경되었습니다.`;
                }
            }

            // 1. Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notificationTitle, {
                    body: notificationBody,
                    icon: '/icon-192x192.png'
                });
            }

            // 2. In-app Alert (Toast)
            const toast = document.createElement('div');
            toast.className = 'fixed top-4 right-4 bg-blue-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-bounce cursor-pointer';
            toast.innerHTML = `<strong>${notificationTitle}</strong><br/>${notificationBody}`;
            toast.onclick = () => {
                toast.remove();
                window.location.reload();
            };
            document.body.appendChild(toast);

            // Auto remove after 5 seconds
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 5000);

            lastScheduleRef.current = currentScheduleStr;
        }
    }, [schedule]);

    if (!showPermissionModal) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center">
                <div className="text-4xl mb-4">🔔</div>
                <h3 className="text-xl font-bold mb-2 text-gray-800">알림 설정</h3>
                <p className="text-gray-600 mb-6">
                    스케줄이 업데이트되면 푸시 알림을 보내드릴까요?
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={() => setShowPermissionModal(false)}
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-medium hover:bg-gray-300 transition-colors"
                    >
                        나중에
                    </button>
                    <button
                        onClick={handlePermissionRequest}
                        className="px-4 py-2 rounded-lg bg-blue-500 text-white font-bold hover:bg-blue-600 transition-colors shadow-md"
                    >
                        네, 받을래요!
                    </button>
                </div>
            </div>
        </div>
    );
}
