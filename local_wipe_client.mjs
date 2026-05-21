import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, deleteField } from 'firebase/firestore';

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

async function wipeTokens(collectionName) {
  console.log(`Wiping tokens in ${collectionName}...`);
  const snap = await getDocs(collection(db, `artifacts/default-app-id/public/data/${collectionName}`));
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
      console.log(`- Removing ${data.fcmTokens.length} tokens from ${collectionName}: ${data.name || doc.id}`);
      await updateDoc(doc.ref, { fcmTokens: deleteField() });
    }
  }
}

async function run() {
  await wipeTokens('cadets');
  await wipeTokens('staff');
  await wipeTokens('users');
  console.log('✅ All duplicate tokens have been successfully wiped from the database!');
  process.exit(0);
}

run().catch(console.error);
