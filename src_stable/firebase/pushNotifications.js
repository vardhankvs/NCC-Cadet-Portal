// src_stable/firebase/pushNotifications.js
// Shared utility for push notifications.
// sendPushToAll(title, body)   — broadcasts to ALL registered devices
// sendPushToUser(enrollmentId, title, body) — sends to ONE specific cadet/user only

import { getDocs, query, where, collection, addDoc } from 'firebase/firestore';
import { db, appId, auth } from './config.js';

const getCollectionRef = (collectionName) => {
    if (!db || !appId) return null;
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
};

export const VERCEL_ORIGIN = 'https://ncc-portal-redesign.vercel.app';

export const getApiEndpoint = () => {
    if (typeof window !== 'undefined' && window.location && window.location.hostname === 'ncc-portal-redesign.vercel.app') {
        return '/api/sendBroadcast';
    }
    // Static frontend hosts (Firebase Hosting: gmrit-ncc-fb1df.web.app, localhost, etc.)
    // MUST proxy to Vercel backend serverless function
    return `${VERCEL_ORIGIN}/api/sendBroadcast`;
};

const safeJsonParse = async (resp) => {
    const text = await resp.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.warn('FCM API returned non-JSON response:', text.substring(0, 120));
        return null;
    }
};

/** Internal: calls the FCM API with the given tokens */
const _dispatch = async (tokens, title, body, targetTab = null) => {
    const uniqueTokens = [...new Set(tokens.filter(Boolean))];
    if (uniqueTokens.length === 0) {
        console.log('FCM: Push skipped — 0 registered device tokens for target recipient(s)');
        return;
    }
    console.log(`FCM: Sending push to ${uniqueTokens.length} device(s): "${title}"`);
    try {
        const payload = { subject: title, message: body, tokens: uniqueTokens };
        if (targetTab) payload.targetTab = targetTab;
        const resp = await fetch(getApiEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });
        if (!resp.ok) {
            const err = await resp.text();
            console.warn('FCM API error:', resp.status, err);
        } else {
            const result = await safeJsonParse(resp);
            if (result) {
                console.log(`FCM: ${result.successCount} delivered, ${result.failureCount} failed`);
            }
        }
    } catch (e) {
        console.warn('FCM dispatch failed:', e.message);
    }
};

/**
 * Sends a push notification to ALL registered devices.
 * Checks all logged-in/registered cadets, collects active tokens,
 * sends Web Push, and logs to notifications collection for real-time OS alert on active screens.
 */
export const sendPushToAll = async (title, body, targetTab = null, options = {}) => {
    try {
        const tokens = [];
        const loggedInCadets = [];

        // Check users collection (primary store of all registered/logged-in accounts)
        try {
            const snap = await getDocs(getCollectionRef('users'));
            snap.forEach((d) => {
                const u = d.data();
                if (u.role === 'cadet') {
                    loggedInCadets.push({
                        uid: d.id,
                        email: u.email,
                        enrollmentId: (u.enrollmentId || '').trim().toUpperCase(),
                        name: u.name || ''
                    });
                }
                const t = u.fcmTokens;
                if (Array.isArray(t)) tokens.push(...t);
                else if (typeof t === 'string' && t) tokens.push(t);
            });
        } catch (e) { console.warn('FCM: users fetch skipped', e.message); }

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

        const uniqueTokens = [...new Set(tokens.filter(Boolean))];
        console.log(`OS Notification: Checked ${loggedInCadets.length} logged cadets across unit:`, loggedInCadets.map(c => c.name || c.email || c.enrollmentId));
        console.log(`FCM: Pushing to ${uniqueTokens.length} active device token(s) for "${title}"`);

        // Send FCM Web Push
        await _dispatch(uniqueTokens, title, body, targetTab);

        // Also write to notifications collection so logged-in cadets receive immediate in-app chime & OS alert
        if (options.writeToDb !== false) {
            try {
                const notifCol = getCollectionRef('notifications');
                if (notifCol) {
                    await addDoc(notifCol, {
                        subject: title,
                        title: title,
                        message: body,
                        content: body,
                        body: body,
                        channel: 'app',
                        target: options.target || 'All',
                        targetTab: targetTab || 'notifications',
                        category: options.category || 'General',
                        sender: options.sender || 'Unit Command',
                        senderUid: auth?.currentUser?.uid || null,
                        timestamp: new Date().toISOString(),
                        institutionId: options.institutionId || 'gmrit',
                        targetEnrollmentIds: loggedInCadets.map(c => c.enrollmentId).filter(Boolean),
                        targetUids: loggedInCadets.map(c => c.uid).filter(Boolean)
                    });
                    console.log(`OS Notification: Logged to notifications collection for real-time chime: "${title}"`);
                }
            } catch (dbErr) {
                console.warn('Could not write notification to db:', dbErr.message);
            }
        }
    } catch (e) {
        console.warn('sendPushToAll failed (non-critical):', e.message);
    }
};

/**
 * Sends a push notification to ONE specific cadet identified by their enrollmentId.
 * Checks cadet/user tokens, dispatches FCM, and writes targeted record for live in-app OS alert.
 *
 * @param {string} enrollmentId  - The cadet's enrollment ID (e.g. "14BNSD001")
 * @param {string} title         - Notification title
 * @param {string} body          - Notification body
 * @param {string} targetTab     - Optional tab to open when notification is clicked
 */
export const sendPushToUser = async (enrollmentId, title, body, targetTab = null, options = {}) => {
    if (!enrollmentId) return;
    const targetKey = String(enrollmentId).trim().toUpperCase();
    try {
        const tokens = [];

        // 1. Look up in cadets collection by enrollmentId, doc ID, or uid
        try {
            const snap = await getDocs(getCollectionRef('cadets'));
            snap.forEach((d) => {
                const data = d.data();
                const eId = String(data.enrollmentId || data.regimentalNumber || '').trim().toUpperCase();
                const docId = String(d.id || '').trim().toUpperCase();
                const uId = String(data.uid || data.userId || '').trim().toUpperCase();

                if (eId === targetKey || docId === targetKey || uId === targetKey) {
                    const t = data.fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: cadet lookup skipped', e.message); }

        // 2. Look up in staff collection by staffId, doc ID, or uid
        try {
            const snap = await getDocs(getCollectionRef('staff'));
            snap.forEach((d) => {
                const data = d.data();
                const sId = String(data.staffId || data.enrollmentId || '').trim().toUpperCase();
                const docId = String(d.id || '').trim().toUpperCase();
                const uId = String(data.uid || data.userId || '').trim().toUpperCase();

                if (sId === targetKey || docId === targetKey || uId === targetKey) {
                    const t = data.fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: staff lookup skipped', e.message); }

        // 3. Look up in users collection
        try {
            const snap = await getDocs(getCollectionRef('users'));
            snap.forEach((d) => {
                const data = d.data();
                const eId = String(data.enrollmentId || data.staffId || '').trim().toUpperCase();
                const docId = String(d.id || '').trim().toUpperCase();
                const uId = String(data.uid || data.userId || '').trim().toUpperCase();

                if (eId === targetKey || docId === targetKey || uId === targetKey) {
                    const t = data.fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: users fetch skipped for single user', e.message); }

        const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
        console.log(`FCM: Targeted push to cadet "${enrollmentId}" (${uniqueTokens.length} device tokens) for "${title}"`);
        await _dispatch(uniqueTokens, title, body, targetTab);

        // Also write targeted notification to db for immediate in-app chime & OS alert
        if (options.writeToDb !== false) {
            try {
                const notifCol = getCollectionRef('notifications');
                if (notifCol) {
                    await addDoc(notifCol, {
                        subject: title,
                        title: title,
                        message: body,
                        content: body,
                        body: body,
                        channel: 'app',
                        enrollmentId: enrollmentId,
                        targetTab: targetTab || 'notifications',
                        category: options.category || 'Personal',
                        sender: options.sender || 'Unit Command',
                        senderUid: auth?.currentUser?.uid || null,
                        timestamp: new Date().toISOString(),
                        institutionId: options.institutionId || 'gmrit'
                    });
                }
            } catch (dbErr) {
                console.warn('Could not write targeted notification to db:', dbErr.message);
            }
        }
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
    const cleanIds = cadetIds.filter(Boolean).map(id => String(id).toLowerCase().trim());
    if (cleanIds.length === 0) return;
    
    try {
        const tokens = [];

        // 1. Look up in cadets collection
        try {
            const snap = await getDocs(getCollectionRef('cadets'));
            snap.forEach((d) => {
                const data = d.data();
                const docId = String(d.id || '').toLowerCase().trim();
                const enrollId = String(data.enrollmentId || '').toLowerCase().trim();
                const uid = String(data.uid || data.userId || '').toLowerCase().trim();

                const isMatch = cleanIds.includes(docId) || 
                                (enrollId && cleanIds.includes(enrollId)) || 
                                (uid && cleanIds.includes(uid));

                if (isMatch) {
                    const t = data.fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: cadet lookup skipped', e.message); }

        // 2. Also look up in users collection for cadet role tokens
        try {
            const snap = await getDocs(getCollectionRef('users'));
            snap.forEach((d) => {
                const data = d.data();
                const docId = String(d.id || '').toLowerCase().trim();
                const enrollId = String(data.enrollmentId || '').toLowerCase().trim();

                const isMatch = cleanIds.includes(docId) || 
                                (enrollId && cleanIds.includes(enrollId));

                if (isMatch) {
                    const t = data.fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: user cadet lookup skipped', e.message); }

        const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
        await _dispatch(uniqueTokens, title, body, targetTab);

        // Also write targeted notification to db for immediate in-app chime & OS alert
        try {
            const notifCol = getCollectionRef('notifications');
            if (notifCol) {
                await addDoc(notifCol, {
                    subject: title,
                    title: title,
                    message: body,
                    content: body,
                    body: body,
                    channel: 'app',
                    targetCadetIds: cleanIds,
                    targetEnrollmentIds: cleanIds,
                    targetTab: targetTab || 'attendance',
                    category: 'Attendance',
                    sender: 'Unit Command',
                    senderUid: auth?.currentUser?.uid || null,
                    timestamp: new Date().toISOString(),
                    institutionId: 'gmrit'
                });
            }
        } catch (dbErr) {
            console.warn('Could not write cadet targeted notification to db:', dbErr.message);
        }
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

/**
 * Sends an attendance-verification push notification to specific cadets.
 * Carries pendingDocId + adminLocation as FCM data fields so the service
 * worker can build the deep-link and show the "✅ Mark Attendance" action button.
 *
 * @param {Array<string>} cadetIds   - Array of cadet Firestore document IDs
 * @param {string} pendingDocId      - Firestore doc ID of the pending_attendance record
 * @param {{ latitude: number, longitude: number }} adminLocation - Admin GPS coords
 */
export const sendAttendancePush = async (cadetIds, pendingDocId, adminLocation) => {
    if (!cadetIds || !Array.isArray(cadetIds) || cadetIds.length === 0) return;
    try {
        const tokens = [];

        // Collect FCM tokens for targeted cadets
        try {
            const snap = await getDocs(getCollectionRef('cadets'));
            snap.forEach((d) => {
                if (cadetIds.includes(d.id)) {
                    const t = d.data().fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: cadet token lookup skipped', e.message); }

        const uniqueTokens = [...new Set(tokens.filter(Boolean))];
        if (uniqueTokens.length === 0) {
            console.warn('FCM Attendance: No tokens found for cadet(s)');
            return;
        }

        const payload = {
            subject: '📍 Attendance Verification Required',
            message: 'Your ANO has scanned your QR code. Tap "On Location" to verify your location.',
            tokens: uniqueTokens,
            notificationType: 'attendance',
            pendingDocId: pendingDocId || '',
            adminLat: String(adminLocation?.latitude  ?? ''),
            adminLng: String(adminLocation?.longitude ?? ''),
        };

        console.log(`FCM Attendance: Sending to ${uniqueTokens.length} device(s), pendingDocId=${pendingDocId}`);

        const resp = await fetch(getApiEndpoint(), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!resp.ok) {
            const err = await resp.text();
            console.warn('FCM Attendance API error:', resp.status, err);
        } else {
            const result = await safeJsonParse(resp);
            if (result) {
                console.log(`FCM Attendance: ${result.successCount} delivered, ${result.failureCount} failed`);
            }
        }
    } catch (e) {
        console.warn('sendAttendancePush failed (non-critical):', e.message);
    }
};

/**
 * Sends a push notification reminder for an upcoming training event to ALL cadets.
 * Use when admin clicks "Send Reminder" on the Training Calendar.
 *
 * @param {string} eventName     - Name of the drill/event
 * @param {string} eventTime     - Time string e.g. "06:00"
 * @param {string} eventLocation - Location string
 * @param {string} eventDate     - Date string e.g. "2026-06-01"
 * @param {string} targetTab     - Optional tab to navigate to in the PWA
 */
export const sendEventReminderPush = async (eventName, eventTime, eventLocation, eventDate, targetTab = 'training') => {
    try {
        const title = `⏰ Reminder: ${eventName}`;
        const body  = `Reports at ${eventTime} · ${eventLocation} · ${new Date(eventDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
        await sendPushToAll(title, body, targetTab);
        console.log(`FCM Event Reminder: Sent for "${eventName}"`);
    } catch (e) {
        console.warn('sendEventReminderPush failed (non-critical):', e.message);
    }
};

/**
 * Sends a push notification to all admins/staff (ANOs) associated with a specific college subunit.
 */
export const sendPushToCollegeANO = async (subdomain, title, body, targetTab = 'announcements') => {
    if (!subdomain) return;
    try {
        const tokens = [];

        // Check users collection
        try {
            const snap = await getDocs(getCollectionRef('users'));
            snap.forEach((d) => {
                const data = d.data();
                if (data.role === 'admin' && data.institutionId === subdomain) {
                    const t = data.fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: ANO users fetch skipped', e.message); }

        // Check staff collection
        try {
            const snap = await getDocs(getCollectionRef('staff'));
            snap.forEach((d) => {
                const data = d.data();
                if ((!data.role || data.role === 'admin') && data.institutionId === subdomain) {
                    const t = data.fcmTokens;
                    if (Array.isArray(t)) tokens.push(...t);
                    else if (typeof t === 'string' && t) tokens.push(t);
                }
            });
        } catch (e) { console.warn('FCM: ANO staff fetch skipped', e.message); }

        await _dispatch(tokens, title, body, targetTab);
    } catch (e) {
        console.warn('sendPushToCollegeANO failed:', e.message);
    }
};

