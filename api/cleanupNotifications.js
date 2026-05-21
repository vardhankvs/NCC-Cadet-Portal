import { getFirebaseAdmin } from './utils/firebaseAdmin.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const admin = getFirebaseAdmin();
        const db = admin.firestore();
        const APP_ID = 'default-app-id';

        const notificationsRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('notifications');
        const snapshot = await notificationsRef.get();

        let deletedCount = 0;
        const batch = db.batch();

        snapshot.forEach(doc => {
            const data = doc.data();
            if (JSON.stringify(data).includes('A fee payment has been verified and approved') || JSON.stringify(data).includes('Fee Record Updated')) {
                batch.delete(doc.ref);
                deletedCount++;
            }
        });

        if (deletedCount > 0) {
            await batch.commit();
            return res.status(200).json({ success: true, message: `Deleted ${deletedCount} legacy fee notifications from Firestore.` });
        } else {
            return res.status(200).json({ success: true, message: `No legacy fee notifications found in Firestore.` });
        }
    } catch (err) {
        console.error('Cleanup Error:', err);
        return res.status(500).json({ error: 'Internal server error', details: err.message });
    }
}
