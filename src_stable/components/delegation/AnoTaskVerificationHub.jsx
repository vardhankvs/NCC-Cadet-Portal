// src/components/delegation/AnoTaskVerificationHub.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
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
    ChevronDown,
    RefreshCcw,
    X
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

    // Custom Module Dropdown State
    const [isModuleDropdownOpen, setIsModuleDropdownOpen] = useState(false);
    const [moduleSearchFilter, setModuleSearchFilter] = useState('');
    const dropdownRef = useRef(null);

    // Click outside to close dropdown
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsModuleDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Dynamic stats
    const stats = useMemo(() => {
        const pending = submissions.filter(s => s.status === 'pending').length;
        const changesReq = submissions.filter(s => s.status === 'changes_requested').length;
        const approved = submissions.filter(s => s.status === 'approved').length;
        const rejected = submissions.filter(s => s.status === 'rejected').length;
        const uniqueCadets = new Set(submissions.map(s => s.cadetEnrollmentId)).size;

        return { pending, changesReq, approved, rejected, uniqueCadets, total: submissions.length };
    }, [submissions]);

    // All Chain of Command delegable modules list
    const allModulesList = useMemo(() => {
        const definedKeys = Object.keys(MODULE_NAMES);
        const dynamicKeys = submissions.map(s => s.moduleId).filter(Boolean);
        const combined = Array.from(new Set([...definedKeys, ...dynamicKeys]));
        return combined.map(id => {
            const count = submissions.filter(s => s.moduleId === id && (statusFilter === 'All' || s.status === statusFilter)).length;
            return {
                id,
                name: MODULE_NAMES[id] || id.replace(/_/g, ' ').replace(/^./, str => str.toUpperCase()),
                count
            };
        });
    }, [submissions, statusFilter]);

    const activeModuleObj = useMemo(() => {
        if (moduleFilter === 'All') return null;
        return allModulesList.find(m => m.id === moduleFilter);
    }, [allModulesList, moduleFilter]);

    const filteredDropdownModules = useMemo(() => {
        if (!moduleSearchFilter.trim()) return allModulesList;
        const q = moduleSearchFilter.toLowerCase();
        return allModulesList.filter(m => m.name.toLowerCase().includes(q));
    }, [allModulesList, moduleSearchFilter]);

    const totalSubmissionsInFilter = submissions.filter(s => statusFilter === 'All' || s.status === statusFilter).length;

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
                        <span className={`text-xs ${statusFilter === 'pending' ? 'text-blue-100' : 'text-gray-500'}`}>Tasks</span>
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
                            Revision Needed
                        </span>
                        <AlertTriangle className={`w-4 h-4 ${statusFilter === 'changes_requested' ? 'text-white' : 'text-amber-500'}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-display">{stats.changesReq}</span>
                        <span className={`text-xs ${statusFilter === 'changes_requested' ? 'text-amber-100' : 'text-gray-500'}`}>Pending Action</span>
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
                        <span className={`text-xs ${statusFilter === 'approved' ? 'text-emerald-100' : 'text-gray-500'}`}>Approved</span>
                    </div>
                </div>

                <div 
                    onClick={() => setStatusFilter('All')}
                    className={`p-4 sm:p-5 rounded-2xl sm:rounded-3xl border transition-all cursor-pointer ${
                        statusFilter === 'All'
                            ? 'bg-ncc-navy dark:bg-white/15 text-white border-ncc-navy shadow-lg'
                            : 'bg-white dark:bg-[#050b14] border-[#ddd8cc] dark:border-white/10 hover:border-ncc-navy/50'
                    }`}
                >
                    <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase tracking-widest ${statusFilter === 'All' ? 'text-ncc-gold' : 'text-gray-400'}`}>
                            Total Handled
                        </span>
                        <Shield className={`w-4 h-4 ${statusFilter === 'All' ? 'text-ncc-gold' : 'text-ncc-navy'}`} />
                    </div>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-2xl sm:text-3xl font-black font-display">{stats.total}</span>
                        <span className={`text-xs ${statusFilter === 'All' ? 'text-gray-300' : 'text-gray-500'}`}>All Submissions</span>
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

                    {/* Custom Styled Module Dropdown */}
                    <div className="relative shrink-0" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsModuleDropdownOpen(prev => !prev)}
                            className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-ncc-navy/40 dark:hover:border-white/30 rounded-2xl py-2.5 px-3.5 text-xs font-bold text-ncc-navy dark:text-white transition-all shadow-sm"
                        >
                            <Filter className="w-3.5 h-3.5 text-ncc-gold shrink-0" />
                            <span className="truncate max-w-[140px] sm:max-w-[180px]">
                                {moduleFilter === 'All' ? 'All Modules' : (activeModuleObj?.name || moduleFilter)}
                            </span>
                            <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white">
                                {moduleFilter === 'All' ? totalSubmissionsInFilter : (activeModuleObj?.count ?? 0)}
                            </span>
                            <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isModuleDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isModuleDropdownOpen && (
                            <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 bg-white dark:bg-[#0c1829] border border-gray-200 dark:border-white/10 rounded-2xl shadow-2xl z-50 p-2 space-y-2 backdrop-blur-xl">
                                {/* Search input inside dropdown */}
                                <div className="relative px-1">
                                    <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search module..."
                                        value={moduleSearchFilter}
                                        onChange={(e) => setModuleSearchFilter(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl py-1.5 pl-8 pr-7 text-xs text-ncc-navy dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-ncc-navy"
                                        autoFocus
                                    />
                                    {moduleSearchFilter && (
                                        <button 
                                            onClick={() => setModuleSearchFilter('')} 
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>

                                <div className="max-h-60 overflow-y-auto space-y-0.5 pr-1">
                                    {/* All Modules option */}
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setModuleFilter('All');
                                            setIsModuleDropdownOpen(false);
                                            setModuleSearchFilter('');
                                        }}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                                            moduleFilter === 'All'
                                                ? 'bg-ncc-navy text-white font-bold'
                                                : 'text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2">
                                            {moduleFilter === 'All' && <Check className="w-3.5 h-3.5 text-ncc-gold" />}
                                            <span>All Modules</span>
                                        </div>
                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                            moduleFilter === 'All' 
                                                ? 'bg-white/20 text-white' 
                                                : 'bg-gray-100 dark:bg-white/10 text-gray-600 dark:text-white/60'
                                        }`}>
                                            {totalSubmissionsInFilter}
                                        </span>
                                    </button>

                                    <div className="h-px bg-gray-100 dark:bg-white/5 my-1" />

                                    {filteredDropdownModules.length === 0 ? (
                                        <div className="p-3 text-center text-xs text-gray-400 italic">
                                            No modules match "{moduleSearchFilter}"
                                        </div>
                                    ) : (
                                        filteredDropdownModules.map(mod => {
                                            const isSelected = moduleFilter === mod.id;
                                            return (
                                                <button
                                                    key={mod.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setModuleFilter(mod.id);
                                                        setIsModuleDropdownOpen(false);
                                                        setModuleSearchFilter('');
                                                    }}
                                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left ${
                                                        isSelected
                                                            ? 'bg-ncc-navy text-white font-bold'
                                                            : 'text-gray-700 dark:text-white/80 hover:bg-gray-100 dark:hover:bg-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2 truncate pr-2">
                                                        {isSelected ? (
                                                            <Check className="w-3.5 h-3.5 text-ncc-gold shrink-0" />
                                                        ) : (
                                                            <div className="w-3.5 h-3.5 shrink-0" />
                                                        )}
                                                        <span className="truncate">{mod.name}</span>
                                                    </div>
                                                    {mod.count > 0 && (
                                                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${
                                                            isSelected
                                                                ? 'bg-white/20 text-white'
                                                                : 'bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300'
                                                        }`}>
                                                            {mod.count}
                                                        </span>
                                                    )}
                                                </button>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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
