/**
 * One-time Firestore user doc creator using Firebase Admin SDK.
 * Run from functions folder: node ../write-admin-doc.cjs
 * Delete this file after running!
 */

const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({ projectId: 'gmrit-ncc-fb1df' });

const db = getFirestore();

async function main() {
    const uid = '5aoY3NndWfc0qTNBhrTRy6MppRV2';
    const email = 'admin@gmrit-ncc.edu.in';

    const docRef = db
        .collection('artifacts')
        .doc('default-app-id')
        .collection('public')
        .doc('data')
        .collection('users')
        .doc(uid);

    await docRef.set({
        role: 'admin',
        email: email,
        institutionId: '14a-bn-srikakulam',
    });

    console.log('✅ Firestore admin document written successfully!');
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${email}`);
    console.log('\n⚠️  Delete write-admin-doc.cjs now!\n');
    process.exit(0);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
