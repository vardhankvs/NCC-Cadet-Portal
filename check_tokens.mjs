import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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

async function run() {
  console.log("Checking cadets...");
  const snap = await getDocs(collection(db, 'artifacts/14a-bn-srikakulam/public/data/cadets'));
  let foundTokens = [];
  snap.forEach(doc => {
    const data = doc.data();
    if (data.fcmTokens && data.fcmTokens.length > 0) {
      console.log('Cadet:', data.name, 'Tokens Count:', data.fcmTokens.length);
      foundTokens.push(...data.fcmTokens);
    }
  });
  console.log('Total unique tokens among all cadets:', new Set(foundTokens).size);
  
  console.log("Checking users collection...");
  const usersSnap = await getDocs(collection(db, 'artifacts/14a-bn-srikakulam/public/data/users'));
  let userTokens = [];
  usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.fcmTokens && data.fcmTokens.length > 0) {
          console.log('User:', data.name || doc.id, 'Tokens Count:', data.fcmTokens.length);
          userTokens.push(...data.fcmTokens);
      }
  });
  console.log('Total unique tokens among all users:', new Set(userTokens).size);
}
run().catch(console.error);
