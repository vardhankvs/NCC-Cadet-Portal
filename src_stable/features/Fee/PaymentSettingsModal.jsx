// src/features/Fee/PaymentSettingsModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import {
    XCircle,
    Loader,
    ImageIcon,
    Upload,
    CreditCard
} from '../../components/Icons.jsx';
import { updatePaymentSettings, updatePaymentScanner } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const PaymentSettingsModal = ({ currentUrl, currentRazorpayKey, onClose }) => {
    const [uploading, setUploading] = useState(false);
    const [razorpayKey, setRazorpayKey] = useState(currentRazorpayKey || '');
    const [savingKey, setSavingKey] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 800 * 1024) {
            toast.error('Image is too large. Please crop it or use a smaller screenshot (under 800KB).');
            return;
        }

        setUploading(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64ImageString = reader.result;
                await updatePaymentScanner(base64ImageString);
                toast.success('Scanner QR code updated successfully!');
                setUploading(false);
            };
            reader.onerror = () => {
                toast.error('Failed to read the image file.');
                setUploading(false);
            };
        } catch (err) {
            toast.error('Upload failed: ' + err.message);
            setUploading(false);
        }
    };

    const handleSaveKey = async (e) => {
        e.preventDefault();
        setSavingKey(true);
        try {
            await updatePaymentSettings({ razorpayKeyId: razorpayKey.trim() });
            toast.success('Razorpay Key ID saved successfully!');
            onClose();
        } catch (err) {
            toast.error('Failed to save Key ID: ' + err.message);
        } finally {
            setSavingKey(false);
        }
    };

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-8 bg-white dark:bg-[#050b14] rounded-3xl shadow-2xl w-full max-w-md mx-auto relative overflow-hidden max-h-[90vh] overflow-y-auto border border-[#ddd8cc] dark:border-white/10">
                <div className="flex justify-between items-center mb-6 border-b border-gray-100 dark:border-white/5 pb-4">
                    <div>
                        <h2 className="text-xl font-black text-ncc-navy dark:text-white uppercase tracking-tight">
                            Payment Settings
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-white/60">Configure Razorpay Key ID and QR Scanner</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 dark:bg-[#0d2137] rounded-full transition-colors"
                    >
                        <XCircle className="w-6 h-6 text-gray-400 dark:text-white/80" />
                    </button>
                </div>

                <div className="space-y-6">
                    {/* Razorpay Key Section */}
                    <form onSubmit={handleSaveKey} className="bg-gray-50 dark:bg-[#0a1628] p-4 rounded-2xl border border-gray-100 dark:border-white/5 text-left space-y-3">
                        <div className="flex items-center gap-2">
                            <CreditCard className="w-4 h-4 text-ncc-gold" />
                            <h3 className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest">
                                Razorpay Gateway Key
                            </h3>
                        </div>
                        <p className="text-[11px] text-gray-500 dark:text-white/70">
                            Enter your Razorpay Key ID (<code className="text-xs text-ncc-gold">rzp_test_...</code> or <code className="text-xs text-ncc-gold">rzp_live_...</code>). Free test payments work out of the box!
                        </p>
                        <input 
                            type="text" 
                            placeholder="e.g. rzp_test_1DP5mmOlF5G5ag" 
                            className="ncc-input text-xs font-mono"
                            value={razorpayKey}
                            onChange={e => setRazorpayKey(e.target.value)}
                        />
                        <button 
                            type="submit" 
                            disabled={savingKey}
                            className="ncc-btn ncc-btn-primary w-full py-2.5 text-xs justify-center"
                        >
                            {savingKey ? 'Saving...' : 'Save Razorpay Key'}
                        </button>
                    </form>

                    {/* QR Code Upload Section */}
                    <div className="text-center space-y-4 pt-2 border-t border-gray-100 dark:border-white/5">
                        <p className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest text-left">
                            Manual PhonePe / UPI QR Code
                        </p>
                        <div className="w-48 h-48 mx-auto border-2 border-dashed border-gray-200 dark:border-white/10 rounded-2xl flex items-center justify-center overflow-hidden bg-gray-50 dark:bg-[#0a1628] shadow-inner group relative">
                            {uploading ? (
                                <div className="flex flex-col items-center">
                                    <Loader className="animate-spin h-8 w-8 text-indigo-600 mb-2" />
                                    <p className="text-[10px] font-bold text-gray-500 dark:text-white/70 uppercase tracking-widest animate-pulse">
                                        Processing...
                                    </p>
                                </div>
                            ) : currentUrl ? (
                                <img
                                    src={currentUrl}
                                    className="object-contain h-full w-full transform transition-transform group-hover:scale-105"
                                    alt="Current QR Code"
                                />
                            ) : (
                                <div className="flex flex-col items-center text-gray-300">
                                    <ImageIcon className="w-10 h-10 mb-2" />
                                    <p className="text-[10px] font-bold uppercase tracking-widest">
                                        No Image Set
                                    </p>
                                </div>
                            )}
                        </div>

                        <label className="inline-flex items-center justify-center w-full px-6 py-3 bg-ncc-navy dark:bg-[#1b3a6b] text-white font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer hover:brightness-110 transition-all shadow-md active:scale-95">
                            <Upload className="w-4 h-4 mr-2" />
                            {currentUrl ? 'Replace QR Image' : 'Upload New QR'}
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handleFileChange}
                                disabled={uploading}
                            />
                        </label>
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
};
