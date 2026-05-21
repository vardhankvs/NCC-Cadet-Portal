import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        env[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '');
    }
});

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Hardcode the appId to make sure it doesn't fail
const appId = "default-app-id";

async function checkCadets() {
    console.log('Checking for duplicate cadets...');
    const snapshot = await getDocs(collection(db, 'artifacts', appId, 'public', 'data', 'cadets'));
    
    let totalTokens = 0;
    const cadetNames = {};
    const tokensCount = {};
    
    snapshot.forEach(doc => {
        const data = doc.data();
        const name = data.name || data.fullName || 'Unknown';
        
        if (!cadetNames[name]) {
            cadetNames[name] = 0;
        }
        cadetNames[name]++;
        
        if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
            tokensCount[name] = (tokensCount[name] || 0) + data.fcmTokens.length;
            totalTokens += data.fcmTokens.length;
            
            if (data.fcmTokens.length >= 1) {
                console.log(`Cadet ${name} (ID: ${doc.id}) has ${data.fcmTokens.length} tokens.`);
            }
        }
    });
    
    for (const [name, count] of Object.entries(cadetNames)) {
        if (count > 1) {
            console.log(`DUPLICATE CADET DOCUMENT: ${name} has ${count} separate documents in the database!`);
        }
    }
    
    console.log(`Checked ${snapshot.size} total cadet documents. Found ${totalTokens} total tokens across all cadets.`);
}

checkCadets().catch(console.error);
