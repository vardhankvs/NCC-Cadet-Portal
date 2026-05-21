const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI",
  authDomain: "gmrit-ncc-fb1df.firebaseapp.com",
  projectId: "gmrit-ncc-fb1df",
  storageBucket: "gmrit-ncc-fb1df.firebasestorage.app",
  messagingSenderId: "218480065073",
  appId: "1:218480065073:web:52a908b9996d0773ba7310",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const unitsRef = collection(db, 'artifacts', 'default-app-id', 'public', 'data', 'units');
  try {
      const snap = await getDocs(unitsRef);
      console.log(`Units fetched: ${snap.size}`);
  } catch (err) {
      console.error("Error fetching units:", err.message);
  }
  process.exit(0);
}

check();
