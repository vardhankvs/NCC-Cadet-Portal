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
            <div className="bg-white dark:bg-[#050b14] rounded-[2rem] shadow-2xl w-full max-w-md modal-in overflow-hidden flex flex-col border border-gray-200 dark:border-white/10">
                <div className="relative px-8 py-6 bg-gradient-to-r from-ncc-navy via-[#1a365d] to-ncc-navy flex-shrink-0 border-b border-white/10">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="relative z-10 pr-12">
                        <p className="text-[10px] uppercase tracking-widest text-ncc-gold font-bold border border-ncc-gold/50 bg-ncc-gold/10 inline-block px-2 py-0.5 rounded mb-2 shadow-sm">Manage Camps</p>
                        <h2 className="text-2xl font-black font-display text-white tracking-tight">{initialData ? 'Edit Camp' : 'Create New Camp'}</h2>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2.5 bg-white/5 hover:bg-red-500/20 rounded-full transition-colors group z-20">
                        <X className="w-5 h-5 text-white/60 group-hover:text-red-400 transition-colors" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto bg-gray-50 dark:bg-[#0a1628]">
                    <div className="space-y-1.5">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campName">Camp Name</label>
                        <input
                            id="campName"
                            type="text" required 
                            className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold dark:focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. Pre-RDC Phase I"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campType">Type</label>
                            <select id="campType" 
                                className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold dark:focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm" 
                                value={formData.type} 
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                {CAMP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campLocation">Location</label>
                            <input
                                id="campLocation"
                                type="text" required 
                                className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold dark:focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm"
                                value={formData.location}
                                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                placeholder="City/Venue"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-5">
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campStartDate">Start Date</label>
                            <input
                                id="campStartDate"
                                type="date" required 
                                className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold dark:focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm dark:[color-scheme:dark]"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1" htmlFor="campEndDate">End Date</label>
                            <input
                                id="campEndDate"
                                type="date" required 
                                className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold dark:focus:border-ncc-gold rounded-xl px-4 py-3 text-sm font-bold text-ncc-navy dark:text-white transition-colors focus:outline-none shadow-sm dark:[color-scheme:dark]"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500 dark:text-white/60 hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="flex-1 bg-ncc-gold hover:bg-[#d4a83a] text-ncc-navy px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl shadow-ncc-gold/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70">
                            {isSubmitting ? (initialData ? 'Updating...' : 'Creating...') : (initialData ? 'Update Camp' : 'Create Camp')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
