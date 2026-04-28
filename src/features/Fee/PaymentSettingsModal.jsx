// src/features/Fee/PaymentSettingsModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import {
    XCircle,
    Loader,
    Image as ImageIcon,
    Upload,
} from '../../components/Icons.jsx';
import { updatePaymentScanner } from '../../firebase/firestoreService.js'; // Notice: Removed uploadProfilePhoto
import { toast } from 'react-toastify';

export const PaymentSettingsModal = ({ currentUrl, onClose }) => {
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Safety check: Keep image under 800KB so it easily fits in Firestore
        if (file.size > 800 * 1024) {
            toast.error(
                'Image is too large. Please crop it or use a smaller screenshot (under 800KB).'
            );
            return;
        }

        setUploading(true);

        try {
            // THE TRICK: Convert image to a Base64 text string instead of using Firebase Storage
            const reader = new FileReader();
            reader.readAsDataURL(file);

            reader.onloadend = async () => {
                const base64ImageString = reader.result;

                // Save the text string directly to Firestore Database
                await updatePaymentScanner(base64ImageString);

                toast.success(
                    'Scanner updated successfully without Firebase Storage!'
                );
                setUploading(false);
                onClose();
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

    return (
        <ModalOverlay onClose={onClose}>
            <div className="p-8 bg-white rounded-3xl shadow-2xl w-full max-w-md mx-auto relative overflow-hidden">
                <div className="flex justify-between items-center mb-8 border-b pb-4">
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                        Scanner Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                    >
                        <XCircle className="w-6 h-6 text-gray-400" />
                    </button>
                </div>

                <div className="text-center space-y-6">
                    <div className="w-56 h-56 mx-auto border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center overflow-hidden bg-gray-50 shadow-inner group relative">
                        {uploading ? (
                            <div className="flex flex-col items-center">
                                <Loader className="animate-spin h-8 w-8 text-indigo-600 mb-2" />
                                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest animate-pulse">
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
                                <ImageIcon className="w-12 h-12 mb-2" />
                                <p className="text-[10px] font-bold uppercase tracking-widest">
                                    No Image Set
                                </p>
                            </div>
                        )}
                    </div>

                    <label className="inline-flex items-center justify-center w-full px-6 py-4 bg-indigo-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl cursor-pointer hover:bg-indigo-700 transition-all shadow-lg active:scale-95">
                        <Upload className="w-5 h-5 mr-2" />
                        {currentUrl ? 'Replace QR Image' : 'Upload New QR'}
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*"
                            onChange={handleFileChange}
                            disabled={uploading}
                        />
                    </label>
                    <p className="text-[10px] text-gray-400 font-bold tracking-widest uppercase mt-2">
                        Bypassing Firebase Storage
                    </p>
                </div>
            </div>
        </ModalOverlay>
    );
};
