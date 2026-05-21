const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');

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
const auth = getAuth(app);

async function fix() {
  await signInWithEmailAndPassword(auth, 'admin@gmrit-ncc.edu.in', 'Admin@NCC2024');
  console.log("Logged in as Admin");

  const usersRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'users');
  const snap = await getDocs(usersRef);
  
  let count = 0;
  for (const userDoc of snap.docs) {
      const data = userDoc.data();
      if (data.institutionId !== '14a-bn-srikakulam') {
          console.log(`Fixing user ${data.email} (${data.institutionId} -> 14a-bn-srikakulam)`);
          await updateDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'users', userDoc.id), {
              institutionId: '14a-bn-srikakulam'
          });
          count++;
      }
  }
  console.log(`Fixed ${count} users.`);
  process.exit(0);
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
