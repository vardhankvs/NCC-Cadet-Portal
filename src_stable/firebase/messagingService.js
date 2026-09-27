import { getToken, onMessage } from 'firebase/messaging';
import { auth, messaging, db, appId } from './config';
import { doc, setDoc, arrayUnion, collection, getDocs, query, where } from 'firebase/firestore';

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
        try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            if (reg?.active && reg.active.state === 'activated') {
                console.log('FCM: Service worker is active & activated —', reg.scope);
                return true;
            }
        } catch (e) {
            // Ignore temporary SW state transition errors
        }
        await new Promise(r => setTimeout(r, 500));
    }
    console.warn('FCM: Service worker active check timed out, falling back to navigator.serviceWorker.ready');
    return true;
};

/**
 * Request notification permission and register this device's FCM token.
 * Saves to:
 * 1. users/{authUid} (guaranteed to succeed under Firestore security rules)
 * 2. cadets/{cadetDocId} (if cadet) and links uid
 * 3. staff/{staffDocId} (if staff/admin)
 *
 * @param {string|object} userOrOptions - Auth UID, profile ID, or options object:
 *   { authUid, profileId, collectionName, enrollmentId, userRole, interactive }
 * @param {string} [maybeCollection='cadets'] - Fallback collection if first arg is string ID
 * @returns {string|null} The FCM token on success, or null on failure.
 */
export const requestNotificationPermission = async (userOrOptions, maybeCollection = 'cadets') => {
    try {
        if (!messaging || typeof window === 'undefined' || !('Notification' in window)) {
            return null;
        }

        let authUid = null;
        let profileId = null;
        let collectionName = maybeCollection;
        let enrollmentId = null;
        let userRole = null;
        let interactive = false;

        if (typeof userOrOptions === 'object' && userOrOptions !== null) {
            authUid = userOrOptions.authUid || auth?.currentUser?.uid || null;
            profileId = userOrOptions.profileId || null;
            collectionName = userOrOptions.collectionName || maybeCollection || 'cadets';
            enrollmentId = userOrOptions.enrollmentId || null;
            userRole = userOrOptions.userRole || null;
            interactive = Boolean(userOrOptions.interactive);
        } else if (typeof userOrOptions === 'string') {
            authUid = auth?.currentUser?.uid || userOrOptions;
            profileId = userOrOptions;
            collectionName = maybeCollection || 'cadets';
        }

        if (!authUid && auth?.currentUser?.uid) {
            authUid = auth.currentUser.uid;
        }

        // If permission was already denied by the user in browser settings
        if (Notification.permission === 'denied') {
            console.log('FCM: Notification permission is denied in browser.');
            return null;
        }

        // Step 1 — request permission
        if (Notification.permission !== 'granted') {
            if (!interactive) {
                // Unsolicited calls without user gesture are blocked on mobile; skip until user clicks
                console.log('FCM: Notification permission is default; awaiting user interaction.');
                return null;
            }
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                return null;
            }
        }

        // Step 2 — wait for service worker to be ready
        await waitForSW(6000);

        let swReg = await navigator.serviceWorker.getRegistration('/');
        if (!swReg || !swReg.active) {
            swReg = await navigator.serviceWorker.ready;
        }

        // Step 3 — get FCM token safely
        let token = null;
        try {
            token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: swReg
            });
        } catch (swErr) {
            console.warn('FCM: First getToken attempt had SW state change, retrying with navigator.serviceWorker.ready...', swErr.message);
            const readyReg = await navigator.serviceWorker.ready;
            token = await getToken(messaging, {
                vapidKey: VAPID_KEY,
                serviceWorkerRegistration: readyReg
            });
        }

        console.log('FCM: Token retrieved:', token ? token.substring(0, 20) + '…' : 'EMPTY');

        if (!token) {
            console.warn('FCM: getToken returned empty.');
            return null;
        }

        const nowIso = new Date().toISOString();

        // Step 4A — Save token to users/{authUid}
        // This is 100% compliant with Firestore rules (request.auth.uid == authUid)
        if (authUid) {
            try {
                await setDoc(doc(colRef('users'), authUid), {
                    fcmTokens: arrayUnion(token),
                    fcmTokenUpdatedAt: nowIso
                }, { merge: true });
                console.log(`FCM: ✅ Saved token to users/${authUid}`);
            } catch (err) {
                console.warn('FCM: Note writing to users collection:', err.message);
            }
        }

        // Step 4B — Save token to cadets collection
        const isCadet = userRole === 'cadet' || collectionName === 'cadets';
        if (isCadet) {
            // If we know the cadet profile doc ID
            if (profileId && profileId !== authUid) {
                try {
                    await setDoc(doc(colRef('cadets'), profileId), {
                        fcmTokens: arrayUnion(token),
                        uid: authUid || null,
                        fcmTokenUpdatedAt: nowIso
                    }, { merge: true });
                    console.log(`FCM: ✅ Saved token to cadets/${profileId}`);
                } catch (err) {
                    console.warn(`FCM: Note writing to cadets/${profileId}:`, err.message);
                }
            }
            
            // If enrollmentId is provided, also update matching cadet doc(s)
            if (enrollmentId) {
                try {
                    const normEnroll = enrollmentId.trim().toUpperCase();
                    const q1 = query(colRef('cadets'), where('enrollmentId', '==', normEnroll));
                    const snap1 = await getDocs(q1);
                    for (const d of snap1.docs) {
                        await setDoc(doc(colRef('cadets'), d.id), {
                            fcmTokens: arrayUnion(token),
                            uid: authUid || null,
                            fcmTokenUpdatedAt: nowIso
                        }, { merge: true });
                        console.log(`FCM: ✅ Linked token to cadet doc ${d.id} via enrollmentId (${normEnroll})`);
                    }
                    if (snap1.empty) {
                        const q2 = query(colRef('cadets'), where('regimentalNumber', '==', normEnroll));
                        const snap2 = await getDocs(q2);
                        for (const d of snap2.docs) {
                            await setDoc(doc(colRef('cadets'), d.id), {
                                fcmTokens: arrayUnion(token),
                                uid: authUid || null,
                                fcmTokenUpdatedAt: nowIso
                            }, { merge: true });
                            console.log(`FCM: ✅ Linked token to cadet doc ${d.id} via regimentalNumber (${normEnroll})`);
                        }
                    }
                } catch (err) {
                    console.warn('FCM: Note linking token to cadets by enrollment:', err.message);
                }
            }
        }

        // Step 4C — Save token to staff collection
        const isStaff = userRole === 'admin' || userRole === 'officer' || collectionName === 'staff';
        if (isStaff && profileId) {
            try {
                await setDoc(doc(colRef('staff'), profileId), {
                    fcmTokens: arrayUnion(token),
                    fcmTokenUpdatedAt: nowIso
                }, { merge: true });
                console.log(`FCM: ✅ Saved token to staff/${profileId}`);
            } catch (err) {
                console.warn(`FCM: Note writing to staff/${profileId}:`, err.message);
            }
        }

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
