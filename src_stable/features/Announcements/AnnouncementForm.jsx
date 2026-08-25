// src/features/Announcements/AnnouncementForm.jsx
import React, { useState, useMemo } from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { X, Loader, Shield, Users, Calendar, GraduationCap, ChevronDown } from '../../components/Icons.jsx';
import { saveAnnouncement } from '../../firebase/firestoreService.js';
import { submitDelegatedTask } from '../../firebase/delegationWorkflowService.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const AnnouncementForm = ({ onClose, initialData = null }) => {
    const { userRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const { units = [] } = useDataContext();

    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';

    // College list for targeting (battalion admin only)
    const colleges = useMemo(() => units.filter(u => !u.isBattalion), [units]);

    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [targetCertificate, setTargetCertificate] = useState(initialData?.targetCertificate || 'All');
    const [targetDivision, setTargetDivision] = useState(initialData?.targetDivision || 'All');
    const [noticeDate, setNoticeDate] = useState(initialData?.noticeDate || new Date().toISOString().split('T')[0]);
    // targetCollege is string in legacy but can be array now
    const initialColleges = useMemo(() => {
        if (!initialData?.targetCollege) return ['All'];
        if (Array.isArray(initialData.targetCollege)) return initialData.targetCollege;
        return [initialData.targetCollege];
    }, [initialData]);

    const [selectedColleges, setSelectedColleges] = useState(initialColleges);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [formError, setFormError] = useState(null);
    const [loading, setLoading] = useState(false);

    const triggerText = useMemo(() => {
        if (selectedColleges.includes('All')) {
            return '📢 All Colleges';
        }
        if (selectedColleges.length === 0) {
            return 'Choose colleges...';
        }
        const names = selectedColleges.map(id => {
            const col = colleges.find(c => (c.subdomain || c.id) === id);
            return col?.collegeName || col?.name || id;
        });
        if (names.length <= 2) {
            return names.join(', ');
        }
        return `${names.length} Colleges Selected`;
    }, [selectedColleges, colleges]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError(null);
        if (!title || !content) {
            setFormError('Title and Content are required.');
            return;
        }

        // Delegated Cadet workflow: Submit for ANO Verification
        if (isDelegatedCadet) {
            setLoading(true);
            try {
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'announcements',
                    moduleName: 'Notice Board',
                    actionType: initialData ? 'update' : 'create',
                    targetDocId: initialData?.id || null,
                    title: `Notice: ${title}`,
                    payload: {
                        title,
                        content,
                        targetCertificate,
                        targetDivision,
                        noticeDate,
                        senderRole: 'cadet_delegated',
                        targetAudience: 'cadets',
                        targetCollege: 'All',
                        id: initialData?.id || null
                    }
                });
                toast.success('Draft notice submitted! Sent to Institution ANO for verification.');
                onClose();
            } catch (e) {
                setFormError(`Failed to submit notice for verification: ${e.message}`);
            } finally {
                setLoading(false);
            }
            return;
        }

        const senderRole = isBattalionAdmin ? 'battalion_admin' : 'ano';
        const targetAudience = isBattalionAdmin ? 'ano' : 'cadets';
        const finalTargetCollege = isBattalionAdmin 
            ? (selectedColleges.includes('All') ? 'All' : selectedColleges)
            : 'All';

        setLoading(true);
        try {
            await saveAnnouncement(
                title, content,
                targetCertificate, targetDivision,
                noticeDate, initialData?.id,
                senderRole, targetAudience, finalTargetCollege
            );
            
            let targetLabel = 'All Colleges';
            if (finalTargetCollege !== 'All') {
                if (Array.isArray(finalTargetCollege)) {
                    targetLabel = finalTargetCollege.map(id => colleges.find(c => (c.subdomain || c.id) === id)?.collegeName || id).join(', ');
                } else {
                    targetLabel = colleges.find(c => (c.subdomain || c.id) === finalTargetCollege)?.collegeName || finalTargetCollege;
                }
            }
            const successMsg = isBattalionAdmin
                ? `Notice sent to ${targetLabel}.`
                : 'Notice posted to your cadets.';
            toast.success(successMsg);
            if (!initialData) sendPushToAll('📢 New Announcement', title, 'announcements');
            onClose();
        } catch (e) {
            setFormError(`Failed to save notice: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ModalOverlay>
            <form
                onSubmit={handleSubmit}
                className="mx-auto w-[90vw] md:w-[75vw] max-w-4xl rounded-[2.5rem] bg-white dark:bg-[#050b14] p-8 shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative flex flex-col max-h-[90vh] overflow-hidden"
            >
                {/* Tactical Header Decoration */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold" />

                <div className="mb-8 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="flex items-center text-2xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight">
                            <Shield className="mr-3 h-8 w-8 text-ncc-gold" />
                            {isDelegatedCadet
                                ? (initialData ? 'Edit Draft Notice (Delegated)' : 'Draft Notice (Delegated Command)')
                                : (initialData ? 'Edit Notice' : (isBattalionAdmin ? 'Post Notice to ANOs' : 'Post Notice to Cadets'))}
                        </h2>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-white/60 uppercase tracking-widest mt-1">
                            {isDelegatedCadet 
                                ? 'Submissions require verification by your Institution ANO'
                                : (isBattalionAdmin ? 'Battalion HQ → College ANOs' : 'College ANO → Cadets')}
                        </p>
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
                    <div className="mb-6 shrink-0">
                        <ErrorDisplay message={formError} />
                    </div>
                )}

                <div className="space-y-6 flex-1 overflow-y-auto pr-1">
                    {/* Notice Subject */}
                    <div>
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">
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

                    {/* Target College (Battalion Admin only) */}
                    {isBattalionAdmin && (
                        <div className="relative">
                            <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <GraduationCap className="w-3 h-3 text-ncc-gold" /> Target Colleges
                            </label>
                            
                            {/* Dropdown Trigger */}
                            <button
                                type="button"
                                onClick={() => setDropdownOpen(!dropdownOpen)}
                                className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-2xl py-3.5 px-4 text-xs font-bold text-ncc-navy dark:text-white flex items-center justify-between hover:border-ncc-gold transition-all text-left"
                            >
                                <span className="truncate pr-4">{triggerText}</span>
                                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Options */}
                            {dropdownOpen && (
                                <>
                                    <div 
                                        className="fixed inset-0 z-10" 
                                        onClick={() => setDropdownOpen(false)}
                                    />
                                    <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl z-20 max-h-60 overflow-y-auto p-2.5 space-y-1 modal-in">
                                        {/* All Colleges Option */}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedColleges(['All']);
                                            }}
                                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left"
                                        >
                                            <input 
                                                type="checkbox"
                                                checked={selectedColleges.includes('All')}
                                                onChange={() => {}}
                                                className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-ncc-navy focus:ring-ncc-navy cursor-pointer shrink-0"
                                            />
                                            <span className="text-xs font-bold text-ncc-navy dark:text-white">📢 All Colleges</span>
                                        </button>
                                        
                                        <div className="h-[1px] bg-gray-100 dark:bg-white/5 my-1.5" />

                                        {/* Individual Colleges Options */}
                                        {colleges.map(col => {
                                            const id = col.subdomain || col.id;
                                            const isSelected = selectedColleges.includes(id) && !selectedColleges.includes('All');
                                            return (
                                                <button
                                                    type="button"
                                                    key={id}
                                                    onClick={() => {
                                                        setSelectedColleges(prev => {
                                                            let next = prev.filter(x => x !== 'All');
                                                            if (next.includes(id)) {
                                                                next = next.filter(x => x !== id);
                                                            } else {
                                                                next.push(id);
                                                            }
                                                            if (next.length === 0) {
                                                                return ['All'];
                                                            }
                                                            return next;
                                                        });
                                                    }}
                                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 dark:hover:bg-white/5 transition-all text-left"
                                                >
                                                    <input 
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => {}}
                                                        className="w-4 h-4 rounded border-gray-300 dark:border-white/20 text-ncc-navy focus:ring-ncc-navy cursor-pointer shrink-0"
                                                    />
                                                    <span className="text-xs font-semibold text-ncc-navy dark:text-white">
                                                        {col.collegeName || col.name || id}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                    {/* Filters row (ANO only — for cadet-level targeting) */}
                    {!isBattalionAdmin && (
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
                    )}

                    {/* Effective Date for battalion admin */}
                    {isBattalionAdmin && (
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest mb-2 flex items-center gap-2">
                                <Calendar className="w-3 h-3" /> Effective Date
                            </label>
                            <input
                                type="date"
                                value={noticeDate}
                                onChange={(e) => setNoticeDate(e.target.value)}
                                className="ncc-input text-xs font-bold w-48"
                            />
                        </div>
                    )}

                    {/* Content */}
                    <div>
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">
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

                <div className="mt-10 flex items-center justify-between gap-4 shrink-0">
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
                        {loading
                            ? 'Processing...'
                            : isDelegatedCadet
                                ? 'Submit for ANO Verification'
                                : initialData
                                    ? 'Update Notice'
                                    : isBattalionAdmin
                                        ? 'Publish to ANOs'
                                        : 'Publish to Cadets'
                        }
                    </button>
                </div>
            </form>
        </ModalOverlay>
    );
};
