// src/features/Events/EventForm.jsx
import React, { useState } from 'react';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { X, Loader, Calendar, MapPin, AlignLeft, Flag, Shield, Clock, Users } from '../../components/Icons.jsx';
import { saveEvent } from '../../firebase/firestoreService.js';
import { submitDelegatedTask } from '../../firebase/delegationWorkflowService.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';
import { parseEventDetails } from '../../utils/dateUtils.js';

import { ImageIcon, List } from '../../components/Icons.jsx';

export const EventForm = ({ currentEvent, onSaveSuccess, onCancel, onManageGallery, onManageRoster }) => {
    const { userRole, actualRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const isCadetUser = isDelegatedCadet || userRole === 'cadet' || actualRole === 'cadet';
    
    const initialDetails = currentEvent ? parseEventDetails(currentEvent) : null;

    const [formData, setFormData] = useState({
        name: currentEvent?.name || '',
        type: currentEvent?.type || initialDetails?.activityType || 'Parade',
        date: currentEvent?.date
            ? new Date(currentEvent.date).toISOString().split('T')[0]
            : '',
        time: currentEvent?.time || initialDetails?.time || '06:00',
        location: currentEvent?.location || '',
        dresscode: currentEvent?.dresscode || initialDetails?.dress || 'No. 2 Dress (Training)',
        reportingStrength: currentEvent?.reportingStrength || initialDetails?.strength || 'All',
        priority: currentEvent?.priority || initialDetails?.priority || 'Normal',
        specialInstructions: currentEvent?.specialInstructions || (initialDetails?.instructions !== 'Nil' ? initialDetails?.instructions : '') || '',
        description: initialDetails?.description || (currentEvent && !initialDetails ? currentEvent?.description : '') || '',
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

        const metaLine = `[${formData.type}] | Time: ${formData.time || '06:00'} | Dress: ${formData.dresscode} | Strength: ${formData.reportingStrength || 'All'} | Priority: ${formData.priority} | Instructions: ${formData.specialInstructions?.trim() || 'Nil'}`;
        const finalDescription = formData.description?.trim() 
            ? `${formData.description.trim()}\n${metaLine}`
            : metaLine;

        const eventPayload = {
            name: formData.name,
            type: formData.type,
            date: formData.date,
            time: formData.time,
            location: formData.location || 'GMRIT NCC Office',
            dresscode: formData.dresscode,
            reportingStrength: formData.reportingStrength,
            priority: formData.priority,
            specialInstructions: formData.specialInstructions?.trim() || 'Nil',
            description: finalDescription,
        };

        if (isCadetUser) {
            setLoading(true);
            try {
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'events',
                    moduleName: 'Events & Drills',
                    actionType: isEditMode ? 'update' : 'create',
                    targetDocId: currentEvent?.id || null,
                    title: `Event: ${formData.name}`,
                    payload: {
                        ...eventPayload,
                        id: currentEvent?.id || null
                    }
                });
                toast.success('Event draft submitted! Sent to Institution ANO for verification.');
                onSaveSuccess();
            } catch (e) {
                setFormError(`Failed to submit event: ${e.message}`);
            } finally {
                setLoading(false);
            }
            return;
        }

        setLoading(true);
        try {
            await saveEvent(eventPayload, currentEvent?.id);
            toast.success(isEditMode ? 'Event updated successfully.' : 'New event added to unit calendar.');
            const timeInfo = formData.time ? ` at ${formData.time}` : '';
            sendPushToAll('🎪 New Event Posted', `${formData.name} (${formData.type}) scheduled for ${formData.date}${timeInfo}. Dress: ${formData.dresscode}. Tap to review details.`, 'events', { category: 'Events' });
            onSaveSuccess();
        } catch (e) {
            setFormError(e.message);
            setLoading(false);
        }
    };

    return (
        <form
            onSubmit={handleSubmit}
            className="mx-auto w-full max-w-2xl rounded-[2.5rem] bg-white dark:bg-[#050b14] p-8 shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative overflow-hidden max-h-[92vh] overflow-y-auto ncc-scrollbar"
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

                {/* Activity Type & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Flag className="w-3 h-3 text-ncc-gold" /> Activity / Event Type
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="ncc-input text-xs font-bold"
                        >
                            <option value="Parade">Parade</option>
                            <option value="Social Activity">Social Activity</option>
                            <option value="Camp">Camp</option>
                            <option value="NCC Day">NCC Day</option>
                            <option value="Exam">Exam</option>
                            <option value="Shooting Practice">Shooting Practice</option>
                            <option value="Drill">Drill / Ceremony</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Shield className="w-3 h-3 text-ncc-gold" /> Priority Level
                        </label>
                        <select
                            name="priority"
                            value={formData.priority}
                            onChange={handleChange}
                            className="ncc-input text-xs font-bold"
                        >
                            <option value="Normal">Normal</option>
                            <option value="High">High Priority</option>
                            <option value="Mandatory">Mandatory</option>
                        </select>
                    </div>
                </div>

                {/* Event Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-ncc-gold" /> Event Date <span className="text-ncc-red">*</span>
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
                            <Clock className="w-3 h-3 text-ncc-gold" /> Event Time
                        </label>
                        <input
                            type="time"
                            name="time"
                            value={formData.time}
                            onChange={handleChange}
                            className="ncc-input text-xs font-bold"
                        />
                    </div>
                </div>

                {/* Location & Dress Code */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-ncc-gold" /> Location
                        </label>
                        <div className="relative">
                            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                name="location"
                                value={formData.location}
                                onChange={handleChange}
                                placeholder="e.g. GMRIT Campus Ground"
                                className="ncc-input pl-11 text-xs font-bold"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            Dress Code
                        </label>
                        <select
                            name="dresscode"
                            value={formData.dresscode}
                            onChange={handleChange}
                            className="ncc-input text-xs font-bold"
                        >
                            <option>No. 2 Dress (Training)</option>
                            <option>No. 1 Dress (Ceremonial)</option>
                            <option>No. 3 Dress (PT)</option>
                            <option>Civilian / Semi-formal</option>
                        </select>
                    </div>
                </div>

                {/* Reporting Strength & Special Instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            <Users className="w-3 h-3 text-ncc-gold" /> Reporting Strength
                        </label>
                        <input
                            type="text"
                            name="reportingStrength"
                            value={formData.reportingStrength}
                            onChange={handleChange}
                            placeholder="e.g. All, or 45"
                            className="ncc-input text-xs font-bold"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                            Instructions
                        </label>
                        <input
                            type="text"
                            name="specialInstructions"
                            value={formData.specialInstructions}
                            onChange={handleChange}
                            placeholder="e.g. Nil, Water bottle mandatory..."
                            className="ncc-input text-xs font-bold"
                        />
                    </div>
                </div>

                {/* Description of the particular event */}
                <div>
                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                        <AlignLeft className="w-3 h-3 text-ncc-gold" /> Description of Particular Event
                    </label>
                    <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Provide details about the event, objectives, briefing notes..."
                        className="ncc-input text-sm min-h-[110px] leading-relaxed"
                    />
                </div>
            </div>


            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/10">
                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-3">Event Management</label>
                {isEditMode ? (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <button type="button" onClick={onManageGallery} className="flex-1 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-ncc-navy dark:hover:border-ncc-gold transition-all group/btn flex items-center justify-center gap-2">
                            <ImageIcon className="w-5 h-5 text-gray-400 group-hover/btn:text-ncc-navy dark:group-hover/btn:text-ncc-gold transition-colors" />
                            <span className="text-xs font-bold text-ncc-navy dark:text-white">Manage Photo Gallery</span>
                        </button>
                        <button type="button" onClick={onManageRoster} className="flex-1 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-ncc-navy dark:hover:border-ncc-gold transition-all group/btn flex items-center justify-center gap-2">
                            <List className="w-5 h-5 text-gray-400 group-hover/btn:text-ncc-navy dark:group-hover/btn:text-ncc-gold transition-colors" />
                            <span className="text-xs font-bold text-ncc-navy dark:text-white">Manage Cadet Roster</span>
                        </button>
                    </div>
                ) : (
                    <div className="p-4 rounded-xl bg-ncc-navy/5 dark:bg-ncc-gold/5 border border-dashed border-ncc-navy/20 dark:border-ncc-gold/20 flex flex-col items-center justify-center text-center">
                        <p className="text-xs font-bold text-ncc-navy/70 dark:text-ncc-gold/80 mb-1">Save Event First</p>
                        <p className="text-[10px] text-gray-500 dark:text-white/60">You can manage the cadet roster and photo gallery after creating this event.</p>
                    </div>
                )}
            </div>

            <div className="mt-8 flex items-center justify-between gap-4">
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
                    {loading 
                        ? 'Processing...' 
                        : isDelegatedCadet
                        ? 'Submit for ANO Verification'
                        : isEditMode 
                        ? 'Update Event Details' 
                        : 'Add Event to Calendar'}
                </button>
            </div>
        </form>
    );
};
