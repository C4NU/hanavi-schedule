/// <reference lib="webworker" />

import { initializeApp } from 'firebase/app';
import { getMessaging, onBackgroundMessage } from 'firebase/messaging/sw';

const worker = self as unknown as ServiceWorkerGlobalScope;
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function notificationUrl(value: string | undefined): string {
    const home = new URL('/', worker.location.origin);
    try {
        const url = new URL(value || '/', home);
        return url.origin === home.origin ? url.href : home.href;
    } catch {
        return home.href;
    }
}

worker.addEventListener('notificationclick', event => {
    const url = event.notification.data?.hanaviUrl;
    if (typeof url !== 'string') return;

    event.notification.close();
    const href = notificationUrl(url);
    event.waitUntil((async () => {
        const windows = await worker.clients.matchAll({ type: 'window', includeUncontrolled: true });
        const existing = windows.find(client => client.url === href);
        return existing ? existing.focus() : worker.clients.openWindow(href);
    })());
});

if (firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.messagingSenderId && firebaseConfig.appId) {
    try {
        const messaging = getMessaging(initializeApp(firebaseConfig));
        onBackgroundMessage(messaging, payload => {
            // Firebase가 notification 페이로드의 표시와 클릭을 처리한다.
            if (payload.notification) return;

            return worker.registration.showNotification(payload.data?.title || '하나비 스케줄', {
                body: payload.data?.body || '새로운 소식이 있습니다.',
                icon: payload.data?.icon || '/icon-192x192.png',
                badge: '/icon-192x192.png',
                data: { hanaviUrl: notificationUrl(payload.data?.url) },
            });
        });
    } catch (error) {
        console.error('Firebase Messaging service worker initialization failed:', error);
    }
}
