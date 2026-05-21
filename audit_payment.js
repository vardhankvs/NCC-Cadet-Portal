import { db, appId } from './src_stable/firebase/config.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function auditData() {
    console.log('App ID:', appId);

    // Check Cadet
    const cadetsRef = collection(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'cadets'
    );
    const cadetSnap = await getDocs(
        query(cadetsRef, where('enrollmentId', '==', 'AP2024SDIA0520797'))
    );

    if (cadetSnap.empty) {
        console.log('CRITICAL: Cadet AP2024SDIA0520797 not found in roster!');
    } else {
        const cadet = cadetSnap.docs[0];
        console.log('Cadet Found:', {
            id: cadet.id,
            name: cadet.data().name,
            enrollmentId: cadet.data().enrollmentId,
        });
    }

    // Check Transactions
    const txRef = collection(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'transactions'
    );
    const txSnap = await getDocs(
        query(
            txRef,
            where('cadetName', '==', 'KVS VARDHAN'),
            where('status', '==', 'pending')
        )
    );

    if (txSnap.empty) {
        console.log('No pending transactions found for KVS VARDHAN');
    } else {
        txSnap.docs.forEach((doc) => {
            console.log('Transaction Found:', {
                id: doc.id,
                cadetId: doc.data().cadetId,
                enrollmentId: doc.data().enrollmentId,
                amount: doc.data().amount,
                status: doc.data().status,
            });
        });
    }
}

auditData().catch(console.error);
