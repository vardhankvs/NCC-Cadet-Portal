// src_stable/firebase/pushNotifications.js
// Shared utility for push notifications.
// sendPushToAll(title, body)   — broadcasts to ALL registered devices
// sendPushToUser(enrollmentId, title, body) — sends to ONE specific cadet/user only

import { getDocs, query, where, collection } from 'firebase/firestore';
import { db, appId } from './config.js';

const getCollectionRef = (collectionName) => {
    if (!db || !appId) return null;
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
};

const VERCEL_ORIGIN = 'https://ncc-portal-redesign.vercel.app';

/** Internal: calls the Vercel FCM API with the given tokens */
const _dispatch = async (tokens, title, body, targetTab = null) => {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    if (uniqueTokens.length === 0) {
        console.warn('FCM: No tokens found — device may not have notifications enabled');
        return;
    }
    console.log(`FCM: Sending push to ${uniqueTokens.length} device(s): "${title}"`);
    try {
        const payload = { subject: title, message: body, tokens: uniqueTokens };
        if (targetTab) payload.targetTab = targetTab;
        const resp = await fetch(`${VERCEL_ORIGIN}/api/sendBroadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!resp.ok) {
            const err = await resp.text();
            console.warn('FCM API error:', resp.status, err);
        } else {
            const result = await resp.json();
            console.log(`FCM: ${result.successCount} delivered, ${result.failureCount} failed`);
        }
    } catch (e) {
        console.warn('FCM dispatch failed:', e.message);
    }
};

/**
 * Sends a push notification to ALL registered devices.
 * Use for general broadcasts (new camp, new exam, social update, etc.)
 */
export const sendPushToAll = async (title, body, targetTab = null) => {
    try {
        const tokens = [];

        // Check cadets collection
        try {
            const snap = await getDocs(getCollectionRef('cadets'));
            snap.forEach((d) => {
                const t = d.data().fcmTokens;
                if (Array.isArray(t)) tokens.push(...t);
                else if (typeof t === 'string' && t) tokens.push(t);
            });
        } catch (e) { console.warn('FCM: cadets fetch skipped', e.message); }

        // Check staff collection
        try {
            const snap = await getDocs(getCollectionRef('staff'));
            snap.forEach((d) => {
                const t = d.data().fcmTokens;
                if (Array.isArray(t)) tokens.push(...t);
                else if (typeof t === 'string' && t) tokens.push(t);
            });
        } catch (e) { console.warn('FCM: staff fetch skipped', e.message); }

        // Check users collection (primary store used by messagingService.js)
        try {
            const snap = await getDocs(getCollectionRef('users'));
            snap.forEach((d) => {
                const t = d.data().fcmTokens;
                if (Array.isArray(t)) tokens.push(...t);
                else if (typeof t === 'string' && t) tokens.push(t);
            });
        } catch (e) { console.warn('FCM: users fetch skipped', e.message); }

        await _dispatch(tokens, title, body, targetTab);
    } catch (e) {
        console.warn('sendPushToAll failed (non-critical):', e.message);
    }
};

/**
 * Sends a push notification to ONE specific cadet identified by their enrollmentId.
 * Use for personal notifications: fee approval, leave status, rank update, etc.
 *
 * @param {string} enrollmentId  - The cadet's enrollment ID (e.g. "14BNSD001")
 * @param {string} title         - Notification title
 * @param {string} body          - Notification body
 * @param {string} targetTab     - Optional tab to open when notification is clicked
 */
export const sendPushToUser = async (enrollmentId, title, body, targetTab = null) => {
    if (!enrollmentId) return;
    try {
        const tokens = [];

        // Look up in cadets collection by enrollmentId
        try {
            const snap = await getDocs(getCollectionRef('cadets'));
            snap.forEach((d) => {
                if (d.data().enrollmentId === enrollmentId) {
                    const t = d.data().fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: cadet lookup skipped', e.message); }

        // Also look up in users collection (tokens saved here when they log in)
        try {
            const snap = await getDocs(getCollectionRef('users'));
            snap.forEach((d) => {
                if (d.data().enrollmentId === enrollmentId) {
                    const t = d.data().fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: users (officer) fetch skipped for single user', e.message); }

        await _dispatch(tokens, title, body, targetTab);
    } catch (e) {
        console.warn('sendPushToUser failed (non-critical):', e.message);
    }
};

/**
 * Sends a push notification to multiple cadets identified by their document IDs.
 * Use for bulk targeted notifications: attendance marking, etc.
 *
 * @param {Array<string>} cadetIds  - Array of cadet document IDs
 * @param {string} title            - Notification title
 * @param {string} body             - Notification body
 * @param {string} targetTab        - Optional tab to open when notification is clicked
 */
export const sendPushToCadets = async (cadetIds, title, body, targetTab = null) => {
    if (!cadetIds || !Array.isArray(cadetIds) || cadetIds.length === 0) return;
    try {
        const tokens = [];

        // Look up in cadets collection by document ID
        try {
            const snap = await getDocs(getCollectionRef('cadets'));
            snap.forEach((d) => {
                if (cadetIds.includes(d.id)) {
                    const t = d.data().fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: cadet lookup skipped', e.message); }

        await _dispatch(tokens, title, body, targetTab);
    } catch (e) {
        console.warn('sendPushToCadets failed (non-critical):', e.message);
    }
};

/**
 * Sends a push notification to all admins.
 * Use for alerting admins about cadet actions (e.g. blood requests, donations).
 *
 * @param {string} title         - Notification title
 * @param {string} body          - Notification body
 * @param {string} targetTab     - Optional tab to open when notification is clicked
 */
export const sendPushToAdmins = async (title, body, targetTab = null) => {
    try {
        const tokens = [];

        try {
            const snap = await getDocs(getCollectionRef('users'));
            snap.forEach((d) => {
                if (d.data().role === 'admin') {
                    const t = d.data().fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: admin user lookup skipped', e.message); }

        try {
            const snap = await getDocs(getCollectionRef('staff'));
            snap.forEach((d) => {
                // Default staff to admins if they have no role specified
                if (!d.data().role || d.data().role === 'admin') {
                    const t = d.data().fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: staff admin lookup skipped', e.message); }

        await _dispatch(tokens, title, body, targetTab);
    } catch (e) {
        console.warn('sendPushToAdmins failed (non-critical):', e.message);
    }
};
