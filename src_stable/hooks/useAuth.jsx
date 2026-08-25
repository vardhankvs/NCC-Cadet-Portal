import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { auth, db, appId } from '../firebase/config';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, onSnapshot, collection, updateDoc, query, where, getDocs } from 'firebase/firestore';
import {
    loginUser,
    signupUser,
    logoutUser,
    logoutAllDevices,
    loginAdminWithOTP,
    loginUserWithOTP,
    loginAnoWithBiometrics,
} from '../firebase/authService';
import {
    updateUserLastViewedAnnouncements,
    updateUserLastViewedNotifications,
    registerSession,
    updateSessionActivity,
    terminateSession,
    verifyAdminOTP,
    clearAdminOTP,
    verifyUserOTP,
    clearUserOTP,
    verifyAnoBiometricSession,
    clearAnoBiometricSession,
    logAuditEvent,
} from '../firebase/firestoreService';
import { useTenant } from '../context/TenantContext';

export const useAuth = () => {
    const { tenant } = useTenant();
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

    // ── OTP 2FA state (Cadet & Admin) ──
    const [otpPending, setOtpPending] = useState(false);
    const [otpUid, setOtpUid] = useState(null);
    const [otpEmail, setOtpEmail] = useState(null);
    const [otpLoading, setOtpLoading] = useState(false);

    // ── Fingerprint Biometric state (ANO only) ──
    const [fingerprintPending, setFingerprintPending] = useState(false);
    const [fingerprintUid, setFingerprintUid] = useState(null);
    const [fingerprintEmail, setFingerprintEmail] = useState(null);
    const [fingerprintLoading, setFingerprintLoading] = useState(false);

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

                // One-time fetch to bootstrap the UI
                try {
                    const userDocSnap = await getDoc(userDocRef);
                    let userData;
                    if (userDocSnap.exists()) {
                        userData = userDocSnap.data();
                    } else {
                        console.warn('User doc not found, logging out.');
                        setUserRole(null);
                        setUserInstitutionId(null);
                        await logoutUser();
                        return;
                    }

                    if (userData) {
                        // Check if global logout or credentials update occurred after this sign-in
                        const changeTimestamp = userData.credentialsChangedAt || userData.lastLogoutTime;
                        if (changeTimestamp) {
                            const changeTime = changeTimestamp.toDate ? changeTimestamp.toDate() : new Date(changeTimestamp);
                            const signInTime = new Date(currentUser.metadata.lastSignInTime);
                            if (changeTime > signInTime) {
                                console.warn('Session invalidated due to credentials update by administrator.');
                                toast.warning('Your login credentials were changed by the Battalion Administrator. Please log in with your updated credentials.');
                                setUserRole(null);
                                setUserInstitutionId(null);
                                await logoutUser();
                                return;
                            }
                        }

                        let finalInstitutionId = customInstitutionId || userData.institutionId;

                        // Query official roster/staff directory to sync/verify the correct institutionId
                        const userRoleVal = customRole || userData.role;
                        if (userRoleVal === 'cadet' && userData.enrollmentId) {
                            try {
                                const cadetsRef = collection(db, 'artifacts', appId, 'public', 'data', 'cadets');
                                const rosterQuery = query(cadetsRef, where('enrollmentId', '==', userData.enrollmentId.trim().toUpperCase()));
                                const rosterSnap = await getDocs(rosterQuery);
                                if (!rosterSnap.empty) {
                                    const officialInstitutionId = rosterSnap.docs[0].data().institutionId;
                                    if (officialInstitutionId && officialInstitutionId !== finalInstitutionId) {
                                        finalInstitutionId = officialInstitutionId;
                                        await updateDoc(userDocRef, { institutionId: officialInstitutionId });
                                        console.log(`Synced cadet institutionId to official roster: ${officialInstitutionId}`);
                                    }
                                }
                            } catch (err) {
                                console.error('Error syncing institutionId for cadet:', err);
                            }
                        } else if (userRoleVal === 'admin' && userData.email) {
                            try {
                                const staffRef = collection(db, 'artifacts', appId, 'public', 'data', 'staff');
                                const staffQuery = query(staffRef, where('email', '==', userData.email.trim().toLowerCase()));
                                const staffSnap = await getDocs(staffQuery);
                                if (!staffSnap.empty) {
                                    const officialInstitutionId = staffSnap.docs[0].data().institutionId;
                                    if (officialInstitutionId && officialInstitutionId !== finalInstitutionId) {
                                        finalInstitutionId = officialInstitutionId;
                                        await updateDoc(userDocRef, { institutionId: officialInstitutionId });
                                        console.log(`Synced admin/staff institutionId to official staff directory: ${officialInstitutionId}`);
                                    }
                                }
                            } catch (err) {
                                console.error('Error syncing institutionId for staff:', err);
                            }
                        }

                        if (!finalInstitutionId) {
                            finalInstitutionId = '14a-bn-srikakulam';
                        }

                        const role = customRole || userData.role;

                        // Restrict non-battalion users to their own subdomain/institution portal
                        if (role !== 'superadmin' && role !== 'battalion_admin' && finalInstitutionId !== tenant?.subdomain) {
                            console.warn(`Redirecting User: User institution (${finalInstitutionId}) does not match current portal (${tenant?.subdomain})`);
                            
                            const hostname = window.location.hostname;
                            const url = new URL(window.location.href);
                            
                            if (hostname !== 'localhost' && !hostname.includes('firebaseapp.com') && !hostname.includes('web.app')) {
                                const parts = hostname.split('.');
                                if (parts.length >= 3) {
                                    parts[0] = finalInstitutionId;
                                    url.hostname = parts.join('.');
                                } else {
                                    url.searchParams.set('unit', finalInstitutionId);
                                }
                            } else {
                                url.searchParams.set('unit', finalInstitutionId);
                            }
                            
                            window.location.href = url.toString();
                            return;
                        }

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
            setAuthError(prev => prev && prev.includes('Access Denied') ? prev : null);
        });
        return () => {
            unsubscribe();
            stopHeartbeat();
        };
    }, []);

    // ── Dedicated real-time listener for "Logout from all devices" & Credentials Updates ──
    // This is a separate useEffect that depends on [user].
    // It is guaranteed to run fresh every time the user logs in,
    // and is cleaned up automatically when the user logs out.
    useEffect(() => {
        if (!user) return;

        const signInTime = new Date(user.metadata.lastSignInTime);
        const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
        const userDocRef = doc(usersRef, user.uid);

        const unsubscribeSnapshot = onSnapshot(userDocRef, async (snap) => {
            if (!snap.exists()) {
                console.warn('User profile document removed by administrator — signing out active session.');
                stopHeartbeat();
                if (sessionIdRef.current) {
                    await terminateSession(sessionIdRef.current);
                    sessionIdRef.current = null;
                }
                toast.error('Your account has been removed by the Battalion Administrator. Session ended.', { autoClose: 6000 });
                await logoutUser();
                return;
            }

            const data = snap.data();

            // 1. If email was changed by admin and no longer matches current auth user email
            if (data.email && user.email && data.email.trim().toLowerCase() !== user.email.trim().toLowerCase()) {
                console.warn('Account email changed by administrator — signing out active session.');
                stopHeartbeat();
                if (sessionIdRef.current) {
                    await terminateSession(sessionIdRef.current);
                    sessionIdRef.current = null;
                }
                toast.warning('Your login email was updated by the Battalion Administrator. You have been logged out. Please log in with your updated email.', { autoClose: 7000 });
                await logoutUser();
                return;
            }

            // 2. If credentials were changed or global logout was triggered after sign-in
            const changeTimestamp = data.credentialsChangedAt || data.lastLogoutTime;
            if (changeTimestamp) {
                const changeTime = changeTimestamp.toDate ? changeTimestamp.toDate() : new Date(changeTimestamp);
                if (changeTime > signInTime) {
                    console.warn('Credentials changed or global logout triggered — signing out active session now.');
                    stopHeartbeat();
                    if (sessionIdRef.current) {
                        await terminateSession(sessionIdRef.current);
                        sessionIdRef.current = null;
                    }
                    const msg = data.sessionRevokedReason === 'credentials_changed'
                        ? 'Your login credentials were changed by the Battalion Administrator. You have been logged out automatically. Please log in with your updated credentials.'
                        : 'Session invalidated by administrator. Please log in again.';
                    toast.warning(msg, { autoClose: 8000 });
                    await logoutUser();
                    return;
                }
            }
        });

        return () => unsubscribeSnapshot();
    }, [user]);

    // ── Dedicated real-time listener for Active Session Termination ──
    useEffect(() => {
        if (!user || !sessionIdRef.current) return;
        const sessionsRef = collection(db, 'artifacts', appId, 'public', 'data', 'sessions');
        const sessionDocRef = doc(sessionsRef, sessionIdRef.current);

        const unsubSession = onSnapshot(sessionDocRef, async (sSnap) => {
            if (sSnap.exists()) {
                const sData = sSnap.data();
                if (sData.isActive === false) {
                    console.warn('Active session was marked inactive.');
                    stopHeartbeat();
                    sessionIdRef.current = null;
                    toast.warning('Your active session has ended because your credentials or permissions were updated. Please log in again.', { autoClose: 7000 });
                    await logoutUser();
                }
            }
        });

        return () => unsubSession();
    }, [user, sessionIdRef.current]);

    // ── Step 1: Cadet / Admin login → trigger 2FA OTP ──────────────────────
    const handleUserOtpStep1 = async (identifier, password, tab) => {
        setAuthLoading(true);
        setAuthError(null);
        setOtpPending(true);
        try {
            const { uid, email, authEmail } = await loginUserWithOTP(identifier, password, tab);
            pendingCredRef.current = { authEmail, password, tab };
            setOtpUid(uid);
            setOtpEmail(email);
            setAuthLoading(false);
            return true;
        } catch (e) {
            setOtpPending(false);
            if (e.code === 'auth/wrong-password' || e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
                setAuthError(tab === 'cadet' ? 'Invalid credentials. Please check your Regimental ID and password.' : 'Invalid credentials. Please check your email and password.');
            } else {
                setAuthError(e.message);
            }
            setAuthLoading(false);
            return false;
        }
    };

    // ── Step 2: Verify OTP → directly launch OS Native Biometric Fingerprint (Windows Hello / Touch ID / Android) ──
    const handleAdminLoginStep2 = async (inputOtp) => {
        setOtpLoading(true);
        setAuthError(null);
        try {
            await verifyUserOTP(otpUid, inputOtp);

            const { authEmail, password, tab } = pendingCredRef.current || {};
            const currentUid = otpUid;
            const currentEmail = authEmail;

            if (tab === 'admin' || tab === 'ano') {
                // Directly launch Native OS Biometric Fingerprint Prompt (NO UI modal)
                const { triggerNativeOsFingerprintPrompt } = await import('../firebase/authService');
                await triggerNativeOsFingerprintPrompt(currentEmail);

                // ONLY AFTER Native OS Fingerprint succeeds: complete Firebase Auth login!
                await signInWithEmailAndPassword(auth, authEmail, password);

                await clearUserOTP(currentUid).catch(() => {});
                await logAuditEvent({
                    action: 'BIOMETRIC_VERIFIED',
                    collection: 'auth',
                    summary: `Admin/Officer ${currentEmail} completed 3-Stage 2FA (Password + OTP + Native OS Biometrics)`,
                    adminUid: currentUid,
                    adminEmail: currentEmail,
                }).catch(() => {});

                pendingCredRef.current = null;
                setOtpPending(false);
                setOtpUid(null);
                setOtpEmail(null);
            } else {
                // Cadet login complete
                await signInWithEmailAndPassword(auth, authEmail, password);
                await clearUserOTP(currentUid).catch(() => {});
                pendingCredRef.current = null;
                setOtpPending(false);
                setOtpUid(null);
                setOtpEmail(null);
            }
        } catch (e) {
            console.error('2FA Verification Error:', e);
            if (e.message?.includes('cancelled') || e.message?.includes('NotAllowedError')) {
                setAuthError('OS Biometric Fingerprint prompt was cancelled or not recognized. Please try logging in again.');
            } else {
                setAuthError(e.message || 'OTP Verification / Biometric prompt failed.');
            }
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

    const cancelFingerprint = () => {
        setFingerprintPending(false);
        setFingerprintUid(null);
        setFingerprintEmail(null);
        pendingCredRef.current = null;
        setAuthError(null);
    };

    const handleAnoFingerprintVerify = async () => {};

    const handleLogin = async (email, pass, enrollId, tab) => {
        setAuthLoading(true);
        setAuthError(null);
        setSignupSuccess(false);
        try {
            if (tab === 'admin' || tab === 'ano') {
                await handleUserOtpStep1(email, pass, tab);
                return;
            }
            if (tab === 'cadet') {
                await handleUserOtpStep1(enrollId, pass, 'cadet');
                return;
            }
            await loginUser(email, pass, enrollId, tab);
        } catch (e) {
            setAuthError(e.message);
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

    const handleLogoutAllDevices = async () => {
        setAuthLoading(true);
        try {
            stopHeartbeat();
            if (sessionIdRef.current) {
                await terminateSession(sessionIdRef.current);
                sessionIdRef.current = null;
            }
            await logoutAllDevices();
            setSignupSuccess(false);
        } catch (e) {
            setAuthError(e.message);
        }
        setAuthLoading(false);
    };

    const handleDemoLogin = async (role) => {
        setAuthLoading(true);
        setAuthError(null);
        setSignupSuccess(false);
        setOtpPending(false);
        try {
            let email = '';
            if (role === 'cadet') email = 'demo.cadet@ncc.unit';
            else if (role === 'admin') email = 'demo.ano@ncc.unit';
            else if (role === 'superadmin') email = 'demo.admin@ncc.unit';
            
            await signInWithEmailAndPassword(auth, email, 'DemoPass123!');
        } catch (e) {
            console.error('Demo login error:', e);
            setAuthError(e.message);
            setAuthLoading(false);
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
        if (userRole === 'admin' || userRole === 'superadmin' || userRole === 'battalion_admin') return true;
        return userDelegatedModules.includes(moduleId);
    };

    const userProfile = React.useMemo(() => {
        if (!user) return null;
        return {
            id: user.uid,
            name: userName || user.displayName || user.email || 'User',
            enrollmentId: userEnrollmentId || 'N/A',
            email: user.email || '',
            personalEmail: user.email || '',
            phone: user.phoneNumber || '',
            phonePersonal: user.phoneNumber || ''
        };
    }, [user, userName, userEnrollmentId]);

    return {
        user,
        userRole,
        userEnrollmentId,
        userName,
        userProfile,
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
        handleLogoutAllDevices,
        lastViewedAnnouncements,
        markAnnouncementsAsRead,
        lastViewedNotifications,
        markNotificationsAsRead,
        // OTP 2FA & Biometric Stubs (for backward compatibility with cached PWA bundles)
        otpPending,
        otpEmail,
        otpLoading,
        handleAdminLoginStep2,
        cancelOtp,
        fingerprintPending,
        fingerprintEmail,
        fingerprintLoading,
        handleAnoFingerprintVerify,
        cancelFingerprint,
        handleDemoLogin,
    };
};
