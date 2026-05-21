import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, updateDoc, deleteField } from 'firebase/firestore';
import fs from 'fs';

const envFile = fs.readFileSync('.env', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...val] = line.split('=');
  if(key && val) env[key.trim()] = val.join('=').trim().replace(/^"|"$/g, '');
});

const app = initializeApp({
  apiKey: env.VITE_FIREBASE_API_KEY,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
});
const db = getFirestore(app);

async function wipeTokens(collectionName) {
  console.log(`Wiping tokens in ${collectionName}...`);
  const snap = await getDocs(collection(db, `artifacts/default-app-id/public/data/${collectionName}`));
  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.fcmTokens && data.fcmTokens.length > 0) {
      console.log(`- Removing ${data.fcmTokens.length} tokens from ${collectionName}: ${data.name || doc.id}`);
      await updateDoc(doc.ref, { fcmTokens: deleteField() });
    }
  }
}

async function run() {
  await wipeTokens('cadets');
  await wipeTokens('staff');
  await wipeTokens('users');
  console.log('✅ All duplicate tokens have been successfully wiped from the database!');
  process.exit(0);
}
run().catch(console.error);
