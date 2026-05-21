import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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
    const cadetsRef = collection(db, 'artifacts', 'gmrit-ncc-fb1df', 'public', 'data', 'cadets');
    const cadets = await getDocs(cadetsRef);
    let cadetTokens = 0;
    cadets.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && data.fcmTokens.length > 0) cadetTokens++;
    });

    const staffRef = collection(db, 'artifacts', 'gmrit-ncc-fb1df', 'public', 'data', 'staff');
    const staff = await getDocs(staffRef);
    let staffTokens = 0;
    staff.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && data.fcmTokens.length > 0) staffTokens++;
    });

    // Check users collection too
    const usersRef = collection(db, 'artifacts', 'gmrit-ncc-fb1df', 'public', 'data', 'users');
    const users = await getDocs(usersRef);
    let userTokens = 0;
    users.forEach(doc => {
        const data = doc.data();
        if (data.fcmTokens && data.fcmTokens.length > 0) userTokens++;
    });

    console.log(`Cadets with tokens: ${cadetTokens}`);
    console.log(`Staff with tokens: ${staffTokens}`);
    console.log(`Users with tokens: ${userTokens}`);
}

check().catch(console.error);
