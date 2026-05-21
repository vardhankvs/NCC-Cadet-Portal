import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db, appId } from './config';
import { doc, setDoc, arrayUnion, collection } from 'firebase/firestore';

// ── VAPID public key (Web Push certificate from Firebase Console) ────────────
const VAPID_KEY = 'BNpINcBKAiIus3dNAcNhCjGHnRIub-fIkDIk0A3bzOGvPcfGdD2ZU-VyTHq9hUBvvrlJVkXx4NLq4oX7_Gu1e2U';

// Internal colRef — avoids circular import from firestoreService.js
const colRef = (name) => collection(db, 'artifacts', appId, 'public', 'data', name);

/**
 * Wait for the Firebase messaging service worker to become active.
 * FCM's getToken() will fail if the SW isn't ready yet.
 */
const waitForSW = async (timeoutMs = 10000) => {
    if (!('serviceWorker' in navigator)) return false;

    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        const reg = await navigator.serviceWorker.getRegistration('/');
        if (reg?.active) {
            console.log('FCM: Service worker is active —', reg.scope);
            return true;
        }
        await new Promise(r => setTimeout(r, 500));
    }
    console.warn('FCM: Service worker did not become active within', timeoutMs, 'ms');
    return false;
};

/**
 * Request notification permission and register this device's FCM token.
 * Saves to: cadets/{userId}, staff/{userId}, and users/{userId} as fallback.
 *
 * @param {string} userId         - Firestore document ID of this user
 * @param {string} collectionName - 'cadets' | 'staff'
 * @returns {string|null} The FCM token on success, or null on failure.
 */
export const requestNotificationPermission = async (userId, collectionName = 'cadets') => {
    try {
        if (!messaging) {
            console.warn('FCM: Firebase Messaging is not supported in this browser.');
            return null;
        }

        // Step 1 — request permission
        const permission = await Notification.requestPermission();
        console.log('FCM: Notification permission status:', permission);
        if (permission !== 'granted') {
            console.warn('FCM: Permission denied.');
            alert(
                'Notification permission was not granted.\n\n' +
                'Please go to your browser Settings → Site Settings → Notifications ' +
                'and allow notifications for this site, then reload the page.'
            );
            return null;
        }

        // Step 2 — wait for service worker to be active (required for getToken)
        const swReady = await waitForSW(8000);
        if (!swReady) {
            console.warn('FCM: Service worker not ready — token registration skipped. Will retry on next login.');
            return null;
        }

        // Step 3 — get FCM token
        const token = await getToken(messaging, {
            vapidKey: VAPID_KEY,
            serviceWorkerRegistration: await navigator.serviceWorker.getRegistration('/')
        });

        console.log('FCM: Token retrieved:', token ? token.substring(0, 20) + '…' : 'EMPTY');

        if (!token) {
            console.warn('FCM: getToken returned empty. Possible causes:\n' +
                '  1. Service worker not registered at / scope\n' +
                '  2. VAPID key mismatch\n' +
                '  3. Browser blocking push (private mode?)');
            return null;
        }

        if (!userId) {
            console.warn('FCM: Token generated but userId is missing — cannot save token.');
            return token;
        }

        // Step 4 — save token to Firestore
        const savePath = `artifacts/${appId}/public/data/${collectionName}/${userId}`;
        console.log('FCM: Saving token to', savePath);

        // Save to the role-specific collection (cadets or staff)
        await setDoc(doc(colRef(collectionName), userId), { fcmTokens: arrayUnion(token) }, { merge: true });
        // Also save to users collection as a fallback for broadcasts
        await setDoc(doc(colRef('users'), userId), { fcmTokens: arrayUnion(token) }, { merge: true });

        console.log('FCM: ✅ Token saved successfully for', userId, 'in', collectionName, '+ users');
        return token;
    } catch (error) {
        console.error('FCM: Error during token registration:', error);
        return null;
    }
};

/**
 * Subscribe to foreground messages (app is open/focused).
 * Returns an unsubscribe function — call it on component unmount.
 *
 * @param {function} callback - Called with the FCM payload for each message.
 * @returns {function} Unsubscribe function.
 */
export const onForegroundMessage = (callback) => {
    if (!messaging) return () => {};
    return onMessage(messaging, callback);
};

/**
 * @deprecated Use onForegroundMessage(callback) instead.
 * One-shot Promise — fires for the FIRST foreground message only.
 */
export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;
        const unsub = onMessage(messaging, (payload) => {
            unsub();
            resolve(payload);
        });
    });
