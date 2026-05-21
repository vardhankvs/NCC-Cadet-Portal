/**
 * Write admin Firestore doc using signed-in user's idToken via REST API.
 * Run: node write-admin-fs.cjs
 * Delete after use!
 */
const https = require('https');

const API_KEY    = 'AIzaSyCXzPxQCX19Qww4W1UhnS3GdsX54KdhXIY';
const PROJECT_ID = 'gmrit-ncc-fb1df';
const UID        = '5aoY3NndWfc0qTNBhrTRy6MppRV2';
const EMAIL      = 'admin@gmrit-ncc.edu.in';
const PASSWORD   = 'Admin@NCC2024';

function post(url, body) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
        }, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

function patch(url, body, token) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(body);
        const u = new URL(url);
        const req = https.request({
            hostname: u.hostname,
            path: u.pathname + u.search,
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data),
                'Authorization': `Bearer ${token}`,
            },
        }, res => {
            let b = '';
            res.on('data', c => b += c);
            res.on('end', () => resolve({ status: res.statusCode, body: JSON.parse(b) }));
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function main() {
    // Step 1: Sign in to get idToken
    console.log('🔑 Signing in to get auth token...');
    const signIn = await post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
        { email: EMAIL, password: PASSWORD, returnSecureToken: true }
    );
    if (signIn.status !== 200) {
        console.error('❌ Sign-in failed:', signIn.body?.error?.message);
        process.exit(1);
    }
    const { idToken } = signIn.body;
    console.log('✅ Signed in successfully');

    // Step 2: Write Firestore document via REST PATCH
    const fsPath = `artifacts/default-app-id/public/data/users/${UID}`;
    const fsUrl  = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${fsPath}`;
    console.log('📝 Writing Firestore document...');
    const fsRes = await patch(fsUrl, {
        fields: {
            role:          { stringValue: 'admin' },
            email:         { stringValue: EMAIL },
            institutionId: { stringValue: '14a-bn-srikakulam' },
        },
    }, idToken);

    if (fsRes.status === 200 || fsRes.status === 201) {
        console.log('✅ Firestore admin document written!');
        console.log('\n🎉 Admin account is fully ready:');
        console.log(`   Email   : ${EMAIL}`);
        console.log(`   Password: ${PASSWORD}`);
        console.log('\n⚠️  Delete: write-admin-fs.cjs, write-admin-doc.cjs, create-admin.js, create-admin.cjs, create-admin-rest.cjs\n');
    } else {
        console.error('❌ Firestore error:', JSON.stringify(fsRes.body?.error));
    }
    process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
