// seed_units_client.cjs
// Seeds the 'units' collection using the Firebase CLIENT SDK (no service account needed).
// Run: node seed_units_client.cjs

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');

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

const units = [
  {
    subdomain: 'gmrit',
    unitName: '14(A) BN NCC',
    collegeName: 'GMR Institute of Technology',
    location: 'Rajam, Srikakulam',
    heroBg: '',
    logo: '',
    primaryColor: '#1B3A6B',
    secondaryColor: '#B8830E',
    motto: 'Unity and Discipline',
    institutionId: '14a-bn-srikakulam',
  },
  {
    subdomain: 'anits',
    unitName: 'ANITS NCC Unit',
    collegeName: 'Anil Neerukonda Institute of Technology and Sciences',
    location: 'Visakhapatnam',
    heroBg: '',
    logo: '',
    primaryColor: '#800000',
    secondaryColor: '#FFD700',
    motto: 'Unity and Discipline',
    institutionId: 'anits',
  },
  {
    subdomain: 'mvgr',
    unitName: 'MVGR NCC Unit',
    collegeName: 'Maharaj Vijayaram Gajapathi Raj College of Engineering',
    location: 'Vizianagaram',
    heroBg: '',
    logo: '',
    primaryColor: '#004a99',
    secondaryColor: '#ffffff',
    motto: 'Unity and Discipline',
    institutionId: 'mvgr',
  },
];

async function seed() {
  console.log('Seeding units collection...');
  const unitsRef = collection(db, 'artifacts', APP_ID, 'public', 'data', 'units');

  for (const unit of units) {
    const docRef = doc(unitsRef, unit.subdomain);
    await setDoc(docRef, unit, { merge: true });
    console.log(`✅ Seeded: ${unit.subdomain} (${unit.unitName})`);
  }

  console.log('\n🎉 All units seeded successfully!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeding failed:', err.message);
  process.exit(1);
});
