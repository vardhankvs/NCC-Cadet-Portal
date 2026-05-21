const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI",
  authDomain: "gmrit-ncc-fb1df.firebaseapp.com",
  projectId: "gmrit-ncc-fb1df",
  storageBucket: "gmrit-ncc-fb1df.firebasestorage.app",
  messagingSenderId: "218480065073",
  appId: "1:218480065073:web:52a908b9996d0773ba7310",
};

const APP_ID = 'default-app-id';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const cadetsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'cadets');
  const q = query(cadetsRef, where('institutionId', '==', '14a-bn-srikakulam'));
  const snap = await getDocs(q);
  
  console.log(`Query returned ${snap.size} cadets.`);
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
