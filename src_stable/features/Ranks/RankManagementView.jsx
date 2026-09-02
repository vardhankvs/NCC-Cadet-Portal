// src/features/Ranks/RankManagementView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { 
    Search, 
    Award, 
    TrendingUp, 
    Filter, 
    UserCheck, 
    Shield, 
    Clock, 
    GraduationCap, 
    Users, 
    ChevronLeft, 
    Check, 
    X, 
    Medal, 
    Sparkles, 
    Layers, 
    ChevronRight,
    CheckCircle2,
    Info,
    BookOpen
} from '../../components/Icons.jsx';
import { updateCadetRank } from '../../firebase/firestoreService.js';
import { submitDelegatedTask } from '../../firebase/delegationWorkflowService.js';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToUser } from '../../firebase/pushNotifications.js';

const ranks = ['CDT', 'LCPL', 'CPL', 'SGT', 'CQMS', 'CSM', 'JUO', 'SUO'];

const rankDescriptions = {
    'SUO': { name: 'Senior Under Officer', level: 8, color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    'JUO': { name: 'Junior Under Officer', level: 7, color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    'CSM': { name: 'Company Sergeant Major', level: 6, color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    'CQMS': { name: 'Company Quartermaster Sergeant', level: 5, color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
    'SGT': { name: 'Sergeant', level: 4, color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    'CPL': { name: 'Corporal', level: 3, color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
    'LCPL': { name: 'Lance Corporal', level: 2, color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    'CDT': { name: 'Cadet', level: 1, color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
};

const reasonPresets = [
    'Annual Merit & Leadership',
    'Camp Distinction & Performance',
    'Drill & Parade Excellence',
    'Seniority & Continuous Service',
    'Special Unit Appointment'
];

export const RankManagementView = () => {
    const { userRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const { cadets, units, loading, selectedCollege } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRank, setFilterRank] = useState('All');
    const [filterCertificate, setFilterCertificate] = useState('All');
    const [filterDivision, setFilterDivision] = useState('All');
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [newRank, setNewRank] = useState('');
    const [reason, setReason] = useState('Merit-based promotion');
    const [processing, setProcessing] = useState(false);
    const [viewMode, setViewMode] = useState('roster'); // 'roster' | 'hierarchy' | 'history'
    
    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';

    // Track selected college for Battalion Admin
    const [selectedCollegeId, setSelectedCollegeId] = useState(
        isBattalionAdmin ? (selectedCollege !== 'All' ? selectedCollege : null) : null
    );

    useEffect(() => {
        if (isBattalionAdmin) {
            if (selectedCollege && selectedCollege !== 'All') {
                setSelectedCollegeId(selectedCollege);
            } else {
                setSelectedCollegeId(null);
            }
        }
    }, [selectedCollege, isBattalionAdmin]);

    // Cadets matching the selected college (or all if not battalion admin)
    const activeCadets = useMemo(() => {
        if (isBattalionAdmin) {
            return cadets.filter(c => c.institutionId === selectedCollegeId);
        }
        return cadets;
    }, [cadets, isBattalionAdmin, selectedCollegeId]);

    // Rank Distribution Counts
    const rankCounts = useMemo(() => {
        const counts = { 'All': activeCadets.filter(c => c.status !== 'alumni').length };
        ranks.forEach(r => counts[r] = 0);
        activeCadets.forEach(c => {
            if (c.status === 'alumni') return;
            const r = c.rank || 'CDT';
            counts[r] = (counts[r] || 0) + 1;
        });
        return counts;
    }, [activeCadets]);

    // Filtered Cadets
    const filteredCadets = useMemo(() => {
        return activeCadets.filter(c => {
            if (c.status === 'alumni') return false;
            const q = searchTerm.toLowerCase();
            const nameMatch = (c.name || '').toLowerCase().includes(q);
            const idMatch = (c.enrollmentId || c.regimentalNumber || '').toLowerCase().includes(q);
            const matchesSearch = nameMatch || idMatch;
            const matchesRank = filterRank === 'All' || (c.rank || 'CDT') === filterRank;
            
            let matchesCert = true;
            if (filterCertificate !== 'All') {
                const rawCert = c.certificate || c.B || '';
                const cadetCert = typeof rawCert === 'string' ? rawCert.trim().toUpperCase() : String(rawCert);
                matchesCert = cadetCert === filterCertificate.toUpperCase();
            }

            let matchesDiv = true;
            if (filterDivision !== 'All') {
                matchesDiv = (c.enrollmentId || c.regimentalNumber || '').toUpperCase().includes(filterDivision);
            }

            return matchesSearch && matchesRank && matchesCert && matchesDiv;
        });
    }, [activeCadets, searchTerm, filterRank, filterCertificate, filterDivision]);

    // Recent Promotion History across all cadets
    const allPromotionHistory = useMemo(() => {
        const list = [];
        activeCadets.forEach(c => {
            if (Array.isArray(c.rankHistory)) {
                c.rankHistory.forEach(h => {
                    list.push({
                        cadetId: c.id,
                        cadetName: c.name,
                        enrollmentId: c.enrollmentId,
                        rank: h.rank,
                        date: h.date,
                        reason: h.reason,
                        rawDate: h.date?.toDate ? h.date.toDate() : new Date(h.date || 0)
                    });
                });
            }
        });
        return list.sort((a, b) => new Date(b.rawDate) - new Date(a.rawDate));
    }, [activeCadets]);

    const selectedCollegeName = useMemo(() => {
        if (!selectedCollegeId) return '';
        return (units || []).find(u => u.subdomain === selectedCollegeId)?.collegeName || selectedCollegeId;
    }, [selectedCollegeId, units]);

    const handleSelectCadet = (cadet) => {
        setSelectedCadet(cadet);
        setNewRank('');
        setReason('Merit-based promotion');
    };

    const handleRankUpdate = async () => {
        if (!selectedCadet || !newRank) return;
        setProcessing(true);
        try {
            if (isDelegatedCadet) {
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'rank_mgmt',
                    moduleName: 'Ranks & Promotions',
                    actionType: 'update',
                    targetDocId: selectedCadet.id,
                    title: `Promote ${selectedCadet.name} to ${newRank}`,
                    payload: {
                        cadetId: selectedCadet.id,
                        cadetName: selectedCadet.name,
                        enrollmentId: selectedCadet.enrollmentId,
                        currentRank: selectedCadet.rank || 'CDT',
                        newRank,
                        reason
                    }
                });
                toast.success(`Rank promotion submitted for ANO verification!`);
                setSelectedCadet(null);
                setNewRank('');
                setReason('Merit-based promotion');
                return;
            }

            await updateCadetRank(selectedCadet.id, newRank, reason);
            toast.success(`${selectedCadet.name} promoted to ${newRank}`);
            sendPushToUser(
                selectedCadet.enrollmentId,
                '⭐ Rank Promotion',
                `Congratulations! You have been officially promoted to the rank of ${newRank}.`,
                'profile'
            );
            setSelectedCadet(null);
            setNewRank('');
            setReason('Merit-based promotion');
        } catch (err) {
            toast.error("Promotion failed: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-2 border-ncc-gold border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // If Battalion Admin and no college is selected, show list of colleges
    if (isBattalionAdmin && !selectedCollegeId) {
        const colleges = (units || []).filter(u => !u.isBattalion);
        return (
            <div className="space-y-6 fade-in w-full">
                <header className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                            Rank & Promotions
                        </h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm mt-1">Select a college unit to manage ranks and appointments.</p>
                    </div>
                </header>

                {colleges.length === 0 ? (
                    <div className="bg-white dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-12 text-center text-gray-400 italic">
                        No colleges found under this unit.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {colleges.map(u => {
                            const cadetCount = cadets.filter(c => c.institutionId === u.subdomain && c.status !== 'alumni').length;
                            return (
                                <div 
                                    key={u.subdomain}
                                    onClick={() => setSelectedCollegeId(u.subdomain)}
                                    className="bg-white dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer relative group overflow-hidden"
                                >
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="w-12 h-12 bg-ncc-navy/5 dark:bg-white/5 rounded-2xl flex items-center justify-center text-ncc-navy dark:text-ncc-gold group-hover:bg-ncc-navy group-hover:text-white dark:group-hover:bg-ncc-gold dark:group-hover:text-ncc-navy transition-all duration-300">
                                            <GraduationCap className="w-6 h-6" />
                                        </div>
                                        <span className="text-[10px] font-black text-gray-400 dark:text-white/60 bg-gray-100 dark:bg-white/10 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                            {u.subdomain}
                                        </span>
                                    </div>
                                    
                                    <div className="mt-6 relative z-10">
                                        <h3 className="font-display font-black text-ncc-navy dark:text-white text-base group-hover:text-ncc-gold transition-colors duration-200 line-clamp-2 min-h-[3rem]">
                                            {u.collegeName || u.unitName}
                                        </h3>
                                        <div className="mt-4 pt-4 border-t border-[#ede8df] dark:border-white/10 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                                            <span className="font-bold flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-ncc-gold" /> {cadetCount} Active Cadets
                                            </span>
                                            <span className="font-black uppercase tracking-wider text-ncc-gold group-hover:translate-x-1.5 transition-transform duration-200">
                                                Manage Ranks &rarr;
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 fade-in w-full">
            {isBattalionAdmin && (
                <button 
                    onClick={() => { setSelectedCollegeId(null); setSelectedCadet(null); }}
                    className="flex items-center gap-1.5 text-xs text-ncc-gold hover:text-ncc-navy dark:hover:text-white transition-colors font-black uppercase tracking-widest"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Colleges
                </button>
            )}

            {/* ── Top Hero & Actions ── */}
            <div className="bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-ncc-navy dark:text-ncc-gold text-xs font-bold uppercase tracking-wider mb-3">
                            <Award className="w-3.5 h-3.5" />
                            Appointments & Hierarchy
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold text-ncc-navy dark:text-white flex flex-wrap items-center gap-2">
                            Rank & Promotions
                            {selectedCollegeName && (
                                <span className="text-xs font-black text-ncc-gold bg-ncc-gold/10 px-3 py-1 rounded-lg uppercase tracking-wider">
                                    {selectedCollegeName}
                                </span>
                            )}
                        </h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm mt-1 max-w-2xl">
                            Administrative control for unit appointments, rank promotions, and cadet chain of command hierarchy.
                        </p>
                    </div>

                    {/* View Switcher Pills */}
                    <div className="flex items-center gap-2 bg-[#f5f0e8] dark:bg-[#0a1628] p-1.5 rounded-2xl border border-[#ddd8cc] dark:border-white/10 self-start lg:self-auto">
                        <button
                            onClick={() => setViewMode('roster')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                viewMode === 'roster'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                    : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                            }`}
                        >
                            Promotions & Roster
                        </button>
                        <button
                            onClick={() => setViewMode('hierarchy')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                viewMode === 'hierarchy'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                    : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                            }`}
                        >
                            Chain of Command
                        </button>
                        <button
                            onClick={() => setViewMode('history')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                viewMode === 'history'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                    : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                            }`}
                        >
                            Promotion Logs ({allPromotionHistory.length})
                        </button>
                    </div>
                </div>

                {/* ── Interactive Rank Hierarchy Distribution Pills ── */}
                <div className="mt-6 pt-6 border-t border-[#ddd8cc] dark:border-white/10">
                    <p className="text-[11px] font-bold text-gray-400 dark:text-white/50 uppercase tracking-wider mb-3">
                        Rank Hierarchy Distribution (Click to filter):
                    </p>
                    <div className="flex items-center gap-2 overflow-x-auto ncc-scrollbar pb-2">
                        <button
                            onClick={() => setFilterRank('All')}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${
                                filterRank === 'All'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                    : 'bg-white dark:bg-[#0a1628] text-gray-700 dark:text-white/80 border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold'
                            }`}
                        >
                            <span>ALL</span>
                            <span className="px-2 py-0.5 rounded-full text-[10px] bg-black/10 dark:bg-white/10">
                                {rankCounts['All']}
                            </span>
                        </button>

                        {[...ranks].reverse().map(r => {
                            const count = rankCounts[r] || 0;
                            const isSelected = filterRank === r;
                            const meta = rankDescriptions[r];
                            return (
                                <button
                                    key={r}
                                    onClick={() => setFilterRank(isSelected ? 'All' : r)}
                                    className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap flex items-center gap-2 ${
                                        isSelected
                                            ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md ring-2 ring-ncc-gold'
                                            : 'bg-white dark:bg-[#0a1628] text-gray-700 dark:text-white/80 border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold'
                                    }`}
                                >
                                    <span>{r}</span>
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${meta?.color || 'bg-gray-100 text-gray-600'}`}>
                                        {count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── VIEW 1: ROSTER & PROMOTIONS ── */}
            {viewMode === 'roster' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
                    {/* Left Side: Cadet Search & Table */}
                    <div className="lg:col-span-7 space-y-4">
                        {/* Search & Filters */}
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/60" />
                                <input 
                                    type="text" 
                                    placeholder="Search cadet by name or regimental number..." 
                                    className="ncc-input pl-10 pr-10 text-xs sm:text-sm"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3">
                                <select 
                                    className="ncc-input w-full sm:flex-1 text-xs font-bold"
                                    value={filterRank}
                                    onChange={e => setFilterRank(e.target.value)}
                                >
                                    <option value="All">All Ranks ({activeCadets.length})</option>
                                    {[...ranks].reverse().map(r => (
                                        <option key={r} value={r}>{r} — {rankDescriptions[r]?.name} ({rankCounts[r] || 0})</option>
                                    ))}
                                </select>
                                <select 
                                    className="ncc-input w-full sm:flex-1 text-xs font-bold"
                                    value={filterDivision}
                                    onChange={e => setFilterDivision(e.target.value)}
                                >
                                    <option value="All">All Divisions (SD & SW)</option>
                                    <option value="SD">SD (Senior Division)</option>
                                    <option value="SW">SW (Senior Wing)</option>
                                </select>
                                <select 
                                    className="ncc-input w-full sm:flex-1 text-xs font-bold"
                                    value={filterCertificate}
                                    onChange={e => setFilterCertificate(e.target.value)}
                                >
                                    <option value="All">All Certificates (B1, B2, C)</option>
                                    <option value="B1">B1 Certificate</option>
                                    <option value="B2">B2 Certificate</option>
                                    <option value="C">C Certificate</option>
                                </select>
                            </div>
                        </div>

                        {/* Cadets Table */}
                        <div className="ncc-card overflow-hidden rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                            <div className="max-h-[640px] overflow-y-auto ncc-scrollbar">
                                {filteredCadets.length === 0 ? (
                                    <div className="p-16 text-center text-gray-400 dark:text-white/60 italic">
                                        No cadets found matching your filter criteria.
                                    </div>
                                ) : (
                                    <table className="w-full text-left border-collapse">
                                        <thead className="sticky top-0 bg-[#f5f0e8] dark:bg-[#0a1628] z-10 border-b border-[#ede8df] dark:border-white/10">
                                            <tr>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white">Cadet</th>
                                                <th className="px-4 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white">Current Rank</th>
                                                <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#ede8df] dark:divide-white/10">
                                            {filteredCadets.map(cadet => {
                                                const isSelected = selectedCadet?.id === cadet.id;
                                                const cRank = cadet.rank || 'CDT';
                                                const meta = rankDescriptions[cRank];
                                                const isSW = (cadet.enrollmentId || '').toUpperCase().includes('SW');
                                                
                                                return (
                                                    <tr 
                                                        key={cadet.id} 
                                                        onClick={() => handleSelectCadet(cadet)}
                                                        className={`hover:bg-[#f9f7f2] dark:hover:bg-white/5 transition-colors cursor-pointer select-none ${
                                                            isSelected 
                                                                ? 'bg-ncc-gold/10 dark:bg-ncc-gold/15 border-l-4 border-ncc-gold' 
                                                                : ''
                                                        }`}
                                                    >
                                                        <td className="px-5 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                                                                    isSelected 
                                                                        ? 'bg-ncc-gold text-ncc-navy' 
                                                                        : 'bg-ncc-navy/5 dark:bg-white/10 text-ncc-navy dark:text-white'
                                                                }`}>
                                                                    {(cadet.name || 'C')[0]}
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-ncc-navy dark:text-white text-sm leading-snug">
                                                                        {cadet.name}
                                                                    </p>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="text-[10px] text-gray-400 dark:text-white/60 font-mono">
                                                                            {cadet.enrollmentId}
                                                                        </span>
                                                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                                                                            isSW ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                                        }`}>
                                                                            {isSW ? 'SW' : 'SD'}
                                                                        </span>
                                                                        {(cadet.certificate || cadet.B) && (
                                                                            <span className="text-[9px] font-black text-ncc-gold px-1.5 py-0.5 bg-ncc-gold/10 rounded uppercase">
                                                                                Cert {cadet.certificate || cadet.B}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black tracking-wider border ${meta?.color || 'bg-gray-100 text-gray-600'}`}>
                                                                {cRank}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-right">
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleSelectCadet(cadet);
                                                                }}
                                                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                                                                    isSelected
                                                                        ? 'bg-ncc-gold text-ncc-navy font-black'
                                                                        : 'bg-ncc-navy/5 dark:bg-white/10 hover:bg-ncc-gold hover:text-ncc-navy text-ncc-navy dark:text-white'
                                                                }`}
                                                            >
                                                                {isSelected ? 'Editing' : 'Promote'}
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Side: Promotion Console & Details */}
                    <div className="lg:col-span-5">
                        {selectedCadet ? (
                            <div className="ncc-card p-6 sm:p-7 border-2 border-ncc-gold/40 rounded-3xl sticky top-6 animate-in slide-in-from-right-4 shadow-xl">
                                {/* Cadet Header Card */}
                                <div className="flex items-center justify-between pb-5 border-b border-[#ddd8cc] dark:border-white/10 mb-6">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-14 h-14 bg-ncc-navy text-ncc-gold rounded-2xl flex items-center justify-center text-xl font-black border-2 border-ncc-gold shadow-md">
                                            {(selectedCadet.name || 'C')[0]}
                                        </div>
                                        <div>
                                            <h3 className="font-display font-black text-lg text-ncc-navy dark:text-white">
                                                {selectedCadet.name}
                                            </h3>
                                            <p className="text-xs text-gray-400 dark:text-white/70 font-mono mt-0.5">
                                                {selectedCadet.enrollmentId}
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setSelectedCadet(null)}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-full hover:bg-gray-100 dark:hover:bg-white/10 transition"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Current vs Target Rank Progression */}
                                <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10 mb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-white/50">Current Rank</p>
                                            <span className="text-sm font-black text-ncc-navy dark:text-white mt-0.5 inline-block">
                                                {selectedCadet.rank || 'CDT'} — {rankDescriptions[selectedCadet.rank || 'CDT']?.name}
                                            </span>
                                        </div>
                                        {newRank && (
                                            <>
                                                <ChevronRight className="w-5 h-5 text-ncc-gold animate-pulse" />
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black uppercase tracking-wider text-ncc-gold">Target Rank</p>
                                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 inline-block">
                                                        {newRank} — {rankDescriptions[newRank]?.name}
                                                    </span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Select New Rank */}
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-2">
                                            Select Promotion Target Rank *
                                        </label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {ranks.map(r => {
                                                const isCurrent = (selectedCadet.rank || 'CDT') === r;
                                                const isSelected = newRank === r;
                                                return (
                                                    <button
                                                        key={r}
                                                        type="button"
                                                        disabled={isCurrent}
                                                        onClick={() => setNewRank(r)}
                                                        className={`p-2.5 rounded-xl text-xs font-black flex flex-col items-center justify-center gap-1 transition-all ${
                                                            isSelected
                                                                ? 'bg-ncc-gold text-ncc-navy shadow-md ring-2 ring-ncc-navy dark:ring-white scale-105'
                                                                : isCurrent
                                                                    ? 'bg-ncc-navy/10 text-ncc-navy/40 dark:bg-white/5 dark:text-white/30 cursor-not-allowed border border-dashed border-gray-300'
                                                                    : 'bg-white dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold text-ncc-navy dark:text-white'
                         
                                                        }`}
                                                    >
                                                        <span>{r}</span>
                                                        <span className="text-[8px] opacity-70">
                                                            {isCurrent ? '(Current)' : `Lvl ${rankDescriptions[r]?.level}`}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Reason Preset Chips */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1.5">
                                            Quick Citation Preset
                                        </label>
                                        <div className="flex flex-wrap gap-1.5">
                                            {reasonPresets.map(preset => (
                                                <button
                                                    key={preset}
                                                    type="button"
                                                    onClick={() => setReason(preset)}
                                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                                                        reason === preset
                                                            ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy font-bold'
                                                            : 'bg-gray-100 dark:bg-white/5 text-gray-600 dark:text-white/70 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    {preset}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Custom Reason TextArea */}
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white mb-1">
                                            Official Citation / Authority
                                        </label>
                                        <textarea 
                                            className="ncc-input h-20 text-xs font-medium resize-none"
                                            placeholder="Enter official reason, battalion order number, or merit citation..."
                                            value={reason}
                                            onChange={e => setReason(e.target.value)}
                                        />
                                    </div>

                                    {/* Confirm Promotion Button */}
                                    <button 
                                        onClick={handleRankUpdate}
                                        disabled={processing || !newRank}
                                        className="ncc-btn ncc-btn-success w-full py-3.5 font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                    >
                                        {processing ? 'Processing Promotion...' : (
                                            <>
                                                <Shield className="w-4 h-4" /> 
                                                {isDelegatedCadet ? 'Submit for ANO Verification' : `Confirm Promotion to ${newRank || '...'}`}
                                            </>
                                        )}
                                    </button>
                                </div>

                                {/* Cadet's Personal Rank History */}
                                {selectedCadet.rankHistory && selectedCadet.rankHistory.length > 0 && (
                                    <div className="mt-6 pt-6 border-t border-[#ddd8cc] dark:border-white/10">
                                        <h4 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5 text-ncc-gold" /> Cadet Promotion History
                                        </h4>
                                        <div className="space-y-2.5 max-h-48 overflow-y-auto ncc-scrollbar">
                                            {selectedCadet.rankHistory.slice().reverse().map((h, i) => (
                                                <div key={i} className="bg-[#f5f0e8] dark:bg-[#0a1628] p-3 rounded-xl border border-[#ddd8cc] dark:border-white/10 text-xs">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-ncc-navy dark:text-white uppercase">
                                                            {h.rank}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 dark:text-white/60">
                                                            {formatDate(h.date)}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-gray-600 dark:text-white/70 italic mt-1">{h.reason}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Unit Structure Overview Card */}
                                <div className="bg-white dark:bg-[#050b14] p-6 sm:p-7 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                                    <h3 className="font-display font-black text-lg text-ncc-navy dark:text-white flex items-center gap-2 mb-4">
                                        <Layers className="w-5 h-5 text-ncc-gold" />
                                        Unit Rank Hierarchy
                                    </h3>
                                    <div className="space-y-3">
                                        {[...ranks].reverse().map(r => {
                                            const count = rankCounts[r] || 0;
                                            const total = activeCadets.length || 1;
                                            const percent = Math.round((count / total) * 100);
                                            const meta = rankDescriptions[r];
                                            return (
                                                <div key={r} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs font-bold">
                                                        <span className="text-ncc-navy dark:text-white">{r} — {meta?.name}</span>
                                                        <span className="text-gray-500 dark:text-white/70 font-mono">{count} ({percent}%)</span>
                                                    </div>
                                                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full bg-ncc-navy dark:bg-ncc-gold transition-all duration-500" 
                                                            style={{ width: `${Math.max(percent, count > 0 ? 5 : 0)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Recent Promotions Stream */}
                                <div className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                                    <h3 className="font-display font-black text-sm uppercase tracking-wider text-ncc-navy dark:text-white flex items-center gap-2 mb-4">
                                        <Sparkles className="w-4 h-4 text-ncc-gold" />
                                        Recent Unit Promotions
                                    </h3>
                                    {allPromotionHistory.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic text-center py-4">No recent promotions recorded yet.</p>
                                    ) : (
                                        <div className="space-y-2.5 max-h-60 overflow-y-auto ncc-scrollbar">
                                            {allPromotionHistory.slice(0, 5).map((p, idx) => (
                                                <div key={idx} className="p-3 rounded-2xl bg-[#f5f0e8] dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 flex items-center justify-between text-xs">
                                                    <div>
                                                        <p className="font-bold text-ncc-navy dark:text-white">{p.cadetName}</p>
                                                        <p className="text-[10px] text-gray-400 dark:text-white/60">{p.reason}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="px-2 py-0.5 rounded-md bg-ncc-gold/20 text-ncc-gold font-black text-[10px]">
                                                            {p.rank}
                                                        </span>
                                                        <p className="text-[9px] text-gray-400 mt-0.5">{formatDate(p.date)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ── VIEW 2: VISUAL CHAIN OF COMMAND HIERARCHY ── */}
            {viewMode === 'hierarchy' && (
                <div className="space-y-6 w-full animate-in fade-in duration-300">
                    {[
                        { title: 'Senior Cadet Appointments (Gazetted Rank)', ranksGroup: ['SUO', 'JUO'], badgeColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
                        { title: 'Warrant Officers & Senior NCOs', ranksGroup: ['CSM', 'CQMS'], badgeColor: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
                        { title: 'Non-Commissioned Officers (NCOs)', ranksGroup: ['SGT', 'CPL', 'LCPL'], badgeColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
                        { title: 'Company Cadets Roster', ranksGroup: ['CDT'], badgeColor: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
                    ].map((tier, tierIdx) => {
                        const tierCadets = activeCadets.filter(c => c.status !== 'alumni' && tier.ranksGroup.includes(c.rank || 'CDT'));
                        return (
                            <div key={tierIdx} className="bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6 pb-4 border-b border-[#ddd8cc] dark:border-white/10">
                                    <div>
                                        <h3 className="font-display font-black text-lg sm:text-xl text-ncc-navy dark:text-white flex items-center gap-2.5">
                                            <Shield className="w-5 h-5 text-ncc-gold" />
                                            {tier.title}
                                        </h3>
                                        <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">
                                            Appointments: {tier.ranksGroup.join(', ')}
                                        </p>
                                    </div>
                                    <span className="px-3.5 py-1.5 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-xs font-bold text-ncc-navy dark:text-white self-start sm:self-auto">
                                        {tierCadets.length} Appointed
                                    </span>
                                </div>

                                {tierCadets.length === 0 ? (
                                    <p className="text-xs text-gray-400 italic py-4 text-center">No cadets currently appointed in this rank tier.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {tierCadets.map(c => {
                                            const cRank = c.rank || 'CDT';
                                            const meta = rankDescriptions[cRank];
                                            return (
                                                <div 
                                                    key={c.id}
                                                    onClick={() => {
                                                        setSelectedCadet(c);
                                                        setViewMode('roster');
                                                    }}
                                                    className="p-4 rounded-2xl bg-[#f5f0e8] dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group"
                                                >
                                                    <div className="flex items-start justify-between">
                                                        <span className={`px-2.5 py-1 rounded-lg text-xs font-black border ${meta?.color || 'bg-gray-100 text-gray-600'}`}>
                                                            {cRank}
                                                        </span>
                                                        <span className="text-[10px] font-mono text-gray-400 dark:text-white/50">
                                                            {c.enrollmentId}
                                                        </span>
                                                    </div>
                                                    <h4 className="font-bold text-sm text-ncc-navy dark:text-white mt-3 group-hover:text-ncc-gold transition-colors">
                                                        {c.name}
                                                    </h4>
                                                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#ddd8cc]/60 dark:border-white/5 text-[11px] text-gray-500 dark:text-white/60 font-semibold">
                                                        <span>Cert {c.certificate || c.B || 'N/A'}</span>
                                                        <span className="text-ncc-gold font-bold group-hover:translate-x-1 transition-transform">
                                                            Manage &rarr;
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── VIEW 3: PROMOTION AUDIT LOGS ── */}
            {viewMode === 'history' && (
                <div className="bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm animate-in fade-in duration-300 w-full">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ddd8cc] dark:border-white/10">
                        <div>
                            <h3 className="font-display font-black text-xl text-ncc-navy dark:text-white flex items-center gap-2">
                                <Clock className="w-5 h-5 text-ncc-gold" />
                                Unit Promotion Audit Log
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">
                                Chronological ledger of all official rank updates and merit appointments.
                            </p>
                        </div>
                        <span className="px-3.5 py-1.5 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-xs font-bold text-ncc-navy dark:text-white">
                            {allPromotionHistory.length} Total Promotions
                        </span>
                    </div>

                    {allPromotionHistory.length === 0 ? (
                        <div className="p-16 text-center text-gray-400 italic">No promotion history recorded yet.</div>
                    ) : (
                        <div className="overflow-x-auto ncc-scrollbar">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[#f5f0e8] dark:bg-[#0a1628] border-b border-[#ddd8cc] dark:border-white/10">
                                    <tr>
                                        <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white">Date</th>
                                        <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white">Cadet Name</th>
                                        <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white">Regimental No</th>
                                        <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white">Promoted Rank</th>
                                        <th className="px-5 py-3.5 text-[10px] font-black uppercase tracking-wider text-ncc-navy dark:text-white">Citation / Reason</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ddd8cc]/60 dark:divide-white/10 text-xs">
                                    {allPromotionHistory.map((log, idx) => (
                                        <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-5 py-4 font-mono text-gray-500 dark:text-white/70 whitespace-nowrap">
                                                {formatDate(log.date)}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-ncc-navy dark:text-white">
                                                {log.cadetName}
                                            </td>
                                            <td className="px-5 py-4 font-mono text-gray-400 dark:text-white/60">
                                                {log.enrollmentId}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className={`px-2.5 py-1 rounded-lg font-black text-[11px] border ${rankDescriptions[log.rank]?.color || 'bg-gray-100 text-gray-700'}`}>
                                                    {log.rank}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-gray-600 dark:text-white/80 italic">
                                                {log.reason}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
