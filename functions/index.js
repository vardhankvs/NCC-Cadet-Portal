const functions = require('firebase-functions');
const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK.
// When deployed to Cloud Functions, this automatically uses application default credentials.
admin.initializeApp();

/**
 * Basic health check function to verify backend deployment.
 */
exports.helloWorld = functions.https.onRequest((request, response) => {
    functions.logger.info('GMRIT NCC Portal Backend is Live!', {
        structuredData: true,
    });
    response.send('GMRIT NCC Portal Backend is Live!');
});

/**
 * Callable Function: assignRole
 * Allows a superadmin to grant 'admin' or 'superadmin' roles and assign an institutionId.
 */
exports.assignRole = functions.https.onCall(async (data, context) => {
    // 1. Check if the initiator has the 'superadmin' authorization.
    // Uncomment the block below in production to restrict access.
    /*
    if (!context.auth || context.auth.token.role !== 'superadmin') {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only superadmins can assign roles.'
        );
    }
    */

    const { targetUid, role, institutionId } = data;

    if (!targetUid || !role) {
        throw new functions.https.HttpsError(
            'invalid-argument',
            'Missing required fields: targetUid or role.'
        );
    }

    try {
        // Set custom user claims on this UID.
        await admin.auth().setCustomUserClaims(targetUid, {
            role: role,
            institutionId: institutionId || 'gmrit', // default fallback for now
        });

        return {
            message: `Success! Granted role ${role} (Institution: ${
                institutionId || 'gmrit'
            }) to user ${targetUid}`,
        };
    } catch (error) {
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Scheduled Function: syncCareerNotices
 * Runs daily at 00:00 to fetch latest army/defense recruitment notices.
 * (Note: In this implementation, we also expose it as a callable function for immediate admin triggers).
 */
exports.syncCareerNotices = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
    return runSync();
});

exports.manualSyncCareerNotices = functions.https.onCall(async (data, context) => {
    // Only admins should trigger manual sync
    /*
    if (!context.auth || context.auth.token.role !== 'admin') {
        throw new functions.https.HttpsError('permission-denied', 'Unauthorized.');
    }
    */
    return runSync();
});

async function runSync() {
    const axios = require('axios');
    
    try {
        functions.logger.info('Starting Career Notice Sync...');
        
        // Fetching from a public job alert aggregator (Example: Sarkari Result RSS or similar)
        // Fetching "from Google" (Google News RSS for Army Recruitment India)
        const query = encodeURIComponent('Army Recruitment India');
        const feedUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
        const response = await axios.get(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}`);
        
        if (!response.data || response.data.status !== 'ok') {
            throw new Error(`External API Error: ${response.data ? response.data.message : 'Unknown'}`);
        }

        const items = response.data.items || [];
        const db = admin.firestore();
        const batch = db.batch();
        
        // Use 'default-app-id' to match the local/vite configuration
        const noticesRef = db.collection('artifacts')
                             .doc('default-app-id')
                             .collection('public')
                             .doc('data')
                             .collection('career_notices');

        let addedCount = 0;
        
        for (const item of items) {
            const title = item.title.toLowerCase();
            const keywords = ['army', 'navy', 'air force', 'ssc', 'upsc', 'defence', 'recruitment', 'constable', 'officer', 'cds', 'afcat', 'agniveer'];
            
            if (keywords.some(k => title.includes(k))) {
                const querySnapshot = await noticesRef.where('title', '==', item.title).get();
                if (querySnapshot.empty) {
                    const newDoc = noticesRef.doc();
                    batch.set(newDoc, {
                        title: item.title,
                        description: item.content || item.description || 'New recruitment opportunity available.',
                        link: item.link,
                        category: 'Automated Alert',
                        institutionId: 'gmrit',
                        createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    });
                    addedCount++;
                }
            }
            if (addedCount >= 10) break; 
        }

        if (addedCount > 0) {
            await batch.commit();
        }

        functions.logger.info(`Sync complete. Added ${addedCount} new notices.`);
        return { message: `Sync complete. Added ${addedCount} new notices.`, count: addedCount };
    } catch (error) {
        functions.logger.error('Sync Error:', error);
        throw new functions.https.HttpsError('internal', `Sync failed: ${error.message}`);
    }
}

/**
 * Trigger: onNotificationCreated
 * Sends FCM push notification to all users when a new notification document is created.
 */
exports.onNotificationCreated = functions.firestore
    .document('artifacts/default-app-id/public/data/notifications/{docId}')
    .onCreate(async (snap, context) => {
        const newValue = snap.data();
        const { subject, message, isAutomated } = newValue;

        // Skip sending push for automated safety net broadcasts to avoid spamming
        if (isAutomated) return null;

        try {
            const db = admin.firestore();
            const cadetsSnap = await db.collection('artifacts/default-app-id/public/data/cadets').get();
            const staffSnap = await db.collection('artifacts/default-app-id/public/data/staff').get();

            let tokens = [];

            cadetsSnap.forEach(doc => {
                const data = doc.data();
                if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                    tokens.push(...data.fcmTokens);
                }
            });

            staffSnap.forEach(doc => {
                const data = doc.data();
                if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                    tokens.push(...data.fcmTokens);
                }
            });

            if (tokens.length === 0) {
                functions.logger.info('No FCM tokens found.');
                return null;
            }

            const payload = {
                notification: {
                    title: subject || 'Unit Broadcast',
                    body: message || 'You have a new update in the NCC Portal',
                }
            };

            const response = await admin.messaging().sendToDevice(tokens, payload);
            
            functions.logger.info('Successfully sent messages:', response.successCount);
            return response;
        } catch (error) {
            functions.logger.error('Error sending push notification:', error);
            return null;
        }
    });