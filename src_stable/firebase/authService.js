// src/firebase/authService.js
import { auth, db, appId, firebaseConfig } from './config.js';
import { initializeApp, deleteApp, getApps } from 'firebase/app';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    getAuth,
} from 'firebase/auth';
import {
    collection,
    query,
    where,
    getDocs,
    setDoc,
    doc,
    getDoc,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { generateUserOTP, generateAnoBiometricSession } from './firestoreService.js';
import emailjs from '@emailjs/browser';

const getUsersRef = () =>
    collection(db, 'artifacts', appId, 'public', 'data', 'users');

// Isolated Auth instance for Step 1 credential validation so main onAuthStateChanged does not fire prematurely
const getTempAuth = () => {
    const tempAppName = 'tempAuth2FAApp';
    const app = getApps().find(a => a.name === tempAppName) || initializeApp(firebaseConfig, tempAppName);
    return getAuth(app);
};

/**
 * Step 1 of Cadet / ANO / Admin 2FA login:
 * Verify credentials with Firebase Auth (isolated so user is not prematurely logged in),
 * lookup target email (Cadet personal email from bulk import / ANO email),
 * generate a 6-digit OTP, store it in Firestore, and send via EmailJS.
 * Returns { uid, email, authEmail } so UI can render OTP modal.
 */
export const loginUserWithOTP = async (emailOrEnrollId, password, activeTab) => {
    let authEmail = emailOrEnrollId ? emailOrEnrollId.trim() : '';
    let targetOtpEmail = authEmail;
    let uid = null;
    const tempAuth = getTempAuth();

    if (activeTab === 'cadet') {
        if (!emailOrEnrollId) throw new Error('Regimental / Enrollment ID is required for Cadet login.');
        const cleanId = emailOrEnrollId.trim().toUpperCase();

        const usersRef = getUsersRef();
        const q = query(usersRef, where('enrollmentId', '==', cleanId));
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            throw new Error(`Regimental Number "${cleanId}" not found or not registered.`);
        }

        const userData = userSnapshot.docs[0].data();
        authEmail = userData.email;

        if (!authEmail) {
            throw new Error('User profile error. Please contact unit administrator.');
        }

        // Authenticate password on isolated tempAuth
        const credential = await signInWithEmailAndPassword(tempAuth, authEmail, password);
        uid = credential.user.uid;

        // Lookup Cadet Personal Email (from bulk import / profile in cadets collection)
        try {
            const cadetsRef = collection(db, 'artifacts', appId, 'public', 'data', 'cadets');
            const cadetQuery = query(cadetsRef, where('enrollmentId', '==', cleanId));
            const cadetSnap = await getDocs(cadetQuery);
            if (!cadetSnap.empty) {
                const cadetData = cadetSnap.docs[0].data();
                const pEmail = (cadetData.personalEmail || cadetData.email || '').toString().trim();
                const isValidPersonal = pEmail && pEmail !== '-' && pEmail !== 'N/A' && !pEmail.endsWith('@ncc-14a.web');
                if (isValidPersonal) {
                    targetOtpEmail = pEmail;
                } else if (cadetData.collegeEmail && cadetData.collegeEmail !== '-' && cadetData.collegeEmail !== 'N/A') {
                    targetOtpEmail = cadetData.collegeEmail.trim();
                } else {
                    targetOtpEmail = authEmail;
                }
            }
        } catch (err) {
            console.error('Error retrieving cadet personal email for OTP:', err);
            targetOtpEmail = authEmail;
        }

    } else {
        // Admin / ANO / Staff Login
        if (!authEmail) throw new Error('Email address is required for login.');
        const cleanEmail = authEmail.trim().toLowerCase();
        const credential = await signInWithEmailAndPassword(tempAuth, cleanEmail, password);
        uid = credential.user.uid;
        targetOtpEmail = (credential.user.email || cleanEmail).trim().toLowerCase();
    }

    if (!targetOtpEmail) {
        targetOtpEmail = authEmail.trim().toLowerCase();
    }

    // Generate & store OTP in Firestore
    const otp = await generateUserOTP(uid, targetOtpEmail);

    // Dispatch OTP via EmailJS
    try {
        const expiresTime = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        await emailjs.send(
            'service_hk68vnz',
            'template_5a7vqzw',
            {
                email: targetOtpEmail,
                to_email: targetOtpEmail,
                user_email: targetOtpEmail,
                recipient: targetOtpEmail,
                reply_to: targetOtpEmail,
                to_name: targetOtpEmail.split('@')[0],
                passcode: otp,
                otp_code: otp,
                otp: otp,
                time: expiresTime
            },
            'iCSap5JY6cLaHx2wc'
        );
        console.log(`2FA OTP Email successfully sent to ${targetOtpEmail} via EmailJS`);
    } catch (e) {
        console.error('EmailJS Error:', e);
        console.warn(`[OTP Backup] Target ${targetOtpEmail}: ${otp}`);
    }

    // Sign out isolated tempAuth
    await signOut(tempAuth).catch(() => {});

    return { uid, email: targetOtpEmail, authEmail };
};

/**
 * Backward compatibility alias for Admin OTP login
 */
export const loginAdminWithOTP = (email, password) => loginUserWithOTP(email, password, 'admin');

/**
 * Triggers the operating system's native default fingerprint / biometric prompt (Windows Hello, Touch ID, Android biometrics)
 */
export const triggerNativeOsFingerprintPrompt = async (anoEmail) => {
    if (!window.PublicKeyCredential) {
        throw new Error('Biometric Fingerprint Authentication is not supported by this browser.');
    }

    try {
        const isAvailable = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        if (!isAvailable) {
            console.warn('Platform authenticator availability check returned false; attempting WebAuthn prompt anyway.');
        }
    } catch (e) {
        console.warn('Authenticator availability check skipped:', e);
    }

    const cleanEmail = (anoEmail || 'ano@ncc.unit').trim().toLowerCase();
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);

    let domain = window.location.hostname;
    if (domain === 'localhost' || domain.includes('127.0.0.1')) {
        domain = 'localhost';
    }

    // Primary: Prompt native OS to register/authenticate platform fingerprint credential (Windows Hello / Touch ID / Android)
    const createOptions = {
        publicKey: {
            challenge,
            rp: {
                name: "14(A) BN NCC Portal",
                id: domain,
            },
            user: {
                id: Uint8Array.from(cleanEmail, c => c.charCodeAt(0)),
                name: cleanEmail,
                displayName: `ANO (${cleanEmail})`,
            },
            pubKeyCredParams: [
                { alg: -7, type: "public-key" },  // ES256
                { alg: -257, type: "public-key" } // RS256
            ],
            authenticatorSelection: {
                authenticatorAttachment: "platform", // Forces native OS biometric sensor (Windows Hello / Touch ID)
                userVerification: "required",        // Require fingerprint/face
            },
            timeout: 60000,
        }
    };

    try {
        // Launches native OS default fingerprint prompt!
        return await navigator.credentials.create(createOptions);
    } catch (createErr) {
        console.warn('create failed, trying get:', createErr);

        // If user explicitly cancelled the native OS popup
        if (createErr.name === 'NotAllowedError' && createErr.message?.toLowerCase().includes('cancel')) {
            throw new Error('OS Fingerprint prompt was cancelled by user.');
        }

        // Secondary fallback: Try fetching existing assertion from native OS authenticator
        try {
            const getOptions = {
                publicKey: {
                    challenge,
                    rpId: domain,
                    userVerification: 'required',
                    timeout: 60000,
                }
            };
            return await navigator.credentials.get(getOptions);
        } catch (getErr) {
            console.error('OS Fingerprint get error:', getErr);
            if (getErr.name === 'NotAllowedError') {
                throw new Error('OS Fingerprint prompt was cancelled or not recognized. Please scan your fingerprint on the Windows Hello / Touch ID popup.');
            }
            throw new Error(createErr.message || getErr.message || 'Native OS Fingerprint Authentication failed.');
        }
    }
};

/**
 * ANO Biometric Fingerprint login:
 * Validate password credentials with Firebase Auth, then immediately launch the OS default fingerprint prompt (Windows Hello / Touch ID / Android).
 * If OS fingerprint scan fails or is cancelled, sign out immediately so user is NOT logged in.
 */
export const loginAnoWithBiometrics = async (email, password) => {
    if (!email) throw new Error('Email address is required for ANO login.');
    const cleanEmail = email.trim().toLowerCase();

    // 1. Validate password credentials with Firebase Auth
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const anoEmail = credential.user.email || cleanEmail;

    // 2. Trigger native OS default fingerprint prompt directly (Windows Hello / Touch ID / Android)
    try {
        await triggerNativeOsFingerprintPrompt(anoEmail);
    } catch (bioErr) {
        // If native OS fingerprint fails or is cancelled, sign out immediately so user is NOT logged in!
        await signOut(auth);
        throw bioErr;
    }

    // 3. Native OS Fingerprint scan passed — user is now logged in!
    return credential.user;
};

export const loginUser = async (email, password, enrollmentId, activeTab) => {
    if (activeTab === 'admin' || activeTab === 'ano') {
        if (!email) throw new Error('Email is required for login.');
        return await signInWithEmailAndPassword(auth, email, password);
    }

    if (activeTab === 'cadet') {
        if (!enrollmentId)
            throw new Error('Enrollment ID is required for cadet login.');

        const usersRef = getUsersRef();
        const q = query(
            usersRef,
            where('enrollmentId', '==', enrollmentId.trim())
        );
        const userSnapshot = await getDocs(q);

        if (userSnapshot.empty) {
            throw new Error(
                `Enrollment ID "${enrollmentId}" not found or not registered.`
            );
        }

        const userData = userSnapshot.docs[0].data();
        const userEmail = userData.email;

        if (!userEmail) {
            throw new Error(
                'User profile is corrupt. Please contact administrator.'
            );
        }

        return await signInWithEmailAndPassword(auth, userEmail, password);
    }
};

const getActiveTenantId = () => {
    try {
        const hostname = window.location.hostname;
        let subdomain = 'gmrit';
        if (hostname !== 'localhost' && !hostname.includes('firebaseapp.com') && !hostname.includes('web.app')) {
            const parts = hostname.split('.');
            if (parts.length >= 3) {
                subdomain = parts[0];
            }
        } else {
            const params = new URLSearchParams(window.location.search);
            subdomain = params.get('unit') || 'gmrit';
        }
        return subdomain;
    } catch (e) {
        return '14a-bn-srikakulam';
    }
};

export const signupUser = async (email, password, enrollmentId, activeTab, name) => {
    const usersRef = getUsersRef();

    if (activeTab === 'admin') {
        if (!email) throw new Error('Email is required for admin signup.');

        const institutionId = getActiveTenantId();
        const cleanEmail = email.trim().toLowerCase();

        // Security check: Verify if the email is pre-authorized to register as an admin
        let isAuthorized = false;

        // 1. Battalion Admins are allowed to bootstrap/bypass
        if (institutionId === '14a-bn-srikakulam') {
            isAuthorized = true;
        } else {
            // 2. Check if email matches the college unit's contactEmail
            try {
                const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
                const unitSnap = await getDoc(doc(unitsRef, institutionId));
                if (unitSnap.exists() && unitSnap.data().contactEmail?.trim().toLowerCase() === cleanEmail) {
                    isAuthorized = true;
                }
            } catch (err) {
                console.error('Error checking unit contactEmail:', err);
            }

            // 3. Check if email matches an existing staff member in this unit
            if (!isAuthorized) {
                try {
                    const staffRef = collection(db, 'artifacts', appId, 'public', 'data', 'staff');
                    const staffQuery = query(staffRef, where('institutionId', '==', institutionId), where('email', '==', cleanEmail));
                    const staffSnap = await getDocs(staffQuery);
                    if (!staffSnap.empty) {
                        isAuthorized = true;
                    }
                } catch (err) {
                    console.error('Error checking staff authorization:', err);
                }
            }
        }

        if (!isAuthorized) {
            throw new Error(
                `Registration Blocked: Email "${email}" is not pre-authorized as an ANO/Staff for this college. ` +
                `Please contact the Battalion Administrator (14(A) BN NCC SKLM) to register.`
            );
        }

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                cleanEmail,
                password
            );
            const newUser = userCredential.user;

            await setDoc(doc(usersRef, newUser.uid), {
                role: 'admin',
                email: newUser.email,
                institutionId: institutionId,
            }, { merge: true });
        } catch (authErr) {
            if (authErr.code === 'auth/email-already-in-use') {
                // If pre-authorized ANO account already existed in Firebase Auth (e.g. from previous deleted profile),
                // automatically reclaim and assign the new password & custom claims via backend Admin API
                const apiUrl = typeof window !== 'undefined' && window.location?.hostname?.includes('vercel.app') 
                    ? '/api/updateUserCredentials' 
                    : 'https://ncc-portal-redesign.vercel.app/api/updateUserCredentials';

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'reclaim',
                        currentEmail: cleanEmail,
                        newPassword: password,
                        institutionId: institutionId,
                        role: 'admin'
                    })
                });

                const data = await res.json();
                if (!res.ok || !data.success) {
                    throw new Error(data?.error || 'This email address is already in use by another account.');
                }
            } else {
                throw authErr;
            }
        }
    } else if (activeTab === 'cadet') {
        if (!enrollmentId)
            throw new Error('Enrollment ID is required for cadet signup.');
        const trimmedId = enrollmentId.trim().toUpperCase();

        // ── Step 1: Verify the regimental number exists in the admin's cadet roster ──
        const cadetsRef = collection(db, 'artifacts', appId, 'public', 'data', 'cadets');
        const rosterQuery = query(cadetsRef, where('enrollmentId', '==', trimmedId));
        const rosterSnap = await getDocs(rosterQuery);

        if (rosterSnap.empty) {
            // Regimental number NOT found in admin roster — block registration
            throw new Error(
                `Regimental Number "${trimmedId}" is not found in the cadet roster. ` +
                `Please contact your Admin/ANO to be added before registering.`
            );
        }

        // ── Step 2: Check if this regimental number is already registered ──
        const existingUserQuery = query(usersRef, where('enrollmentId', '==', trimmedId));
        const existingUserSnap = await getDocs(existingUserQuery);
        if (!existingUserSnap.empty) {
            throw new Error(
                `Regimental Number "${trimmedId}" is already registered. ` +
                `Please log in or use the Reset Password option.`
            );
        }

        // ── Step 3: Determine the email to use for Firebase Auth ──
        const rosterData = rosterSnap.docs[0].data();
        const hasRealEmail =
            rosterData.personalEmail &&
            rosterData.personalEmail !== '-' &&
            rosterData.personalEmail !== 'N/A' &&
            rosterData.personalEmail.trim() !== '';

        const targetEmail = hasRealEmail
            ? rosterData.personalEmail.trim()
            : `${trimmedId.toLowerCase()}@ncc-14a.web`;

        // ── Step 4: Create the Firebase Auth account ──
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            targetEmail,
            password
        );
        const newUser = userCredential.user;

        // ── Step 5: Create the Firestore user profile ──
        await setDoc(doc(usersRef, newUser.uid), {
            role: 'cadet',
            email: targetEmail,
            enrollmentId: trimmedId,
            institutionId: rosterData.institutionId || '14a-bn-srikakulam',
            fullName: name || rosterData.name || 'New Cadet',
            delegatedModules: rosterData.delegatedModules || []
        });
    }

    // Sign out user immediately after signup
    await signOut(auth);
};

export const logoutUser = async () => {
    await signOut(auth);
};

export const logoutAllDevices = async () => {
    const user = auth.currentUser;
    if (user) {
        const usersRef = getUsersRef();
        try {
            await setDoc(doc(usersRef, user.uid), { lastLogoutTime: serverTimestamp() }, { merge: true });
        } catch (error) {
            console.error('Error setting lastLogoutTime:', error);
        }
    }
    await signOut(auth);
};

// --- Password Reset for Admin ---
export const initiatePasswordReset = async (email) => {
    if (!email) {
        throw new Error('Email address is required to reset the password.');
    }
    await sendPasswordResetEmail(auth, email);
};

// --- MODIFIED: Cadet Password Reset to use realEmail and actionCodeSettings ---
export const initiateCadetPasswordReset = async (enrollmentId) => {
    if (!enrollmentId) {
        throw new Error('Enrollment ID is required.');
    }

    const usersRef = getUsersRef();
    const q = query(usersRef, where('enrollmentId', '==', enrollmentId.trim().toUpperCase()));
    const userSnapshot = await getDocs(q);

    if (userSnapshot.empty) {
        throw new Error(
            `Regimental Number "${enrollmentId}" is not yet registered. Please Sign Up first.`
        );
    }

    const userData = userSnapshot.docs[0].data();
    const userEmail = userData.email; 

    if (!userEmail || userEmail.includes('@ncc-14a.web')) {
        throw new Error('This account is using an older verification method. Please contact your Admin to update your email address.');
    }

    const actionCodeSettings = {
        url: 'https://gmrit-ncc-fb1df.web.app/login',
        handleCodeInApp: true,
    };

    await sendPasswordResetEmail(auth, userEmail, actionCodeSettings);
    return userEmail;
};

/**
 * Creates an ANO account (Firebase Auth and Firestore users document)
 * using a secondary App instance so that the active administrator is not signed out.
 */
export const createANOAccount = async (email, password, institutionId) => {
    if (!email || !password || !institutionId) {
        throw new Error('Email, password, and institution association are required.');
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Initialize temporary app to avoid signing out the current logged-in admin
    const tempApp = initializeApp(firebaseConfig, `tempApp_${Date.now()}`);
    const tempAuth = getAuth(tempApp);

    try {
        let authUid = null;
        try {
            // 2. Create the user account in Firebase Auth
            const credential = await createUserWithEmailAndPassword(tempAuth, cleanEmail, password);
            authUid = credential.user.uid;
            await signOut(tempAuth);
        } catch (createErr) {
            if (createErr.code === 'auth/email-already-in-use') {
                // Pre-authorized ANO account already existed in Auth; reclaim via Admin API
                const apiUrl = typeof window !== 'undefined' && window.location?.hostname?.includes('vercel.app') 
                    ? '/api/updateUserCredentials' 
                    : 'https://ncc-portal-redesign.vercel.app/api/updateUserCredentials';

                const res = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        action: 'reclaim',
                        currentEmail: cleanEmail,
                        newPassword: password,
                        institutionId: institutionId,
                        role: 'admin'
                    })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    authUid = data.uid;
                } else {
                    throw createErr;
                }
            } else {
                throw createErr;
            }
        }

        // 4. Create or update the Firestore user profile document
        if (authUid) {
            const usersRef = getUsersRef();
            await setDoc(doc(usersRef, authUid), {
                role: 'admin',
                email: cleanEmail,
                institutionId: institutionId,
            }, { merge: true });
        }

        // 5. Clean up temporary app instance
        await deleteApp(tempApp);
        
        return authUid;
    } catch (error) {
        try {
            await deleteApp(tempApp);
        } catch (e) {
            console.error('Error cleaning up tempApp:', e);
        }
        throw error;
    }
};
