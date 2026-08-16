// ============================================================
// firebase-messaging-sw.js — Background Push Notification Handler
// Must live at /public/ so it is served at the root URL.
// Handles ALL background push notifications with custom defence sound.
// ============================================================

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

// ── Raw Push Event Listener for ALL Background Notifications ──────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    return;
  }

  const data = payload.data || {};
  const notif = payload.notification || {};

  const notificationTitle = notif.title || data.title || data.subject || '📢 NCC Portal Update';
  const notificationBody  = notif.body  || data.body  || data.message || 'You have a new update in the NCC Portal';

  const isAttendance = data.notificationType === 'attendance';
  const targetTab = data.targetTab || (isAttendance ? 'attendance' : 'notifications');

  const destinationUrl = isAttendance
    ? `${self.location.origin}/?tab=attendance&autoVerify=${encodeURIComponent(data.pendingDocId || '')}&adminLat=${encodeURIComponent(data.adminLat || '')}&adminLng=${encodeURIComponent(data.adminLng || '')}`
    : `${self.location.origin}/?tab=${targetTab}`;

  const notificationTag = data.tag || notif.tag || `ncc-push-${Date.now()}`;

  const options = {
    body:               notificationBody,
    icon:               `${self.location.origin}/pwa-192x192.png`,
    badge:              `${self.location.origin}/pwa-192x192.png`,
    sound:              `${self.location.origin}/sounds/ncc_notification.mp3`,
    vibrate:            [250, 100, 250, 100, 400],
    requireInteraction: isAttendance ? true : false,
    tag:                notificationTag,
    renotify:           true,
    data: {
      url: destinationUrl,
      targetTab: targetTab,
      pendingDocId: data.pendingDocId || '',
      adminLat: data.adminLat || '',
      adminLng: data.adminLng || ''
    }
  };

  if (isAttendance) {
    options.actions = [
      { action: 'mark-attendance', title: '✅ On Location' },
      { action: 'dismiss',         title: '✖ Dismiss'     }
    ];
  }

  // Broadcast to all open/background client windows to trigger Web Audio "Jai Hind!" sound on mobile devices
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      clientList.forEach((client) => {
        try {
          client.postMessage({
            type: 'PLAY_NCC_SOUND',
            payload: payload
          });
        } catch (e) {}
      });
      return self.registration.showNotification(notificationTitle, options);
    })
  );
});

// ── Firebase initialisation ──────────────────────────────────────────────────
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

// ── Firebase Background Message Handler ──────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  console.log('[SW] Firebase background message received:', payload);
});

// ── Notification click / action button handler ────────────────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action    = event.action;
  const notifData = event.notification.data || {};
  const destinationUrl = notifData.url || `${self.location.origin}/?tab=${notifData.targetTab || 'notifications'}`;

  if (action === 'dismiss') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) client.navigate(destinationUrl);
          return;
        }
      }
      if (clients.openWindow) return clients.openWindow(destinationUrl);
    })
  );
});
