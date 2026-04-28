// src/features/Auth/CadetResetModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { Loader, XCircle, User, Mail } from '../../components/Icons.jsx'; // Added Mail
import { initiateCadetPasswordReset } from '../../firebase/authService.js';

export const CadetResetModal = ({ onCancel }) => {
    const [enrollmentId, setEnrollmentId] = useState('');
    const [email, setEmail] = useState(''); // <-- Added email state
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [sentToEmail, setSentToEmail] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setSuccess(false);
        setLoading(true);

        if (!enrollmentId || !email) {
            // <-- Check for both fields
            setError('Enrollment ID and Email are required.');
            setLoading(false);
            return;
        }

        try {
            // Pass both Enrollment ID and the real email
            await initiateCadetPasswordReset(enrollmentId, email);
            setSentToEmail(email); // Store the real email for the success message
            setSuccess(true);
        } catch (e) {
            if (e.message.includes('Enrollment ID')) {
                setError(e.message);
            } else if (e.code === 'auth/invalid-continue-uri') {
                setError(
                    "Reset failed: The app's domain is not authorized. Please contact your administrator."
                );
            } else {
                setError(
                    'Reset failed. Please contact your administrator for help.'
                );
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay>
            <div className="p-6 bg-white rounded-xl shadow-2xl border-t-4 border-indigo-600 w-full max-w-md mx-auto">
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Reset Cadet Password
                    </h2>
                    <button type="button" onClick={onCancel} title="Close Form">
                        <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {error && (
                    <div className="mb-4">
                        <ErrorDisplay message={error} />
                    </div>
                )}

                {success ? (
                    <div className="p-4 bg-green-100 text-green-700 rounded-lg text-center font-medium">
                        Password reset link sent to **{sentToEmail}**. Please
                        check your primary inbox.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <p className="text-sm text-gray-600">
                            Enter your Enrollment ID and the email where you
                            want the reset link sent.
                        </p>

                        <InputField
                            label="Enrollment ID"
                            name="enrollmentId"
                            value={enrollmentId}
                            onChange={(e) => setEnrollmentId(e.target.value)}
                            placeholder="e.g., AP2024SD..."
                            icon={User}
                        />

                        <InputField
                            label="Reset Email"
                            name="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your.email@example.com"
                            icon={Mail}
                        />

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex justify-center items-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg shadow-md hover:bg-indigo-700 transition duration-150 disabled:bg-indigo-300"
                        >
                            {loading ? (
                                <Loader className="animate-spin w-5 h-5 mr-2" />
                            ) : (
                                'Send Reset Link'
                            )}
                        </button>
                    </form>
                )}
                {success && (
                    <div className="flex justify-end mt-4">
                        <button
                            onClick={onCancel}
                            className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                        >
                            Close
                        </button>
                    </div>
                )}
            </div>
        </ModalOverlay>
    );
};
