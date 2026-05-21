import React, { useState } from 'react';
import { addJobOpportunity } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { Plus } from '../../components/Icons.jsx';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const JobForm = ({ onClose }) => {
    const [formData, setFormData] = useState({
        title: '',
        type: 'Armed Forces',
        deadline: '',
        location: '',
        description: '',
        link: ''
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await addJobOpportunity(formData);
            toast.success('Opportunity posted to the Career Bridge.');
            sendPushToAll('💼 New Job Opportunity', `${formData.title} (${formData.type}) has been posted on the Job Board`);
            onClose();
        } catch (error) {
            console.error('Error posting job:', error);
            toast.error('Failed to post opportunity.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-ncc-navy/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white dark:bg-[#050b14] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-[#ddd8cc] flex flex-col max-h-[90vh]">
                <div className="p-6 bg-ncc-navy text-white flex justify-between items-center shrink-0">
                    <h2 className="text-xl font-display font-bold flex items-center gap-2">
                        <Plus className="w-5 h-5 text-ncc-gold" /> Post Opportunity
                    </h2>
                    <button type="button" onClick={onClose} className="text-white/60 hover:text-white">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto ncc-scrollbar">
                    <div>
                        <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/60 mb-1">Opportunity Title</label>
                        <input required type="text" className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14]" 
                            value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} 
                            placeholder="e.g., AFCAT 2026, Security Manager" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/60 mb-1">Sector</label>
                            <select className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14]"
                                value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                <option value="Armed Forces">Armed Forces</option>
                                <option value="Corporate">Corporate</option>
                                <option value="Government">Government (Non-Military)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/60 mb-1">Deadline</label>
                            <input required type="date" className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14]"
                                value={formData.deadline} onChange={e => setFormData({...formData, deadline: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/60 mb-1">Location</label>
                        <input required type="text" className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14]"
                            value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} 
                            placeholder="e.g., Pan India, Hyderabad" />
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/60 mb-1">Application URL</label>
                        <input required type="url" className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14]"
                            value={formData.link} onChange={e => setFormData({...formData, link: e.target.value})} 
                            placeholder="https://..." />
                    </div>

                    <div>
                        <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/60 mb-1">Short Description</label>
                        <textarea required rows="3" className="w-full px-4 py-3 rounded-xl border border-[#ddd8cc] bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] resize-none"
                            value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} 
                            placeholder="Highlight C-Certificate advantages if any..." />
                    </div>

                    <div className="flex gap-3 pt-4 border-t border-[#ddd8cc]">
                        <button type="button" onClick={onClose} className="flex-1 py-3 font-bold text-gray-500 dark:text-white/70 hover:bg-gray-50 dark:bg-[#0a1628] rounded-xl">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 ncc-btn ncc-btn-primary py-3">
                            {loading ? 'Posting...' : 'Publish'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
