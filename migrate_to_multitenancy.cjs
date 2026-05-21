// migrate_to_multitenancy.cjs
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI",
  authDomain: "gmrit-ncc-fb1df.firebaseapp.com",
  projectId: "gmrit-ncc-fb1df",
  storageBucket: "gmrit-ncc-fb1df.firebasestorage.app",
  messagingSenderId: "218480065073",
  appId: "1:218480065073:web:52a908b9996d0773ba7310",
};

const APP_ID = 'default-app-id';
const DEFAULT_INSTITUTION = 'gmrit';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionsToMigrate = [
    'cadets',
    'events',
    'staff',
    'announcements',
    'unit_gallery',
    'inventory',
    'camps',
    'materials',
    'quizzes',
    'social_activities',
    'grievances',
    'users'
];

async function migrate() {
    for (const colName of collectionsToMigrate) {
        console.log(`Migrating collection: ${colName}...`);
        const colRef = collection(db, 'artifacts', APP_ID, 'public', 'data', colName);
        const snap = await getDocs(colRef);
        
        let count = 0;
        for (const document of snap.docs) {
            if (!document.data().institutionId) {
                await updateDoc(doc(colRef, document.id), {
                    institutionId: DEFAULT_INSTITUTION
                });
                count++;
            }
        }
        console.log(`✅ Updated ${count} documents in ${colName}.`);
    }
    console.log('\n🎉 Migration complete!');
    process.exit(0);
}

migrate().catch(err => {
    console.error('❌ Migration failed:', err);
    process.exit(1);
});
