import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const fallbackConfig = {
    apiKey: 'AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI',
    authDomain: 'gmrit-ncc-fb1df.firebaseapp.com',
    projectId: 'gmrit-ncc-fb1df',
    storageBucket: 'gmrit-ncc-fb1df.firebasestorage.app',
    messagingSenderId: '218480065073',
    appId: '1:218480065073:web:52a908b9996d0773ba7310',
};

const app = initializeApp(fallbackConfig);
const db = getFirestore(app);

async function inspect() {
    console.log("=== INSPECTING ATTENDANCE COLLECTION ===");
    const attSnap = await getDocs(collection(db, 'attendance'));
    console.log(`Total documents in 'attendance' collection: ${attSnap.size}`);
    const attDates = {};
    attSnap.forEach(d => {
        const data = d.data();
        const date = data.date;
        attDates[date] = (attDates[date] || 0) + 1;
    });
    console.log("Attendance dates in 'attendance' collection:", attDates);

    console.log("\n=== INSPECTING CADETS COLLECTION ATTENDANCE MAPS ===");
    const cadetSnap = await getDocs(collection(db, 'cadets'));
    console.log(`Total cadets: ${cadetSnap.size}`);
    const cadetDates = {};
    cadetSnap.forEach(d => {
        const data = d.data();
        if (data.attendance) {
            Object.keys(data.attendance).forEach(k => {
                cadetDates[k] = (cadetDates[k] || 0) + 1;
            });
        }
    });
    console.log("Cadet attendance map keys and frequency:", cadetDates);
}

inspect().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
