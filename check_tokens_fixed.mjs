import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const app = initializeApp({
  apiKey: "AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI",
  authDomain: "gmrit-ncc-fb1df.firebaseapp.com",
  projectId: "gmrit-ncc-fb1df",
  storageBucket: "gmrit-ncc-fb1df.firebasestorage.app",
  messagingSenderId: "218480065073",
  appId: "1:218480065073:web:52a908b9996d0773ba7310",
  measurementId: "G-8LBCG7FRM0"
});
const db = getFirestore(app);

async function run() {
  console.log("Checking cadets...");
  const snap = await getDocs(collection(db, 'artifacts/14a-bn-srikakulam/public/data/cadets'));
  let foundTokens = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (data.fcmTokens && data.fcmTokens.length > 0) {
      console.log('Cadet:', data.name, 'Tokens Count:', data.fcmTokens.length);
      foundTokens.push(...data.fcmTokens);
    }
  });
  console.log('Total unique tokens among all cadets:', new Set(foundTokens).size);
  
  console.log("Checking users collection...");
  const usersSnap = await getDocs(collection(db, 'artifacts/14a-bn-srikakulam/public/data/users'));
  let userTokens = [];
  usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmTokens && data.fcmTokens.length > 0) {
          console.log('User:', data.name || doc.id, 'Tokens Count:', data.fcmTokens.length);
          userTokens.push(...data.fcmTokens);
      }
  });
  console.log('Total unique tokens among all users:', new Set(userTokens).size);

  console.log("Checking staff collection...");
  const staffSnap = await getDocs(collection(db, 'artifacts/14a-bn-srikakulam/public/data/staff'));
  let staffTokens = [];
  staffSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmTokens && data.fcmTokens.length > 0) {
          console.log('Staff:', data.name || doc.id, 'Tokens Count:', data.fcmTokens.length);
          staffTokens.push(...data.fcmTokens);
      }
  });
  console.log('Total unique tokens among all staff:', new Set(staffTokens).size);
}
run().catch(console.error);
