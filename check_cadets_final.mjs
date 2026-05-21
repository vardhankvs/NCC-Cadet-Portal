import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI",
    authDomain: "gmrit-ncc-fb1df.firebaseapp.com",
    projectId: "gmrit-ncc-fb1df",
    storageBucket: "gmrit-ncc-fb1df.firebasestorage.app",
    messagingSenderId: "218480065073",
    appId: "1:218480065073:web:52a908b9996d0773ba7310",
    measurementId: "G-8LBCG7FRM0"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
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
