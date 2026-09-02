// src/features/Auth/LoginPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { InputField } from '../../components/ui/InputField';
import { Loader, LogIn, User, Shield, Key, Mail, CheckCircle, XCircle } from '../../components/Icons.jsx';
import { CadetResetModal } from './CadetResetModal.jsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx';
import nccLogo from '../../assets/ncc_logo.png';

export const LoginPage = ({
    onLogin,
    onSignup,
    loading,
    error,
    setError,
    signupSuccess,
    setSignupSuccess,
    activeAuthTab,
    onTabChange,
    initialIsSignup = false,
    // OTP 2FA props
    otpPending = false,
    otpEmail = null,
    otpLoading = false,
    onOtpVerify,
    onOtpResend,
    onOtpCancel,
    // ANO Fingerprint Biometric props
    fingerprintPending = false,
    fingerprintEmail = null,
    fingerprintLoading = false,
    onFingerprintVerify,
    onFingerprintCancel,
    onDemoLogin,
    isDemoMode = false,
}) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [rePassword, setRePassword] = useState('');
    const [isSignup, setIsSignup] = useState(initialIsSignup);
    const [fullName, setFullName] = useState('');
    const [enrollmentId, setEnrollmentId] = useState('');
    const [resetSuccess, setResetSuccess] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [isCadetResetModalOpen, setIsCadetResetModalOpen] = useState(false);
    // OTP screen state
    const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
    const [otpTimer, setOtpTimer] = useState(600); // 10 minutes in seconds
    const otpRefs = useRef([]);

    useEffect(() => {
        if (!otpPending) { setOtpDigits(['', '', '', '', '', '']); setOtpTimer(600); return; }
        const interval = setInterval(() => setOtpTimer(t => t > 0 ? t - 1 : 0), 1000);
        return () => clearInterval(interval);
    }, [otpPending]);

    const handleOtpDigit = (index, value) => {
        if (!/^\d?$/.test(value)) return;
        const next = [...otpDigits];
        next[index] = value;
        setOtpDigits(next);
        if (value && index < 5) otpRefs.current[index + 1]?.focus();
    };

    const handleOtpKeyDown = (index, e) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) otpRefs.current[index - 1]?.focus();
    };

    const handleOtpPaste = (e) => {
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (pasted.length === 6) {
            setOtpDigits(pasted.split(''));
            otpRefs.current[5]?.focus();
        }
    };

    const submitOtp = () => {
        const code = otpDigits.join('');
        if (code.length !== 6) { setError('Please enter all 6 digits.'); return; }
        onOtpVerify(code);
    };

    // Update isSignup when initialIsSignup changes
    React.useEffect(() => {
        setIsSignup(initialIsSignup);
    }, [initialIsSignup]);

    // Show the Officer tab by default so admins can find it easily
    const showAdminTab = true;

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
            onSignup(email, password, enrollmentId, activeAuthTab, fullName);
        } else {
            onLogin(email, password, enrollmentId, activeAuthTab);
        }
    };

    const handleTabChange = (tab) => {
        onTabChange(tab);
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

    // ── OTP Verification Screen ─────────────────────────────────────────────
    if (otpPending) {
        const minutes = String(Math.floor(otpTimer / 60)).padStart(2, '0');
        const seconds = String(otpTimer % 60).padStart(2, '0');
        const expired = otpTimer <= 0;
        return (
            <div className="min-h-screen flex items-center justify-center p-4 relative" style={{ background: 'var(--bg-main, #050C1A)' }}>
                <div className="absolute inset-0 ncc-stripe opacity-40 pointer-events-none" />
                <div className="absolute top-6 right-6 z-[100]"><ThemeToggle className="shadow-2xl" /></div>
                <div className="relative w-full max-w-md mx-4">
                    <div className="rounded-2xl shadow-ncc-lg overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
                        <div className="h-1.5 w-full flex">
                            <div className="flex-1 bg-ncc-red" /><div className="flex-1 bg-ncc-gold" /><div className="flex-1 bg-ncc-navy" />
                        </div>
                        <div className="px-8 pt-8 pb-8 space-y-6">
                            {/* Header */}
                            <div className="flex flex-col items-center gap-3">
                                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b8830e, #0A1628)' }}>
                                    <Key className="w-7 h-7 text-white" />
                                </div>
                                <div className="text-center">
                                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-main)' }}>Two-Factor Authentication</h2>
                                    <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Enter the 6-digit code sent to</p>
                                    <p className="text-sm font-semibold text-ncc-gold mt-0.5 flex items-center justify-center gap-1.5">
                                        <Mail className="w-3.5 h-3.5" />{otpEmail || 'your registered email'}
                                    </p>
                                </div>
                            </div>

                            {error && <ErrorDisplay message={error} />}

                            {/* OTP Boxes */}
                            <div onPaste={handleOtpPaste}>
                                <div className="flex gap-2 justify-center">
                                    {otpDigits.map((d, i) => (
                                        <input
                                            key={i}
                                            ref={el => otpRefs.current[i] = el}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={d}
                                            onChange={e => handleOtpDigit(i, e.target.value)}
                                            onKeyDown={e => handleOtpKeyDown(i, e)}
                                            disabled={expired || otpLoading}
                                            className="w-11 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all"
                                            style={{
                                                background: 'var(--bg-input, #112240)',
                                                borderColor: d ? '#b8830e' : 'var(--border-main)',
                                                color: 'var(--text-main)',
                                                boxShadow: d ? '0 0 0 3px rgba(184,131,14,0.2)' : 'none',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Timer & Resend */}
                            <div className="flex flex-col items-center justify-center gap-2">
                                {expired ? (
                                    <span className="text-red-500 text-sm font-semibold flex items-center gap-1">
                                        <XCircle className="w-4 h-4" /> Code expired
                                    </span>
                                ) : (
                                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                                        Expires in <span className="font-bold text-ncc-gold">{minutes}:{seconds}</span>
                                    </span>
                                )}

                                {onOtpResend && (
                                    <button
                                        type="button"
                                        disabled={otpLoading}
                                        onClick={() => {
                                            onOtpResend();
                                            setOtpTimer(600);
                                        }}
                                        className="text-xs font-bold text-ncc-gold hover:underline disabled:opacity-50 transition"
                                    >
                                        {otpLoading ? 'Sending new code...' : "Didn't receive a code? Resend Code"}
                                    </button>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="space-y-3">
                                <button
                                    onClick={submitOtp}
                                    disabled={otpLoading || expired || otpDigits.join('').length !== 6}
                                    className="w-full flex justify-center items-center gap-2 px-4 py-3 text-sm font-bold tracking-wide text-white rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-ncc"
                                    style={{ background: 'linear-gradient(135deg, #b8830e 0%, #0A1628 100%)' }}
                                >
                                    {otpLoading ? <Loader className="animate-spin w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                                    {otpLoading ? 'Verifying...' : 'Verify & Login'}
                                </button>
                                <button
                                    onClick={onOtpCancel}
                                    className="w-full text-sm text-center py-2 rounded-lg transition"
                                    style={{ color: 'var(--text-muted)' }}
                                >
                                    ← Back to Login
                                </button>
                            </div>

                            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                                Check your spam/junk folder if the code does not appear in your inbox within 1 minute.
                            </p>
                        </div>
                    </div>
                    <p className="text-center text-white/30 text-xs mt-4 tracking-widest uppercase">14(A) BN NCC · Srikakulam</p>
                </div>
            </div>
        );
    }

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

            <div className="absolute top-6 right-6 z-[100]">
                <ThemeToggle className="shadow-2xl" />
            </div>

            {isCadetResetModalOpen && (
                <CadetResetModal
                    onCancel={() => setIsCadetResetModalOpen(false)}
                />
            )}

            <div className="relative w-full max-w-md mx-4">
                {/* Card */}
                <div className="rounded-2xl shadow-ncc-lg overflow-hidden border" style={{ background: 'var(--bg-card)', borderColor: 'var(--border-main)' }}>
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
                                    src={nccLogo}
                                    alt="NCC Logo"
                                    className="h-24 w-auto max-w-[120px] object-contain drop-shadow-lg"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src =
                                            'https://placehold.co/64x64/0A1628/C9922A?text=NCC';
                                    }}
                                />
                            </div>
                            <div className="text-center">
                                <h1 className="text-2xl font-bold font-display leading-tight" style={{ color: 'var(--text-main)' }}>
                                    14(A) BN NCC
                                </h1>
                                <p className="text-[10px] tracking-widest uppercase text-ncc-gold/70 mt-0.5">
                                    Srikakulam
                                </p>
                                <p className="text-xs tracking-[0.2em] uppercase text-ncc-gold font-semibold mt-0.5">
                                    Unity &amp; Discipline
                                </p>
                            </div>
                        </div>

                        {/* Role tabs - only show for login, not registration */}
                        {showAdminTab && !isSignup && (
                            <div className="flex bg-gray-100 dark:bg-white/5 rounded-xl p-1 border border-gray-200 dark:border-white/10 gap-1">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('cadet')}
                                    className={`flex-1 flex justify-center items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                        activeAuthTab === 'cadet'
                                            ? 'bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy shadow-ncc'
                                            : 'text-ncc-navy/60 dark:text-white/40 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    <User className="w-3.5 h-3.5" /> Cadet
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('ano')}
                                    className={`flex-1 flex justify-center items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                        activeAuthTab === 'ano'
                                            ? 'bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy shadow-ncc'
                                            : 'text-ncc-navy/60 dark:text-white/40 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    <Shield className="w-3.5 h-3.5" /> ANO
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('admin')}
                                    className={`flex-1 flex justify-center items-center gap-1.5 px-2 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                                        activeAuthTab === 'admin'
                                            ? 'bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy shadow-ncc'
                                            : 'text-ncc-navy/60 dark:text-white/40 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    <Shield className="w-3.5 h-3.5" /> Battalion Admin
                                </button>
                            </div>
                        )}

                        {/* Section title */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-ncc-cream-dark" />
                            <span className="text-xs font-bold uppercase tracking-widest text-ncc-navy dark:text-white/40">
                                {isSignup ? 'Cadet Registration' : (activeAuthTab === 'cadet' ? 'Cadet Authentication' : (activeAuthTab === 'ano' ? 'ANO Authentication' : 'Battalion Admin Authentication'))}
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
                            {isSignup && activeAuthTab === 'cadet' && (
                                <InputField
                                    label="Full Name"
                                    name="fullName"
                                    type="text"
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    required
                                    placeholder="Enter your full name"
                                />
                            )}
                            {(activeAuthTab === 'admin' || activeAuthTab === 'ano') && (
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
                                    label={isSignup ? 'Regimental Number' : 'Regimental / Enrollment ID'}
                                    name="enrollmentId"
                                    type="text"
                                    value={enrollmentId}
                                    onChange={(e) =>
                                        setEnrollmentId(e.target.value)
                                    }
                                    required
                                    placeholder="e.g. AP24SD... (14A BN)"
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
                                            (activeAuthTab === 'admin' || activeAuthTab === 'ano')
                                                ? handleAdminResetPassword
                                                : () =>
                                                      setIsCadetResetModalOpen(
                                                          true
                                                      )
                                        }
                                        disabled={isResetting || loading}
                                        className="text-xs font-semibold text-ncc-gold hover:text-ncc-gold-dark disabled:text-gray-400 dark:text-white/80 transition"
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
                        {activeAuthTab === 'cadet' && (
                            <p className="text-sm text-center text-gray-500 dark:text-white/70">
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
                        )}
                        {isSignup && activeAuthTab === 'admin' && (
                            <p className="text-xs text-center text-gray-400 dark:text-white/80 border-t border-ncc-cream-dark pt-3">
                                Only the first admin signup will be registered.
                            </p>
                        )}

                        {isDemoMode && (
                            <div className="border-t border-[#ddd8cc] dark:border-white/10 pt-5 mt-4 space-y-3">
                                <div className="text-center">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-ncc-gold bg-ncc-gold/10 border border-ncc-gold/30 px-2.5 py-0.5 rounded">
                                        Demonstration Access
                                    </span>
                                    <p className="text-[10px] text-gray-400 dark:text-white/50 mt-1">
                                        Click any button to log in instantly without password or 2FA verification.
                                    </p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onDemoLogin('cadet')}
                                        className="w-full py-2 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-1.5"
                                    >
                                        Log in as Cadet (Demo)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDemoLogin('admin')}
                                        className="w-full py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-1.5"
                                    >
                                        Log in as ANO / Staff (Demo)
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onDemoLogin('superadmin')}
                                        className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all shadow-md flex justify-center items-center gap-1.5"
                                    >
                                        Log in as Battalion Admin (Demo)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer text */}
                <p className="text-center text-white/30 text-xs mt-4 tracking-widest uppercase">
                    14(A) BN NCC · Srikakulam
                </p>
            </div>
        </div>
    );
};
