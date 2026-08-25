// src/components/delegation/DelegatedTaskReviewModal.jsx
import React, { useState } from 'react';
import { X, Check, Edit2, AlertTriangle, XCircle, Shield, User, Calendar, MapPin, FileText, ChevronRight, CheckCircle } from '../Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { toast } from 'react-toastify';
import { approveDelegatedTask, requestChangesOnDelegatedTask, rejectDelegatedTask } from '../../firebase/delegationWorkflowService.js';

export const DelegatedTaskReviewModal = ({
    submission,
    onClose,
    onSuccess,
    anoName = 'Institution ANO'
}) => {
    if (!submission) return null;

    const [isEditing, setIsEditing] = useState(false);
    const [editedPayload, setEditedPayload] = useState({ ...(submission.payload || {}) });
    const [actionState, setActionState] = useState(null); // 'idle' | 'request_changes' | 'reject'
    const [anoRemarks, setAnoRemarks] = useState('');
    const [processing, setProcessing] = useState(false);

    const isPending = submission.status === 'pending';
    const isChangesReq = submission.status === 'changes_requested';
    const isApproved = submission.status === 'approved';
    const isRejected = submission.status === 'rejected';

    const handlePayloadChange = (key, value) => {
        setEditedPayload(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleApprove = async () => {
        setProcessing(true);
        try {
            const modifiedPayload = isEditing ? editedPayload : null;
            await approveDelegatedTask(submission, modifiedPayload, anoName);
            toast.success(`Task approved and published to live portal!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Approval error:', err);
            toast.error(`Approval failed: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleRequestChanges = async () => {
        if (!anoRemarks.trim()) {
            toast.warning('Please provide specific feedback remarks for the cadet.');
            return;
        }
        setProcessing(true);
        try {
            await requestChangesOnDelegatedTask(
                submission.id,
                anoRemarks,
                submission.cadetEnrollmentId,
                submission.moduleName,
                anoName
            );
            toast.info('Revision request sent to the cadet.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Request changes error:', err);
            toast.error(`Failed to request changes: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!anoRemarks.trim()) {
            toast.warning('Please provide a reason for rejecting the task.');
            return;
        }
        setProcessing(true);
        try {
            await rejectDelegatedTask(
                submission.id,
                anoRemarks,
                submission.cadetEnrollmentId,
                submission.moduleName,
                anoName
            );
            toast.error('Task submission rejected.');
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Reject error:', err);
            toast.error(`Failed to reject task: ${err.message}`);
        } finally {
            setProcessing(false);
        }
    };

    // Render payload fields depending on the module
    const renderPayloadFields = () => {
        const p = isEditing ? editedPayload : (submission.payload || {});

        return (
            <div className="space-y-4">
                {/* Dedicated display for Cadet Names / Lists */}
                {Object.entries(p).map(([key, val]) => {
                    if (['id', 'volunteers', 'campIds', 'cadetIds'].includes(key)) return null;

                    const label = key
                        .replace(/([A-Z])/g, ' $1')
                        .replace(/^./, str => str.toUpperCase());

                    // 1. Array of Cadet Names / Strings
                    if (Array.isArray(val)) {
                        return (
                            <div key={key} className="p-4 bg-gray-50 dark:bg-white/5 rounded-2xl border border-gray-100 dark:border-white/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[11px] font-black uppercase tracking-wider text-gray-600 dark:text-white/70 flex items-center gap-2">
                                        <User className="w-3.5 h-3.5 text-ncc-gold" />
                                        {label} ({val.length} Cadets)
                                    </label>
                                    <span className="text-[10px] font-black px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-800">
                                        Full Verified List
                                    </span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto ncc-scrollbar p-1">
                                    {val.map((item, idx) => {
                                        const itemStr = typeof item === 'object' ? (item.name || item.cadetName || JSON.stringify(item)) : String(item);
                                        return (
                                            <div key={idx} className="flex items-center gap-2.5 p-3 rounded-xl bg-white dark:bg-[#0a1628] border border-gray-200/80 dark:border-white/10 shadow-sm hover:border-ncc-gold/40 transition-colors">
                                                <div className="w-6 h-6 rounded-full bg-ncc-navy text-ncc-gold text-[10px] font-black flex items-center justify-center shrink-0 shadow-xs">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-bold text-ncc-navy dark:text-white break-words leading-tight">
                                                        {itemStr}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    }

                    // 2. Boolean values
                    if (typeof val === 'boolean') {
                        return (
                            <div key={key} className="flex items-center justify-between p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <span className="text-xs font-bold text-gray-600 dark:text-white/70">{label}</span>
                                {isEditing ? (
                                    <input
                                        type="checkbox"
                                        checked={Boolean(val)}
                                        onChange={e => handlePayloadChange(key, e.target.checked)}
                                        className="w-4 h-4 rounded text-ncc-navy"
                                    />
                                ) : (
                                    <span className="text-xs font-black text-ncc-navy dark:text-white">{val ? 'Yes' : 'No'}</span>
                                )}
                            </div>
                        );
                    }

                    // 3. Long text values
                    if (typeof val === 'string' && val.length > 80) {
                        return (
                            <div key={key} className="space-y-1.5 p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-white/60">
                                    {label}
                                </label>
                                {isEditing ? (
                                    <textarea
                                        rows={4}
                                        value={val || ''}
                                        onChange={e => handlePayloadChange(key, e.target.value)}
                                        className="w-full text-xs font-medium p-2.5 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a1628] text-ncc-navy dark:text-white focus:ring-2 focus:ring-ncc-navy"
                                    />
                                ) : (
                                    <p className="text-xs text-ncc-navy dark:text-white whitespace-pre-wrap leading-relaxed break-words">
                                        {val || '-'}
                                    </p>
                                )}
                            </div>
                        );
                    }

                    // 4. Default standard fields (Status, Action, Date, Title, etc.)
                    return (
                        <div key={key} className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <label className="text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-white/60 shrink-0">
                                {label}
                            </label>
                            {isEditing ? (
                                <input
                                    type={typeof val === 'number' ? 'number' : 'text'}
                                    value={val !== undefined && val !== null ? val : ''}
                                    onChange={e => handlePayloadChange(key, typeof val === 'number' ? Number(e.target.value) : e.target.value)}
                                    className="text-xs font-bold p-2 rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0a1628] text-ncc-navy dark:text-white focus:ring-2 focus:ring-ncc-navy sm:max-w-xs w-full"
                                />
                            ) : (
                                <span className="text-xs font-bold text-ncc-navy dark:text-white break-words sm:text-right">
                                    {String(val ?? '-')}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm fade-in">
            <div className="relative w-full max-w-2xl bg-white dark:bg-[#050b14] rounded-3xl shadow-2xl border border-[#ddd8cc] dark:border-white/10 overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-5 sm:p-6 border-b border-[#ddd8cc] dark:border-white/10 bg-gray-50 dark:bg-white/5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-ncc-navy text-ncc-gold flex items-center justify-center font-bold shadow-md">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-ncc-gold/20 text-ncc-navy dark:text-ncc-gold">
                                    {submission.moduleName || submission.moduleId}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs font-bold text-gray-500 dark:text-white/60 uppercase">
                                    {submission.actionType} Action
                                </span>
                            </div>
                            <h3 className="text-base sm:text-lg font-black font-display text-ncc-navy dark:text-white mt-0.5">
                                {submission.title}
                            </h3>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-ncc-navy dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Submitting Cadet Banner */}
                <div className="px-6 py-3.5 bg-ncc-navy/5 dark:bg-white/5 border-b border-[#ddd8cc] dark:border-white/10 flex items-center justify-between gap-4 shrink-0 text-xs">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-ncc-navy text-white flex items-center justify-center font-bold text-xs">
                            <User className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="font-bold text-ncc-navy dark:text-white">{submission.cadetName}</p>
                            <p className="text-[10px] text-gray-500 dark:text-white/60">{submission.cadetEnrollmentId}</p>
                        </div>
                    </div>

                    <div className="text-right">
                        <p className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">Status</p>
                        <p className="font-bold text-ncc-navy dark:text-white">
                            {isPending && '⏳ Pending ANO Verification'}
                            {isChangesReq && '⚠️ Changes Requested'}
                            {isApproved && '✅ Approved & Live'}
                            {isRejected && '❌ Rejected'}
                        </p>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                    
                    {/* Inline Editing Toggle Bar */}
                    {(isPending || isChangesReq) && (
                        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-500/30">
                            <div>
                                <h5 className="text-xs font-black text-ncc-navy dark:text-white">
                                    {isEditing ? 'Editing Mode Active (ANO Override)' : 'Cadet Submission Details'}
                                </h5>
                                <p className="text-[11px] text-gray-500 dark:text-white/70">
                                    {isEditing ? 'You are modifying the cadet’s submission directly before approval.' : 'You can modify fields directly or approve as-is.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditing(!isEditing)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                    isEditing 
                                        ? 'bg-ncc-navy text-white shadow-sm' 
                                        : 'bg-white dark:bg-white/10 text-ncc-navy dark:text-white border border-gray-200 dark:border-white/15 hover:border-ncc-navy'
                                }`}
                            >
                                <Edit2 className="w-3.5 h-3.5" />
                                {isEditing ? 'Done Editing' : 'Modify Fields'}
                            </button>
                        </div>
                    )}

                    {/* Action Form if Requesting Changes or Rejecting */}
                    {actionState && (
                        <div className={`p-4 rounded-2xl border space-y-3 ${
                            actionState === 'request_changes' 
                                ? 'bg-amber-50 dark:bg-amber-950/20 border-amber-300 dark:border-amber-500/40' 
                                : 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-500/40'
                        }`}>
                            <div className="flex items-center justify-between">
                                <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                                    actionState === 'request_changes' ? 'text-amber-800 dark:text-amber-300' : 'text-red-800 dark:text-red-300'
                                }`}>
                                    <AlertTriangle className="w-4 h-4" />
                                    {actionState === 'request_changes' ? 'Feedback & Revision Instructions for Cadet' : 'Reason for Rejection'}
                                </h4>
                                <button
                                    onClick={() => setActionState(null)}
                                    className="text-xs font-bold text-gray-400 hover:text-gray-600"
                                >
                                    Cancel
                                </button>
                            </div>

                            <textarea
                                rows={3}
                                placeholder={actionState === 'request_changes' 
                                    ? "e.g. Please update the reporting time to 06:00 AM and specify the parade uniform." 
                                    : "e.g. This event is a duplicate of the battalion parade schedule."}
                                value={anoRemarks}
                                onChange={e => setAnoRemarks(e.target.value)}
                                className="w-full text-xs p-3 rounded-xl border border-gray-300 dark:border-white/15 bg-white dark:bg-[#0a1628] text-ncc-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-ncc-navy"
                                autoFocus
                            />

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setActionState(null)}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/5"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={actionState === 'request_changes' ? handleRequestChanges : handleReject}
                                    disabled={processing}
                                    className={`px-4 py-2 rounded-xl text-xs font-black text-white shadow-md transition-all ${
                                        actionState === 'request_changes' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-red-600 hover:bg-red-700'
                                    }`}
                                >
                                    {processing ? 'Submitting...' : actionState === 'request_changes' ? 'Send Instructions to Cadet' : 'Confirm Rejection'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Formatted Payload Fields */}
                    {renderPayloadFields()}
                </div>

                {/* Footer Controls */}
                <div className="p-4 sm:p-6 border-t border-[#ddd8cc] dark:border-white/10 bg-gray-50 dark:bg-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        {!actionState && (isPending || isChangesReq) && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setActionState('request_changes')}
                                    className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100/70 dark:bg-amber-500/20 hover:bg-amber-200 border border-amber-300/60 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Request Changes
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setActionState('reject')}
                                    className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-700 dark:text-red-300 bg-red-100/70 dark:bg-red-500/20 hover:bg-red-200 border border-red-300/60 transition-all flex items-center justify-center gap-1.5"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                    Reject
                                </button>
                            </>
                        )}
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-white/70 hover:bg-gray-100 dark:hover:bg-white/10"
                        >
                            Close
                        </button>

                        {(isPending || isChangesReq) && !actionState && (
                            <button
                                type="button"
                                onClick={handleApprove}
                                disabled={processing}
                                className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-ncc-navy hover:bg-ncc-navy-mid transition-all shadow-lg shadow-ncc-navy/20 flex items-center gap-2 disabled:opacity-50"
                            >
                                <Check className="w-4 h-4 text-ncc-gold" />
                                {processing 
                                    ? 'Publishing...' 
                                    : isEditing 
                                    ? 'Save Modified & Approve' 
                                    : 'Accept & Publish Live'}
                            </button>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
