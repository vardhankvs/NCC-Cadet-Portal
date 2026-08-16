import admin from 'firebase-admin';

// Initialize Firebase Admin lazily to avoid cold start issues on Vercel
function getFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.error('Firebase Admin Init Error:', error);
            throw new Error('Failed to initialize Firebase Admin. Is FIREBASE_SERVICE_ACCOUNT set?');
        }
    }
    return admin;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { subject, message, tokens, targetTab, notificationType, pendingDocId, adminLat, adminLng } = req.body;

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({ error: 'No FCM tokens provided.' });
        }

        const isAttendance = notificationType === 'attendance';

        // Intercept old cached PWA clients sending the hardcoded fee message to EVERYONE
        if (message && message.includes('verified and approved')) {
            console.log('Blocked legacy fee broadcast from cached client');
            return res.status(200).json({ success: true, blocked: true, message: 'Legacy broadcast blocked' });
        }

        // Deduplicate tokens
        const uniqueTokens = [...new Set(tokens.filter(Boolean))];

        const firebaseAdmin = getFirebaseAdmin();

        const reqOrigin = req.headers.origin || (req.headers.host ? `https://${req.headers.host}` : 'https://ncc-portal-redesign.vercel.app');

        const rawContent = (subject || '') + (message || '');
        const contentHash = rawContent.replace(/[^a-zA-Z0-9]/g, '').substring(0, 16) || Date.now().toString();
        const broadcastTag = `ncc-${contentHash}`;

        // ─────────────────────────────────────────────────────────────────────
        // ATTENDANCE — Data-only message (no `notification` field at any level)
        // ─────────────────────────────────────────────────────────────────────
        // WHY data-only?
        //   When a FCM message has a `notification` field, the Firebase SDK in
        //   the service worker (firebase-messaging-compat.js) auto-displays the
        //   notification WITHOUT action buttons AND suppresses our custom handler
        //   on Android Chrome. By omitting `notification` entirely, FCM delivers
        //   a raw data push — the SDK calls our onBackgroundMessage handler which
        //   then shows the notification WITH action buttons via showNotification().
        //   This is the ONLY reliable cross-platform way to get action buttons on
        //   Android Chrome PWA.
        // ─────────────────────────────────────────────────────────────────────
        if (isAttendance) {
            const attendanceDeepLink = `${reqOrigin}/?tab=attendance&autoVerify=${pendingDocId || ''}&adminLat=${adminLat || ''}&adminLng=${adminLng || ''}`;

            const attendanceMessage = {
                tokens: uniqueTokens,

                // ALL content goes into `data` — service worker reads these to
                // build and display the notification with action buttons.
                data: {
                    notificationType: 'attendance',
                    pendingDocId:     pendingDocId || '',
                    adminLat:         adminLat     || '',
                    adminLng:         adminLng     || '',
                    title:            subject  || '📍 Attendance Verification Required',
                    body:             message  || 'Your ANO has scanned your QR code. Tap to verify your location.',
                    tag:              `attendance-${pendingDocId || Date.now()}`,
                },

                // No top-level `notification` field — prevents SDK auto-display.

                android: {
                    priority: 'high',
                    // No android.notification block — service worker handles display.
                },

                webpush: {
                    headers: { Urgency: 'high' },
                    // No webpush.notification block — service worker handles display
                    // with showNotification() including actions: [].
                    fcmOptions: {
                        // Fallback deep-link if service worker click handler fails
                        link: attendanceDeepLink,
                    },
                },

                apns: {
                    headers: { 'apns-priority': '10' },
                    payload: {
                        aps: {
                            // iOS doesn't support Web Push actions; show a plain alert.
                            alert: {
                                title: subject || '📍 Attendance Verification Required',
                                body:  message || 'Your ANO has scanned your QR code. Open the app to verify.',
                            },
                            sound: 'default',
                            badge: 1,
                            'content-available': 1,
                        },
                    },
                },
            };

            const response = await firebaseAdmin.messaging().sendEachForMulticast(attendanceMessage);

            if (response.failureCount > 0) {
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        console.warn(`FCM Attendance failed token[${idx}]:`, resp.error?.message);
                    }
                });
            }

            console.log(`FCM Attendance (data-only): ${response.successCount} delivered, ${response.failureCount} failed`);
            return res.status(200).json({
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
                total: uniqueTokens.length,
            });
        }

        // ─────────────────────────────────────────────────────────────────────
        // STANDARD BROADCAST — `notification` field present, SDK auto-displays.
        // ─────────────────────────────────────────────────────────────────────
        const multicastMessage = {
            tokens: uniqueTokens,
            data: {
                targetTab: targetTab || 'notifications',
                title: subject || 'NCC Portal Update',
                body: message || 'You have a new update in the NCC Portal',
            },

            // OS-level notification — shown on lock screen, notification bar
            notification: {
                title: subject || 'NCC Portal Update',
                body:  message || 'You have a new update in the NCC Portal',
            },

            android: {
                priority: 'high',
                collapseKey: broadcastTag,
                notification: {
                    title: subject || 'NCC Portal Update',
                    body:  message || 'You have a new update in the NCC Portal',
                    color: '#1a2a4a',
                    sound: 'default',
                    channel_id: 'ncc_portal_custom_sound',
                    notification_priority: 'PRIORITY_HIGH',
                    visibility: 'PUBLIC',
                    tag: broadcastTag,
                }
            },

            webpush: {
                headers: { Urgency: 'high' },
                notification: {
                    title: subject || 'NCC Portal Update',
                    body:  message || 'You have a new update in the NCC Portal',
                    icon:  `${reqOrigin}/pwa-192x192.png`,
                    badge: `${reqOrigin}/pwa-192x192.png`,
                    sound: `${reqOrigin}/sounds/ncc_notification.mp3`,
                    vibrate: [250, 100, 250, 100, 400],
                    requireInteraction: false,
                    tag: broadcastTag,
                },
                fcmOptions: {
                    link: targetTab
                        ? `${reqOrigin}/?tab=${targetTab}`
                        : `${reqOrigin}/?tab=notifications`,
                }
            },

            apns: {
                headers: { 'apns-priority': '10' },
                payload: {
                    aps: {
                        alert: {
                            title: subject || 'NCC Portal Update',
                            body:  message || 'You have a new update in the NCC Portal',
                        },
                        sound: 'default',
                        badge: 1,
                        'content-available': 1,
                    },
                },
            },
        };

        const response = await firebaseAdmin.messaging().sendEachForMulticast(multicastMessage);

        if (response.failureCount > 0) {
            const failedTokens = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push({ token: uniqueTokens[idx], error: resp.error?.message });
                }
            });
            console.warn('Failed tokens:', JSON.stringify(failedTokens));
        }

        console.log(`FCM Broadcast: ${response.successCount} delivered, ${response.failureCount} failed out of ${uniqueTokens.length} tokens`);

        return res.status(200).json({
            success: true,
            successCount: response.successCount,
            failureCount: response.failureCount,
            total: uniqueTokens.length
        });

    } catch (error) {
        console.error('Broadcast Error:', error);
        return res.status(500).json({ error: 'Failed to send broadcast.', details: error.message });
    }
}
