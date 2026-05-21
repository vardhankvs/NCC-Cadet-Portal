// src/firebase/authService.js
import { auth, db, appId } from './config.js';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
} from 'firebase/auth';
import {
    collection,
    query,
    where,
    getDocs,
    setDoc,
    doc,
    addDoc,
    serverTimestamp,
} from 'firebase/firestore';
import { generateAdminOTP } from './firestoreService.js';
import emailjs from '@emailjs/browser';

const getUsersRef = () =>
    collection(db, 'artifacts', appId, 'public', 'data', 'users');

/**
 * Step 1 of admin 2FA login:
 * Verify credentials with Firebase Auth, then immediately sign out,
 * generate a 6-digit OTP, store it in Firestore, and send via email queue.
 * Returns { uid, email } so the UI can show the OTP input step.
 */
export const loginAdminWithOTP = async (email, password) => {
    // 1. Verify credentials
    const credential = await signInWithEmailAndPassword(auth, email, password);
    const uid = credential.user.uid;
    const userEmail = credential.user.email;

    // 2. Generate & store OTP in Firestore (Must be done WHILE logged in to pass security rules)
    const otp = await generateAdminOTP(uid, userEmail);

    // 3. Send the OTP email via EmailJS
    try {
        const expiresTime = new Date(Date.now() + 10 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        await emailjs.send(
            'service_hk68vnz', // Service ID
            'template_5a7vqzw', // Template ID
            {
                email: userEmail,
                passcode: otp,
                time: expiresTime
            },
            'iCSap5JY6cLaHx2wc' // Public Key
        );
        console.log('OTP Email sent successfully via EmailJS');
    } catch (e) {
        console.error('EmailJS Error:', e);
        // Dev fallback — log OTP if email fails
        console.warn(`[DEV OTP] Admin ${userEmail}: ${otp}`);
    }

    // 4. Sign out immediately — user is NOT considered logged in yet for the dashboard
    await signOut(auth);

    return { uid, email: userEmail };
};

export const loginUser = async (email, password, enrollmentId, activeTab) => {
    if (activeTab === 'admin') {
        if (!email) throw new Error('Email is required for admin login.');
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

export const signupUser = async (email, password, enrollmentId, activeTab, name) => {
    const usersRef = getUsersRef();

    if (activeTab === 'admin') {
        if (!email) throw new Error('Email is required for admin signup.');

        const userCredential = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const newUser = userCredential.user;

        await setDoc(doc(usersRef, newUser.uid), {
            role: 'admin',
            email: newUser.email,
            institutionId: '14a-bn-srikakulam', // Multi-Tenancy: Default to 14a-bn-srikakulam
        });
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
