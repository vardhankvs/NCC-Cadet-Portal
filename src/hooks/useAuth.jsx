// src/hooks/useAuth.jsx
import { useState, useEffect } from 'react';
import { auth, db, appId } from '../firebase/config';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection } from 'firebase/firestore';
import {
    loginUser,
    signupUser,
    logoutUser,
    // Password reset functions are called from LoginPage, no need to import here
} from '../firebase/authService';
// Import the new update function
import { updateUserLastViewedAnnouncements } from '../firebase/firestoreService';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userEnrollmentId, setUserEnrollmentId] = useState(null);
    const [userInstitutionId, setUserInstitutionId] = useState(null); // MULTI-TENANCY
    // Add new state for last viewed time
    const [lastViewedAnnouncements, setLastViewedAnnouncements] =
        useState(null);

    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [signupSuccess, setSignupSuccess] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setAuthLoading(true);
            if (currentUser) {
                setUser(currentUser);
                
                // Fetch Custom Claims for Multi-Tenancy Roles
                let customRole = null;
                let customInstitutionId = null;
                try {
                    const idTokenResult = await currentUser.getIdTokenResult();
                    if (idTokenResult.claims.role) customRole = idTokenResult.claims.role;
                    if (idTokenResult.claims.institutionId) customInstitutionId = idTokenResult.claims.institutionId;
                } catch (e) {
                    console.error('Error fetching custom claims:', e);
                }

                const usersRef = collection(
                    db,
                    'artifacts',
                    appId,
                    'public',
                    'data',
                    'users'
                );
                const userDocRef = doc(usersRef, currentUser.uid);
                try {
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        
                        // Use Custom Claim if available, else fallback to Firestore Doc
                        setUserRole(customRole || userData.role);
                        setUserInstitutionId(customInstitutionId || userData.institutionId || 'gmrit');
                        setUserEnrollmentId(userData.enrollmentId || null);

                        // Get the last viewed time from Firestore
                        if (userData.lastViewedAnnouncements) {
                            setLastViewedAnnouncements(
                                userData.lastViewedAnnouncements.toDate()
                            );
                        } else {
                            // Default to a very old date if it's never been set
                            setLastViewedAnnouncements(new Date(0));
                        }
                    } else {
                        console.warn('User doc not found, logging out.');
                        setUserRole(null);
                        setUserInstitutionId(null);
                        await logoutUser();
                    }
                } catch (fetchError) {
                    console.error('Error fetching user role:', fetchError);
                    setUserRole(null);
                    setUserInstitutionId(null);
                }
            } else {
                setUser(null);
                setUserRole(null);
                setUserInstitutionId(null);
                setUserEnrollmentId(null);
                setLastViewedAnnouncements(null); // Clear on logout
            }
            setAuthLoading(false);
            setAuthError(null);
        });
        return () => unsubscribe();
    }, []); // Dependency array is empty, runs once

    const handleLogin = async (email, pass, enrollId, tab) => {
        setAuthLoading(true);
        setAuthError(null);
        setSignupSuccess(false);
        try {
            await loginUser(email, pass, enrollId, tab);
            // onAuthStateChanged will handle setting user state
        } catch (e) {
            if (
                e.code === 'auth/wrong-password' ||
                e.code === 'auth/user-not-found' ||
                e.code === 'auth/invalid-credential'
            ) {
                setAuthError(
                    'Invalid credentials. Please check your username and password.'
                );
            } else {
                setAuthError(e.message);
            }
            setAuthLoading(false);
        }
    };

    const handleSignup = async (email, pass, enrollId, tab) => {
        setAuthLoading(true);
        setAuthError(null);
        try {
            await signupUser(email, pass, enrollId, tab);
            setSignupSuccess(true);
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                setAuthError(
                    tab === 'cadet'
                        ? `Enrollment ID "${enrollId}" is already registered.`
                        : 'This email address is already in use.'
                );
            } else {
                setAuthError(e.message);
            }
        }
        setAuthLoading(false);
    };

    const handleLogout = async () => {
        try {
            await logoutUser();
            setSignupSuccess(false);
        } catch (e) {
            setAuthError(e.message);
        }
    };

    // NEW: Function to mark announcements as read
    const markAnnouncementsAsRead = async () => {
        // Only run for logged-in cadets
        if (!user || userRole !== 'cadet') return;

        try {
            // 1. Update Firestore
            await updateUserLastViewedAnnouncements(user.uid);
            // 2. Update local state immediately so UI refreshes
            setLastViewedAnnouncements(new Date());
        } catch (error) {
            console.error('Failed to update last viewed timestamp:', error);
        }
    };

    return {
        user,
        userRole,
        userEnrollmentId,
        userInstitutionId,
        authLoading,
        authError,
        setAuthError,
        signupSuccess,
        setSignupSuccess,
        handleLogin,
        handleSignup,
        handleLogout,

        // Expose new state and function
        lastViewedAnnouncements,
        markAnnouncementsAsRead,
    };
};
