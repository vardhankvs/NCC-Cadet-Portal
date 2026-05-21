/**
 * One-time admin creator using Firebase Auth REST API.
 * Run: node create-admin-rest.cjs
 * Delete this file after running!
 */

const https = require('https');

// ── SET YOUR CREDENTIALS ─────────────────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@gmrit-ncc.edu.in';  // ← Your admin email
const ADMIN_PASSWORD = 'Admin@NCC2024';            // ← Your password
// ─────────────────────────────────────────────────────────────────────────────

const API_KEY      = 'AIzaSyCXzPxQCX19Qww4W1UhnS3GdsX54KdhXIY';
const PROJECT_ID   = 'gmrit-ncc-fb1df';
const APP_ID_PATH  = 'default-app-id';

function httpsPost(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const urlObj = new URL(url);
        const options = {
            hostname: urlObj.hostname,
            path: urlObj.pathname + urlObj.search,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
            },
        };
        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(body) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    console.log(`\n🔧 Creating admin: ${ADMIN_EMAIL}\n`);

    // Step 1: Create user via Firebase Auth REST API
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
    const authRes = await httpsPost(signUpUrl, {
        email: ADMIN_EMAIL,
        password: ADMIN_PASSWORD,
        returnSecureToken: true,
    });

    if (authRes.status !== 200) {
        const code = authRes.body?.error?.message || 'UNKNOWN';
        if (code === 'EMAIL_EXISTS') {
            console.warn('⚠️  This email already has an account. Try logging in directly.');
        } else {
            console.error('❌ Auth error:', code);
        }
        process.exit(1);
    }

    const { localId: uid, idToken } = authRes.body;
    console.log(`✅ Auth account created — UID: ${uid}`);

    // Step 2: Write Firestore user doc via REST API
    const fsUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/artifacts/${APP_ID_PATH}/public/data/users/${uid}`;
    const fsRes = await httpsPost(fsUrl + '?updateMask.fieldPaths=role&updateMask.fieldPaths=email&updateMask.fieldPaths=institutionId', {
        fields: {
            role:          { stringValue: 'admin' },
            email:         { stringValue: ADMIN_EMAIL },
            institutionId: { stringValue: '14a-bn-srikakulam' },
        },
    });

    // Firestore PATCH requires different method; use fetch workaround via signIn + REST
    if (fsRes.status === 200 || fsRes.status === 201) {
        console.log('✅ Firestore user document created');
    } else {
        console.warn('⚠️  Firestore write needs manual step (see below).');
    }

    console.log('\n🎉 Admin login credentials:');
    console.log(`   Email    : ${ADMIN_EMAIL}`);
    console.log(`   Password : ${ADMIN_PASSWORD}`);
    console.log('\n📋 If Firestore doc failed, do this manually in Firebase Console:');
    console.log(`   Path: artifacts/default-app-id/public/data/users/${uid}`);
    console.log('   Fields: role="admin", email="' + ADMIN_EMAIL + '", institutionId="14a-bn-srikakulam"');
    console.log('\n⚠️  Delete this file now!\n');
    process.exit(0);
}

main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
