const fs = require('fs');
const admin = require('firebase-admin');

// Parse .env to get FIREBASE_SERVICE_ACCOUNT
const envContent = fs.readFileSync('.env', 'utf-8');
let serviceAccountStr = '';
envContent.split('\n').forEach(line => {
    if (line.startsWith('FIREBASE_SERVICE_ACCOUNT=')) {
        serviceAccountStr = line.replace('FIREBASE_SERVICE_ACCOUNT=', '').trim();
        // remove surrounding quotes if any
        if (serviceAccountStr.startsWith("'") || serviceAccountStr.startsWith('"')) {
            serviceAccountStr = serviceAccountStr.slice(1, -1);
        }
    }
});

const serviceAccount = JSON.parse(serviceAccountStr);

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function run() {
    console.log('Wiping tokens...');
    let totalWiped = 0;
    const collections = ['cadets', 'staff', 'users'];
    
    for (const col of collections) {
        const snapshot = await db.collection(`artifacts/default-app-id/public/data/${col}`).get();
        for (const doc of snapshot.docs) {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
                console.log(`Wiping ${data.fcmTokens.length} tokens from ${col}/${doc.id}`);
                await doc.ref.update({
                    fcmTokens: admin.firestore.FieldValue.delete()
                });
                totalWiped++;
            }
        }
    }
    console.log(`✅ SUCCESS: Wiped tokens from ${totalWiped} documents.`);
    process.exit(0);
}

run().catch(console.error);
