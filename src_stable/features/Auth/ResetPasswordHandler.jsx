import React, { useState } from 'react';
import { confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../firebase/config.js';
import { InputField } from '../../components/ui/InputField.jsx';
import { Loader, Shield } from '../../components/Icons.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';

export const ResetPasswordHandler = ({ oobCode }) => {
    const [regimentalNumber, setRegimentalNumber] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        if (!regimentalNumber) {
            setError('Please enter your Regimental Number.');
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        if (newPassword.length < 6) {
            setError('Password must be at least 6 characters long.');
            return;
        }

        setLoading(true);
        try {
            await confirmPasswordReset(auth, oobCode, newPassword);
            setSuccess(true);
            setTimeout(() => {
                // Clear URL params and reload to go to login
                window.location.href = window.location.origin + window.location.pathname;
            }, 3000);
        } catch (err) {
            console.error(err);
            setError('Failed to reset password. The link might be expired or invalid.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center font-body relative overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, #0A1628 0%, #1B3A6B 50%, #0A1628 100%)',
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

            <div className="relative w-full max-w-md mx-4">
                <div className="bg-white dark:bg-[#050b14] rounded-2xl shadow-ncc-lg overflow-hidden">
                    <div className="h-1.5 w-full flex">
                        <div className="flex-1 bg-ncc-red" />
                        <div className="flex-1 bg-ncc-gold" />
                        <div className="flex-1 bg-ncc-navy" />
                    </div>

                    <div className="px-8 pt-8 pb-8 space-y-5">
                        <div className="flex flex-col items-center gap-3">
                            <div className="relative">
                                <img
                                    src="/src/assets/ncc_logo.jpg"
                                    alt="NCC Logo"
                                    className="h-16 w-16 object-contain drop-shadow-md"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = 'https://placehold.co/64x64/0A1628/C9922A?text=NCC';
                                    }}
                                />
                            </div>
                            <div className="text-center">
                                <h1 className="text-xl font-bold font-display text-ncc-navy dark:text-white leading-tight">
                                    Reset Password
                                </h1>
                                <p className="text-sm text-gray-500 dark:text-white/70 mt-1">
                                    Create a new password for your account
                                </p>
                            </div>
                        </div>

                        {error && <ErrorDisplay message={error} />}
                        {success && (
                            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                                <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                <p className="text-sm text-green-700 font-medium">
                                    Password updated successfully! Redirecting to login...
                                </p>
                            </div>
                        )}

                        {!success && (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <InputField
                                    label="Regimental Number"
                                    name="regimentalNumber"
                                    type="text"
                                    value={regimentalNumber}
                                    onChange={(e) => setRegimentalNumber(e.target.value)}
                                    required
                                    placeholder="e.g. AP24SD..."
                                />
                                <InputField
                                    label="New Password"
                                    name="newPassword"
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                                <InputField
                                    label="Confirm Password"
                                    name="confirmPassword"
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                />
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full flex justify-center items-center gap-2 px-4 py-3 text-sm font-bold tracking-wide text-white rounded-lg transition duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-ncc"
                                    style={{
                                        background: loading ? '#6b7280' : 'linear-gradient(135deg, #0A1628 0%, #1B3A6B 100%)',
                                    }}
                                >
                                    {loading ? (
                                        <Loader className="animate-spin w-4 h-4" />
                                    ) : (
                                        <Shield className="w-4 h-4" />
                                    )}
                                    {loading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
                <p className="text-center text-white/30 text-xs mt-4 tracking-widest uppercase">
                    14(A) BN NCC · Srikakulam
                </p>
            </div>
        </div>
    );
};
