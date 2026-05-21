// src/features/Fee/FeeBulkUpdateModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { XCircle, Briefcase, Loader } from '../../components/Icons.jsx';
import { updateAllCadetFeesBulk } from '../../firebase/firestoreService.js';

export const FeeBulkUpdateModal = ({ onClose }) => {
    const [enrollmentFee, setEnrollmentFee] = useState('');
    const [uniformFee, setUniformFee] = useState('');
    const [campFee, setCampFee] = useState('');

    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);

        // Check if at least one field is filled, otherwise all will be set to 0
        if (enrollmentFee === '' && uniformFee === '' && campFee === '') {
            setFormError(
                'Please enter a value for at least one fee component.'
            );
            return;
        }

        // Use 0 if a field is left blank
        const newEnrollmentFee = Number(enrollmentFee || 0);
        const newUniformFee = Number(uniformFee || 0);
        const newCampFee = Number(campFee || 0);

        setLoading(true);
        try {
            const bulkData = {
                enrollmentFee: newEnrollmentFee,
                uniformFee: newUniformFee,
                campFee: newCampFee,
            };

            await updateAllCadetFeesBulk(bulkData);
            onClose();
        } catch (e) {
            setFormError(`Bulk update failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay>
            <form
                onSubmit={handleSubmit}
                className="p-6 bg-white dark:bg-[#050b14] rounded-xl shadow-2xl w-full max-w-lg mx-auto"
            >
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Briefcase className="w-6 h-6 mr-2 text-red-600" /> Bulk
                        Fee Assignment
                    </h2>
                    <button type="button" onClick={onClose} title="Close">
                        <XCircle className="w-6 h-6 text-gray-400 dark:text-white/80 hover:text-gray-600 dark:text-white/80" />
                    </button>
                </div>
                {formError && (
                    <div className="mb-4">
                        <ErrorDisplay message={formError} />
                    </div>
                )}

                <p className="text-sm text-red-600 font-medium mb-4">
                    NOTE: These amounts will be applied as the NEW required fees
                    for ALL cadets.
                </p>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <InputField
                        label="Enrollment Fee (₹)"
                        name="enrollmentFee"
                        type="number"
                        value={enrollmentFee}
                        onChange={(e) => setEnrollmentFee(e.target.value)}
                        placeholder="e.g., 1000"
                        required={false} // No longer required
                    />
                    {/* --- MODIFIED LABEL --- */}
                    <InputField
                        label="Track & Suit Fee (₹)"
                        name="uniformFee"
                        type="number"
                        value={uniformFee}
                        onChange={(e) => setUniformFee(e.target.value)}
                        placeholder="e.g., 1500"
                        required={false} // No longer required
                    />
                    <InputField
                        label="Camp Fee (₹)"
                        name="campFee"
                        type="number"
                        value={campFee}
                        onChange={(e) => setCampFee(e.target.value)}
                        placeholder="e.g., 500"
                        className="col-span-2"
                        required={false} // No longer required
                    />
                </div>

                <p className="text-xs text-gray-500 dark:text-white/70 mb-6">
                    Leave a field blank to set its value to ₹0 for all cadets.
                </p>

                <div className="flex justify-end space-x-4 mt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100 dark:bg-[#0d2137]"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-6 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-300 flex items-center"
                    >
                        {loading ? (
                            <Loader className="animate-spin w-4 h-4 mr-2" />
                        ) : (
                            'Apply to ALL Cadets'
                        )}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
