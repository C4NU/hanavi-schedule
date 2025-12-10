"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { CharacterSchedule } from '@/types/schedule';


export default function NotificationManager() {
    const { schedule, isUsingMock } = useSchedule();

    const [showPermissionModal, setShowPermissionModal] = useState(false);

    const subscribeUser = async (registration: ServiceWorkerRegistration) => {
        const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            console.error('VAPID Public Key is missing');
            return;
        }
        console.log('VAPID Key loaded:', vapidPublicKey.substring(0, 5) + '...');

        try {
            // Dynamically import firebase messaging to avoid SSR issues
            const { messaging } = await import('@/lib/firebase');
            const { getToken } = await import('firebase/messaging');

            if (!messaging) {
                console.error('Firebase messaging not supported');
                return;
            }

            // Check if VAPID key is valid format (basic check)
            if (!vapidPublicKey || vapidPublicKey.length < 10) {
                console.error('Invalid VAPID Public Key format');
                return;
            }

            const token = await getToken(messaging, {
                serviceWorkerRegistration: registration,
                vapidKey: vapidPublicKey
            });

            if (token) {
                console.log('Firebase Token:', token);
                // Send token to backend
                await fetch('/api/push/subscribe', {
                    method: 'POST',
                    body: JSON.stringify({ endpoint: token }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }

        } catch (error) {
            console.error('An error occurred while retrieving token. ', error);
            // @ts-ignore
            if (error?.code === 'messaging/token-subscribe-failed') {
                console.error('This error usually means the VAPID key is incorrect or the permission was not granted properly. Please check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local matches the Key Pair in Firebase Console > Project Settings > Cloud Messaging > Web configuration.');
            }
        }

        // Listen for foreground messages
        try {
            const { onMessage } = await import('firebase/messaging');
            const { messaging } = await import('@/lib/firebase');
            if (messaging) {
                onMessage(messaging, (payload) => {
                    console.log('Message received in foreground: ', payload);
                    const title = payload.notification?.title || '알림';
                    const body = payload.notification?.body || '';

                    // Show valid browser notification even in foreground if supported/allowed
                    if (Notification.permission === 'granted') {
                        new Notification(title, {
                            body: body,
                            icon: payload.notification?.icon || '/icon-192x192.png'
                        });
                    }
                });
            }
        } catch (e) {
            console.error('Error setting up foreground listener:', e);
        }
    };

    const registerServiceWorker = useCallback(async () => {
        if ('serviceWorker' in navigator && 'Notification' in window) {
            try {
                const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('Service Worker registered');
                await subscribeUser(registration);
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }, []);

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
    }, [registerServiceWorker]);

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
    // Helper to get stored schedule
    const getStoredSchedule = () => {
        if (typeof window === 'undefined') return null;
        const stored = localStorage.getItem('hanavi_last_schedule');
        return stored ? JSON.parse(stored) : null;
    };

    // Helper to set stored schedule
    const setStoredSchedule = (data: any) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('hanavi_last_schedule', JSON.stringify(data));
    };

    useEffect(() => {
        // 0. Ignore if using mock data or no schedule
        if (!schedule || isUsingMock) return;

        const currentScheduleStr = JSON.stringify(schedule);
        const storedSchedule = getStoredSchedule();
        const storedScheduleStr = storedSchedule ? JSON.stringify(storedSchedule) : '';

        // 1. Initial Load / No previous data
        if (!storedSchedule) {
            console.log('Initial schedule sync (no notification)');
            setStoredSchedule(schedule);
            return;
        }

        // 2. Check for changes
        if (storedScheduleStr !== currentScheduleStr) {
            // Schedule has changed compared to LOCAL STORAGE
            const oldSchedule = storedSchedule;
            const newSchedule = schedule;
            let notificationTitle = '하나비 스케줄 업데이트';
            let notificationBody = '스케줄이 업데이트되었습니다. 확인해보세요!';

            // A. Check if Week Range Changed
            if (oldSchedule.weekRange !== newSchedule.weekRange) {
                notificationTitle = '새로운 주간 스케줄 도착! 📅';
                notificationBody = `${newSchedule.weekRange} 주간 스케줄이 공개되었습니다.`;
            } else {
                // B. Check for Specific Character Changes
                const changedCharacters: string[] = [];

                newSchedule.characters.forEach((newChar: CharacterSchedule) => {
                    const oldChar = oldSchedule.characters.find((c: CharacterSchedule) => c.id === newChar.id);
                    if (!oldChar) return;

                    // Compare schedule items
                    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;
                    const hasChanged = days.some(day => {
                        const oldItem = oldChar.schedule[day];
                        const newItem = newChar.schedule[day];

                        // Compare content and time
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
                } else {
                    // No visible changes detected (maybe order or minor metadata), skip notification
                    // Update storage and return
                    setStoredSchedule(schedule);
                    return;
                }
            }

            // 3. Browser Notification
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification(notificationTitle, {
                    body: notificationBody,
                    icon: '/icon-192x192.png'
                });
            }

            // 4. Update Local Storage
            setStoredSchedule(schedule);
        }
    }, [schedule, isUsingMock]);

    const modal = useRef<HTMLDivElement>(null);

    // close on click outside
    useEffect(() => {
        const clickHandler = ({ target }: MouseEvent) => {
            if (!modal.current) return;
            if (
                !showPermissionModal ||
                modal.current.contains(target as Node)
            )
                return;
            setShowPermissionModal(false);
        };
        document.addEventListener("click", clickHandler);
        return () => document.removeEventListener("click", clickHandler);
    });

    // close if the esc key is pressed
    useEffect(() => {
        const keyHandler = ({ keyCode }: KeyboardEvent) => {
            if (!showPermissionModal || keyCode !== 27) return;
            setShowPermissionModal(false);
        };
        document.addEventListener("keydown", keyHandler);
        return () => document.removeEventListener("keydown", keyHandler);
    });

    if (!showPermissionModal) return null;

    return (
        <div
            className={`fixed left-0 top-0 flex h-full min-h-screen w-full items-center justify-center bg-black/40 px-4 py-5 z-[9999] ${showPermissionModal ? "block" : "hidden"
                }`}
        >
            <div
                ref={modal}
                className="w-full max-w-[520px] rounded-[24px] bg-white p-10 shadow-2xl animate-scale-in"
            >
                {/* 아이콘 */}
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#ffb6c1]/10">
                    <svg className="h-7 w-7 text-[#ffb6c1]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>

                {/* 제목 */}
                <h3 className="mb-3 text-2xl font-bold text-[#1a1a1a]">
                    알림 설정
                </h3>

                {/* 본문 */}
                <p className="mb-10 text-base leading-relaxed text-[#6b7280]">
                    스케줄이 변경되면 가장 먼저 알려드릴까요?
                </p>

                {/* 버튼 영역 */}
                <div className="flex gap-4">
                    <button
                        onClick={() => setShowPermissionModal(false)}
                        className="flex-1 rounded-lg border-2 border-gray-200 bg-white px-6 py-4 text-base font-semibold text-[#1a1a1a] transition hover:bg-gray-50"
                    >
                        허용 안 함
                    </button>
                    <button
                        onClick={handlePermissionRequest}
                        className="flex-1 rounded-lg bg-[#ffb6c1] px-6 py-4 text-base font-semibold text-white transition hover:bg-[#ff9aa2] shadow-sm"
                    >
                        허용
                    </button>
                </div>
            </div>
        </div>
    );
}
