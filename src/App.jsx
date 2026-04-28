// src/App.jsx
import React, { useState } from 'react';
import { useAuthContext } from './context/AuthContext.jsx';
import { LoginPage } from './features/Auth/LoginPage.jsx';
import { Dashboard } from './Dashboard.jsx';
import { LoadingIndicator } from './components/ui/LoadingIndicator.jsx';

// --- 1. Import Toastify CSS and Component ---
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export function App() {
    const {
        user,
        authLoading,
        authError,
        setAuthError,
        signupSuccess,
        setSignupSuccess,
        handleLogin,
        handleSignup,
    } = useAuthContext();

    // Default to 'cadet' or 'phone' tab
    const [activeAuthTab, setActiveAuthTab] = useState('cadet');

    // Show loading indicator while checking auth
    if (authLoading && !user) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-100">
                <LoadingIndicator message="Authenticating..." />
            </div>
        );
    }

    // If not logged in, show Login page
    if (!user) {
        return (
            <>
                <LoginPage
                    onLogin={handleLogin}
                    onSignup={handleSignup}
                    loading={authLoading}
                    error={authError}
                    setError={setAuthError}
                    signupSuccess={signupSuccess}
                    setSignupSuccess={setSignupSuccess}
                    activeAuthTab={activeAuthTab}
                    setActiveAuthTab={setActiveAuthTab}
                />
                {/* --- 2. Add ToastContainer for login/signup errors --- */}
                <ToastContainer theme="colored" />
            </>
        );
    }

    // User is logged in, show the main dashboard
    return (
        <>
            <Dashboard key={user.uid} />
            {/* --- 3. Add ToastContainer for the main app (e.g., save success) --- */}
            <ToastContainer theme="colored" />
        </>
    );
}

export default App;
