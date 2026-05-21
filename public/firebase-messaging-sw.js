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

// The Firebase SDK automatically displays notifications when the push payload includes a `notification` object.
// We DO NOT manually handle onBackgroundMessage here, as that causes duplicate notifications.
// The SDK also automatically handles notification clicks via fcmOptions.link defined in the server payload.

