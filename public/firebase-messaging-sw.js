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
});

const messaging = firebase.messaging();

// ── Background message handler ───────────────────────────────────────────────
// Fired when app is in background or phone is locked.
// This is what shows the notification on the lock screen / notification bar.
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);

  const notificationTitle = payload.notification?.title || 'NCC Portal Update';
  const notificationBody  = payload.notification?.body  || 'You have a new update.';

  // Use a unique tag so each notification is shown separately (not replaced)
  const uniqueTag = `ncc-${Date.now()}`;

  const notificationOptions = {
    body: notificationBody,
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    tag: uniqueTag,          // unique tag = no grouping/replacing
    renotify: false,         // false because tag is already unique
    vibrate: [200, 100, 200],
    requireInteraction: false,
    data: {
      url: 'https://ncc-portal-redesign.vercel.app'
    }
  };

  // showNotification is the ONLY way to show a notification from a SW
  // DO NOT use window.location here — service workers have no window object
  return self.registration.showNotification(notificationTitle, notificationOptions);
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
