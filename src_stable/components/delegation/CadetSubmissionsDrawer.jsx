// src/components/delegation/CadetSubmissionsDrawer.jsx
import React, { useState, useMemo } from 'react';
import { X, Clock, AlertTriangle, CheckCircle, XCircle, Search, Edit2, Shield, Calendar, RefreshCcw, Check, Sparkles } from '../Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { deleteDelegatedTask, submitDelegatedTask } from '../../firebase/delegationWorkflowService.js';
import { toast } from 'react-toastify';

export const CadetSubmissionsDrawer = ({
    isOpen,
    onClose,
    submissions = [],
    loading = false,
    onResubmitTask,
    currentModuleId = null
}) => {
    const [filterStatus, setFilterStatus] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [editingSub, setEditingSub] = useState(null);
    const [editPayload, setEditPayload] = useState({});
    const [isSaving, setIsSaving] = useState(false);

    // Filter out superseded Changes Requested items if an Approved item exists for the same target/module
    const activeSubmissions = useMemo(() => {
        const approvedKeys = new Set(
            submissions
                .filter(s => s.status === 'approved')
                .map(s => `${s.moduleId}_${s.targetDocId || s.payload?.cadetId || s.payload?.enrollmentId || s.cadetEnrollmentId}`)
        );

        return submissions.filter((sub) => {
            if (sub.status === 'changes_requested') {
                const key = `${sub.moduleId}_${sub.targetDocId || sub.payload?.cadetId || sub.payload?.enrollmentId || sub.cadetEnrollmentId}`;
                if (approvedKeys.has(key)) {
                    // Auto-delete from Firestore in background
                    deleteDelegatedTask(sub.id).catch(() => {});
                    return false;
                }
            }
            return true;
        });
    }, [submissions]);

    const filteredSubmissions = useMemo(() => {
        return activeSubmissions.filter((sub) => {
            const matchesStatus =
                filterStatus === 'All' || sub.status === filterStatus;
            
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                (sub.title || '').toLowerCase().includes(q) ||
                (sub.moduleName || '').toLowerCase().includes(q) ||
                (sub.remarks || '').toLowerCase().includes(q);

            return matchesStatus && matchesSearch;
        });
    }, [activeSubmissions, filterStatus, searchQuery]);

    const handleStartEdit = (sub) => {
        setEditingSub(sub);
        setEditPayload({ ...(sub.payload || {}) });
    };

    const handleFieldChange = (key, value) => {
        setEditPayload(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSaveAndResubmit = async () => {
        if (!editingSub) return;
        setIsSaving(true);
        try {
            // Determine dynamic title if rank or notice changed
            let dynamicTitle = editingSub.title;
            if (editingSub.moduleId === 'rank_mgmt' && editPayload.newRank) {
                dynamicTitle = `Promote ${editPayload.cadetName || editPayload.name || 'Cadet'} to ${editPayload.newRank}`;
            } else if (editingSub.moduleId === 'announcements' && editPayload.title) {
                dynamicTitle = editPayload.title;
            }

            await submitDelegatedTask({
                institutionId: editingSub.institutionId,
                cadetEnrollmentId: editingSub.cadetEnrollmentId,
                cadetName: editingSub.cadetName,
                cadetUid: editingSub.cadetUid,
                moduleId: editingSub.moduleId,
                moduleName: editingSub.moduleName,
                actionType: editingSub.actionType,
                targetDocId: editingSub.targetDocId,
                title: dynamicTitle,
                payload: editPayload,
                submissionId: editingSub.id // In-place update to reset status to pending
            });

            toast.success("Changes saved! Resubmitted to ANO for verification.");
            setEditingSub(null);
        } catch (err) {
            console.error("Resubmit error:", err);
            toast.error(`Failed to resubmit: ${err.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-xl bg-white dark:bg-[#050b14] shadow-2xl border-l border-[#ddd8cc] dark:border-white/10 flex flex-col">
                    
                    {/* Header */}
                    <div className="p-5 sm:p-6 border-b border-[#ddd8cc] dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-ncc-navy text-ncc-gold flex items-center justify-center font-bold shadow-md">
                                <Shield className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base sm:text-lg font-black font-display text-ncc-navy dark:text-white">
                                    My Delegated Submissions
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-white/60">
                                    Track approval status and feedback from your ANO
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-ncc-navy dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Filter & Search Controls */}
                    <div className="p-4 border-b border-[#ddd8cc] dark:border-white/10 space-y-3 bg-white dark:bg-[#0a1628]">
                        <div className="relative">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search submissions by title or module..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs dark:text-white focus:outline-none focus:ring-2 focus:ring-ncc-navy"
                            />
                        </div>

                        {/* Status Filter Tabs */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
                            {[
                                { id: 'All', label: 'All' },
                                { id: 'pending', label: 'Pending Review' },
                                { id: 'changes_requested', label: 'Action Required' },
                                { id: 'approved', label: 'Approved' },
                                { id: 'rejected', label: 'Rejected' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilterStatus(tab.id)}
                                    className={`px-3 py-1.5 rounded-xl shrink-0 transition-all ${
                                        filterStatus === tab.id
                                            ? 'bg-ncc-navy text-white shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10'
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Submissions List */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                        {loading ? (
                            <div className="py-16 text-center">
                                <div className="w-8 h-8 border-2 border-ncc-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                                <p className="text-xs text-gray-500">Loading submissions...</p>
                            </div>
                        ) : filteredSubmissions.length === 0 ? (
                            <div className="py-16 text-center text-gray-400 dark:text-white/40 space-y-3">
                                <Clock className="w-12 h-12 mx-auto text-gray-300 dark:text-white/20" />
                                <p className="text-sm font-bold">No submissions found</p>
                                <p className="text-xs max-w-xs mx-auto">
                                    When you create or edit items in delegated tabs, your drafts will appear here for tracking.
                                </p>
                            </div>
                        ) : (
                            filteredSubmissions.map((sub) => {
                                const isPending = sub.status === 'pending';
                                const isChangesReq = sub.status === 'changes_requested';
                                const isApproved = sub.status === 'approved';
                                const isRejected = sub.status === 'rejected';

                                const postDate = sub.updatedAt?.toDate
                                    ? sub.updatedAt.toDate()
                                    : sub.updatedAt
                                    ? new Date(sub.updatedAt)
                                    : new Date();

                                return (
                                    <div
                                        key={sub.id}
                                        className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                                            isChangesReq
                                                ? 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40 shadow-sm'
                                                : isPending
                                                ? 'bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-500/30'
                                                : isApproved
                                                ? 'bg-emerald-50/50 dark:bg-emerald-950/10 border-emerald-200 dark:border-emerald-500/30'
                                                : 'bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10'
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <div>
                                                <span className="inline-block text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-md bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white mb-1.5">
                                                    {sub.moduleName || sub.moduleId} • {sub.actionType.toUpperCase()}
                                                </span>
                                                <h4 className="font-bold text-sm text-ncc-navy dark:text-white leading-snug">
                                                    {sub.title}
                                                </h4>
                                            </div>

                                            {/* Status Badge */}
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                {isPending && (
                                                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                                                        <Clock className="w-3.5 h-3.5" /> Pending Review
                                                    </span>
                                                )}
                                                {isChangesReq && (
                                                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse">
                                                        <AlertTriangle className="w-3.5 h-3.5" /> Changes Requested
                                                    </span>
                                                )}
                                                {isApproved && (
                                                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                                        <CheckCircle className="w-3.5 h-3.5" /> Approved & Live
                                                    </span>
                                                )}
                                                {isRejected && (
                                                    <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                                                        <XCircle className="w-3.5 h-3.5" /> Rejected
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {/* ANO Feedback Section if Changes Requested */}
                                        {isChangesReq && (
                                            <div className="my-3 p-3 rounded-xl bg-amber-100/70 dark:bg-amber-900/30 border border-amber-300/80 dark:border-amber-500/40 text-xs text-amber-900 dark:text-amber-200">
                                                <p className="font-bold flex items-center gap-1.5 mb-1 text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300">
                                                    <AlertTriangle className="w-3.5 h-3.5" /> ANO Feedback & Modification Instructions:
                                                </p>
                                                <p className="italic font-medium leading-relaxed">
                                                    "{sub.remarks || 'Please review and update your draft before resubmission.'}"
                                                </p>
                                            </div>
                                        )}

                                        {/* Rejection Note */}
                                        {isRejected && sub.remarks && (
                                            <div className="my-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-500/30 text-xs text-red-800 dark:text-red-200">
                                                <p className="font-bold text-[11px] uppercase tracking-wider mb-0.5">Reason for rejection:</p>
                                                <p className="italic">{sub.remarks}</p>
                                            </div>
                                        )}

                                        {/* Footer Meta & Actions */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 dark:border-white/5 text-[11px] text-gray-500 dark:text-white/50">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {formatDate(postDate)}
                                            </span>

                                            {/* Action button if actionable */}
                                            {(isChangesReq || isPending) && (
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleStartEdit(sub)}
                                                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5 text-white" />
                                                        {isChangesReq ? 'Quick Edit & Resubmit' : 'Edit Submission'}
                                                    </button>
                                                    {onResubmitTask && (
                                                        <button
                                                            onClick={() => onResubmitTask(sub)}
                                                            className="text-ncc-navy dark:text-white hover:underline text-xs font-bold"
                                                        >
                                                            Open Full Tab
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                </div>
            </div>

            {/* Quick Edit & Resubmit Modal */}
            {editingSub && (
                <div className="fixed inset-0 z-[60] overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-black/75 backdrop-blur-sm fade-in">
                    <div className="relative w-full max-w-lg bg-white dark:bg-[#0a1628] rounded-3xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-5 border-b border-gray-200 dark:border-white/10 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                            <div>
                                <h4 className="font-black text-sm text-ncc-navy dark:text-white flex items-center gap-2">
                                    <Sparkles className="w-4 h-4 text-ncc-gold" />
                                    Modify & Resubmit Task
                                </h4>
                                <p className="text-xs text-gray-500 dark:text-white/60">
                                    {editingSub.title} ({editingSub.moduleName})
                                </p>
                            </div>
                            <button
                                onClick={() => setEditingSub(null)}
                                className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* ANO Feedback Banner */}
                        {editingSub.remarks && (
                            <div className="m-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-500/40 text-xs text-amber-900 dark:text-amber-200">
                                <span className="font-bold block text-[11px] uppercase tracking-wider text-amber-800 dark:text-amber-300 mb-1">
                                    ANO's Modification Instructions:
                                </span>
                                <p className="italic">"{editingSub.remarks}"</p>
                            </div>
                        )}

                        {/* Form Fields */}
                        <div className="p-5 space-y-4 overflow-y-auto max-h-[50vh]">
                            {/* Special Rank field for Rank Management */}
                            {editingSub.moduleId === 'rank_mgmt' && (
                                <div className="space-y-1">
                                    <label className="text-[11px] font-black uppercase text-gray-600 dark:text-white/70">
                                        Target Rank:
                                    </label>
                                    <select
                                        value={editPayload.newRank || ''}
                                        onChange={(e) => handleFieldChange('newRank', e.target.value)}
                                        className="w-full text-xs font-bold p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white"
                                    >
                                        <option value="">Select Rank</option>
                                        {['CDT', 'LCPL', 'CPL', 'SGT', 'CQMS', 'CSM', 'JUO', 'SUO'].map(r => (
                                            <option key={r} value={r}>{r}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {Object.entries(editPayload).map(([key, val]) => {
                                if (['id', 'cadetId', 'enrollmentId', 'action', 'campId'].includes(key)) return null;
                                if (editingSub.moduleId === 'rank_mgmt' && key === 'newRank') return null;

                                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());

                                if (typeof val === 'string' && val.length > 80) {
                                    return (
                                        <div key={key} className="space-y-1">
                                            <label className="text-[11px] font-black uppercase text-gray-600 dark:text-white/70">
                                                {label}
                                            </label>
                                            <textarea
                                                rows={3}
                                                value={val || ''}
                                                onChange={(e) => handleFieldChange(key, e.target.value)}
                                                className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white"
                                            />
                                        </div>
                                    );
                                }

                                return (
                                    <div key={key} className="space-y-1">
                                        <label className="text-[11px] font-black uppercase text-gray-600 dark:text-white/70">
                                            {label}
                                        </label>
                                        <input
                                            type={typeof val === 'number' ? 'number' : 'text'}
                                            value={val !== undefined && val !== null ? val : ''}
                                            onChange={(e) => handleFieldChange(key, typeof val === 'number' ? Number(e.target.value) : e.target.value)}
                                            className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white"
                                        />
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-end gap-2">
                            <button
                                onClick={() => setEditingSub(null)}
                                className="px-4 py-2 text-xs font-bold text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10 rounded-xl"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSaveAndResubmit}
                                disabled={isSaving}
                                className="px-5 py-2 text-xs font-bold bg-ncc-navy text-white hover:bg-ncc-navy-mid rounded-xl flex items-center gap-2 shadow-lg disabled:opacity-50"
                            >
                                <Check className="w-4 h-4 text-ncc-gold" />
                                {isSaving ? 'Submitting...' : 'Resubmit to ANO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
