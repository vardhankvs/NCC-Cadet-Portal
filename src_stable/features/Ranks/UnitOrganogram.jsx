import React, { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { 
    Users, 
    Shield, 
    Award, 
    Star, 
    ChevronDown, 
    ChevronRight, 
    Search, 
    X, 
    Layers, 
    Grid, 
    RefreshCcw, 
    CheckCircle, 
    GraduationCap,
    Sparkles
} from '../../components/Icons.jsx';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { CadetProfileModal } from './CadetProfileModal.jsx';

// ─── Rank Definition & Hierarchy Configuration ──────────────────────────────
const RANK_HIERARCHY = [
    {
        id: 'SUO', 
        name: 'Senior Under Officer', 
        abbr: 'SUO',
        icon: Star, 
        tier: 'apex',
        accent: '#D4920A',
        badgeBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
        avatarBg: 'bg-gradient-to-br from-amber-400 to-amber-600 text-white',
        connector: '#D4920A',
        maxVisible: 4,
    },
    {
        id: 'JUO', 
        name: 'Junior Under Officer', 
        abbr: 'JUO',
        icon: Star, 
        tier: 'senior',
        accent: '#C0445E',
        badgeBg: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30',
        avatarBg: 'bg-gradient-to-br from-rose-400 to-rose-600 text-white',
        connector: '#C0445E',
        maxVisible: 6,
    },
    {
        id: 'CSM', 
        name: 'Company Sergeant Major', 
        abbr: 'CSM',
        icon: Award, 
        tier: 'officer',
        accent: '#2E8B55',
        badgeBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
        avatarBg: 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white',
        connector: '#2E8B55',
        maxVisible: 6,
    },
    {
        id: 'CQMS', 
        name: 'Company Quartermaster Sergeant', 
        abbr: 'CQMS',
        icon: Shield, 
        tier: 'nco',
        accent: '#0A8FA0',
        badgeBg: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30',
        avatarBg: 'bg-gradient-to-br from-teal-400 to-teal-600 text-white',
        connector: '#0A8FA0',
        maxVisible: 6,
    },
    {
        id: 'SGT', 
        name: 'Sergeant', 
        abbr: 'SGT',
        icon: Shield, 
        tier: 'nco',
        accent: '#5448B8',
        badgeBg: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
        avatarBg: 'bg-gradient-to-br from-indigo-500 to-indigo-700 text-white',
        connector: '#5448B8',
        maxVisible: 8,
    },
    {
        id: 'CPL', 
        name: 'Corporal', 
        abbr: 'CPL',
        icon: Users, 
        tier: 'junior',
        accent: '#B85A2A',
        badgeBg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30',
        avatarBg: 'bg-gradient-to-br from-orange-400 to-orange-600 text-white',
        connector: '#B85A2A',
        maxVisible: 10,
    },
    {
        id: 'LCPL', 
        name: 'Lance Corporal', 
        abbr: 'LCPL',
        icon: Users, 
        tier: 'junior',
        accent: '#3A6AAA',
        badgeBg: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30',
        avatarBg: 'bg-gradient-to-br from-blue-400 to-blue-600 text-white',
        connector: '#3A6AAA',
        maxVisible: 12,
    },
    {
        id: 'CDT', 
        name: 'Cadet', 
        abbr: 'CDT',
        icon: Users, 
        tier: 'base',
        accent: '#4E6880',
        badgeBg: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30',
        avatarBg: 'bg-slate-700 text-white',
        connector: '#4E6880',
        maxVisible: 18,
    },
];

// ─── Cadet Node Card ──────────────────────────────────────────────────────────
const CadetCard = ({ cadet, rank, onClick }) => {
    const initials = cadet.name
        ? cadet.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
        : 'NC';
    const isSW = (cadet.enrollmentId || '').toUpperCase().includes('SW');
    const isApex = rank.id === 'SUO' || rank.id === 'JUO';
    const cert = cadet.certificate || cadet.B || '';

    return (
        <button
            onClick={() => onClick && onClick(cadet)}
            className={`
                bg-white dark:bg-[#050b14]
                w-[calc(50%-6px)] sm:w-auto
                ${isApex ? 'sm:min-w-[200px] sm:max-w-[250px]' : 'sm:min-w-[160px] sm:max-w-[200px]'}
                relative group flex flex-col items-center gap-2 p-3 sm:p-4 rounded-2xl
                border border-[#ddd8cc] dark:border-white/10
                shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-95
                transition-all duration-300 cursor-pointer text-left
            `}
            style={{
                borderColor: `${rank.accent}60`,
                boxShadow: `0 4px 16px 0 ${rank.accent}18`,
            }}
        >
            {/* Top Accent Strip */}
            <div 
                className="absolute top-0 left-1/2 -translate-x-1/2 w-10 sm:w-12 h-1 rounded-full opacity-80 group-hover:w-20 group-hover:opacity-100 transition-all duration-300"
                style={{ background: rank.accent }} 
            />

            {/* Avatar & Badges */}
            <div className="relative mt-1">
                <div
                    className={`${isApex ? 'w-12 h-12 sm:w-14 sm:h-14 text-sm sm:text-base' : 'w-10 h-10 sm:w-11 sm:h-11 text-xs'} rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-black ring-2 shadow-sm`}
                    style={{ ringColor: rank.accent, boxShadow: `0 0 0 2px ${rank.accent}40` }}
                >
                    {cadet.photoUrl ? (
                        <img src={cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className={`w-full h-full flex items-center justify-center font-black ${rank.avatarBg}`}>
                            <span>{initials}</span>
                        </div>
                    )}
                </div>

                {/* Division Badge Mini */}
                <span className={`absolute -bottom-1 -right-1 text-[8px] font-black px-1 py-0.5 rounded shadow-sm uppercase ${
                    isSW ? 'bg-pink-600 text-white' : 'bg-blue-600 text-white'
                }`}>
                    {isSW ? 'SW' : 'SD'}
                </span>
            </div>

            {/* Cadet Details */}
            <div className="w-full text-center mt-0.5">
                <p className="font-bold text-xs text-ncc-navy dark:text-white line-clamp-1 group-hover:text-ncc-gold transition-colors">
                    {cadet.name}
                </p>
                <p className="font-mono text-[9px] sm:text-[10px] text-gray-400 dark:text-white/60 truncate mt-0.5">
                    {cadet.enrollmentId || cadet.regimentalNumber}
                </p>
                
                {cert && (
                    <span className="inline-block mt-1 px-1.5 sm:px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-black bg-ncc-gold/10 text-ncc-gold uppercase tracking-wider">
                        Cert {cert}
                    </span>
                )}
            </div>
        </button>
    );
};

// ─── Overflow Pill ────────────────────────────────────────────────────────────
const OverflowPill = ({ count, rank, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-1 px-4 sm:px-5 py-3 sm:py-4 rounded-2xl
                   border-2 border-dashed border-ncc-gold/50 bg-ncc-gold/5 dark:bg-ncc-gold/10
                   hover:bg-ncc-gold/15 hover:border-ncc-gold transition-all duration-200 cursor-pointer min-w-[100px] sm:min-w-[120px]"
        title={`Show ${count} more cadets`}
    >
        <span className="text-ncc-gold font-black text-sm sm:text-base">+{count}</span>
        <span className="text-[9px] sm:text-[10px] text-gray-500 dark:text-white/80 uppercase tracking-widest font-bold">Show All</span>
    </button>
);

// ─── Level Row in Organogram ──────────────────────────────────────────────────
const LevelRow = ({ rank, cadets, onSelect }) => {
    const [expanded, setExpanded] = useState(false);
    const maxV = rank.maxVisible;
    const visible = expanded ? cadets : cadets.slice(0, maxV);
    const overflow = cadets.length - maxV;

    if (cadets.length === 0 && rank.id !== 'CDT') return null;

    return (
        <div className="flex flex-col items-center w-full my-2 sm:my-3">
            {/* Rank Header Pill */}
            <div
                className="flex items-center gap-2 px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-full text-[10px] sm:text-xs font-black uppercase tracking-wider mb-3 sm:mb-5 shadow-sm bg-white dark:bg-[#050b14] border-2"
                style={{
                    borderColor: `${rank.accent}80`,
                    color: rank.accent,
                }}
            >
                <rank.icon className="w-3.5 h-3.5" />
                <span>{rank.name}</span>
                <span
                    className="ml-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black text-white"
                    style={{ background: rank.accent }}
                >
                    {cadets.length}
                </span>
            </div>

            {/* Cadet Cards Container */}
            {cadets.length === 0 ? (
                <p className="text-xs text-gray-400 italic py-2">No active appointments in this rank tier</p>
            ) : (
                <div className="flex flex-wrap justify-center gap-2.5 sm:gap-4 w-full max-w-6xl px-1 sm:px-4">
                    {visible.map(c => (
                        <CadetCard key={c.id} cadet={c} rank={rank} onClick={onSelect} />
                    ))}
                    {!expanded && overflow > 0 && (
                        <OverflowPill count={overflow} rank={rank} onClick={() => setExpanded(true)} />
                    )}
                    {expanded && overflow > 0 && (
                        <button
                            onClick={() => setExpanded(false)}
                            className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl
                                       border border-dashed border-gray-300 dark:border-white/20 bg-gray-50 dark:bg-[#0a1628]
                                       hover:bg-gray-100 dark:hover:bg-white/5 transition-all text-[10px] text-gray-500 dark:text-white/80 uppercase tracking-widest font-bold self-center"
                        >
                            Collapse
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Hierarchy Connector ──────────────────────────────────────────────────────
const Connector = ({ color = '#c8a951' }) => (
    <div className="flex flex-col items-center my-2">
        <div className="w-0.5 h-6" style={{ background: `linear-gradient(to bottom, ${color}90, ${color}30)` }} />
        <div className="w-2.5 h-2.5 rounded-full border-2" style={{ borderColor: color, background: `${color}60` }} />
        <div className="w-0.5 h-4" style={{ background: `${color}30` }} />
    </div>
);

// ─── Main Export ──────────────────────────────────────────────────────────────
export const UnitOrganogram = ({ initialFilter = 'All', initialDivFilter = 'All', onFilterChange, onDivFilterChange }) => {
    const { cadets, loading, attendanceData, units } = useDataContext();
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [filter, setFilter] = useState(initialFilter);
    const [divFilter, setDivFilter] = useState(initialDivFilter);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewLayout, setViewLayout] = useState('pyramid'); // 'pyramid' | 'grid'
    
    const { userInstitutionId, userRole } = useAuthContext();
    const isAdmin = Boolean(userRole && userRole.toLowerCase() !== 'cadet');

    useEffect(() => {
        setFilter(initialFilter);
        setDivFilter(initialDivFilter);
    }, [initialFilter, initialDivFilter]);

    const handleFilterChange = (f) => {
        setFilter(f);
        if (onFilterChange) onFilterChange(f);
    };

    const handleDivFilterChange = (f) => {
        setDivFilter(f);
        if (onDivFilterChange) onDivFilterChange(f);
    };

    const attendanceLookup = useMemo(() => {
        const map = {};
        (attendanceData?.individualSummaries || []).forEach(s => { map[s.enrollmentId] = s; });
        return map;
    }, [attendanceData]);

    // Active Cadets & Grouping (Strictly GMRIT Unit Cadets Only)
    const groupedCadets = useMemo(() => {
        const groups = {};
        RANK_HIERARCHY.forEach(r => groups[r.id] = []);

        const targetInst = (userInstitutionId || 'gmrit').toLowerCase();

        (cadets || [])
            .filter(c => {
                if (c.status === 'alumni') return false;

                // Strict GMRIT Unit Cadet Isolation: Only include GMRIT cadets
                const inst = (c.institutionId || '').toLowerCase();
                const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
                const isGMR = inst === targetInst || reg.includes('0520') || reg.includes('GMR') || (c.college || '').toLowerCase().includes('gmr') || (c.collegeName || '').toLowerCase().includes('gmr');
                if (!isGMR) return false;
                
                // Search query match
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchName = (c.name || '').toLowerCase().includes(q);
                    const matchReg = (c.enrollmentId || c.regimentalNumber || '').toLowerCase().includes(q);
                    if (!matchName && !matchReg) return false;
                }

                // Cert filter
                const certMatch = filter === 'All' || (c.certificate || c.B) === filter;

                // Division filter
                const regNo = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
                const divMatch = divFilter === 'All' || regNo.includes(divFilter);

                return certMatch && divMatch;
            })
            .forEach(c => {
                const rank = c.rank || 'CDT';
                if (groups[rank] !== undefined) groups[rank].push(c);
                else groups['CDT'].push(c);
            });

        return groups;
    }, [cadets, filter, divFilter, searchQuery, userInstitutionId]);

    // KPI Summary Calculations
    const kpiSummary = useMemo(() => {
        const total = Object.values(groupedCadets).reduce((a, b) => a + b.length, 0);
        const apex = (groupedCadets['SUO']?.length || 0) + (groupedCadets['JUO']?.length || 0);
        const seniorNcos = (groupedCadets['CSM']?.length || 0) + (groupedCadets['CQMS']?.length || 0);
        const juniorNcos = (groupedCadets['SGT']?.length || 0) + (groupedCadets['CPL']?.length || 0) + (groupedCadets['LCPL']?.length || 0);
        const baseCadets = groupedCadets['CDT']?.length || 0;

        return { total, apex, seniorNcos, juniorNcos, baseCadets };
    }, [groupedCadets]);



    if (loading) return <div className="p-20 text-center"><LoadingIndicator /></div>;

    const visibleLevels = RANK_HIERARCHY.filter(r => groupedCadets[r.id]?.length > 0 || r.id === 'CDT');

    return (
        <>
            {/* Cadet Profile Modal */}
            {selectedCadet && (() => {
                const summary = attendanceLookup[selectedCadet.enrollmentId] || {};
                return (
                    <CadetProfileModal
                        cadet={selectedCadet}
                        attendancePct={summary.percentage ?? 0}
                        attendancePresentCount={summary.presentCount ?? 0}
                        attendanceTotalPeriods={attendanceData?.totalPeriodsHeld ?? 0}
                        onClose={() => setSelectedCadet(null)}
                    />
                );
            })()}

            <div className="space-y-4 sm:space-y-6 fade-in w-full">
                {/* ── Top Hero & Actions ── */}
                <div className="bg-white dark:bg-[#050b14] p-4 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-ncc-navy dark:text-ncc-gold text-xs font-bold uppercase tracking-wider mb-2 sm:mb-3">
                                <Users className="w-3.5 h-3.5" />
                                Chain of Command
                            </div>
                            <h2 className="text-xl sm:text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                                Unit Hierarchy Organogram
                            </h2>
                            <p className="text-gray-500 dark:text-white/70 text-xs sm:text-sm mt-1 max-w-2xl">
                                Official command structure, rank appointments, and leadership hierarchy for the cadet company.
                            </p>
                        </div>

                        {/* View Switcher */}
                        <div className="flex bg-[#f5f0e8] dark:bg-[#0a1628] p-1 sm:p-1.5 rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                            <button
                                onClick={() => setViewLayout('pyramid')}
                                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                                    viewLayout === 'pyramid'
                                        ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                        : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                                }`}
                            >
                                <Layers className="w-3.5 h-3.5" />
                                Pyramid Tree
                            </button>
                            <button
                                onClick={() => setViewLayout('grid')}
                                className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-bold transition-all ${
                                    viewLayout === 'grid'
                                        ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                        : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                                }`}
                            >
                                <Grid className="w-3.5 h-3.5" />
                                Tier Grid
                            </button>
                        </div>
                    </div>

                    {/* ── KPI Summary Badges ── */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4 mt-5 sm:mt-6 pt-5 sm:pt-6 border-t border-[#ddd8cc] dark:border-white/10">
                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-3 sm:p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10 flex flex-col justify-between">
                            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Total Cadets</p>
                            <p className="text-xl sm:text-3xl font-black text-ncc-navy dark:text-white mt-1">{kpiSummary.total}</p>
                        </div>
                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-3 sm:p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10 flex flex-col justify-between">
                            <p className="text-[9px] sm:text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-wider">Apex (SUO/JUO)</p>
                            <p className="text-xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1">{kpiSummary.apex}</p>
                        </div>
                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-3 sm:p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10 flex flex-col justify-between">
                            <p className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Senior NCOs</p>
                            <p className="text-xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{kpiSummary.seniorNcos}</p>
                        </div>
                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-3 sm:p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10 flex flex-col justify-between">
                            <p className="text-[9px] sm:text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-wider">Junior NCOs</p>
                            <p className="text-xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{kpiSummary.juniorNcos}</p>
                        </div>
                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-3 sm:p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10 col-span-2 sm:col-span-1 flex flex-col justify-between">
                            <p className="text-[9px] sm:text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Company Cadets</p>
                            <p className="text-xl sm:text-3xl font-black text-gray-600 dark:text-gray-300 mt-1">{kpiSummary.baseCadets}</p>
                        </div>
                    </div>
                </div>

                {/* ── Search & Filter Controls ── */}
                <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                    {/* Certificate & Division Chips */}
                    <div className="flex items-center gap-2 overflow-x-auto ncc-scrollbar pb-1 md:pb-0">
                        {/* Certificate Filter */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-1 shadow-sm shrink-0">
                            {['All', 'B1', 'B2', 'C'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => handleFilterChange(f)}
                                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        filter === f
                                            ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                            : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    {f === 'All' ? 'All Certs' : `Cert ${f}`}
                                </button>
                            ))}
                        </div>

                        {/* Division Filter */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-1 shadow-sm shrink-0">
                            {['All', 'SD', 'SW'].map(f => (
                                <button
                                    key={f}
                                    onClick={() => handleDivFilterChange(f)}
                                    className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        divFilter === f
                                            ? 'bg-ncc-gold text-ncc-navy shadow-sm'
                                            : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    {f === 'All' ? 'All Div.' : f}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-auto md:min-w-[280px] lg:min-w-[320px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                        <input
                            type="text"
                            placeholder="Search cadet by name or regimental number..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy dark:focus:border-ncc-gold transition-all text-xs dark:text-white shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* ── VIEW 1: PYRAMID ORGANOGRAM ── */}
                {viewLayout === 'pyramid' && (
                    <div className="bg-white dark:bg-[#050b14] p-3 sm:p-8 md:p-10 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm relative overflow-x-auto w-full">
                        <div className="relative flex flex-col items-center w-full min-w-0 py-2 sm:py-4">
                            {visibleLevels.length === 0 ? (
                                <p className="text-gray-400 italic py-12 text-center">No cadets match the selected filter criteria.</p>
                            ) : (
                                visibleLevels.map((rank, idx) => (
                                    <React.Fragment key={rank.id}>
                                        <LevelRow
                                            rank={rank}
                                            cadets={groupedCadets[rank.id] || []}
                                            onSelect={setSelectedCadet}
                                        />
                                        {idx < visibleLevels.length - 1 && (
                                            <Connector color={rank.connector} />
                                        )}
                                    </React.Fragment>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* ── VIEW 2: TIER ROSTER GRID ── */}
                {viewLayout === 'grid' && (
                    <div className="space-y-6 w-full animate-in fade-in duration-300">
                        {RANK_HIERARCHY.map(rank => {
                            const rankCadets = groupedCadets[rank.id] || [];
                            if (rankCadets.length === 0 && rank.id !== 'CDT') return null;

                            return (
                                <div 
                                    key={rank.id}
                                    className="bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm"
                                >
                                    <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#ddd8cc] dark:border-white/10">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-xl ${rank.badgeBg}`}>
                                                <rank.icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h3 className="font-display font-black text-lg text-ncc-navy dark:text-white">
                                                    {rank.name} ({rank.abbr})
                                                </h3>
                                                <p className="text-xs text-gray-500 dark:text-white/60">
                                                    Official Rank Level {RANK_HIERARCHY.length - RANK_HIERARCHY.findIndex(r => r.id === rank.id)}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="px-3.5 py-1.5 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-xs font-bold text-ncc-navy dark:text-white">
                                            {rankCadets.length} {rankCadets.length === 1 ? 'Cadet' : 'Cadets'}
                                        </span>
                                    </div>

                                    {rankCadets.length === 0 ? (
                                        <p className="text-xs text-gray-400 italic py-4 text-center">No cadets appointed under this rank.</p>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                                            {rankCadets.map(cadet => {
                                                const isSW = (cadet.enrollmentId || '').toUpperCase().includes('SW');
                                                return (
                                                    <div
                                                        key={cadet.id}
                                                        onClick={() => setSelectedCadet(cadet)}
                                                        className="p-4 rounded-2xl bg-[#f5f0e8] dark:bg-[#0a1628] border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md group flex items-start gap-3"
                                                    >
                                                        <div className={`w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold text-xs ${rank.avatarBg}`}>
                                                            {cadet.photoUrl ? (
                                                                <img src={cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span>{cadet.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'NC'}</span>
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h4 className="font-bold text-xs text-ncc-navy dark:text-white truncate group-hover:text-ncc-gold transition-colors">
                                                                {cadet.name}
                                                            </h4>
                                                            <p className="font-mono text-[10px] text-gray-400 dark:text-white/60 truncate mt-0.5">
                                                                {cadet.enrollmentId}
                                                            </p>
                                                            <div className="flex items-center gap-1.5 mt-2">
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded ${
                                                                    isSW ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                                }`}>
                                                                    {isSW ? 'SW' : 'SD'}
                                                                </span>
                                                                {(cadet.certificate || cadet.B) && (
                                                                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-ncc-gold/10 text-ncc-gold rounded uppercase">
                                                                        Cert {cadet.certificate || cadet.B}
                                                                    </span>
                                                                )}
                                                            </div>
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

                {/* ── Rank Legend ── */}
                <div className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 dark:text-white/50 uppercase tracking-widest text-center mb-3">
                        NCC Unit Rank Hierarchy Legend
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {RANK_HIERARCHY.map(r => (
                            <div
                                key={r.id}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${r.badgeBg}`}
                            >
                                <r.icon className="w-3 h-3" />
                                <span>{r.abbr} — {r.name}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};
