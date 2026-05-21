// src/features/Events/EventForm.jsx
import React, { useState } from 'react';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { X, Loader, Calendar, MapPin, AlignLeft, Flag, Shield } from '../../components/Icons.jsx';
import { saveEvent } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const EventForm = ({ currentEvent, onSaveSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        name: currentEvent?.name || '',
        date: currentEvent?.date
            ? new Date(currentEvent.date).toISOString().split('T')[0]
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
            setFormError('Event name and date are required.');
            return;
        }

        setLoading(true);
        try {
            await saveEvent(formData, currentEvent?.id);
            toast.success(isEditMode ? 'Event updated successfully.' : 'New event added to unit calendar.');
            sendPushToAll('📅 New Event', `${formData.name} has been added to the unit calendar`);
            onSaveSuccess();
        } catch (e) {
            setFormError(e.message);
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-xl rounded-[2.5rem] bg-white dark:bg-[#050b14] p-8 shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative overflow-hidden"
        >
            {/* Tactical Header Decoration */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold" />
            
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="flex items-center text-2xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight">
                        <Flag className="mr-3 h-8 w-8 text-ncc-navy dark:text-ncc-gold" />
                        {isEditMode ? 'Edit Unit Event' : 'Add New Event'}
                    </h2>
                    <p className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest mt-1">Official Unit Calendar Entry</p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-ncc-red transition-colors"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {formError && (
                <div className="mb-6">
                    <ErrorDisplay message={formError} />
                </div>
            )}

            <div className="space-y-6">
                <div>
                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        Event Name <span className="text-ncc-red">*</span>
                    </label>
                    <div className="relative">
                        <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            placeholder="e.g. Republic Day Parade Practice"
                            className="ncc-input pl-11 text-sm font-bold"
                            required
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Calendar className="w-3 h-3" /> Event Date <span className="text-ncc-red">*</span>
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            className="ncc-input text-xs font-bold"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <MapPin className="w-3 h-3" /> Location
                        </label>
                        <input
                            type="text"
                            name="location"
                            value={formData.location}
                            onChange={handleChange}
                            placeholder="e.g. Unit Ground"
                            className="ncc-input text-xs font-bold"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlignLeft className="w-3 h-3" /> Event Description
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Provide details about the event, attire, and objectives..."
                        className="ncc-input text-sm min-h-[140px] leading-relaxed"
                    />
                </div>
            </div>

            <div className="mt-10 flex items-center justify-between gap-4">
                <button
                    type="button"
                    onClick={onCancel}
                    disabled={loading}
                    className="px-6 py-3 text-xs font-black text-gray-500 hover:text-ncc-navy dark:text-white/60 dark:hover:text-white uppercase tracking-widest transition-all"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center rounded-2xl bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy px-8 py-4 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-ncc-navy/20 dark:shadow-ncc-gold/10 disabled:opacity-50"
                >
                    {loading ? (
                        <Loader className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Flag className="mr-2 h-4 w-4" />
                    )}
                    {loading ? 'Processing...' : isEditMode ? 'Update Event Details' : 'Add Event to Calendar'}
                </button>
            </div>
        </form>
    );
};
