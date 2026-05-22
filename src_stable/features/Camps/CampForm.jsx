import React, { useState } from 'react';
import { X } from '../../components/Icons.jsx';
import { saveCamp } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

const CAMP_TYPES = ['ATC', 'CATC', 'EBSB', 'RDC', 'TSC', 'NSC', 'VSC', 'SNIC', 'ALC', 'BLC', 'Trekking', 'Other'];

export const CampForm = ({ onClose, initialData = null }) => {
    const [formData, setFormData] = useState(initialData ? {
        name: initialData.name || '',
        type: initialData.type || 'ATC',
        location: initialData.location || '',
        startDate: initialData.startDate || '',
        endDate: initialData.endDate || '',
    } : {
        name: '',
        type: 'ATC',
        location: '',
        startDate: '',
        endDate: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await saveCamp(formData, initialData?.id || null);
            toast.success(initialData ? 'Camp updated successfully!' : 'Camp created successfully!');
            if (!initialData) {
                sendPushToAll('🏕️ New Camp', `${formData.name} (${formData.type}) has been added. Check the Camps tab for details.`, 'camps');
            }
            onClose();
        } catch (err) {
            toast.error(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 fade-in">
            <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-2xl w-full max-w-md modal-in overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 bg-ncc-navy text-white">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#d4a83a] font-bold">Manage Camps</p>
                        <h2 className="text-lg font-bold font-display">{initialData ? 'Edit Camp' : 'Create New Camp'}</h2>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white dark:bg-[#050b14]/10 rounded-lg transition">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                    <div>
                        <label className="ncc-label" htmlFor="campName">Camp Name</label>
                        <input
                            id="campName"
                            type="text" required className="ncc-input"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Pre-RDC Phase I"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="ncc-label" htmlFor="campType">Type</label>
                            <select id="campType" className="ncc-input" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                {CAMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="ncc-label" htmlFor="campLocation">Location</label>
                            <input
                                id="campLocation"
                                type="text" required className="ncc-input"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="City/Venue"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="ncc-label" htmlFor="campStartDate">Start Date</label>
                            <input
                                id="campStartDate"
                                type="date" required className="ncc-input"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="ncc-label" htmlFor="campEndDate">End Date</label>
                            <input
                                id="campEndDate"
                                type="date" required className="ncc-input"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-[#ede8df] mt-6">
                        <button type="button" onClick={onClose} className="ncc-btn ncc-btn-ghost">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="ncc-btn ncc-btn-primary">
                            {isSubmitting ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Camp' : 'Create Camp')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
