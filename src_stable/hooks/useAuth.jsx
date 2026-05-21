// src/hooks/useAuth.jsx
import { useState, useEffect, useRef } from 'react';
import { auth, db, appId } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, collection, updateDoc } from 'firebase/firestore';
import {
    loginUser,
    signupUser,
    logoutUser,
    loginAdminWithOTP,
} from '../firebase/authService';
import {
    updateUserLastViewedAnnouncements,
    updateUserLastViewedNotifications,
    registerSession,
    updateSessionActivity,
    terminateSession,
    verifyAdminOTP,
    clearAdminOTP,
    logAuditEvent,
} from '../firebase/firestoreService';

export const useAuth = () => {
    const [user, setUser] = useState(null);
    const [userRole, setUserRole] = useState(null);
    const [userEnrollmentId, setUserEnrollmentId] = useState(null);
    const [userName, setUserName] = useState(null);
    const [userInstitutionId, setUserInstitutionId] = useState(null);
    const [userDelegatedModules, setUserDelegatedModules] = useState([]);
    const [lastViewedAnnouncements, setLastViewedAnnouncements] = useState(null);
    const [lastViewedNotifications, setLastViewedNotifications] = useState(null);

    const [authLoading, setAuthLoading] = useState(true);
    const [authError, setAuthError] = useState(null);
    const [signupSuccess, setSignupSuccess] = useState(false);

    // ── OTP 2FA state (admin only) ──
    const [otpPending, setOtpPending] = useState(false);
    const [otpUid, setOtpUid] = useState(null);
    const [otpEmail, setOtpEmail] = useState(null);
    const [otpLoading, setOtpLoading] = useState(false);
    // Store credentials temporarily for step 2 re-login
    const pendingCredRef = useRef(null);

    // ── Session tracking ──
    const sessionIdRef = useRef(null);
    const heartbeatRef = useRef(null);

    const startHeartbeat = (sessionId) => {
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
        heartbeatRef.current = setInterval(() => {
            updateSessionActivity(sessionId);
        }, 5 * 60 * 1000);
    };

    const stopHeartbeat = () => {
        if (heartbeatRef.current) {
            clearInterval(heartbeatRef.current);
            heartbeatRef.current = null;
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setAuthLoading(true);
            if (currentUser) {
                setUser(currentUser);

                let customRole = null;
                let customInstitutionId = null;
                try {
                    const idTokenResult = await currentUser.getIdTokenResult();
                    if (idTokenResult.claims.role) customRole = idTokenResult.claims.role;
                    if (idTokenResult.claims.institutionId) customInstitutionId = idTokenResult.claims.institutionId;
                } catch (e) {
                    console.error('Error fetching custom claims:', e);
                }

                const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
                const userDocRef = doc(usersRef, currentUser.uid);
                try {
                    const userDocSnap = await getDoc(userDocRef);
                    if (userDocSnap.exists()) {
                        const userData = userDocSnap.data();
                        let finalInstitutionId = customInstitutionId || userData.institutionId || '14a-bn-srikakulam';

                        if (userData.institutionId && userData.institutionId !== '14a-bn-srikakulam') {
                            finalInstitutionId = '14a-bn-srikakulam';
                            try {
                                await updateDoc(userDocRef, { institutionId: '14a-bn-srikakulam' });
                            } catch (e) {
                                console.error('Failed to auto-heal user institutionId:', e);
                            }
                        }

                        const role = customRole || userData.role;
                        setUserRole(role);
                        setUserInstitutionId(finalInstitutionId);
                        setUserEnrollmentId(userData.enrollmentId || null);
                        setUserName(userData.fullName || userData.name || null);
                        setUserDelegatedModules(userData.delegatedModules || []);

                        if (userData.lastViewedAnnouncements) {
                            setLastViewedAnnouncements(userData.lastViewedAnnouncements.toDate());
                        } else {
                            setLastViewedAnnouncements(new Date(0));
                        }
                        if (userData.lastViewedNotifications) {
                            setLastViewedNotifications(userData.lastViewedNotifications.toDate());
                        } else {
                            setLastViewedNotifications(new Date(0));
                        }

                        // Register session & start heartbeat
                        if (!sessionIdRef.current) {
                            const sId = await registerSession({
                                uid: currentUser.uid,
                                role,
                                email: currentUser.email,
                            });
                            sessionIdRef.current = sId;
                            if (sId) startHeartbeat(sId);
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
                setUserName(null);
                setUserDelegatedModules([]);
                setLastViewedAnnouncements(null);
                stopHeartbeat();
                sessionIdRef.current = null;
            }
            setAuthLoading(false);
            setAuthError(null);
        });
        return () => {
            unsubscribe();
            stopHeartbeat();
        };
    }, []);

    // ── Step 1: Admin login → trigger OTP ──────────────────────────────────
    const handleAdminLoginStep1 = async (email, password) => {
        setAuthLoading(true);
        setAuthError(null);
        setOtpPending(true); // Pre-emptively block Dashboard from loading during the auth handshake
        try {
            const { uid, email: userEmail } = await loginAdminWithOTP(email, password);
            pendingCredRef.current = { email, password };
            setOtpUid(uid);
            setOtpEmail(userEmail);
            setAuthLoading(false);
            return true;
        } catch (e) {
            setOtpPending(false); // Revert if login failed
            if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                setAuthError('Invalid credentials. Please check your email and password.');
            } else {
                setAuthError(e.message);
            }
            setAuthLoading(false);
            return false;
        }
    };

    // ── Step 2: Verify OTP → complete real login ────────────────────────────
    const handleAdminLoginStep2 = async (inputOtp) => {
        setOtpLoading(true);
        setAuthError(null);
        try {
            await verifyAdminOTP(otpUid, inputOtp);

            const { email: adminEmail, password: adminPassword } = pendingCredRef.current || {};
            await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
            
            // Now that we are authenticated again, we can clear the OTP from the database
            await clearAdminOTP(otpUid);

            await logAuditEvent({
                action: 'OTP_VERIFIED',
                collection: 'auth',
                summary: `Admin ${adminEmail} completed 2FA login`,
                adminUid: otpUid,
                adminEmail,
            });

            pendingCredRef.current = null;
            setOtpPending(false);
            setOtpUid(null);
            setOtpEmail(null);
        } catch (e) {
            setAuthError(e.message);
        }
        setOtpLoading(false);
    };

    const cancelOtp = () => {
        setOtpPending(false);
        setOtpUid(null);
        setOtpEmail(null);
        pendingCredRef.current = null;
        setAuthError(null);
    };

    const handleLogin = async (email, pass, enrollId, tab) => {
        setAuthLoading(true);
        setAuthError(null);
        setSignupSuccess(false);
        try {
            if (tab === 'admin') {
                await handleAdminLoginStep1(email, pass);
                return;
            }
            await loginUser(email, pass, enrollId, tab);
        } catch (e) {
            if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                setAuthError('Invalid credentials. Please check your username and password.');
            } else {
                setAuthError(e.message);
            }
            setAuthLoading(false);
        }
    };

    const handleSignup = async (email, pass, enrollId, tab, name) => {
        setAuthLoading(true);
        setAuthError(null);
        try {
            await signupUser(email, pass, enrollId, tab, name);
            setSignupSuccess(true);
        } catch (e) {
            if (e.code === 'auth/email-already-in-use') {
                setAuthError(tab === 'cadet'
                    ? `Enrollment ID "${enrollId}" is already registered.`
                    : 'This email address is already in use.');
            } else {
                setAuthError(e.message);
            }
        }
        setAuthLoading(false);
    };

    const handleLogout = async () => {
        try {
            stopHeartbeat();
            if (sessionIdRef.current) {
                await terminateSession(sessionIdRef.current);
                sessionIdRef.current = null;
            }
            await logoutUser();
            setSignupSuccess(false);
        } catch (e) {
            setAuthError(e.message);
        }
    };

    const markAnnouncementsAsRead = async () => {
        if (!user || userRole !== 'cadet') return;
        try {
            await updateUserLastViewedAnnouncements(user.uid);
            setLastViewedAnnouncements(new Date());
        } catch (error) {
            console.error('Failed to update last viewed timestamp:', error);
        }
    };

    const markNotificationsAsRead = async () => {
        if (!user || userRole !== 'cadet') return;
        try {
            await updateUserLastViewedNotifications(user.uid);
            setLastViewedNotifications(new Date());
        } catch (error) {
            console.error('Failed to update last viewed notification timestamp:', error);
        }
    };

    const hasPermission = (moduleId) => {
        if (userRole === 'admin') return true;
        return userDelegatedModules.includes(moduleId);
    };

    return {
        user,
        userRole,
        userEnrollmentId,
        userName,
        userInstitutionId,
        userDelegatedModules,
        hasPermission,
        authLoading,
        authError,
        setAuthError,
        signupSuccess,
        setSignupSuccess,
        handleLogin,
        handleSignup,
        handleLogout,
        lastViewedAnnouncements,
        markAnnouncementsAsRead,
        lastViewedNotifications,
        markNotificationsAsRead,
        // OTP 2FA
        otpPending,
        otpEmail,
        otpLoading,
        handleAdminLoginStep2,
        cancelOtp,
    };
};
