// src/components/delegation/AnoTaskVerificationHub.jsx
import React, { useState, useMemo } from 'react';
import { 
    Shield, 
    Clock, 
    AlertTriangle, 
    CheckCircle, 
    XCircle, 
    Search, 
    Filter, 
    User, 
    Calendar, 
    Eye, 
    Check, 
    Edit2,
    Sparkles,
    ChevronRight,
    RefreshCcw
} from '../Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { useDelegatedSubmissions, MODULE_NAMES } from '../../firebase/delegationWorkflowService.js';
import { DelegatedTaskReviewModal } from './DelegatedTaskReviewModal.jsx';

export const AnoTaskVerificationHub = ({ institutionId, anoName = 'Institution ANO' }) => {
    const { submissions = [], loading } = useDelegatedSubmissions(institutionId);

    const [statusFilter, setStatusFilter] = useState('pending');
    const [moduleFilter, setModuleFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSubmission, setSelectedSubmission] = useState(null);

    // Dynamic stats
    const stats = useMemo(() => {
        const pending = submissions.filter(s => s.status === 'pending').length;
        const changesReq = submissions.filter(s => s.status === 'changes_requested').length;
        const approved = submissions.filter(s => s.status === 'approved').length;
        const rejected = submissions.filter(s => s.status === 'rejected').length;
        const uniqueCadets = new Set(submissions.map(s => s.cadetEnrollmentId)).size;

        return { pending, changesReq, approved, rejected, uniqueCadets, total: submissions.length };
    }, [submissions]);

    // Available modules in current submissions
    const availableModules = useMemo(() => {
        const set = new Set(submissions.map(s => s.moduleId).filter(Boolean));
        return Array.from(set);
    }, [submissions]);

    // Filtered submissions
    const filteredSubmissions = useMemo(() => {
        return submissions.filter(sub => {
            const matchesStatus = statusFilter === 'All' || sub.status === statusFilter;
            const matchesModule = moduleFilter === 'All' || sub.moduleId === moduleFilter;

            const q = searchQuery.toLowerCase();
            const matchesSearch = 
                (sub.title || '').toLowerCase().includes(q) ||
                (sub.cadetName || '').toLowerCase().includes(q) ||
                (sub.cadetEnrollmentId || '').toLowerCase().includes(q) ||
                (sub.moduleName || '').toLowerCase().includes(q);

            return matchesStatus && matchesModule && matchesSearch;
        });
    }, [submissions, statusFilter, moduleFilter, searchQuery]);

    return (
        <div className="space-y-6 fade-in">
            {/* Modal for inspection / direct edit / action */}
            {selectedSubmission && (
                <DelegatedTaskReviewModal
                    submission={selectedSubmission}
                    onClose={() => setSelectedSubmission(null)}
                    anoName={anoName}
                />
            )}

            {/* Top Stat Summary Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div 
                    onClick={() => setStatusFilter('pending')}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                        statusFilter === 'pending'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/20'
                            : 'bg-white dark:bg-[#050b14] border-[#ddd8cc] dark:border-white/10 hover:border-blue-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === 'pending' ? 'text-blue-200' : 'text-gray-400'}`}>
                            Awaiting Review
                        </span>
                        <Clock className={`w-4 h-4 ${statusFilter === 'pending' ? 'text-white' : 'text-blue-500'}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-display">{stats.pending}</span>
                        <span className={`text-xs ${statusFilter === 'pending' ? 'text-blue-200' : 'text-gray-500'}`}>Tasks</span>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('changes_requested')}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                        statusFilter === 'changes_requested'
                            ? 'bg-amber-600 text-white border-amber-600 shadow-lg shadow-amber-600/20'
                            : 'bg-white dark:bg-[#050b14] border-[#ddd8cc] dark:border-white/10 hover:border-amber-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === 'changes_requested' ? 'text-amber-200' : 'text-gray-400'}`}>
                            Cadet Revision
                        </span>
                        <AlertTriangle className={`w-4 h-4 ${statusFilter === 'changes_requested' ? 'text-white' : 'text-amber-500'}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-display">{stats.changesReq}</span>
                        <span className={`text-xs ${statusFilter === 'changes_requested' ? 'text-amber-200' : 'text-gray-500'}`}>In Progress</span>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('approved')}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                        statusFilter === 'approved'
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-600/20'
                            : 'bg-white dark:bg-[#050b14] border-[#ddd8cc] dark:border-white/10 hover:border-emerald-500/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === 'approved' ? 'text-emerald-200' : 'text-gray-400'}`}>
                            Verified & Live
                        </span>
                        <CheckCircle className={`w-4 h-4 ${statusFilter === 'approved' ? 'text-white' : 'text-emerald-500'}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-display">{stats.approved}</span>
                        <span className={`text-xs ${statusFilter === 'approved' ? 'text-emerald-200' : 'text-gray-500'}`}>Approved</span>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('All')}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                        statusFilter === 'All'
                            ? 'bg-ncc-navy text-white border-ncc-navy shadow-lg shadow-ncc-navy/20'
                            : 'bg-white dark:bg-[#050b14] border-[#ddd8cc] dark:border-white/10 hover:border-ncc-navy/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === 'All' ? 'text-white/70' : 'text-gray-400'}`}>
                            Total Handled
                        </span>
                        <Shield className={`w-4 h-4 ${statusFilter === 'All' ? 'text-ncc-gold' : 'text-ncc-gold'}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-display">{stats.total}</span>
                        <span className={`text-xs ${statusFilter === 'All' ? 'text-white/70' : 'text-gray-500'}`}>All Submissions</span>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="p-4 sm:p-5 bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-1 items-center gap-3">
                    <div className="relative flex-1 max-w-md">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by cadet name, regimental no, or title..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-2.5 pl-10 pr-4 text-xs sm:text-sm dark:text-white focus:outline-none focus:ring-2 focus:ring-ncc-navy"
                        />
                    </div>

                    <select
                        value={moduleFilter}
                        onChange={e => setModuleFilter(e.target.value)}
                        className="bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-2xl py-2.5 px-3 text-xs font-bold text-ncc-navy dark:text-white focus:outline-none focus:ring-2 focus:ring-ncc-navy"
                    >
                        <option value="All">All Modules</option>
                        {availableModules.map(modId => (
                            <option key={modId} value={modId}>
                                {MODULE_NAMES[modId] || modId}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Status Segmented Tabs */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 overflow-x-auto text-xs font-bold">
                    {[
                        { id: 'pending', label: `Pending (${stats.pending})` },
                        { id: 'changes_requested', label: `Revision (${stats.changesReq})` },
                        { id: 'approved', label: `Approved (${stats.approved})` },
                        { id: 'rejected', label: `Rejected (${stats.rejected})` },
                        { id: 'All', label: 'All' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setStatusFilter(tab.id)}
                            className={`px-3 py-2 rounded-xl shrink-0 transition-all ${
                                statusFilter === tab.id
                                    ? 'bg-ncc-navy text-white shadow-sm'
                                    : 'text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Submissions List / Grid */}
            {loading ? (
                <div className="py-20 text-center">
                    <div className="w-8 h-8 border-2 border-ncc-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-xs text-gray-500">Loading delegated task submissions...</p>
                </div>
            ) : filteredSubmissions.length === 0 ? (
                <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 p-12 text-center text-gray-400 dark:text-white/40 space-y-3 shadow-sm">
                    <CheckCircle className="w-12 h-12 mx-auto text-emerald-500/50" />
                    <h4 className="text-base font-bold text-ncc-navy dark:text-white">All Caught Up!</h4>
                    <p className="text-xs max-w-sm mx-auto">
                        No submissions matching the selected filters. When cadets submit tasks in their delegated tabs, they will appear here for verification.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredSubmissions.map(sub => {
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
                                className={`p-5 rounded-3xl border bg-white dark:bg-[#050b14] transition-all flex flex-col justify-between shadow-sm hover:shadow-md ${
                                    isChangesReq
                                        ? 'border-amber-300/80 dark:border-amber-500/30'
                                        : isPending
                                        ? 'border-blue-300/80 dark:border-blue-500/30 ring-1 ring-blue-500/10'
                                        : isApproved
                                        ? 'border-emerald-300/60 dark:border-emerald-500/20'
                                        : 'border-[#ddd8cc] dark:border-white/10'
                                }`}
                            >
                                <div className="space-y-3">
                                    {/* Header: Module & Status Badge */}
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-ncc-gold/20 text-ncc-navy dark:text-ncc-gold text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg border border-ncc-gold/30">
                                                {sub.moduleName || sub.moduleId}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {sub.actionType}
                                            </span>
                                        </div>

                                        {isPending && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-500/30">
                                                <Clock className="w-3 h-3" /> Pending Verification
                                            </span>
                                        )}
                                        {isChangesReq && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-500/40 animate-pulse">
                                                <AlertTriangle className="w-3 h-3" /> Cadet Modifying
                                            </span>
                                        )}
                                        {isApproved && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                                                <CheckCircle className="w-3 h-3" /> Live & Published
                                            </span>
                                        )}
                                        {isRejected && (
                                            <span className="flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                                                <XCircle className="w-3 h-3" /> Rejected
                                            </span>
                                        )}
                                    </div>

                                    {/* Title & Submitting Cadet */}
                                    <div>
                                        <h4 className="font-bold text-base text-ncc-navy dark:text-white leading-snug">
                                            {sub.title}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-white/60">
                                            <User className="w-3.5 h-3.5 text-ncc-navy dark:text-ncc-gold" />
                                            <span className="font-semibold text-ncc-navy dark:text-white">{sub.cadetName}</span>
                                            <span>•</span>
                                            <span>{sub.cadetEnrollmentId}</span>
                                        </div>
                                    </div>

                                    {/* Remarks if changes requested or modified */}
                                    {sub.remarks && (
                                        <div className="p-3 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-200/60 dark:border-white/5 text-xs">
                                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 mb-0.5">
                                                {isChangesReq ? 'ANO Instructions Given:' : isRejected ? 'Rejection Reason:' : 'Notes:'}
                                            </p>
                                            <p className="italic text-gray-700 dark:text-white/80 font-medium">
                                                "{sub.remarks}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Bottom Meta & Actions */}
                                <div className="mt-4 pt-3.5 border-t border-gray-100 dark:border-white/5 flex items-center justify-between">
                                    <span className="text-[11px] text-gray-400 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> {formatDate(postDate)}
                                    </span>

                                    <button
                                        onClick={() => setSelectedSubmission(sub)}
                                        className="bg-ncc-navy text-white hover:bg-ncc-navy-mid text-xs font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                                    >
                                        <Eye className="w-3.5 h-3.5 text-ncc-gold" />
                                        <span>{isPending || isChangesReq ? 'Review & Verify' : 'View Details'}</span>
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
