"use client";

import { useEffect, useState, useCallback } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { useReleaseNotice } from '@/hooks/useReleaseNotice';
import { WeeklySchedule } from '@/types/schedule';
import { usePathname } from 'next/navigation';
import BaseModal from './BaseModal';
import { MenuIcon } from './MobileScheduleMenu';
import headerStyles from './ScheduleHeader.module.css';


export default function NotificationManager() {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');
    const showReleaseNotice = useReleaseNotice();

    // Skip fetching on admin to avoid conflict/redundant requests
    const { schedule, isUsingMock } = useSchedule(isAdmin ? 'SKIP' : undefined);

    const [showPermissionModal, setShowPermissionModal] = useState(false);

    const subscribeUser = useCallback(async (registration: ServiceWorkerRegistration) => {
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
            if ((error as { code?: string })?.code === 'messaging/token-subscribe-failed') {
                console.error('This error usually means the VAPID key is incorrect or the permission was not granted properly. Please check NEXT_PUBLIC_VAPID_PUBLIC_KEY in .env.local matches the Key Pair in Firebase Console > Project Settings > Cloud Messaging > Web configuration.');
            }
        }

    }, []);

    useEffect(() => {
        let isActive = true;
        let unsubscribe: (() => void) | undefined;

        const registerForegroundListener = async () => {
            try {
                const { onMessage } = await import('firebase/messaging');
                const { messaging } = await import('@/lib/firebase');
                if (!isActive || !messaging) return;

                unsubscribe = onMessage(messaging, (payload) => {
                    console.log('Message received in foreground: ', payload);
                    const title = payload.notification?.title || '알림';
                    const body = payload.notification?.body || '';

                    if (Notification.permission === 'granted') {
                        new Notification(title, {
                            body,
                            icon: payload.notification?.icon || '/icon-192x192.png'
                        });
                    }
                });
            } catch (error) {
                console.error('Error setting up foreground listener:', error);
            }
        };

        void registerForegroundListener();

        return () => {
            isActive = false;
            unsubscribe?.();
        };
    }, []);

    const subscribeWithPwaWorker = useCallback(async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.ready;
                if (registration.scope !== new URL('/', window.location.href).href || Notification.permission !== 'granted') return;
                await subscribeUser(registration);
            } catch (error) {
                console.error('Failed to subscribe with the PWA service worker:', error);
            }
        }
    }, [subscribeUser]);

    useEffect(() => {
        // 개발 서버에서는 PWA 워커를 등록하지 않는다.
        if (process.env.NODE_ENV === 'development') return;

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
            void subscribeWithPwaWorker();
        }
    }, [subscribeWithPwaWorker]);

    const handlePermissionRequest = async () => {
        const permission = await Notification.requestPermission();
        setShowPermissionModal(false);
        if (permission === 'granted') {
            void subscribeWithPwaWorker();
            new Notification('알림 설정 완료', {
                body: '이제 스케줄 업데이트 알림을 받을 수 있습니다!',
                icon: '/icon-192x192.png'
            });
        }
    };
    // Helper to set stored schedule for caching purposes (optional, keeps UI responsive)
    const setStoredSchedule = (data: WeeklySchedule) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('hanavi_last_schedule', JSON.stringify(data));
    };

    useEffect(() => {
        // Just sync current schedule to local storage for cache without triggering manual notification
        if (schedule && !isUsingMock && !isAdmin && schedule.weekRange !== 'SKIP') {
            setStoredSchedule(schedule);
        }
    }, [schedule, isUsingMock, isAdmin]);

    return (
        <BaseModal
            isOpen={showPermissionModal && !(pathname === '/' && showReleaseNotice)}
            onClose={() => setShowPermissionModal(false)}
            title="알림 설정"
            maxWidth="400px"
            variant="sheet"
        >
            <div className={`${headerStyles.theme} grid gap-4 pb-1`}>
                <div className="flex items-center gap-3 py-3">
                    <span className="grid size-8 shrink-0 place-items-center text-[var(--schedule-title-pink)]">
                        <MenuIcon name="bell" />
                    </span>
                    <p className="text-sm leading-relaxed text-stone-700 [word-break:keep-all]">
                        시간표가 업데이트되면 알림을 받을 수 있어요.
                    </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setShowPermissionModal(false)}
                        className={`${headerStyles.button} min-h-11`}
                    >
                        다음에
                    </button>
                    <button
                        type="button"
                        onClick={handlePermissionRequest}
                        className={`${headerStyles.button} min-h-11 !bg-[var(--control-well)] hover:!bg-pink-100`}
                    >
                        허용하기
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}
