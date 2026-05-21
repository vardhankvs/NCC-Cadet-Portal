import admin from 'firebase-admin';

function getFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.error('Firebase Admin Init Error:', error);
            throw new Error('Failed to initialize Firebase Admin.');
        }
    }
    return admin;
}

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const firebaseAdmin = getFirebaseAdmin();
        const db = firebaseAdmin.firestore();
        let totalWiped = 0;

        // The collections where tokens might be hiding
        const collections = ['cadets', 'staff', 'users'];
        
        // Loop through all collections and wipe the tokens
        for (const col of collections) {
            const snapshot = await db.collection(`artifacts/default-app-id/public/data/${col}`).get();
            
            for (const doc of snapshot.docs) {
                const data = doc.data();
                if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
                    await doc.ref.update({
                        fcmTokens: admin.firestore.FieldValue.delete()
                    });
                    totalWiped++;
                }
            }
        }

        return res.status(200).send(`
            <html>
                <body style="font-family: sans-serif; text-align: center; margin-top: 50px;">
                    <h1 style="color: #4CAF50;">✅ SUCCESS: Tokens Cleared!</h1>
                    <p>Wiped <b>${totalWiped}</b> leftover duplicate tokens from the database.</p>
                    <p>You can now go back to the app, force refresh your phone, and tap Enable Notifications ONE last time!</p>
                </body>
            </html>
        `);
    } catch (error) {
        console.error('Clear Tokens Error:', error);
        return res.status(500).json({ error: 'Failed to clear tokens', details: error.message });
    }
}
