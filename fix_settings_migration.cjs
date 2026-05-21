// fix_settings_migration.cjs
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, getDoc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI",
  authDomain: "gmrit-ncc-fb1df.firebaseapp.com",
  projectId: "gmrit-ncc-fb1df",
  storageBucket: "gmrit-ncc-fb1df.firebasestorage.app",
  messagingSenderId: "218480065073",
  appId: "1:218480065073:web:52a908b9996d0773ba7310",
};

const APP_ID = 'default-app-id';
const DEFAULT_INSTITUTION = 'gmrit';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function fix() {
    const settingsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'settings');
    const paymentDocRef = doc(settingsRef, 'payment');
    const snap = await getDoc(paymentDocRef);
    
    if (snap.exists() && !snap.data().institutionId) {
        await updateDoc(paymentDocRef, {
            institutionId: DEFAULT_INSTITUTION
        });
        console.log('✅ Fixed payment settings institutionId.');
    } else {
        console.log('Payment settings already fixed or does not exist.');
    }
    process.exit(0);
}

fix().catch(err => {
    console.error(err);
    process.exit(1);
});
