// src/features/Auth/CadetResetModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { Loader, XCircle, User, Mail, ShieldCheck } from '../../components/Icons.jsx';
import { db, appId } from '../../firebase/config.js';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { initiateCadetPasswordReset } from '../../firebase/authService.js';
import { toast } from 'react-toastify';

export const CadetResetModal = ({ onCancel }) => {
    const [step, setStep] = useState(1); // 1: Enrollment, 2: Confirmation/Success
    const [enrollmentId, setEnrollmentId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [foundEmail, setFoundEmail] = useState('');

    const handleLookupAndReset = async (e) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            // Trigger the reset flow (which now finds the email automatically in authService)
            const email = await initiateCadetPasswordReset(enrollmentId);
            setFoundEmail(email);
            setStep(2);
            toast.success("Reset link sent successfully!");
        } catch (err) {
            console.error(err);
            setError(err.message || "Failed to initiate reset.");
        } finally {
            setLoading(false);
        }
    };

    // Mask email for privacy (e.g., k****@gmail.com)
    const maskEmail = (email) => {
        if (!email) return '';
        const [user, domain] = email.split('@');
        return `${user[0]}${'*'.repeat(user.length - 1)}@${domain}`;
    };

    return (
        <ModalOverlay>
            <div className="bg-white dark:bg-[#050b14] rounded-3xl shadow-2xl w-full max-w-md mx-4 overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="h-1.5 w-full flex">
                    <div className="flex-1 bg-ncc-red" />
                    <div className="flex-1 bg-ncc-gold" />
                    <div className="flex-1 bg-ncc-navy" />
                </div>

                <div className="p-8">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Reset Password</h2>
                            <p className="text-xs text-gray-500 dark:text-white/70 font-medium">Cadet Self-Service Portal</p>
                        </div>
                        <button onClick={onCancel} className="p-2 hover:bg-gray-100 dark:bg-[#0d2137] rounded-full transition-colors">
                            <XCircle className="w-6 h-6 text-gray-300" />
                        </button>
                    </div>

                    {error && <ErrorDisplay message={error} />}

                    {step === 1 ? (
                        <form onSubmit={handleLookupAndReset} className="space-y-6">
                            <p className="text-sm text-gray-500 dark:text-white/70 leading-relaxed">
                                Enter your **Regimental Number**. We will send a secure password reset link to your registered personal email address.
                            </p>
                            <InputField 
                                label="Enrollment ID" 
                                value={enrollmentId} 
                                onChange={e => setEnrollmentId(e.target.value)}
                                placeholder="e.g. AP24SD..."
                                icon={User}
                                required
                            />
                            <button disabled={loading} className="w-full ncc-btn ncc-btn-primary py-4 flex items-center justify-center gap-2">
                                {loading ? <Loader className="animate-spin w-5 h-5" /> : <Mail className="w-4 h-4" />}
                                {loading ? 'Finding Account...' : 'Send Reset Link'}
                            </button>
                        </form>
                    ) : (
                        <div className="text-center space-y-6 py-4">
                            <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-2">
                                <ShieldCheck className="w-8 h-8" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Email Sent!</h3>
                                <p className="text-sm text-gray-500 dark:text-white/70">
                                    A secure reset link has been dispatched to:<br/>
                                    <span className="font-bold text-ncc-navy dark:text-white">{maskEmail(foundEmail)}</span>
                                </p>
                            </div>
                            <p className="text-xs text-gray-400 dark:text-white/80 italic">
                                Please check your Inbox and Spam folder. The link will expire in 1 hour.
                            </p>
                            <button onClick={onCancel} className="w-full ncc-btn ncc-btn-secondary py-3">
                                Back to Login
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </ModalOverlay>
    );
};
