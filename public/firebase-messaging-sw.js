
// Scripts for firebase messaging service worker
// Version: 1.2 (Force update)

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

// Force service worker to activate immediately
self.addEventListener('install', () => {
    self.skipWaiting();
});

// Initialize the Firebase app in the service worker by passing in the
// messagingSenderId.
firebase.initializeApp({
    apiKey: "AIzaSyAUYTo4EKEh0NR59nILMvS5k7ulmfQ3IAw",
    authDomain: "hanavi-schedule.firebaseapp.com",
    projectId: "hanavi-schedule",
    storageBucket: "hanavi-schedule.firebasestorage.app",
    messagingSenderId: "656255197646",
    appId: "1:656255197646:web:901b93ea1c78a1c4e2cb9f",
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    // If the payload has a 'notification' property, the browser/OS will automatically display it.
    // So we should NOT display another one here to avoid duplicates.
    if (payload.notification) {
        console.log('[firebase-messaging-sw.js] System notification detected. Skipping manual display.');
        return;
    }

    // Customize notification here (Only for data-only messages)
    const notificationTitle = payload.data?.title || '하나비 스케줄';
    const notificationOptions = {
        body: payload.data?.body || '새로운 소식이 있습니다.',
        icon: payload.data?.icon || '/icon-192x192.png',
        badge: '/icon-192x192.png',
        data: {
            url: payload.data?.url || '/'
        }
    };

    if (notificationTitle) {
        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});

// Handle notification click
self.addEventListener('notificationclick', function (event) {
    console.log('[firebase-messaging-sw.js] Notification click Received.');
    event.notification.close();

    const targetUrl = event.notification.data?.url || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
            // If a window is already open, focus it and navigate to the target URL
            for (let i = 0; i < clientList.length; i++) {
                const client = clientList[i];
                if (client.url === targetUrl && 'focus' in client) {
                    return client.focus();
                }
            }
            // If no window is open, open a new one
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});
