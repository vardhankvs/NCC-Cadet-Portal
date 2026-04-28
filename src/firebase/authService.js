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
} from 'firebase/firestore';

const getUsersRef = () =>
    collection(db, 'artifacts', appId, 'public', 'data', 'users');

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

export const signupUser = async (email, password, enrollmentId, activeTab) => {
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
            institutionId: 'gmrit', // Multi-Tenancy: Default to gmrit for now
        });
    } else if (activeTab === 'cadet') {
        if (!enrollmentId)
            throw new Error('Enrollment ID is required for cadet signup.');
        const trimmedId = enrollmentId.trim();

        const existingUserQuery = query(
            usersRef,
            where('enrollmentId', '==', trimmedId)
        );
        const existingUserSnapshot = await getDocs(existingUserQuery);
        if (!existingUserSnapshot.empty) {
            throw new Error(
                `Enrollment ID "${trimmedId}" is already registered by another user.`
            );
        }

        const fakeEmail = `${trimmedId.toLowerCase()}@ncc-gmrit.web`;
        const userCredential = await createUserWithEmailAndPassword(
            auth,
            fakeEmail,
            password
        );
        const newUser = userCredential.user;

        await setDoc(doc(usersRef, newUser.uid), {
            role: 'cadet',
            email: fakeEmail,
            enrollmentId: trimmedId,
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
export const initiateCadetPasswordReset = async (enrollmentId, realEmail) => {
    if (!enrollmentId || !realEmail) {
        throw new Error('Enrollment ID and Email are required.');
    }

    const usersRef = getUsersRef();
    const q = query(usersRef, where('enrollmentId', '==', enrollmentId.trim()));
    const userSnapshot = await getDocs(q);

    if (userSnapshot.empty) {
        throw new Error(
            `Enrollment ID "${enrollmentId}" not found. Cannot proceed.`
        );
    }

    const userData = userSnapshot.docs[0].data();
    const userFirebaseEmail = userData.email; // The 'fake' email tied to the Firebase Auth account

    if (!userFirebaseEmail) {
        throw new Error('User profile is corrupt. Contact administrator.');
    }

    // 1. Define the action code settings. This is what tells Firebase where to redirect.
    // NOTE: This MUST match one of the Authorized Domains in your Firebase console.
    const actionCodeSettings = {
        // Use your app's URL. Use localhost for testing.
        url: `http://localhost:5173`, // <-- Make sure this port (5173) is correct!
        handleCodeInApp: true,
    };

    // 2. Send the reset link to the real email address provided by the cadet.
    // Firebase sends the email to 'realEmail' but links it to the 'userFirebaseEmail' account.
    await sendPasswordResetEmail(auth, userFirebaseEmail, {
        ...actionCodeSettings,
        email: realEmail,
    });
};
