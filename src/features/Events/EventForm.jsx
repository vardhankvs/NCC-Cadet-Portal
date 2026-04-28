// src/features/Events/EventForm.js
import React, { useState } from 'react';
import { InputField } from '../../components/ui/InputField';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { XCircle } from '../../components/Icons';
import { saveEvent } from '../../firebase/firestoreService';

export const EventForm = ({ currentEvent, onSaveSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: currentEvent?.name || '',
        date: currentEvent?.date
            ? currentEvent.date.toISOString().split('T')[0]
            : '',
        description: currentEvent?.description || '',
        location: currentEvent?.location || '',
    });
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const isEditMode = !!currentEvent;

    const handleChange = (e) =>
        setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!formData.name || !formData.date) {
            setFormError('Event name and date required.');
            return;
        }

        setLoading(true);
        try {
            await saveEvent(formData, currentEvent?.id);
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
                    {isEditMode ? 'Edit Event' : 'Add New Event'}
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
                label="Event Name"
                name="name"
                value={formData.name}
                onChange={handleChange}
            />
            <InputField
                label="Date"
                name="date"
                type="date"
                value={formData.date}
                onChange={handleChange}
            />
            <InputField
                label="Location (Opt)"
                name="location"
                value={formData.location}
                onChange={handleChange}
                required={false}
            />
            <InputField
                label="Description (Opt)"
                name="description"
                value={formData.description}
                onChange={handleChange}
                required={false}
                type="textarea"
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
                          ? 'Update Event'
                          : 'Add Event'}
                </button>
            </div>
        </form>
    );
};
