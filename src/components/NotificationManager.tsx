"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSchedule } from '@/hooks/useSchedule';
import { CharacterSchedule } from '@/types/schedule';
import { usePathname } from 'next/navigation';
import BaseModal from './BaseModal';


export default function NotificationManager() {
    const pathname = usePathname();
    const isAdmin = pathname?.startsWith('/admin');

    // Skip fetching on admin to avoid conflict/redundant requests
    const { schedule, isUsingMock } = useSchedule(isAdmin ? 'SKIP' : undefined);

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
    // Helper to set stored schedule for caching purposes (optional, keeps UI responsive)
    const setStoredSchedule = (data: any) => {
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
            isOpen={showPermissionModal}
            onClose={() => setShowPermissionModal(false)}
            title="알림 설정"
            maxWidth="400px"
        >
            <div className="flex flex-col items-center py-4">
                <div className="mb-6 h-16 w-16 flex items-center justify-center rounded-3xl bg-pink-50 shadow-inner">
                    <svg className="h-8 w-8 text-pink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                </div>

                <p className="mb-8 text-center text-gray-500 font-medium leading-relaxed">
                    스케줄이 업데이트될 때마다<br />
                    실시간으로 알림을 보내드릴까요?
                </p>

                <div className="flex w-full gap-3">
                    <button
                        onClick={() => setShowPermissionModal(false)}
                        className="flex-1 py-4 rounded-2xl font-bold text-gray-400 bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                        다음에
                    </button>
                    <button
                        onClick={handlePermissionRequest}
                        className="flex-1 py-4 bg-pink-400 text-white rounded-2xl font-bold shadow-lg shadow-pink-100 hover:bg-pink-500 transition-all active:scale-95"
                    >
                        허용하기
                    </button>
                </div>
            </div>
        </BaseModal>
    );
}
