import admin from 'firebase-admin';

// Initialize Firebase Admin lazily to avoid cold start issues on Vercel
function getFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            // Read Service Account from Vercel Environment Variable
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
    // Enable CORS for testing (Vercel naturally allows it, but good to be explicit)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Handle OPTIONS request for CORS preflight
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

        const firebaseAdmin = getFirebaseAdmin();

        const payload = {
            notification: {
                title: subject || 'Unit Broadcast',
                body: message || 'You have a new update in the NCC Portal',
            }
        };

        // Send multicast push
        const response = await firebaseAdmin.messaging().sendMulticast({
            tokens: tokens,
            notification: payload.notification
        });

        console.log(`Successfully sent ${response.successCount} messages; Failed ${response.failureCount}.`);

        return res.status(200).json({ 
            success: true, 
            successCount: response.successCount, 
            failureCount: response.failureCount 
        });

    } catch (error) {
        console.error('Broadcast Error:', error);
        return res.status(500).json({ error: 'Failed to send broadcast.', details: error.message });
    }
}
