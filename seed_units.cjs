// seed_units.cjs
const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'gmrit-ncc-fb1df'
});

const db = getFirestore();
const appId = 'default-app-id'; // Corrected appId to match config

async function seedUnits() {
  const units = [
    {
      subdomain: 'gmrit',
      unitName: '14(A) BN NCC',
      collegeName: 'GMR Institute of Technology',
      location: 'Rajam, Srikakulam',
      heroBg: 'https://firebasestorage.googleapis.com/v0/b/gmrit-ncc-fb1df.appspot.com/o/assets%2Fhero_bg.png?alt=media', // Use your 4K asset URL
      logo: 'https://firebasestorage.googleapis.com/v0/b/gmrit-ncc-fb1df.appspot.com/o/assets%2Fncc_logo.png?alt=media',
      primaryColor: '#1B3A6B',
      secondaryColor: '#B8830E',
      motto: 'Unity and Discipline'
    },
    {
      subdomain: 'anits',
      unitName: 'ANITS NCC Unit',
      collegeName: 'Anil Neerukonda Institute of Technology and Sciences',
      location: 'Visakhapatnam',
      heroBg: 'https://images.unsplash.com/photo-1599708153386-62e257e10884?auto=format&fit=crop&q=80&w=2000', // Sharp placeholder for now
      logo: 'https://www.anits.edu.in/images/logo.png',
      primaryColor: '#800000', // ANITS Maroon
      secondaryColor: '#FFD700',
      motto: 'Unity and Discipline'
    },
    {
      subdomain: 'mvgr',
      unitName: 'MVGR NCC Unit',
      collegeName: 'Maharaj Vijayaram Gajapathi Raj College of Engineering',
      location: 'Vizianagaram',
      heroBg: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe1?auto=format&fit=crop&q=80&w=2000', // Sharp placeholder for now
      logo: 'https://www.mvgrce.com/sites/default/files/logo_0.png',
      primaryColor: '#004a99', // MVGR Blue
      secondaryColor: '#ffffff',
      motto: 'Unity and Discipline'
    }
  ];

  const batch = db.batch();
  const unitsRef = db.collection('artifacts').doc(appId).collection('public').doc('data').collection('units');

  for (const unit of units) {
    const docRef = unitsRef.doc(unit.subdomain);
    batch.set(docRef, {
      ...unit,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    console.log(`Prepared seed for: ${unit.unitName}`);
  }

  await batch.commit();
  console.log('✅ Multi-Tenancy Units Seeded Successfully!');
  process.exit();
}

seedUnits();
