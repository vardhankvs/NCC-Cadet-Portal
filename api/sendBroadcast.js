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
        const { subject, message, tokens } = req.body;

        if (!tokens || !Array.isArray(tokens) || tokens.length === 0) {
            return res.status(400).json({ error: 'No FCM tokens provided.' });
        }

        // Deduplicate tokens just in case
        const uniqueTokens = [...new Set(tokens.filter(Boolean))];

        const firebaseAdmin = getFirebaseAdmin();

        // ── Build the multicast message ──────────────────────────────────────
        // IMPORTANT: Both `notification` (for OS-level display) AND `android`/`apns`
        // configs are needed for notifications to appear on lock screen & notification bar.
        const multicastMessage = {
            tokens: uniqueTokens,

            // OS-level notification — shown on lock screen, notification bar, home screen
            notification: {
                title: subject || 'NCC Portal Update',
                body: message || 'You have a new update in the NCC Portal',
            },

            // Android-specific config — required for foreground/background display on Android
            android: {
                priority: 'high',                  // Wake up the device
                collapse_key: 'ncc-broadcast-update', // Collapses duplicate notifications
                notification: {
                    title: subject || 'NCC Portal Update',
                    body: message || 'You have a new update in the NCC Portal',
                    icon: 'ic_notification',        // Must match a drawable in Android app (for web PWA this is ignored, notification.icon in SW is used)
                    color: '#1a2a4a',               // NCC Navy
                    sound: 'default',
                    channel_id: 'ncc_portal',       // Required for Android 8+
                    click_action: 'FLUTTER_NOTIFICATION_CLICK',
                    notification_priority: 'PRIORITY_HIGH',
                    visibility: 'PUBLIC',           // Show on lock screen
                }
            },

            // Web push config — for Chrome on desktop/mobile PWA
            webpush: {
                headers: {
                    Urgency: 'high',
                },
                notification: {
                    title: subject || 'NCC Portal Update',
                    body: message || 'You have a new update in the NCC Portal',
                    icon: 'https://ncc-portal-redesign.vercel.app/pwa-192x192.png',
                    badge: 'https://ncc-portal-redesign.vercel.app/pwa-192x192.png',
                    vibrate: [200, 100, 200],
                    requireInteraction: false,
                    tag: 'ncc-broadcast-update', // Collapses duplicate notifications
                },
                fcmOptions: {
                    link: 'https://ncc-portal-redesign.vercel.app',
                }
            },

            // APNs config for iOS
            apns: {
                headers: {
                    'apns-priority': '10',
                },
                payload: {
                    aps: {
                        alert: {
                            title: subject || 'NCC Portal Update',
                            body: message || 'You have a new update in the NCC Portal',
                        },
                        sound: 'default',
                        badge: 1,
                        'content-available': 1,
                    },
                },
            },
        };

        // sendEachForMulticast is required for firebase-admin v12+
        const response = await firebaseAdmin.messaging().sendEachForMulticast(multicastMessage);

        // Log failed tokens for debugging
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
