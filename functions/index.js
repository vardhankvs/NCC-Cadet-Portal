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
