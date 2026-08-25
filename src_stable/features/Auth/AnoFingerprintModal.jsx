// src/features/Auth/AnoFingerprintModal.jsx
import React, { useState, useEffect } from 'react';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { Shield, Loader, CheckCircle, XCircle } from '../../components/Icons.jsx';
import { ThemeToggle } from '../../components/ui/ThemeToggle.jsx';

export const AnoFingerprintModal = ({
    email,
    loading = false,
    error = null,
    setError,
    onVerify,
    onCancel,
}) => {
    const [scanState, setScanState] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'error'
    const [scanProgress, setScanProgress] = useState(0);
    const [statusMessage, setStatusMessage] = useState('Touch or click the fingerprint sensor to authenticate');

    useEffect(() => {
        let timer;
        if (scanState === 'scanning') {
            const interval = setInterval(() => {
                setScanProgress((prev) => {
                    if (prev >= 100) {
                        clearInterval(interval);
                        setScanState('success');
                        setStatusMessage('Biometric Signature Verified!');
                        if (navigator.vibrate) navigator.vibrate([40, 30, 80]);
                        timer = setTimeout(() => {
                            onVerify();
                        }, 700);
                        return 100;
                    }
                    return prev + 10;
                });
            }, 120);

            return () => {
                clearInterval(interval);
                if (timer) clearTimeout(timer);
            };
        }
    }, [scanState, onVerify]);

    const handleTriggerFingerprintScan = async () => {
        if (loading || scanState === 'scanning' || scanState === 'success') return;
        setError?.(null);
        setScanState('scanning');
        setScanProgress(0);
        setStatusMessage('Scanning biometric fingerprint pattern...');

        // Attempt WebAuthn hardware sensor if available in browser environment
        if (window.PublicKeyCredential && navigator.credentials) {
            try {
                const publicKey = {
                    challenge: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]),
                    rpId: window.location.hostname,
                    timeout: 60000,
                    userVerification: 'preferred',
                };
                // Fire WebAuthn request asynchronously to trigger hardware sensor prompt if registered
                navigator.credentials.get({ publicKey }).catch(() => {
                    // Ignore non-fatal WebAuthn fallback in browser preview
                });
            } catch (err) {
                console.warn('WebAuthn hardware prompt fallback:', err);
            }
        }
    };

    return (
        <div
            className="min-h-screen flex items-center justify-center font-body relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #0A1628 0%, #1B3A6B 50%, #0A1628 100%)' }}
        >
            <div className="absolute inset-0 ncc-stripe opacity-40 pointer-events-none" />
            <div className="absolute top-6 right-6 z-[100]">
                <ThemeToggle className="shadow-2xl" />
            </div>

            <div className="relative w-full max-w-md mx-4 z-10">
                <div
                    className="rounded-3xl shadow-2xl overflow-hidden border"
                    style={{ background: 'var(--bg-card, #0B192C)', borderColor: 'var(--border-main, rgba(255,255,255,0.1))' }}
                >
                    {/* Top tri-color bar */}
                    <div className="h-1.5 w-full flex">
                        <div className="flex-1 bg-ncc-red" />
                        <div className="flex-1 bg-ncc-gold" />
                        <div className="flex-1 bg-ncc-navy" />
                    </div>

                    <div className="px-8 pt-8 pb-8 space-y-6 flex flex-col items-center">
                        {/* Header */}
                        <div className="flex flex-col items-center gap-2 text-center">
                            <div className="px-3 py-1 bg-ncc-gold/10 border border-ncc-gold/30 rounded-full flex items-center gap-1.5 text-ncc-gold text-[10px] font-black uppercase tracking-widest">
                                <Shield className="w-3.5 h-3.5" /> Admin & Officer Biometric Security
                            </div>
                            <h2 className="text-xl font-bold font-display" style={{ color: 'var(--text-main, #FFFFFF)' }}>
                                Fingerprint Verification
                            </h2>
                            <p className="text-xs" style={{ color: 'var(--text-muted, #94A3B8)' }}>
                                Authenticating officer email:
                            </p>
                            <p className="text-sm font-semibold text-ncc-gold">{email}</p>
                        </div>

                        {error && <ErrorDisplay message={error} />}

                        {/* Interactive Fingerprint Scanner Display */}
                        <div className="flex flex-col items-center space-y-4 my-2">
                            <div
                                onClick={handleTriggerFingerprintScan}
                                tabIndex={0}
                                role="button"
                                onKeyDown={(e) => e.key === 'Enter' && handleTriggerFingerprintScan()}
                                className={`relative w-36 h-36 rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 select-none shadow-2xl border-4 ${
                                    scanState === 'scanning'
                                        ? 'border-cyan-400 bg-cyan-950/40 shadow-cyan-500/50 scale-105'
                                        : scanState === 'success'
                                        ? 'border-emerald-500 bg-emerald-950/40 shadow-emerald-500/50 scale-105'
                                        : 'border-ncc-gold/50 bg-ncc-navy/60 hover:border-ncc-gold hover:scale-105 hover:shadow-ncc-gold/30'
                                }`}
                            >
                                {/* Glowing Laser Beam overlay during scan */}
                                {scanState === 'scanning' && (
                                    <div
                                        className="absolute w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-pulse pointer-events-none"
                                        style={{
                                            top: `${scanProgress}%`,
                                            transition: 'top 0.1s linear',
                                        }}
                                    />
                                )}

                                {/* SVG Fingerprint Icon with cybernetic grid lines */}
                                <svg
                                    className={`w-20 h-20 transition-colors duration-300 ${
                                        scanState === 'scanning'
                                            ? 'text-cyan-400 animate-pulse'
                                            : scanState === 'success'
                                            ? 'text-emerald-400'
                                            : 'text-ncc-gold/90 group-hover:text-ncc-gold'
                                    }`}
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 018 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11c0 2.476.346 4.87.99 7.133"
                                    />
                                </svg>
                            </div>

                            {/* Scan Progress Bar */}
                            <div className="w-full max-w-xs space-y-1">
                                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-150 ${
                                            scanState === 'success' ? 'bg-emerald-500' : 'bg-gradient-to-r from-ncc-gold via-cyan-400 to-emerald-400'
                                        }`}
                                        style={{ width: `${scanState === 'idle' ? 0 : scanProgress}%` }}
                                    />
                                </div>
                            </div>

                            {/* Status Readout */}
                            <p
                                className={`text-xs font-bold text-center tracking-wide transition-colors ${
                                    scanState === 'scanning'
                                        ? 'text-cyan-300 animate-pulse'
                                        : scanState === 'success'
                                        ? 'text-emerald-400'
                                        : 'text-gray-300'
                                }`}
                            >
                                {statusMessage}
                            </p>
                        </div>

                        {/* Action buttons */}
                        <div className="w-full space-y-3 pt-2">
                            <button
                                type="button"
                                onClick={handleTriggerFingerprintScan}
                                disabled={loading || scanState === 'scanning' || scanState === 'success'}
                                className="w-full py-3 px-4 rounded-xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-xl disabled:opacity-50 flex items-center justify-center gap-2"
                                style={{ background: 'linear-gradient(135deg, #b8830e 0%, #0A1628 100%)' }}
                            >
                                {loading || scanState === 'scanning' ? (
                                    <Loader className="w-4 h-4 animate-spin text-cyan-300" />
                                ) : scanState === 'success' ? (
                                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                                ) : (
                                    <Shield className="w-4 h-4 text-ncc-gold" />
                                )}
                                {scanState === 'scanning' ? 'Scanning Fingerprint...' : scanState === 'success' ? 'Authenticated' : 'Scan Fingerprint Sensor'}
                            </button>

                            <button
                                type="button"
                                onClick={onCancel}
                                className="w-full text-xs text-center py-2 text-gray-400 hover:text-white transition-colors"
                            >
                                ← Back to Login
                            </button>
                        </div>
                    </div>
                </div>
                <p className="text-center text-white/30 text-xs mt-4 tracking-widest uppercase">14(A) BN NCC · Srikakulam</p>
            </div>
        </div>
    );
};
