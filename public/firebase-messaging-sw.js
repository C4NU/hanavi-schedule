
// Scripts for firebase messaging service worker

importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

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

    // Prevent duplicate notifications
    // If the payload has a 'notification' property, the browser/OS will automatically display it.
    // So we should NOT display another one here.
    if (payload.notification) {
        console.log('[firebase-messaging-sw.js] System notification detected. Skipping manual display.');
        return;
    }

    // Customize notification here (Only for data-only messages)
    const notificationTitle = payload.data?.title;
    const notificationOptions = {
        body: payload.data?.body,
        icon: payload.data?.icon || '/icon-192x192.png',
        data: {
            url: payload.data?.url || '/'
        }
    };

    if (notificationTitle) {
        self.registration.showNotification(notificationTitle, notificationOptions);
    }
});
