const SW_VERSION = "v2";
console.log("BatchOS Messaging SW", SW_VERSION);

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey: "AIzaSyBTyn9CF7lGsWsWMkbcsxZp9OVVoovBGZ8",
    authDomain: "batchos-a2e65.firebaseapp.com",
    projectId: "batchos-a2e65",
    storageBucket: "batchos-a2e65.firebasestorage.app",
    messagingSenderId: "20467113701",
    appId: "1:20467113701:web:f34c17e6423b882995be0c",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    const notificationTitle = payload.notification?.title || "BatchOS";

    const notificationOptions = {
        body: payload.notification?.body || "New update",
        icon: "/batchos-logo.png",
        data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener("notificationclick", function (event) {
    event.notification.close();

    const targetUrl = event.notification.data?.link || "/dashboard";

    event.waitUntil(
        clients.matchAll({
            type: "window",
            includeUncontrolled: true,
        }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(targetUrl) && "focus" in client) {
                    return client.focus();
                }
            }

            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});