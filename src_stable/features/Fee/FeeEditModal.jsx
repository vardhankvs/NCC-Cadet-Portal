// src/features/Fee/FeeEditModal.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
// ErrorDisplay is not used, toast is
// import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { XCircle, Briefcase, Loader } from '../../components/Icons.jsx';
import { updateCadetFee } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const FeeEditModal = ({ cadet, onClose }) => {
    const [enrollmentFee, setEnrollmentFee] = useState(
        cadet.enrollmentFee || 0
    );
    const [uniformFee, setUniformFee] = useState(cadet.uniformFee || 0);
    const [campFee, setCampFee] = useState(cadet.campFee || 0);
    const [feePaid, setFeePaid] = useState(cadet.feePaid || 0);
    const [feeDueDate, setFeeDueDate] = useState(cadet.feeDueDate || '');

    const [loading, setLoading] = useState(false);

    const totalRequired =
        Number(enrollmentFee) + Number(uniformFee) + Number(campFee);
    const amountDue = totalRequired - Number(feePaid);
    const statusColor = amountDue > 0 ? 'text-red-600' : 'text-green-600';

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (isNaN(totalRequired) || isNaN(feePaid)) {
            toast.error('All fee fields must be valid numbers.');
            return;
        }

        setLoading(true);
        try {
            const updatedData = {
                enrollmentFee: Number(enrollmentFee),
                uniformFee: Number(uniformFee),
                campFee: Number(campFee),
                feePaid: Number(feePaid),
                feeDueDate: feeDueDate,
            };

            await updateCadetFee(cadet.id, updatedData);
            toast.success(`Fee details for ${cadet.name} updated!`);
            onClose();
        } catch (e) {
            toast.error(`Update failed: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return `₹ ${Number(amount).toLocaleString('en-IN')}`;
    };

    return (
        <ModalOverlay>
            <form
                onSubmit={handleSubmit}
                className="p-6 bg-white dark:bg-[#050b14] rounded-xl shadow-2xl w-full max-w-lg mx-auto"
            >
                <div className="flex justify-between items-center mb-6 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Briefcase className="w-6 h-6 mr-2 text-indigo-600" />{' '}
                        Edit Fee: {cadet.name}
                    </h2>
                    <button type="button" onClick={onClose} title="Close">
                        <XCircle className="w-6 h-6 text-gray-400 dark:text-white/80 hover:text-gray-600 dark:text-white/80" />
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                    <InputField
                        label="Enrollment Fee"
                        name="enrollmentFee"
                        type="number"
                        value={enrollmentFee}
                        onChange={(e) => setEnrollmentFee(e.target.value)}
                        required={false}
                    />
                    {/* --- MODIFIED LABEL --- */}
                    <InputField
                        label="Track & Suit Fee"
                        name="uniformFee"
                        type="number"
                        value={uniformFee}
                        onChange={(e) => setUniformFee(e.target.value)}
                        required={false}
                    />
                    <InputField
                        label="Camp/Activity Fee"
                        name="campFee"
                        type="number"
                        value={campFee}
                        onChange={(e) => setCampFee(e.target.value)}
                        required={false}
                    />
                    <InputField
                        label="Fee Paid"
                        name="feePaid"
                        type="number"
                        value={feePaid}
                        onChange={(e) => setFeePaid(e.target.value)}
                        required={false}
                        className="col-span-2"
                    />
                    <InputField
                        label="Due Date"
                        name="feeDueDate"
                        type="date"
                        value={feeDueDate}
                        onChange={(e) => setFeeDueDate(e.target.value)}
                        required={false}
                        className="col-span-2"
                    />
                </div>

                <div className="p-4 bg-gray-100 dark:bg-[#0d2137] rounded-lg shadow-inner text-sm space-y-1">
                    <p className="font-semibold text-gray-700 dark:text-white/90 flex justify-between">
                        Total Required:{' '}
                        <span className="font-extrabold text-indigo-600">
                            {formatCurrency(totalRequired)}
                        </span>
                    </p>
                    <p
                        className={`font-semibold flex justify-between ${statusColor}`}
                    >
                        Amount Due:{' '}
                        <span className="font-extrabold">
                            {formatCurrency(amountDue)}
                        </span>
                    </p>
                </div>

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
                        className="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center"
                    >
                        {loading ? (
                            <Loader className="animate-spin w-4 h-4 mr-2" />
                        ) : (
                            'Save Changes'
                        )}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
