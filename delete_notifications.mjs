import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

const APP_ID = 'default-app-id';

async function main() {
    try {
        console.log('Logging in as admin...');
        await signInWithEmailAndPassword(auth, 'admin@gmrit-ncc.edu.in', 'Admin@NCC2024');
        console.log('Logged in successfully!');

        const notifsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'notifications');
        const snap = await getDocs(notifsRef);

        let deletedCount = 0;
        for (const document of snap.docs) {
            const data = document.data();
            const rawStr = JSON.stringify(data);
            if (rawStr.includes('A fee payment has been verified and approved') || rawStr.includes('Fee Record Updated')) {
                console.log('Found ghost message:', document.id);
                await deleteDoc(doc(db, 'artifacts', APP_ID, 'public', 'data', 'notifications', document.id));
                deletedCount++;
            }
        }

        console.log(`\n✅ Finished! Deleted ${deletedCount} ghost notifications.`);
        process.exit(0);
    } catch (err) {
        console.error('Error:', err.message);
        process.exit(1);
    }
}

main();
