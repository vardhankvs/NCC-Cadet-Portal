const { initializeApp, applicationDefault } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

initializeApp({
  credential: applicationDefault(),
  projectId: 'gmrit-ncc-fb1df'
});

const db = getFirestore();
const APP_ID = 'default-app-id';

async function fix() {
  const usersRef = db.collection('artifacts').doc(APP_ID).collection('public').doc('data').collection('users');
  const snap = await usersRef.get();
  
  let count = 0;
  for (const userDoc of snap.docs) {
      const data = userDoc.data();
      if (data.institutionId !== '14a-bn-srikakulam') {
          console.log(`Fixing user ${data.email} (${data.institutionId} -> 14a-bn-srikakulam)`);
          await userDoc.ref.update({
              institutionId: '14a-bn-srikakulam'
          });
          count++;
      }
  }
  console.log(`Fixed ${count} users.`);
  process.exit(0);
}

fix().catch(err => {
  console.error(err);
  process.exit(1);
});
