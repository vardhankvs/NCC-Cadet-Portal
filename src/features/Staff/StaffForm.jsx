// src/features/Staff/StaffForm.js
import React, { useState } from 'react';
import { InputField } from '../../components/ui/InputField';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { XCircle } from '../../components/Icons';
import { saveStaff } from '../../firebase/firestoreService';

export const StaffForm = ({ currentStaff, onSaveSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: currentStaff?.name || '',
        rank: currentStaff?.rank || '',
        phone: currentStaff?.phone || '',
        email: currentStaff?.email || '',
        photoUrl: currentStaff?.photoUrl || '',
    });
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const isEditMode = !!currentStaff;

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!formData.name || !formData.rank) {
            setFormError('Staff name and rank required.');
            return;
        }

        setLoading(true);
        try {
            await saveStaff(formData, currentStaff?.id);
            onSaveSuccess();
        } catch (e) {
            setFormError(e.message);
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto"
        >
            <div className="flex justify-between items-center mb-6 border-b pb-3">
                <h2 className="text-2xl font-bold text-gray-900">
                    {isEditMode ? 'Edit Staff Member' : 'Add Staff Member'}
                </h2>
                <button type="button" onClick={onCancel} title="Close Form">
                    <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                </button>
            </div>
            {formError && (
                <div className="mb-4">
                    <ErrorDisplay message={formError} />
                </div>
            )}

            <InputField
                label="Full Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
            />
            <InputField
                label="Rank/Designation"
                name="rank"
                value={formData.rank}
                onChange={handleChange}
            />
            <InputField
                label="Phone (Opt)"
                name="phone"
                type="tel"
                value={formData.phone}
                onChange={handleChange}
                required={false}
            />
            <InputField
                label="Email (Opt)"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                required={false}
            />
            <InputField
                label="Photo URL (Opt)"
                name="photoUrl"
                type="url"
                value={formData.photoUrl}
                onChange={handleChange}
                required={false}
                placeholder="https://i.postimg.cc/..."
            />

            <div className="flex justify-end space-x-4 mt-6">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:bg-gray-100"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-300"
                >
                    {loading
                        ? 'Saving...'
                        : isEditMode
                          ? 'Update Staff'
                          : 'Add Staff'}
                </button>
            </div>
        </form>
    );
};
