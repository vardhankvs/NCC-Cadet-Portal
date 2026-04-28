// src/features/Auth/LoginPage.jsx
import React, { useState } from 'react';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { InputField } from '../../components/ui/InputField';
import { Loader, LogIn, User, Shield } from '../../components/Icons';
import { initiatePasswordReset } from '../../firebase/authService';
import { CadetResetModal } from './CadetResetModal.jsx';

export const LoginPage = ({
    onLogin,
    onSignup,
    loading,
    error,
    setError,
    signupSuccess,
    setSignupSuccess,
    activeAuthTab,
    setActiveAuthTab,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rePassword, setRePassword] = useState('');
    const [isSignup, setIsSignup] = useState(false);
    const [enrollmentId, setEnrollmentId] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isCadetResetModalOpen, setIsCadetResetModalOpen] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        setError(null);
        setSignupSuccess(false);
        setResetSuccess(false);
        if (isSignup) {
            if (password !== rePassword) {
                setError('Passwords do not match.');
                return;
            }
            onSignup(email, password, enrollmentId, activeAuthTab);
        } else {
            onLogin(email, password, enrollmentId, activeAuthTab);
        }
    };

    const handleTabChange = (tab) => {
        setActiveAuthTab(tab);
        setError(null);
        setIsSignup(false);
        setSignupSuccess(false);
        setResetSuccess(false);
    };

    const handleToggleSignup = () => {
        setIsSignup(!isSignup);
        setError(null);
        setSignupSuccess(false);
    };

    const handleAdminResetPassword = async () => {
        if (!email) {
            setError('Enter your Admin email above before resetting.');
            return;
        }
        setIsResetting(true);
        setError(null);
        setResetSuccess(false);
        try {
            await initiatePasswordReset(email);
            setResetSuccess(true);
        } catch (e) {
            setError(
                e.code === 'auth/user-not-found'
                    ? 'No user found with that email.'
                    : `Failed: ${e.message}`
            );
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center font-body relative overflow-hidden"
            style={{
                background:
                    'linear-gradient(135deg, #0A1628 0%, #1B3A6B 50%, #0A1628 100%)',
            }}
        >
            {/* Background pattern */}
            <div className="absolute inset-0 ncc-stripe opacity-40 pointer-events-none" />

            {/* Decorative diagonal accent */}
            <div
                className="absolute top-0 right-0 w-96 h-96 opacity-10 pointer-events-none"
                style={{
                    background: 'linear-gradient(135deg, #C9922A, transparent)',
                    clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
                }}
            />
            <div
                className="absolute bottom-0 left-0 w-64 h-64 opacity-10 pointer-events-none"
                style={{
                    background: 'linear-gradient(315deg, #C0152A, transparent)',
                    clipPath: 'polygon(0 100%, 0 0, 100% 100%)',
                }}
            />

            {isCadetResetModalOpen && (
                <CadetResetModal
                    onCancel={() => setIsCadetResetModalOpen(false)}
                />
            )}

            <div className="relative w-full max-w-md mx-4">
                {/* Card */}
                <div className="bg-white rounded-2xl shadow-ncc-lg overflow-hidden">
                    {/* Top tri-color bar */}
                    <div className="h-1.5 w-full flex">
                        <div className="flex-1 bg-ncc-red" />
                        <div className="flex-1 bg-ncc-gold" />
                        <div className="flex-1 bg-ncc-navy" />
                    </div>

                    <div className="px-8 pt-8 pb-8 space-y-5">
                        {/* Header */}
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <img
                                    src="https://upload.wikimedia.org/wikipedia/en/thumb/5/52/National_Cadet_Corps_logo.svg/1200px-National_Cadet_Corps_logo.svg.png"
                                    alt="NCC Logo"
                                    className="h-16 w-16 object-contain drop-shadow-md"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src =
                                            'https://placehold.co/64x64/0A1628/C9922A?text=NCC';
                                    }}
                                />
                            </div>
                            <div className="text-center">
                                <h1 className="text-2xl font-bold font-display text-ncc-navy leading-tight">
                                    GMRIT NCC
                                </h1>
                                <p className="text-xs tracking-[0.2em] uppercase text-ncc-gold font-semibold mt-0.5">
                                    Unity &amp; Discipline
                                </p>
                            </div>
                        </div>

                        {/* Role tabs */}
                        <div className="flex bg-ncc-cream rounded-xl p-1 border border-ncc-cream-dark">
                            <button
                                onClick={() => handleTabChange('cadet')}
                                className={`flex-1 flex justify-center items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                    activeAuthTab === 'cadet'
                                        ? 'bg-ncc-navy text-white shadow-ncc'
                                        : 'text-ncc-navy/60 hover:text-ncc-navy'
                                }`}
                            >
                                <User className="w-4 h-4" /> Cadet
                            </button>
                            <button
                                onClick={() => handleTabChange('admin')}
                                className={`flex-1 flex justify-center items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                                    activeAuthTab === 'admin'
                                        ? 'bg-ncc-navy text-white shadow-ncc'
                                        : 'text-ncc-navy/60 hover:text-ncc-navy'
                                }`}
                            >
                                <Shield className="w-4 h-4" /> Officer
                            </button>
                        </div>

                        {/* Section title */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-ncc-cream-dark" />
                            <span className="text-xs font-bold uppercase tracking-widest text-ncc-navy/40">
                                {activeAuthTab === 'cadet' ? 'Cadet' : 'Admin'}{' '}
                                {isSignup ? 'Registration' : 'Authentication'}
                            </span>
                            <div className="flex-1 h-px bg-ncc-cream-dark" />
                        </div>

                        {/* Alerts */}
                        {error && <ErrorDisplay message={error} />}
                        {signupSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <svg
                                    className="w-4 h-4 text-green-600 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 13l4 4L19 7"
                                    />
                                </svg>
                                <p className="text-sm text-green-700 font-medium">
                                    Signup successful! Please log in.
                                </p>
                            </div>
                        )}
                        {resetSuccess && (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                <svg
                                    className="w-4 h-4 text-blue-600 flex-shrink-0"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                                    />
                                </svg>
                                <p className="text-sm text-blue-700 font-medium">
                                    Reset link sent! Check your inbox.
                                </p>
                            </div>
                        )}

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {activeAuthTab === 'admin' && (
                                <InputField
                                    label="Email Address"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required={!isSignup}
                                    placeholder="you@example.com"
                                />
                            )}
                            {activeAuthTab === 'cadet' && (
                                <InputField
                                    label="Enrollment ID"
                                    name="enrollmentId"
                                    type="text"
                                    value={enrollmentId}
                                    onChange={(e) =>
                                        setEnrollmentId(e.target.value)
                                    }
                                    required
                                    placeholder="e.g., AP2024SD..."
                                />
                            )}

                            {!isSignup && (
                                <InputField
                                    label="Password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    required
                                    placeholder="••••••••"
                                />
                            )}
                            {isSignup && (
                                <>
                                    <InputField
                                        label="Create Password"
                                        name="password"
                                        type="password"
                                        value={password}
                                        onChange={(e) =>
                                            setPassword(e.target.value)
                                        }
                                        required
                                        placeholder="••••••••"
                                    />
                                    <InputField
                                        label="Re-enter Password"
                                        name="rePassword"
                                        type="password"
                                        value={rePassword}
                                        onChange={(e) =>
                                            setRePassword(e.target.value)
                                        }
                                        required
                                        placeholder="••••••••"
                                    />
                                </>
                            )}

                            {!isSignup && (
                                <div className="flex justify-end -mt-2">
                                    <button
                                        type="button"
                                        onClick={
                                            activeAuthTab === 'admin'
                                                ? handleAdminResetPassword
                                                : () =>
                                                      setIsCadetResetModalOpen(
                                                          true
                                                      )
                                        }
                                        disabled={isResetting || loading}
                                        className="text-xs font-semibold text-ncc-gold hover:text-ncc-gold-dark disabled:text-gray-400 transition"
                                    >
                                        {isResetting
                                            ? 'Sending...'
                                            : 'Reset Password?'}
                                    </button>
                                </div>
                            )}

                            {/* Submit */}
                            <button
                                type="submit"
                                disabled={loading || isResetting}
                                className="
                                    w-full flex justify-center items-center gap-2
                                    px-4 py-3 text-sm font-bold tracking-wide text-white
                                    rounded-lg transition duration-150
                                    disabled:opacity-50 disabled:cursor-not-allowed
                                    shadow-ncc
                                "
                                style={{
                                    background:
                                        loading || isResetting
                                            ? '#6b7280'
                                            : 'linear-gradient(135deg, #0A1628 0%, #1B3A6B 100%)',
                                }}
                            >
                                {loading || isResetting ? (
                                    <Loader className="animate-spin w-4 h-4" />
                                ) : (
                                    <LogIn className="w-4 h-4" />
                                )}
                                {loading || isResetting
                                    ? 'Processing...'
                                    : isSignup
                                      ? 'Register'
                                      : 'Log In'}
                            </button>
                        </form>

                        {/* Toggle signup */}
                        <p className="text-sm text-center text-gray-500">
                            {isSignup
                                ? 'Already registered?'
                                : "Don't have an account?"}{' '}
                            <button
                                onClick={handleToggleSignup}
                                className="font-semibold text-ncc-red hover:text-ncc-red-dark transition"
                            >
                                {isSignup ? 'Log In' : 'Sign Up'}
                            </button>
                        </p>

                        {isSignup && activeAuthTab === 'admin' && (
                            <p className="text-xs text-center text-gray-400 border-t border-ncc-cream-dark pt-3">
                                Only the first admin signup will be registered.
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer text */}
                <p className="text-center text-white/30 text-xs mt-4 tracking-widest uppercase">
                    GMRIT NCC · Rajam
                </p>
            </div>
        </div>
    );
};
