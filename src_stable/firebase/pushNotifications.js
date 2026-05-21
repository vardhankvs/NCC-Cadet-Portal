// src_stable/firebase/pushNotifications.js
// Shared utility: call sendPushToAll(title, body) from any feature after a successful save.
// Fetches all FCM tokens from cadets, staff AND users collections, then fires a push.
// Silent fail — never blocks the main save flow.

import { getDocs } from 'firebase/firestore';
import { getCollectionRef } from './firestoreService.js';

const VERCEL_ORIGIN = 'https://ncc-portal-redesign.vercel.app';

/**
 * Sends a push notification to ALL registered devices.
 * Checks cadets, staff, AND users collections for fcmTokens.
 *
 * @param {string} title  - Notification title shown on lock screen
 * @param {string} body   - Notification body text
 */
export const sendPushToAll = async (title, body) => {
    try {
        const tokens = [];

        // 1. Gather from cadets collection
        try {
            const cadetsSnap = await getDocs(getCollectionRef('cadets'));
            cadetsSnap.forEach((d) => {
                const t = d.data().fcmTokens;
                if (Array.isArray(t)) tokens.push(...t);
                else if (typeof t === 'string' && t) tokens.push(t);
            });
        } catch (e) { console.warn('FCM: cadets fetch skipped', e.message); }

        // 2. Gather from staff collection  
        try {
            const staffSnap = await getDocs(getCollectionRef('staff'));
            staffSnap.forEach((d) => {
                const t = d.data().fcmTokens;
                if (Array.isArray(t)) tokens.push(...t);
                else if (typeof t === 'string' && t) tokens.push(t);
            });
        } catch (e) { console.warn('FCM: staff fetch skipped', e.message); }

        // 3. Gather from users collection (primary store used by messagingService.js)
        try {
            const usersSnap = await getDocs(getCollectionRef('users'));
            usersSnap.forEach((d) => {
                const t = d.data().fcmTokens;
                if (Array.isArray(t)) tokens.push(...t);
                else if (typeof t === 'string' && t) tokens.push(t);
            });
        } catch (e) { console.warn('FCM: users fetch skipped', e.message); }

        const uniqueTokens = [...new Set(tokens.filter(Boolean))];
        
        if (uniqueTokens.length === 0) {
            console.warn('FCM: No tokens found — cadets may not have enabled notifications yet');
            return;
        }

        console.log(`FCM: Sending push to ${uniqueTokens.length} device(s): "${title}"`);

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
            console.log(`FCM: Sent successfully — ${result.successCount} delivered, ${result.failureCount} failed`);
        }
    } catch (e) {
        // Silent fail — push notification errors must never interrupt the main save
        console.warn('Push notification failed (non-critical):', e.message);
    }
};
