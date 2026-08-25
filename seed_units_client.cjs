// seed_units_client.cjs
// Seeds the 'units' collection using the Firebase CLIENT SDK (no service account needed).
// Run: node seed_units_client.cjs

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');
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

const units = [
  {
    subdomain: '14a-bn-srikakulam',
    unitName: '14(A) BN NCC, Srikakulam',
    collegeName: 'Battalion Headquarters',
    location: 'Srikakulam',
    isBattalion: true,
    heroBg: 'https://images.unsplash.com/photo-1599708153386-62e257e10884?auto=format&fit=crop&q=80&w=2000',
    logo: 'https://firebasestorage.googleapis.com/v0/b/gmrit-ncc-fb1df.appspot.com/o/assets%2Fncc_logo.png?alt=media',
    primaryColor: '#1B3A6B',
    secondaryColor: '#B8830E',
    motto: 'Unity and Discipline'
  },
  {
    subdomain: 'gmrit',
    unitName: '14(A) BN NCC',
    collegeName: 'GMR Institute of Technology',
    location: 'Rajam, Srikakulam',
    heroBg: 'https://firebasestorage.googleapis.com/v0/b/gmrit-ncc-fb1df.appspot.com/o/assets%2Fhero_bg.png?alt=media',
    logo: 'https://firebasestorage.googleapis.com/v0/b/gmrit-ncc-fb1df.appspot.com/o/assets%2Fncc_logo.png?alt=media',
    primaryColor: '#1B3A6B',
    secondaryColor: '#B8830E',
    motto: 'Unity and Discipline',
    battalionId: '14a-bn-srikakulam',
  },
  {
    subdomain: 'anits',
    unitName: '14(A) BN NCC',
    collegeName: 'Anil Neerukonda Institute of Technology and Sciences',
    location: 'Visakhapatnam',
    heroBg: 'https://images.unsplash.com/photo-1599708153386-62e257e10884?auto=format&fit=crop&q=80&w=2000',
    logo: 'https://www.anits.edu.in/images/logo.png',
    primaryColor: '#800000',
    secondaryColor: '#FFD700',
    motto: 'Unity and Discipline',
    battalionId: '14a-bn-srikakulam',
  },
  {
    subdomain: 'mvgr',
    unitName: '14(A) BN NCC',
    collegeName: 'Maharaj Vijayaram Gajapathi Raj College of Engineering',
    location: 'Vizianagaram',
    heroBg: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe1?auto=format&fit=crop&q=80&w=2000',
    logo: 'https://www.mvgrce.com/sites/default/files/logo_0.png',
    primaryColor: '#004a99',
    secondaryColor: '#ffffff',
    motto: 'Unity and Discipline',
    battalionId: '14a-bn-srikakulam',
  },
];

async function seed() {
  console.log('Seeding units collection directly...');
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
