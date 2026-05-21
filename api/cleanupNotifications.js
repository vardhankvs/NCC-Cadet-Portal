import admin from 'firebase-admin';

function getFirebaseAdmin() {
    if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    }
    return admin;
}

// One-time cleanup: deletes any notification doc in Firestore that contains
// fee-related broadcast text that should never have gone to all cadets.
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    try {
        const db = getFirebaseAdmin().firestore();
        const col = db.collection('notifications');

        // Fetch all notification docs and find ones with the old broadcast text
        const snap = await col.get();
        const toDelete = [];

        snap.forEach(doc => {
            const data = doc.data();
            const msg  = (data.message || '').toLowerCase();
            const subj = (data.subject || '').toLowerCase();

            // Match any old fee broadcast messages that should be personal only
            const isBadFeeMsg =
                msg.includes('fee payment has been verified') ||
                msg.includes('fee record updated') ||
                subj.includes('fee record updated');

            if (isBadFeeMsg) toDelete.push(doc.id);
        });

        // Batch delete
        const batch = db.batch();
        toDelete.forEach(id => batch.delete(col.doc(id)));
        await batch.commit();

        return res.status(200).json({ deleted: toDelete.length, ids: toDelete });
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
