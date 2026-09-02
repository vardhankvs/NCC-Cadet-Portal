import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs, doc, updateDoc, deleteField } from 'firebase/firestore';

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

const normalizeReg = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
const normalizeDate = (date) => {
    if (!date) return '';
    if (typeof date === 'object' && typeof date.toDate === 'function') {
        const d = date.toDate();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    const dStr = String(date).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) return dStr;
    const parts = dStr.split(/[-/]/);
    if (parts.length === 3) {
        if (parts[0].length === 2 && parts[2].length === 4) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
        if (parts[0].length === 4) {
            return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
        }
    }
    return dStr;
};

async function main() {
    await signInWithEmailAndPassword(auth, 'admin@gmrit-ncc.edu.in', 'Admin@NCC2024');

    // 1. Get all attendance logs to know official parade dates
    const attCol = collection(db, 'artifacts', appId, 'public', 'data', 'attendance');
    const logsSnap = await getDocs(attCol);
    const dateCounts = {};
    logsSnap.forEach(d => {
        const l = d.data();
        const date = normalizeDate(l.date);
        if (date && date !== '2026-08-26') {
            dateCounts[date] = (dateCounts[date] || 0) + 1;
        }
    });

    console.log("=== OFFICIAL DATES IN LOGS WITH COUNTS ===");
    console.log(dateCounts);

    // Official dates are dates with >= 3 cadets in logs
    const officialDates = new Set(Object.keys(dateCounts).filter(d => dateCounts[d] >= 3));
    console.log(`Official parade dates count: ${officialDates.size}`);

    // 2. Check all cadets' attendance maps for rogue non-parade dates
    const cadetsCol = collection(db, 'artifacts', appId, 'public', 'data', 'cadets');
    const cadetsSnap = await getDocs(cadetsCol);
    console.log(`Total cadets: ${cadetsSnap.size}`);

    let totalRogueKeysRemoved = 0;
    for (const cDoc of cadetsSnap.docs) {
        const c = cDoc.data();
        const att = c.attendance || {};
        const updates = {};
        let needsUpdate = false;

        for (const [k, v] of Object.entries(att)) {
            const normD = normalizeDate(k);
            if (normD === '2026-08-26' || !officialDates.has(normD)) {
                console.log(`Cadet ${c.name} (${c.enrollmentId}) has non-parade key: ${k} = ${v}`);
                updates[`attendance.${k}`] = deleteField();
                needsUpdate = true;
                totalRogueKeysRemoved++;
            }
        }

        if (needsUpdate) {
            await updateDoc(cDoc.ref, updates);
            console.log(`  -> Cleaned rogue keys for ${c.name}`);
        }
    }

    console.log(`\n🎉 Total rogue keys removed across all cadets: ${totalRogueKeysRemoved}`);
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
