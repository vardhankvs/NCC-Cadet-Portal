// api/verifyRazorpayPayment.js
import crypto from 'crypto';
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
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            cadetId,
            cadetName,
            enrollmentId,
            amount,
            institutionId
        } = req.body;

        const keySecret = process.env.RAZORPAY_KEY_SECRET;

        // If secret is set, verify HMAC SHA256 signature
        if (keySecret && razorpay_order_id && razorpay_signature) {
            const generatedSignature = crypto
                .createHmac('sha256', keySecret)
                .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                .digest('hex');

            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({ error: 'Invalid payment signature. Verification failed.' });
            }
        }

        const numericAmount = Number(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({ error: 'Invalid payment amount.' });
        }

        // Record in Firestore via Firebase Admin SDK
        const firebaseAdmin = getFirebaseAdmin();
        const db = firebaseAdmin.firestore();

        const appId = 'default-app-id';
        const finalInstId = institutionId || 'gmrit';

        const batch = db.batch();

        // 1. Transaction doc
        const transRef = db.collection(`artifacts/${appId}/public/data/transactions`).doc();
        batch.set(transRef, {
            cadetId: cadetId || '',
            cadetName: cadetName || '',
            enrollmentId: enrollmentId || '',
            amount: numericAmount,
            status: 'approved',
            type: 'Razorpay',
            paymentId: razorpay_payment_id || `RZP-${Date.now()}`,
            orderId: razorpay_order_id || '',
            institutionId: finalInstId,
            createdAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            approvedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            autoApproved: true,
            verifiedByServer: true
        });

        // 2. Increment cadet's feePaid balance
        if (cadetId) {
            const cadetRef = db.collection(`artifacts/${appId}/public/data/cadets`).doc(cadetId);
            batch.set(cadetRef, {
                feePaid: firebaseAdmin.firestore.FieldValue.increment(numericAmount),
                updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
        }

        await batch.commit();

        return res.status(200).json({
            success: true,
            message: 'Payment verified and credited successfully!',
            transactionId: transRef.id,
            paymentId: razorpay_payment_id
        });
    } catch (error) {
        console.error('Razorpay Verification Error:', error);
        return res.status(500).json({ error: 'Failed to verify payment', details: error.message });
    }
}
