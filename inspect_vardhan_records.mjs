import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: 'AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI',
    authDomain: 'gmrit-ncc-fb1df.firebaseapp.com',
    projectId: 'gmrit-ncc-fb1df',
    storageBucket: 'gmrit-ncc-fb1df.firebasestorage.app',
    messagingSenderId: '218480065073',
    appId: '1:218480065073:web:52a908b9996d0773ba7310',
    measurementId: 'G-8LBCG7FRM0',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'default-app-id';

async function main() {
    await signInWithEmailAndPassword(auth, 'admin@gmrit-ncc.edu.in', 'Admin@NCC2024');

    // 1. Get Vardhan cadet doc
    const vardhanDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'cadets', 'pqop0Pvc2jwb4agoLe7O');
    const vSnap = await getDoc(vardhanDocRef);
    const vData = vSnap.data();

    console.log("=== VARDHAN CADET DOC ATTENDANCE MAP ===");
    console.log("Certificate:", vData.certificate || vData.currentCertificate);
    console.log("attendance map keys count:", Object.keys(vData.attendance || {}).length);
    console.log("attendance map:", vData.attendance);

    // 2. Get Vardhan logs in attendance collection
    const attCol = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
    const logsSnap = await getDocs(query(attCol, where('cadetId', '==', 'pqop0Pvc2jwb4agoLe7O')));
    console.log("\n=== VARDHAN ATTENDANCE COLLECTION LOGS ===");
    console.log("Logs count:", logsSnap.size);
    logsSnap.forEach(d => {
        const l = d.data();
        console.log(`Doc ID: ${d.id}, Date: ${l.date}, Status: ${l.status}, MarkedBy: ${l.markedBy}`);
    });

    // 3. Check all logs on 2026-08-24 and 2026-08-25
    console.log("\n=== CHECKING UNIT LOGS ON 2026-08-24 ===");
    const snap24 = await getDocs(query(attCol, where('date', '==', '2026-08-24')));
    console.log("2026-08-24 count:", snap24.size);
    snap24.forEach(d => {
        const l = d.data();
        console.log(`  - ${l.enrollmentId} (${l.cadetName}) cert: ${l.certificate}`);
    });

    console.log("\n=== CHECKING UNIT LOGS ON 2026-08-25 ===");
    const snap25 = await getDocs(query(attCol, where('date', '==', '2026-08-25')));
    console.log("2026-08-25 count:", snap25.size);
    snap25.forEach(d => {
        const l = d.data();
        console.log(`  - ${l.enrollmentId} (${l.cadetName}) cert: ${l.certificate}`);
    });

    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
