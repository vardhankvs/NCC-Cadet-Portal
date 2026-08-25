// api/updateUserCredentials.js
import admin from 'firebase-admin';

function getFirebaseAdmin() {
    if (!admin.apps.length) {
        try {
            const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount)
            });
        } catch (error) {
            console.error('Firebase Admin Init Error:', error);
            throw new Error('Failed to initialize Firebase Admin.');
        }
    }
    return admin;
}

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { action, currentEmail, newEmail, newPassword, institutionId, role } = req.body;

        if (!currentEmail && !newEmail) {
            return res.status(400).json({ error: 'Email is required.' });
        }

        const firebaseAdmin = getFirebaseAdmin();
        const searchEmail = (currentEmail || newEmail).trim().toLowerCase();
        const db = firebaseAdmin.firestore();
        const appId = 'default-app-id';
        const usersCol = db.collection(`artifacts/${appId}/public/data/users`);

        // ── 1. ACTION: DELETE / RELEASE EMAIL ──
        if (action === 'delete' || action === 'release') {
            try {
                const authUser = await firebaseAdmin.auth().getUserByEmail(searchEmail);
                if (authUser) {
                    await firebaseAdmin.auth().deleteUser(authUser.uid);
                    await usersCol.doc(authUser.uid).delete().catch(() => {});
                }
            } catch (e) {
                // Auth user didn't exist or already removed
            }

            // Also delete any Firestore users doc with matching email
            try {
                const qSnap = await usersCol.where('email', '==', searchEmail).get();
                for (const d of qSnap.docs) {
                    await d.ref.delete();
                }
            } catch (e) {
                console.warn('Firestore user doc cleanup notice:', e);
            }

            return res.status(200).json({
                success: true,
                message: `Successfully released and unblocked email "${searchEmail}".`
            });
        }

        // ── 2. ACTION: RECLAIM / RE-ASSIGN EXISTING AUTH ACCOUNT ──
        if (action === 'reclaim') {
            let authUser;
            try {
                authUser = await firebaseAdmin.auth().getUserByEmail(searchEmail);
            } catch (authErr) {
                // If not found in Auth, create it afresh
                authUser = await firebaseAdmin.auth().createUser({
                    email: searchEmail,
                    password: newPassword || 'NccOfficer@2024',
                    emailVerified: true
                });
            }

            const authUpdates = {};
            if (newPassword && newPassword.length >= 6) {
                authUpdates.password = newPassword;
            }
            if (Object.keys(authUpdates).length > 0) {
                await firebaseAdmin.auth().updateUser(authUser.uid, authUpdates);
            }

            // Revoke all existing active tokens for this user so old sessions cannot continue
            try {
                await firebaseAdmin.auth().revokeRefreshTokens(authUser.uid);
            } catch (rErr) {
                console.warn('Revoke tokens notice:', rErr);
            }

            // Set custom claims
            await firebaseAdmin.auth().setCustomUserClaims(authUser.uid, {
                role: role || 'admin',
                institutionId: institutionId || '14a-bn-srikakulam'
            });

            // Update Firestore user document with invalidation timestamp
            const userDocRef = usersCol.doc(authUser.uid);
            await userDocRef.set({
                email: searchEmail,
                role: role || 'admin',
                institutionId: institutionId || '14a-bn-srikakulam',
                lastLogoutTime: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                credentialsChangedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                sessionRevokedReason: 'credentials_changed',
                updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Terminate active sessions in sessions collection
            try {
                const sessionsCol = db.collection(`artifacts/${appId}/public/data/sessions`);
                const sSnap = await sessionsCol.where('email', '==', searchEmail).where('isActive', '==', true).get();
                for (const sDoc of sSnap.docs) {
                    await sDoc.ref.update({
                        isActive: false,
                        terminatedAt: new Date().toISOString(),
                        terminateReason: 'credentials_changed'
                    });
                }
            } catch (sErr) {}

            return res.status(200).json({
                success: true,
                message: `Successfully reclaimed and assigned credentials for ${searchEmail}.`,
                uid: authUser.uid
            });
        }

        // ── 3. ACTION: UPDATE / RENAME EMAIL OR PASSWORD ──
        // Case A: Email change (newEmail is different from currentEmail)
        if (newEmail && newEmail.trim().toLowerCase() !== searchEmail) {
            const targetNewEmail = newEmail.trim().toLowerCase();
            let authUser;
            try {
                authUser = await firebaseAdmin.auth().getUserByEmail(searchEmail);
            } catch (e) {
                // If currentEmail wasn't in Auth, check if targetNewEmail is in Auth
                try {
                    authUser = await firebaseAdmin.auth().getUserByEmail(targetNewEmail);
                } catch (e2) {
                    // Create new user with targetNewEmail
                    authUser = await firebaseAdmin.auth().createUser({
                        email: targetNewEmail,
                        password: newPassword || 'NccOfficer@2024',
                        emailVerified: true
                    });
                }
            }

            // If targetNewEmail exists on a different UID, remove stale conflict
            try {
                const conflictUser = await firebaseAdmin.auth().getUserByEmail(targetNewEmail);
                if (conflictUser && conflictUser.uid !== authUser.uid) {
                    await firebaseAdmin.auth().deleteUser(conflictUser.uid);
                    await usersCol.doc(conflictUser.uid).delete().catch(() => {});
                }
            } catch (e) {}

            // Update Auth user (email rename + optional password change)
            const authUpdates = { email: targetNewEmail };
            if (newPassword && newPassword.length >= 6) {
                authUpdates.password = newPassword;
            }
            await firebaseAdmin.auth().updateUser(authUser.uid, authUpdates);

            // Revoke existing refresh tokens immediately
            try {
                await firebaseAdmin.auth().revokeRefreshTokens(authUser.uid);
            } catch (rErr) {}

            // Set custom claims
            await firebaseAdmin.auth().setCustomUserClaims(authUser.uid, {
                role: role || 'admin',
                institutionId: institutionId || '14a-bn-srikakulam'
            });

            // Update Firestore user document with real-time invalidation timestamps
            const userDocRef = usersCol.doc(authUser.uid);
            await userDocRef.set({
                email: targetNewEmail,
                role: role || 'admin',
                institutionId: institutionId || '14a-bn-srikakulam',
                lastLogoutTime: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                credentialsChangedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
                sessionRevokedReason: 'credentials_changed',
                updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Clean up any stale user docs matching the old searchEmail
            try {
                const oldSnap = await usersCol.where('email', '==', searchEmail).get();
                for (const d of oldSnap.docs) {
                    if (d.id !== authUser.uid) {
                        await d.ref.delete();
                    }
                }
            } catch (e) {}

            // Terminate active sessions in sessions collection for old email
            try {
                const sessionsCol = db.collection(`artifacts/${appId}/public/data/sessions`);
                const sSnap = await sessionsCol.where('email', '==', searchEmail).where('isActive', '==', true).get();
                for (const sDoc of sSnap.docs) {
                    await sDoc.ref.update({
                        isActive: false,
                        terminatedAt: new Date().toISOString(),
                        terminateReason: 'credentials_changed'
                    });
                }
            } catch (sErr) {}

            return res.status(200).json({
                success: true,
                message: `Successfully changed email from ${searchEmail} to ${targetNewEmail}. Active sessions invalidated.`,
                uid: authUser.uid
            });
        }

        // Case B: Password or Role / Institution update for the same email
        let authUser;
        try {
            authUser = await firebaseAdmin.auth().getUserByEmail(searchEmail);
        } catch (authErr) {
            if (newPassword && newPassword.length >= 6) {
                authUser = await firebaseAdmin.auth().createUser({
                    email: searchEmail,
                    password: newPassword,
                    emailVerified: true
                });
            } else {
                return res.status(404).json({ error: `User with email ${searchEmail} not found in Authentication database.` });
            }
        }

        if (newPassword && newPassword.length >= 6) {
            await firebaseAdmin.auth().updateUser(authUser.uid, { password: newPassword });
        }

        // Revoke active refresh tokens on password/role update
        try {
            await firebaseAdmin.auth().revokeRefreshTokens(authUser.uid);
        } catch (rErr) {}

        if (role || institutionId) {
            await firebaseAdmin.auth().setCustomUserClaims(authUser.uid, {
                role: role || 'admin',
                institutionId: institutionId || '14a-bn-srikakulam'
            });
        }

        const userDocRef = usersCol.doc(authUser.uid);
        const fsPayload = {
            email: searchEmail,
            lastLogoutTime: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            credentialsChangedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp(),
            sessionRevokedReason: 'credentials_changed',
            updatedAt: firebaseAdmin.firestore.FieldValue.serverTimestamp()
        };
        if (role) fsPayload.role = role;
        if (institutionId) fsPayload.institutionId = institutionId;

        await userDocRef.set(fsPayload, { merge: true });

        // Invalidate active sessions in sessions collection
        try {
            const sessionsCol = db.collection(`artifacts/${appId}/public/data/sessions`);
            const sSnap = await sessionsCol.where('email', '==', searchEmail).where('isActive', '==', true).get();
            for (const sDoc of sSnap.docs) {
                await sDoc.ref.update({
                    isActive: false,
                    terminatedAt: new Date().toISOString(),
                    terminateReason: 'credentials_changed'
                });
            }
        } catch (sErr) {}

        return res.status(200).json({
            success: true,
            message: `Successfully updated credentials for user ${authUser.email}. Active sessions invalidated.`,
            uid: authUser.uid
        });
    } catch (error) {
        console.error('Update Credentials API Error:', error);
        return res.status(500).json({ error: error.message || 'Failed to update credentials.' });
    }
}
