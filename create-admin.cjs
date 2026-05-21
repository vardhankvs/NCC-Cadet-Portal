/**
 * One-time script: Create initial admin account for gmrit-ncc-fb1df
 * 
 * Run from the project root with:
 *   node --require dotenv/config create-admin.cjs
 * OR simply:
 *   node create-admin.cjs
 *
 * ⚠️  DELETE THIS FILE after running it!
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

// ── SET YOUR ADMIN CREDENTIALS HERE ──────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@gmrit-ncc.edu.in';  // ← change to your email
const ADMIN_PASSWORD = 'Admin@NCC2024';            // ← change to a strong password
// ─────────────────────────────────────────────────────────────────────────────

// Use Application Default Credentials (Firebase CLI handles this automatically)
initializeApp({
    credential: require('firebase-admin/app').applicationDefault(),
    projectId: 'gmrit-ncc-fb1df',
});

const auth = getAuth();
const db   = getFirestore();

const APP_ID = 'default-app-id'; // must match what the portal uses

async function main() {
    console.log(`\n🔧 Creating admin: ${ADMIN_EMAIL} in project gmrit-ncc-fb1df...\n`);

    try {
        // 1. Create Firebase Auth user
        const user = await auth.createUser({
            email: ADMIN_EMAIL,
            password: ADMIN_PASSWORD,
            displayName: 'NCC Admin',
        });
        console.log(`✅ Auth user created  — UID: ${user.uid}`);

        // 2. Write Firestore user document (matches portal's getUsersRef path)
        await db
            .collection('artifacts')
            .doc(APP_ID)
            .collection('public')
            .doc('data')
            .collection('users')
            .doc(user.uid)
            .set({
                role: 'admin',
                email: ADMIN_EMAIL,
                institutionId: '14a-bn-srikakulam',
            });
        console.log('✅ Firestore user doc created');

        console.log('\n🎉 Done! Log in with:');
        console.log(`   Email    : ${ADMIN_EMAIL}`);
        console.log(`   Password : ${ADMIN_PASSWORD}`);
        console.log('\n⚠️  Delete create-admin.cjs now!\n');
    } catch (err) {
        if (err.code === 'auth/email-already-exists') {
            console.warn('⚠️  That email already exists in Firebase Auth.');
            console.warn('   → Try logging in with it, or pick a different email.');
        } else {
            console.error('❌ Error:', err.message);
        }
    }
    process.exit(0);
}

main();
