// src/App.jsx
import React, { useState, useEffect } from 'react';
import { useAuthContext } from './context/AuthContext.jsx';
import { LoginPage } from './features/Auth/LoginPage.jsx';
import { Dashboard } from './Dashboard.jsx';
import { LoadingIndicator } from './components/ui/LoadingIndicator.jsx';
import { ResetPasswordHandler } from './features/Auth/ResetPasswordHandler.jsx';
import { LandingPage } from './components/LandingPage.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { VerifyCadet } from './components/VerifyCadet.jsx';

// Firebase Tracking Imports
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getCollectionRef } from './firebase/firestoreService';

// --- 1. Import Toastify CSS and Component ---
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function App() {
    const {
        user,
        userRole,
        authLoading,
        authError,
        setAuthError,
        signupSuccess,
        setSignupSuccess,
        handleLogin,
        handleSignup,
        otpPending,
        otpEmail,
        otpLoading,
        handleAdminLoginStep2,
        handleResendOtp,
        cancelOtp,
        handleDemoLogin,
    } = useAuthContext();

    // Default to 'cadet' or 'phone' tab
    const [activeAuthTab, setAuthTab] = useState('cadet');
    
    // State to toggle between Landing Page and Login/Signup
    const [showAuth, setShowAuth] = useState(false);
    const [initialIsSignup, setInitialIsSignup] = useState(false);

    // --- NEW: Comprehensive Visitor Tracking (Guest & Authenticated) ---
    useEffect(() => {
        const trackVisitor = async () => {
            if (userRole === 'admin') return; // Don't count admin views in reach
            try {
                const statsRef = getCollectionRef('visitor_logs');
                if (!statsRef) return;

                // 1. Always ensure a persistent Device ID exists
                let deviceId = localStorage.getItem('ncc_visitor_id');
                if (!deviceId) {
                    deviceId = `v_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}`;
                    localStorage.setItem('ncc_visitor_id', deviceId);
                }

                let type = user?.email ? 'authenticated' : 'guest';
                if (!deviceId) return;

                const docRef = doc(statsRef, deviceId);
                
                // Track visit
                await setDoc(docRef, { 
                    identity: deviceId,
                    lastVisit: serverTimestamp(),
                    type: type,
                    email: user?.email || null
                }, { merge: true });
                
                console.log('Portal Reach Logged:', deviceId, `(${type})`);
            } catch (e) {
                console.error('Visitor tracking error:', e);
            }
        };

        // Run tracking once when component mounts or user state changes
        const timer = setTimeout(trackVisitor, 2000);
        return () => clearTimeout(timer);
    }, [user?.email, userRole, authLoading]);

    // Check for password reset mode in URL
    const queryParams = new URLSearchParams(window.location.search);
    const mode = queryParams.get('mode');
    const oobCode = queryParams.get('oobCode');

    if (mode === 'resetPassword' && oobCode) {
        return (
            <>
                <ResetPasswordHandler oobCode={oobCode} />
                <ToastContainer theme="colored" />
            </>
        );
    }

    // Check for Verify Cadet Route
    const pathname = window.location.pathname;
    if (pathname.startsWith('/verify/')) {
        const verifyId = pathname.split('/verify/')[1];
        if (verifyId) {
            return (
                <ThemeProvider>
                    <VerifyCadet verifyId={verifyId} />
                    <ToastContainer theme="colored" />
                </ThemeProvider>
            );
        }
    }

    // Check for Demo Route
    const isDemoRoute = pathname === '/demo' || pathname.startsWith('/demo/');

    // Show loading indicator while checking auth
    if (authLoading && !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <LoadingIndicator message="Authenticating..." />
            </div>
        );
    }

    // If not logged in, show Landing Page or Login Page
    let content;

    if (!user || otpPending) {
        if (!showAuth && !isDemoRoute && !otpPending) {
            content = (
                <LandingPage 
                    user={user}
                    onGetStarted={(type, isSignup = false) => {
                        if (type === 'cadet' || type === 'admin' || type === 'ano') {
                            setAuthTab(type);
                        }
                        setInitialIsSignup(isSignup);
                        setShowAuth(true);
                    }} 
                />
            );
        } else {
            content = (
                <>
                    <div className="fixed top-6 left-6 z-[60]">
                        <button 
                            onClick={() => setShowAuth(false)}
                            className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all"
                        >
                            ← Back to Home
                        </button>
                    </div>
                    <LoginPage
                        onLogin={handleLogin}
                        onSignup={handleSignup}
                        onDemoLogin={handleDemoLogin}
                        isDemoMode={isDemoRoute}
                        loading={authLoading}
                        error={authError}
                        setError={setAuthError}
                        signupSuccess={signupSuccess}
                        setSignupSuccess={setSignupSuccess}
                        activeAuthTab={activeAuthTab}
                        onTabChange={setAuthTab}
                        initialIsSignup={initialIsSignup}
                        otpPending={otpPending}
                        otpEmail={otpEmail}
                        otpLoading={otpLoading}
                        onOtpVerify={handleAdminLoginStep2}
                        onOtpResend={handleResendOtp}
                        onOtpCancel={cancelOtp}
                    />
                    <ToastContainer theme="colored" />
                </>
            );
        }
    } else {
        // User is logged in, show the main dashboard
        content = (
            <>
                <Dashboard key={user.uid} />
                <ToastContainer theme="colored" />
            </>
        );
    }

    return (
        <ThemeProvider>
            {content}
        </ThemeProvider>
    );
}

export default App;
