
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// I'll use this to check the data if I could run it. 
// Since I can't run it directly without a key, I'll use grep to see how 'cadets' are fetched.
