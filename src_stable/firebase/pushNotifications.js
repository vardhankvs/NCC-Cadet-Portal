// src_stable/firebase/pushNotifications.js
// Shared utility: call sendPushToAll(title, body) from any feature after a successful save.
// Reads FCM tokens from ALL docs in cadets, staff AND users, then fires a push via /api/sendBroadcast.
// Silent fail — never blocks the main save flow.

import { getDocs, query, where } from 'firebase/firestore';
import { db, appId } from './config.js';
import { collection } from 'firebase/firestore';

const VERCEL_ORIGIN = 'https://ncc-portal-redesign.vercel.app';

// Internal: build a collection ref directly (same as getCollectionRef in firestoreService.js)
// Duplicated here to avoid a circular import with firestoreService.js
const colRef = (name) => {
    if (!db || !appId) return null;
    return collection(db, 'artifacts', appId, 'public', 'data', name);
};

/**
 * Collects all unique FCM tokens from the cadets, staff, and users collections.
 * Filters out blank / null tokens.
 */
const collectAllTokens = async () => {
    const tokens = [];

    const SOURCES = ['cadets', 'staff', 'users'];
    for (const src of SOURCES) {
        try {
            const ref = colRef(src);
            if (!ref) continue;
            const snap = await getDocs(ref);
            snap.forEach((d) => {
                const t = d.data().fcmTokens;
                if (Array.isArray(t)) {
                    t.forEach(tok => { if (tok) tokens.push(tok); });
                } else if (typeof t === 'string' && t) {
                    tokens.push(t);
                }
            });
            console.log(`FCM: [${src}] → ${snap.size} docs scanned`);
        } catch (e) {
            console.warn(`FCM: ${src} fetch skipped —`, e.message);
        }
    }

    const unique = [...new Set(tokens)];
    console.log(`FCM: Total unique tokens collected: ${unique.length}`);
    return unique;
};

/**
 * Sends a push notification to ALL registered devices.
 *
 * @param {string} title  - Notification title shown on lock screen
 * @param {string} body   - Notification body text
 */
export const sendPushToAll = async (title, body) => {
    try {
        const uniqueTokens = await collectAllTokens();

        if (uniqueTokens.length === 0) {
            console.warn(
                'FCM: No tokens found — users may not have granted notification permission yet.\n' +
                `Collection path: artifacts/${appId}/public/data/{cadets|staff|users}`
            );
            return;
        }

        console.log(`FCM: Sending "${title}" to ${uniqueTokens.length} device(s)`);

        const resp = await fetch(`${VERCEL_ORIGIN}/api/sendBroadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: title, message: body, tokens: uniqueTokens }),
        });

        if (!resp.ok) {
            const err = await resp.text();
            console.warn('FCM API error:', resp.status, err);
        } else {
            const result = await resp.json();
            console.log(`FCM: ✅ ${result.successCount} delivered, ❌ ${result.failureCount} failed of ${uniqueTokens.length} total`);
        }
    } catch (e) {
        // Silent fail — push notification errors must never interrupt the main save
        console.warn('Push notification failed (non-critical):', e.message);
    }
};
