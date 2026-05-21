// ============================================================
// firebase-messaging-sw.js — Background Push Notification Handler
// Must live at /public/ so it is served at the root URL.
// Uses compat SDK (required for importScripts in service workers).
// VERSION: 10.x compat (matches firebase ^10.x in package.json)
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI",
  authDomain: "gmrit-ncc-fb1df.firebaseapp.com",
  projectId: "gmrit-ncc-fb1df",
  storageBucket: "gmrit-ncc-fb1df.firebasestorage.app",
  messagingSenderId: "218480065073",
  appId: "1:218480065073:web:52a908b9996d0773ba7310",
  measurementId: "G-8LBCG7FRM0",
});

const messaging = firebase.messaging();

// ── Helper: show notification from any payload shape ────────────────────────
function showNCCNotification(title, body, data) {
  const uniqueTag = `ncc-${Date.now()}`;
  return self.registration.showNotification(title || 'NCC Portal Update', {
    body: body || 'You have a new update.',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: uniqueTag,
    renotify: false,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: { url: 'https://ncc-portal-redesign.vercel.app', ...(data || {}) },
  });
}

// ── onBackgroundMessage: Fired by Firebase SDK for DATA-ONLY messages ────────
// NOTE: When the FCM message includes a `notification` key, the browser/OS
// displays it automatically and this handler is NOT called.
// For messages WITH a `notification` payload (which our sendBroadcast sends),
// the native `push` handler below is the reliable intercept point.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] onBackgroundMessage:', payload);

  const title = payload.notification?.title || payload.data?.title || 'NCC Portal Update';
  const body  = payload.notification?.body  || payload.data?.body  || 'You have a new update.';

  return showNCCNotification(title, body, payload.data);
});

// ── Notification click handler ───────────────────────────────────────────────
// Opens the app when user taps the notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || 'https://ncc-portal-redesign.vercel.app';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes('ncc-portal-redesign.vercel.app') && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
