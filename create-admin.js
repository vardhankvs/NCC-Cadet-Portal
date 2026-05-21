/**
 * One-time script: Create the initial admin account for gmrit-ncc-fb1df
 * Run with: node create-admin.js
 * 
 * IMPORTANT: Delete this file after running it!
 */

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: 'AIzaSyCXzPxQCX19Qww4W1UhnS3GdsX54KdhXIY',
    authDomain: 'gmrit-ncc-fb1df.firebaseapp.com',
    projectId: 'gmrit-ncc-fb1df',
    storageBucket: 'gmrit-ncc-fb1df.firebasestorage.app',
    messagingSenderId: '780219909557',
    appId: '1:780219909557:web:f9e703e0609cede4a205fc',
};

// ── SET YOUR ADMIN CREDENTIALS HERE ──────────────────────────────────────────
const ADMIN_EMAIL = 'admin@gmrit-ncc.edu.in';   // Change this to your email
const ADMIN_PASSWORD = 'Admin@NCC2024';           // Change this to a strong password
// ─────────────────────────────────────────────────────────────────────────────

async function createAdmin() {
    try {
        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);

        const appId = 'default-app-id'; // Matches what the portal uses

        console.log(`Creating admin account: ${ADMIN_EMAIL}`);
        const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
        const uid = cred.user.uid;
        console.log(`✅ Auth account created. UID: ${uid}`);

        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        await setDoc(doc(usersRef, uid), {
            role: 'admin',
            email: ADMIN_EMAIL,
            institutionId: '14a-bn-srikakulam',
        });
        console.log('✅ Firestore user document created.');
        console.log('\n🎉 Admin account is ready! You can now log in with:');
        console.log(`   Email:    ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log('\n⚠️  IMPORTANT: Delete this file (create-admin.js) after use!');
        process.exit(0);
    } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
            console.log('⚠️  An account with this email already exists. Try logging in with it, or use a different email.');
        } else {
            console.error('❌ Error:', err.message);
        }
        process.exit(1);
    }
}

createAdmin();
