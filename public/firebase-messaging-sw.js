// ============================================================
// firebase-messaging-sw.js — Background Push Notification Handler
// Must live at /public/ so it is served at the root URL.
// Uses compat SDK (required for importScripts in service workers).
// VERSION: 10.x compat (matches firebase ^10.x in package.json)
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Register RAW push listener FIRST, before Firebase initialises ─────────────
//
// WHY raw push instead of messaging.onBackgroundMessage()?
//
//   messaging.onBackgroundMessage() is a Firebase wrapper around the push event.
//   On Android Chrome the compat SDK sometimes doesn't properly call
//   event.waitUntil() with our custom showNotification(), causing the
//   notification to be dropped or shown without action buttons.
//
//   A raw push event listener:
//     • Fires reliably on EVERY push, including data-only messages
//     • Lets us call event.waitUntil() ourselves — guaranteed to keep the SW alive
//     • Works the same on Chrome Android 50+ and Chrome Desktop
//
//   Multiple push listeners coexist fine — both ours AND Firebase's fire:
//     • Attendance (data-only)  → Our listener shows with actions; Firebase does nothing
//     • Standard notifications  → Our listener exits early; Firebase auto-displays
//
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    return; // Not valid JSON — let Firebase handle it
  }

  // FCM encodes our custom fields under payload.data
  const data = payload.data || {};

  // Only intercept attendance pushes — everything else is handled by Firebase below
  if (data.notificationType !== 'attendance') return;

  const notificationTitle = data.title || '📍 Attendance Verification Required';
  const notificationBody  = data.body  || 'Your ANO has scanned your QR code. Tap to verify your location.';

  const verifyUrl = (
    `${self.location.origin}/?tab=attendance` +
    `&autoVerify=${encodeURIComponent(data.pendingDocId  || '')}` +
    `&adminLat=${encodeURIComponent(data.adminLat || '')}` +
    `&adminLng=${encodeURIComponent(data.adminLng || '')}`
  );

  const notificationTag = data.tag || `attendance-${data.pendingDocId || Date.now()}`;

  // event.waitUntil() keeps the service worker alive until the notification is shown
  event.waitUntil(
    self.registration.showNotification(notificationTitle, {
      body:              notificationBody,
      icon:              `${self.location.origin}/pwa-192x192.png`,
      badge:             `${self.location.origin}/pwa-192x192.png`,
      vibrate:           [200, 100, 200, 100, 200],
      requireInteraction: true,   // Stay visible until cadet acts
      tag:               notificationTag,
      renotify:          true,    // Vibrate even when replacing same tag
      data: {
        pendingDocId: data.pendingDocId || '',
        adminLat:     data.adminLat    || '',
        adminLng:     data.adminLng    || '',
        verifyUrl,
      },
      // Action buttons — Chrome Android 50+ and Chrome Desktop
      actions: [
        { action: 'mark-attendance', title: '✅ On Location' },
        { action: 'dismiss',         title: '✖ Dismiss'         },
      ],
    })
  );
});

// ── Firebase initialisation (handles standard broadcast notifications) ─────────
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

// Standard broadcasts (non-attendance) are auto-displayed by the Firebase SDK
// from their `notification` field. No manual handler needed for those.
// We intentionally do NOT call messaging.onBackgroundMessage() here to avoid
// conflicting with our raw push listener above.

// ── Notification click / action button handler ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action    = event.action;             // 'mark-attendance' | 'dismiss' | ''
  const notifData = event.notification.data || {};
  const verifyUrl = notifData.verifyUrl || `${self.location.origin}/?tab=attendance`;

  // Dismiss — just close the notification (already done above)
  if (action === 'dismiss') return;

  // 'mark-attendance' OR plain body tap → open / focus the PWA at the verify URL
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(verifyUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(verifyUrl);
    })
  );
});
