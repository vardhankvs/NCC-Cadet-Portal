// src/features/Announcements/AnnouncementForm.jsx
import React, { useState } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { InputField } from '../../components/ui/InputField.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { X, Loader, Shield, Users, Calendar } from '../../components/Icons.jsx';
import { saveAnnouncement } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const AnnouncementForm = ({ onClose, initialData = null }) => {
    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [targetCertificate, setTargetCertificate] = useState(initialData?.targetCertificate || 'All');
    const [targetDivision, setTargetDivision] = useState(initialData?.targetDivision || 'All');
    const [noticeDate, setNoticeDate] = useState(initialData?.noticeDate || new Date().toISOString().split('T')[0]);
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!title || !content) {
            setFormError('Title and Content are required.');
            return;
        }

        setLoading(true);
        try {
            await saveAnnouncement(title, content, targetCertificate, targetDivision, noticeDate, initialData?.id);
            toast.success(initialData ? "Formal notice updated." : "Formal notice posted to the unit board.");
            onClose();
        } catch (e) {
            setFormError(`Failed to save announcement: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay>
            <form
                onSubmit={handleSubmit}
                className="mx-auto w-full max-w-xl rounded-[2.5rem] bg-white dark:bg-[#050b14] p-8 shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative overflow-hidden"
            >
                {/* Tactical Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold" />
                
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h2 className="flex items-center text-2xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight">
                            <Shield className="mr-3 h-8 w-8 text-ncc-gold" />
                            {initialData ? 'Edit Unit Notice' : 'Post Unit Notice'}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest mt-1">Official Standing Orders Registry</p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
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
                            Notice Subject <span className="text-ncc-red">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Annual Training Camp 2026 Instructions"
                            className="ncc-input text-sm font-bold"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Users className="w-3 h-3" /> Certificate
                            </label>
                            <select
                                value={targetCertificate}
                                onChange={(e) => setTargetCertificate(e.target.value)}
                                className="ncc-input text-xs font-bold"
                            >
                                <option value="All">All Cadets</option>
                                <option value="B1">B1 Only</option>
                                <option value="B2">B2 Only</option>
                                <option value="C">C Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Shield className="w-3 h-3" /> Division
                            </label>
                            <select
                                value={targetDivision}
                                onChange={(e) => setTargetDivision(e.target.value)}
                                className="ncc-input text-xs font-bold"
                            >
                                <option value="All">All Div.</option>
                                <option value="SD">SD Only</option>
                                <option value="SW">SW Only</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Effective Date
                            </label>
                            <input
                                type="date"
                                value={noticeDate}
                                onChange={(e) => setNoticeDate(e.target.value)}
                                className="ncc-input text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2 flex items-center gap-2">
                            Content Detail <span className="text-ncc-red">*</span>
                        </label>
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Type the formal notice content here..."
                            className="ncc-input text-sm min-h-[160px] leading-relaxed"
                            required
                        />
                    </div>
                </div>

                <div className="mt-10 flex items-center justify-between gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={loading}
                        className="px-6 py-3 text-xs font-black text-gray-500 hover:text-ncc-navy dark:text-white/60 dark:hover:text-white uppercase tracking-widest transition-all"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="flex-1 flex items-center justify-center rounded-2xl bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy px-8 py-4 text-xs font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl shadow-ncc-navy/20 dark:shadow-ncc-gold/10 disabled:opacity-50"
                    >
                        {loading ? (
                            <Loader className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Shield className="mr-2 h-4 w-4" />
                        )}
                        {loading ? 'Processing...' : initialData ? 'Update Official Notice' : 'Publish Official Notice'}
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
