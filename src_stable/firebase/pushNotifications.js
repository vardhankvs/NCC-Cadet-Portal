// src_stable/firebase/pushNotifications.js
// Shared utility: call sendPushToAll(title, body) from any feature after a successful save.
// It fetches all FCM tokens and fires a push notification — silently fails so it never blocks the main action.

import { getDocs } from 'firebase/firestore';
import { getCollectionRef } from './firestoreService.js';

const VERCEL_ORIGIN = 'https://ncc-portal-redesign.vercel.app';

/**
 * Sends a push notification to ALL cadets and staff who have registered FCM tokens.
 * Fire-and-forget — errors are swallowed so they never break the calling action.
 *
 * @param {string} title  - Notification title shown on the lock screen
 * @param {string} body   - Notification body text
 */
export const sendPushToAll = async (title, body) => {
    try {
        // Gather tokens from cadets
        const cadetsSnap = await getDocs(getCollectionRef('cadets'));
        const tokens = [];
        cadetsSnap.forEach((d) => {
            const t = d.data().fcmTokens;
            if (Array.isArray(t)) tokens.push(...t);
        });

        // Gather tokens from staff / officers
        const staffSnap = await getDocs(getCollectionRef('staff'));
        staffSnap.forEach((d) => {
            const t = d.data().fcmTokens;
            if (Array.isArray(t)) tokens.push(...t);
        });

        const uniqueTokens = [...new Set(tokens.filter(Boolean))];
        if (uniqueTokens.length === 0) return; // Nobody has registered yet

        await fetch(`${VERCEL_ORIGIN}/api/sendBroadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject: title, message: body, tokens: uniqueTokens }),
        });
    } catch (e) {
        // Silent fail — push notification errors should never interrupt the main save flow
        console.warn('Push notification failed (non-critical):', e.message);
    }
};
