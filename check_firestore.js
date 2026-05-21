
import { db, appId } from './src_stable/firebase/config.js';
import { collection, getDocs, query, where } from 'firebase/firestore';

async function checkData() {
    const collections = ['camps', 'social_activities', 'blood_requests', 'cadets'];
    for (const colName of collections) {
        const ref = collection(db, 'artifacts', appId, 'public', 'data', colName);
        const snap = await getDocs(ref);
        console.log(`Collection: ${colName}, Total Docs: ${snap.size}`);
        
        const gmritSnap = await getDocs(query(ref, where('institutionId', '==', 'gmrit')));
        console.log(`  - institutionId == 'gmrit': ${gmritSnap.size}`);
        
        const srikakulamSnap = await getDocs(query(ref, where('institutionId', '==', '14a-bn-srikakulam')));
        console.log(`  - institutionId == '14a-bn-srikakulam': ${srikakulamSnap.size}`);
        
        const noIdSnap = snap.docs.filter(d => !d.data().institutionId);
        console.log(`  - NO institutionId: ${noIdSnap.length}`);
    }
}

checkData().catch(console.error);
