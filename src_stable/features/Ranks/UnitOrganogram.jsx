import React, { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { Users, Shield, Award, Star, ChevronDown, ChevronRight } from '../../components/Icons.jsx';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { CadetProfileModal } from './CadetProfileModal.jsx';
import { deduplicateCadets, rescueCadets } from '../../firebase/firestoreService';
import { RefreshCcw, Trash2, CheckCircle, LifeBuoy } from '../../components/Icons.jsx';

// ─── Rank Definition ──────────────────────────────────────────────────────────
// Each rank: WHITE card background + unique accent colour for border, avatar & label
const RANK_HIERARCHY = [
    {
        // SUO — Amber Gold  (#D4920A)
        id: 'SUO', name: 'Senior Under Officer', abbr: 'SUO',
        icon: Star, tier: 'apex',
        accent: '#D4920A',
        cardStyle: { border: '2px solid #D4920A' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #D4920A', color: '#D4920A' },
        avatarStyle:{ background: '#D4920A', color: '#fff' },
        nameColor: '#1a1200',
        idColor:   '#8a6a20',
        connector: '#D4920A',
        maxVisible: 2,
    },
    {
        // JUO — Deep Rose  (#C0445E)
        id: 'JUO', name: 'Junior Under Officer', abbr: 'JUO',
        icon: Star, tier: 'senior',
        accent: '#C0445E',
        cardStyle: { border: '2px solid #C0445E' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #C0445E', color: '#C0445E' },
        avatarStyle:{ background: '#C0445E', color: '#fff' },
        nameColor: '#5a0020',
        idColor:   '#a06070',
        connector: '#C0445E',
        maxVisible: 4,
    },
    {
        // C-SGT — Emerald Green  (#2E8B55)
        id: 'C-SGT', name: 'Company Sergeant', abbr: 'C/SGT',
        icon: Award, tier: 'officer',
        accent: '#2E8B55',
        cardStyle: { border: '2px solid #2E8B55' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #2E8B55', color: '#2E8B55' },
        avatarStyle:{ background: '#2E8B55', color: '#fff' },
        nameColor: '#0d3320',
        idColor:   '#5a9070',
        connector: '#2E8B55',
        maxVisible: 6,
    },
    {
        // CQMS — Ocean Teal  (#0A8FA0)
        id: 'CQMS', name: 'Company Quartermaster', abbr: 'CQMS',
        icon: Shield, tier: 'nco',
        accent: '#0A8FA0',
        cardStyle: { border: '2px solid #0A8FA0' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #0A8FA0', color: '#0A8FA0' },
        avatarStyle:{ background: '#0A8FA0', color: '#fff' },
        nameColor: '#053040',
        idColor:   '#4090a0',
        connector: '#0A8FA0',
        maxVisible: 6,
    },
    {
        // SGT — Royal Indigo  (#5448B8)
        id: 'SGT', name: 'Sergeant', abbr: 'SGT',
        icon: Shield, tier: 'nco',
        accent: '#5448B8',
        cardStyle: { border: '2px solid #5448B8' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #5448B8', color: '#5448B8' },
        avatarStyle:{ background: '#5448B8', color: '#fff' },
        nameColor: '#1e1860',
        idColor:   '#7870b8',
        connector: '#5448B8',
        maxVisible: 8,
    },
    {
        // CPL — Burnt Copper  (#B85A2A)
        id: 'CPL', name: 'Corporal', abbr: 'CPL',
        icon: Users, tier: 'junior',
        accent: '#B85A2A',
        cardStyle: { border: '2px solid #B85A2A' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #B85A2A', color: '#B85A2A' },
        avatarStyle:{ background: '#B85A2A', color: '#fff' },
        nameColor: '#401800',
        idColor:   '#a07050',
        connector: '#B85A2A',
        maxVisible: 10,
    },
    {
        // LCPL — Steel Blue  (#3A6AAA)
        id: 'LCPL', name: 'Lance Corporal', abbr: 'LCPL',
        icon: Users, tier: 'junior',
        accent: '#3A6AAA',
        cardStyle: { border: '2px solid #3A6AAA' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #3A6AAA', color: '#3A6AAA' },
        avatarStyle:{ background: '#3A6AAA', color: '#fff' },
        nameColor: '#0e2440',
        idColor:   '#6080a8',
        connector: '#3A6AAA',
        maxVisible: 12,
    },
    {
        // CDT — Slate Blue-Gray  (#4E6880)
        id: 'CDT', name: 'Cadet', abbr: 'CDT',
        icon: Users, tier: 'base',
        accent: '#4E6880',
        cardStyle: { border: '1.5px solid #4E6880' },
        labelStyle: { background: '#ffffff', border: '1.5px solid #4E6880', color: '#4E6880' },
        avatarStyle:{ background: '#4E6880', color: '#fff' },
        nameColor: '#1a2a38',
        idColor:   '#607888',
        connector: '#4E6880',
        maxVisible: 20,
    },
];

// ─── Tier Config ──────────────────────────────────────────────────────────────
const TIER_CARD_SIZE = {
    apex:   { card: 'min-w-[210px] max-w-[260px]', avatar: 'w-16 h-16 text-base', nameCls: 'text-sm',    idCls: 'text-[10px]' },
    senior: { card: 'min-w-[185px] max-w-[240px]', avatar: 'w-14 h-14 text-sm',  nameCls: 'text-xs',    idCls: 'text-[10px]' },
    officer:{ card: 'min-w-[170px] max-w-[220px]', avatar: 'w-12 h-12 text-sm',  nameCls: 'text-xs',    idCls: 'text-[9px]'  },
    nco:    { card: 'min-w-[155px] max-w-[200px]', avatar: 'w-11 h-11 text-xs',  nameCls: 'text-[11px]',idCls: 'text-[9px]'  },
    junior: { card: 'min-w-[145px] max-w-[185px]', avatar: 'w-10 h-10 text-xs',  nameCls: 'text-[11px]',idCls: 'text-[9px]'  },
    base:   { card: 'min-w-[135px] max-w-[170px]', avatar: 'w-9  h-9  text-[10px]',nameCls:'text-[10px]',idCls: 'text-[9px]'  },
};

// ─── Single Cadet Card ────────────────────────────────────────────────────────
const CadetCard = ({ cadet, rank, onClick }) => {
    const { tier } = rank;
    const sz = TIER_CARD_SIZE[tier] || TIER_CARD_SIZE.base;
    const initials = cadet.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

    const centerContent = tier === 'junior' || tier === 'base';

    return (
        <button
            onClick={() => onClick(cadet)}
            className={`
                bg-white dark:bg-[#0a1628]
                ${sz.card} w-full
                ${centerContent ? 'justify-center' : ''}
                relative group flex flex-col items-center gap-2 p-3 pt-4 rounded-2xl
                shadow-sm hover:shadow-lg hover:-translate-y-1
                transition-all duration-300 cursor-pointer
            `}
            style={{
                ...rank.cardStyle,
                boxShadow: `0 2px 12px 0 ${rank.connector}22`,
                minHeight: centerContent ? '110px' : undefined,
            }}
        >
            {/* Rank-colour accent top bar */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 rounded-full opacity-70 group-hover:opacity-100 group-hover:w-14 transition-all duration-300"
                 style={{ background: rank.connector }} />

            {/* Avatar */}
            <div
                className={`${sz.avatar} rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-bold ring-2`}
                style={{ ringColor: rank.connector, boxShadow: `0 0 0 2px ${rank.connector}` }}
            >
                {cadet.photoUrl
                    ? <img src={cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                    : (
                        <div className="w-full h-full flex items-center justify-center font-bold"
                             style={rank.avatarStyle}>
                            <span>{initials}</span>
                        </div>
                    )
                }
            </div>

            {/* Name & ID — NO truncation; wraps naturally */}
            <div className="w-full text-center">
                <p className={`font-bold leading-snug break-words ${sz.nameCls} transition-colors duration-200 group-hover:opacity-80 text-ncc-navy dark:text-white`}>
                    {cadet.name}
                </p>
                <p className={`font-mono mt-0.5 break-all ${sz.idCls} text-gray-500 dark:text-white/70`}>
                    {cadet.enrollmentId}
                </p>
            </div>
        </button>
    );
};

// ─── Overflow Pill ────────────────────────────────────────────────────────────
const OverflowPill = ({ count, rank, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-2xl
                   border border-dashed border-ncc-gold/40 bg-ncc-gold/5
                   hover:bg-ncc-gold/10 hover:border-ncc-gold/60 transition-all duration-200 cursor-pointer"
        title={`Show ${count} more cadets`}
    >
        <span className="text-ncc-gold font-black text-sm">+{count}</span>
        <span className="text-[9px] text-gray-400 dark:text-white/80 uppercase tracking-widest font-bold">more</span>
    </button>
);

// ─── Level Row ────────────────────────────────────────────────────────────────
const LevelRow = ({ rank, cadets, onSelect }) => {
    const [expanded, setExpanded] = useState(false);
    const maxV = rank.maxVisible;
    const visible = expanded ? cadets : cadets.slice(0, maxV);
    const overflow = cadets.length - maxV;

    if (cadets.length === 0 && rank.id !== 'CDT') return null;

    return (
        <div className="flex flex-col items-center w-full">
            {/* Rank Label Badge — unique colour per rank */}
            <div
                className="flex items-center gap-2 px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm bg-white dark:bg-[#0a1628] border"
                style={{
                    borderColor: rank.accent,
                    color: rank.accent,
                }}
            >
                <rank.icon className="w-3 h-3" />
                {rank.name}
                <span
                    className="ml-1 px-2 py-0.5 rounded-full text-[9px] font-black"
                    style={{ background: rank.connector + '30', color: rank.connector }}
                >
                    {cadets.length}
                </span>
            </div>

            {/* Cards Row */}
            {cadets.length === 0 ? (
                <p className="text-[10px] text-gray-300 italic py-1">No active appointments</p>
            ) : (
                <div className="flex flex-wrap justify-center gap-3">
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
                                       border border-dashed border-gray-300 bg-gray-50 dark:bg-[#0a1628]
                                       hover:bg-gray-100 dark:bg-[#0d2137] transition-all text-[9px] text-gray-400 dark:text-white/80 uppercase tracking-widest font-bold"
                        >
                            Show less
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

// ─── Connector ────────────────────────────────────────────────────────────────
const Connector = ({ color = '#c8a951' }) => (
    <div className="flex flex-col items-center my-1">
        <div className="w-px h-6" style={{ background: `linear-gradient(to bottom, ${color}80, ${color}20)` }} />
        <div className="w-2 h-2 rounded-full border-2" style={{ borderColor: color, background: `${color}40` }} />
        <div className="w-px h-4" style={{ background: `${color}20` }} />
    </div>
);

// ─── Summary Strip ────────────────────────────────────────────────────────────
const SummaryStrip = ({ groupedCadets }) => {
    const total = Object.values(groupedCadets).reduce((a, b) => a + b.length, 0);
    const officers = (groupedCadets['SUO']?.length || 0) + (groupedCadets['JUO']?.length || 0);
    const ncos = (groupedCadets['C-SGT']?.length || 0) + (groupedCadets['CQMS']?.length || 0) + (groupedCadets['SGT']?.length || 0) + (groupedCadets['CPL']?.length || 0) + (groupedCadets['LCPL']?.length || 0);
    const cadets = groupedCadets['CDT']?.length || 0;

    const pills = [
        { label: 'Total Strength', value: total, color: 'text-ncc-navy dark:text-white', big: true },
        { label: 'Officers (SUO/JUO)', value: officers, color: 'text-ncc-gold' },
        { label: 'Rank Holders', value: ncos, color: 'text-blue-700' },
        { label: 'Cadets', value: cadets, color: 'text-gray-600 dark:text-white/80' },
    ];

    return (
        <div className="flex flex-wrap justify-center gap-4 mb-6">
            {pills.map(p => (
                <div key={p.label}
                     className={`flex flex-col items-center px-6 py-3 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] shadow-sm ${p.big ? 'min-w-[130px]' : 'min-w-[100px]'}`}>
                    <span className={`font-black leading-none mb-1 ${p.big ? 'text-4xl' : 'text-2xl'} ${p.color}`}>
                        {p.value}
                    </span>
                    <span className="text-[9px] text-gray-400 dark:text-white/80 uppercase tracking-widest font-bold text-center">
                        {p.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

// ─── Main Export ──────────────────────────────────────────────────────────────
export const UnitOrganogram = ({ initialFilter = 'All', initialDivFilter = 'All', onFilterChange, onDivFilterChange }) => {
    const { cadets, loading, attendanceData } = useDataContext();
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [filter, setFilter] = useState(initialFilter);
    const [divFilter, setDivFilter] = useState(initialDivFilter);
    const [cleaning, setCleaning] = useState(false);
    const [cleanResult, setCleanResult] = useState(null);
    const { userInstitutionId } = useAuthContext();

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

    const handleCleanDuplicates = async () => {
        if (!confirm('This will find and merge duplicate cadet records. Continue?')) return;
        setCleaning(true);
        try {
            const result = await deduplicateCadets();
            setCleanResult(`Merged ${result.removedCount} duplicates across ${result.totalScanned} records!`);
            setTimeout(() => setCleanResult(null), 5000);
        } catch (err) {
            console.error('Deduplication failed:', err);
            alert('Cleanup failed: ' + err.message);
        } finally {
            setCleaning(false);
        }
    };

    const handleRescue = async () => {
        if (!confirm('This will force-restore all cadets to the default unit. Continue?')) return;
        setCleaning(true);
        try {
            const count = await rescueCadets();
            alert(`Rescued ${count} cadets! Refreshing...`);
            window.location.reload();
        } catch (err) {
            console.error('Rescue failed:', err);
            alert('Rescue failed: ' + err.message);
        } finally {
            setCleaning(false);
        }
    };

    const attendanceLookup = useMemo(() => {
        const map = {};
        (attendanceData?.individualSummaries || []).forEach(s => { map[s.enrollmentId] = s; });
        return map;
    }, [attendanceData]);

    const groupedCadets = useMemo(() => {
        const groups = {};
        RANK_HIERARCHY.forEach(r => groups[r.id] = []);

        cadets
            .filter(c => {
                if (c.status === 'alumni') return false;
                const certMatch = filter === 'All' || (c.certificate || c.B) === filter;
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
    }, [cadets, filter, divFilter]);

    if (loading) return <div className="p-20 text-center"><LoadingIndicator /></div>;

    const visibleLevels = RANK_HIERARCHY.filter(r => groupedCadets[r.id]?.length > 0 || r.id === 'CDT');

    return (
        <>
            {/* Profile Modal */}
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

            <div className="space-y-2 fade-in">

                {/* ── Header ── */}
                <header className="text-center mb-10">
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white tracking-tight">
                        Unit Hierarchy
                    </h2>
                    <div className="w-20 h-1 bg-ncc-gold mx-auto mt-2 mb-3 rounded-full" />
                    <p className="text-gray-500 dark:text-white/70 text-sm">
                        Showing&nbsp;
                        <span className="text-ncc-navy dark:text-white font-bold">{filter === 'All' ? 'Complete' : `${filter} Cert`}</span>
                        &nbsp;hierarchy for&nbsp;
                        <span className="text-ncc-gold font-bold">{divFilter === 'All' ? 'All Divisions' : `${divFilter} Division`}</span>
                    </p>
                    
                    {/* DIAGNOSTIC PANEL */}
                    <div className="mt-4 inline-flex items-center gap-4 px-4 py-1.5 bg-gray-900/50 rounded-full border border-white/5 text-[9px] font-mono text-gray-400">
                        <span>UNIT_ID: <span className="text-ncc-gold">{userInstitutionId || 'NONE'}</span></span>
                        <span className="w-px h-3 bg-white/10" />
                        <span>DB_TOTAL: <span className="text-white">{cadets?.length || 0}</span></span>
                    </div>
                </header>

                {/* ── Filters ── */}
                <div className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 mb-8">
                    {/* Certificate Filters */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#050b14] border border-[#ddd8cc] rounded-full p-1 shadow-sm">
                        {['All', 'B1', 'C'].map(f => (
                            <button key={f} onClick={() => handleFilterChange(f)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filter === f
                                        ? 'bg-ncc-navy text-ncc-gold shadow'
                                        : 'text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white'
                                }`}>
                                {f === 'All' ? 'Overall' : `${f} Cert`}
                            </button>
                        ))}
                    </div>
                    {/* Division Filters */}
                    <div className="flex items-center gap-2 bg-white dark:bg-[#050b14] border border-[#ddd8cc] rounded-full p-1 shadow-sm">
                        {['All', 'SD', 'SW'].map(f => (
                            <button key={f} onClick={() => handleDivFilterChange(f)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    divFilter === f
                                        ? 'bg-ncc-gold text-ncc-navy dark:text-white shadow'
                                        : 'text-gray-400 dark:text-white/80 hover:text-ncc-gold'
                                }`}>
                                {f === 'All' ? 'All Divisions' : `${f}`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Summary Strip ── */}
                <SummaryStrip groupedCadets={groupedCadets} />

                {/* Prominent Clean Duplicates Button */}
                <div className="flex justify-center mb-10">
                    <button
                        onClick={handleCleanDuplicates}
                        disabled={cleaning}
                        className={`
                            flex items-center gap-3 px-8 py-3 rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg
                            ${cleanResult 
                                ? 'bg-emerald-500 text-white scale-105' 
                                : 'bg-ncc-red text-white hover:bg-ncc-red/90 hover:-translate-y-1 active:scale-95'}
                            disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                    >
                        {cleaning ? (
                            <RefreshCcw className="w-5 h-5 animate-spin" />
                        ) : cleanResult ? (
                            <CheckCircle className="w-5 h-5" />
                        ) : (
                            <Trash2 className="w-5 h-5" />
                        )}
                        <div className="text-left">
                            <p className="text-[12px] leading-none">
                                {cleaning ? 'Processing...' : cleanResult ? 'Success!' : 'Fix Duplicates Now'}
                            </p>
                            <p className="text-[9px] opacity-70 font-bold mt-1">
                                {cleaning ? 'Merging records...' : cleanResult ? cleanResult : 'Deletes redundant copies safely'}
                            </p>
                        </div>
                    </button>
                    
                    {/* EMERGENCY RESCUE BUTTON */}
                    <button
                        onClick={handleRescue}
                        className="flex items-center gap-2 px-6 py-2 rounded-xl bg-amber-500 text-white font-bold text-[10px] uppercase tracking-wider hover:bg-amber-600 transition-all shadow-md ml-4"
                    >
                        <LifeBuoy className="w-4 h-4" />
                        Rescue My Cadets
                    </button>
                </div>

                {/* ── Pyramid Organogram ── */}
                <div className="relative flex flex-col items-center w-full overflow-x-auto">

                    {/* Subtle pyramid background guide */}
                    <div className="absolute inset-0 pointer-events-none"
                         style={{
                             background: 'radial-gradient(ellipse 70% 60% at 50% 10%, rgba(200,169,81,0.04) 0%, transparent 70%)',
                         }} />

                    {visibleLevels.map((rank, idx) => (
                        <React.Fragment key={rank.id}>
                            <LevelRow
                                rank={rank}
                                cadets={groupedCadets[rank.id] || []}
                                onSelect={setSelectedCadet}
                            />
                            {/* Connector between levels */}
                            {idx < visibleLevels.length - 1 && (
                                <Connector color={rank.connector} />
                            )}
                        </React.Fragment>
                    ))}
                </div>

                {/* ── Legend ── */}
                <div className="mt-12 pt-8 border-t border-[#ddd8cc]">
                    <p className="text-center text-[9px] font-black text-gray-300 uppercase tracking-[0.3em] mb-4">
                        Rank Legend
                    </p>
                    <div className="flex flex-wrap justify-center gap-2">
                        {RANK_HIERARCHY.map(r => (
                            <div
                                key={r.id}
                                className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider shadow-sm"
                                style={{ ...r.labelStyle, color: r.nameColor }}
                            >
                                <r.icon className="w-2.5 h-2.5" style={{ color: r.connector }} />
                                {r.abbr} – {r.name}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};
