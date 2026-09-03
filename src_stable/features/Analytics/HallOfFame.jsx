import React, { useMemo, useState } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Star, TrendingUp, Users, Crown, Medal, Plus, X, Search, Info } from '../../components/Icons.jsx';
import CountUp from 'react-countup';
import Tilt from 'react-parallax-tilt';
import { toast } from 'react-toastify';

const LeaderboardCard = ({ cadet, rank, points, isTop3, onClick }) => {
    const cardStyles = {
        1: "from-yellow-400 via-yellow-500 to-yellow-600 border-yellow-300 shadow-yellow-200/50",
        2: "from-slate-300 via-slate-400 to-slate-500 border-slate-200 shadow-slate-200/50",
        3: "from-amber-600 via-amber-700 to-amber-800 border-amber-500 shadow-amber-200/50"
    };

    const RankIcon = {
        1: <Crown className="w-8 h-8 text-yellow-100" />,
        2: <Medal className="w-8 h-8 text-slate-100" />,
        3: <Medal className="w-8 h-8 text-amber-100" />
    };

    const awardsList = cadet.awards || [];

    if (isTop3) {
        return (
            <div onClick={() => onClick && onClick(cadet)} className={onClick ? "cursor-pointer" : ""}>
                <Tilt perspective={1000} scale={1.05} transitionSpeed={1000}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: rank * 0.1 }}
                        className={`relative p-1 rounded-[2rem] bg-gradient-to-br ${cardStyles[rank]} shadow-2xl overflow-hidden group`}
                    >
                        <div className="bg-white/10 backdrop-blur-md rounded-[1.8rem] p-6 h-full flex flex-col items-center text-center relative z-10">
                            <div className="absolute top-4 right-4 opacity-30 group-hover:opacity-100 transition-opacity">
                                {RankIcon[rank]}
                            </div>
                            
                            <div className="w-24 h-24 rounded-full border-4 border-white/30 overflow-hidden mb-4 shadow-lg group-hover:scale-110 transition-transform">
                                {cadet.photoURL || cadet.photoUrl ? (
                                    <img src={cadet.photoURL || cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-white/20 flex items-center justify-center text-2xl font-black text-white">
                                        {cadet.name?.[0]}
                                    </div>
                                )}
                            </div>

                            <h3 className="text-xl font-black text-white mb-1 w-full px-2 leading-tight">{cadet.name}</h3>
                            <p className="text-white/70 text-[10px] font-black uppercase tracking-[0.2em] mb-2">{cadet.regimentalNumber || cadet.enrollmentId}</p>
                            
                            {awardsList.length > 0 && (
                                <div className="flex gap-1 mb-4 flex-wrap justify-center">
                                    {awardsList.slice(0,3).map((aw, i) => (
                                        <span key={i} title={aw.title} className="bg-white/20 text-white text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-widest backdrop-blur-md border border-white/10">
                                            <Award className="w-2 h-2 inline-block mr-0.5 -mt-0.5" /> {aw.title}
                                        </span>
                                    ))}
                                    {awardsList.length > 3 && <span className="bg-white/20 text-white text-[8px] px-1.5 py-0.5 rounded-full font-bold">+{awardsList.length-3}</span>}
                                </div>
                            )}

                            <div className="mt-auto w-full">
                                <div className="text-4xl font-black text-white leading-none">
                                    <CountUp end={points} duration={2} />
                                </div>
                                <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mt-1">Performance Index</p>
                            </div>
                        </div>
                        {/* Animated background flare */}
                        <div className="absolute -inset-24 bg-white/20 blur-3xl rounded-full translate-x-1/2 translate-y-1/2 animate-pulse pointer-events-none"></div>
                    </motion.div>
                </Tilt>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onClick={() => onClick && onClick(cadet)}
            className={`flex flex-col gap-2 p-4 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl transition-all group ${onClick ? 'hover:bg-gray-50 dark:hover:bg-white/10 cursor-pointer' : ''}`}
        >
            <div className="flex items-center gap-4">
                <div className="w-10 font-black text-2xl text-gray-300 dark:text-white/20 group-hover:text-ncc-navy dark:group-hover:text-ncc-gold transition-colors italic">
                    #{rank}
                </div>
                <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/10 overflow-hidden flex-shrink-0">
                    {cadet.photoURL || cadet.photoUrl ? (
                        <img src={cadet.photoURL || cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-gray-400">
                            {cadet.name?.[0]}
                        </div>
                    )}
                </div>
                <div className="flex-1 min-w-0 py-1">
                    <h4 className="font-black text-ncc-navy dark:text-white text-sm uppercase tracking-tight leading-tight mb-1">{cadet.name}</h4>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">{cadet.regimentalNumber || cadet.enrollmentId}</p>
                </div>
                <div className="text-right shrink-0 pl-4 border-l border-gray-100 dark:border-white/5">
                    <div className="text-xl font-black text-ncc-navy dark:text-ncc-gold leading-tight">{points}</div>
                    <div className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">Index</div>
                </div>
            </div>
            {awardsList.length > 0 && (
                <div className="flex gap-1.5 flex-wrap ml-14">
                    {awardsList.map((aw, i) => (
                        <span key={i} className="bg-ncc-gold/10 text-ncc-gold text-[8px] px-2 py-1 rounded-md font-bold uppercase tracking-widest border border-ncc-gold/20 flex items-center gap-1">
                            <Star className="w-2 h-2" /> {aw.title}
                        </span>
                    ))}
                </div>
            )}
        </motion.div>
    );
};

export const getRankBonus = (rank) => {
    if (!rank) return 0;
    const r = String(rank).trim().toUpperCase().replace(/[\s\-_/]/g, '');
    if (r === 'SUO') return 50;
    if (r === 'JUO') return 40;
    if (r === 'CSM' || r === 'CSGT' || r === 'COMPANYSERGEANTMAJOR') return 35;
    if (r === 'CQMS' || r === 'COMPANYQUARTERMASTER') return 30;
    if (r === 'SGT' || r === 'SERGEANT') return 25;
    if (r === 'CPL' || r === 'CORPORAL') return 20;
    if (r === 'LCPL' || r === 'LANCECORPORAL' || r === 'LANC CORPORAL') return 15;
    return 0; // CDT / others
};

const RANK_BONUS = {
    'SUO': 50,
    'JUO': 40,
    'CSM': 35,
    'C-SGT': 35,
    'C/SGT': 35,
    'CSGT': 35,
    'CQMS': 30,
    'SGT': 25,
    'CPL': 20,
    'LCPL': 15,
    'CDT': 0
};

const CadetPointsModal = ({ cadet, onClose }) => {
    if (!cadet) return null;

    const rawPct = cadet.percentage ?? cadet.attendancePercentage ?? 0;
    const attendancePct = parseFloat(Number(rawPct || 0).toFixed(2));
    const attendancePts = cadet.attendancePts ?? Math.round(attendancePct * 1.2);
    const normRank = String(cadet.rank || 'CDT').trim().toUpperCase();
    const rankBonus = cadet.rankBonus ?? getRankBonus(normRank);
    const awardsList = Array.isArray(cadet.awards) ? cadet.awards : [];
    const awardPoints = cadet.awardPoints ?? (awardsList.length * 50);
    const totalPoints = cadet.score ?? Math.round(attendancePts + rankBonus + awardPoints);

    return (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/70 backdrop-blur-md"
                onClick={onClose}
            />
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white dark:bg-[#0a1628] rounded-[2.5rem] border border-[#ddd8cc] dark:border-white/10 shadow-2xl p-6 sm:p-8 max-w-md w-full relative z-10 overflow-hidden"
            >
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-white/10 rounded-full hover:bg-gray-200 dark:hover:bg-white/20 transition-colors text-gray-500 dark:text-white"
                >
                    <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-ncc-navy text-ncc-gold overflow-hidden shrink-0 flex items-center justify-center font-bold text-xl border-2 border-ncc-gold shadow-md">
                        {cadet.photoURL || cadet.photoUrl ? (
                            <img src={cadet.photoURL || cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                        ) : (
                            <span>{cadet.name?.[0]}</span>
                        )}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="text-xl font-display font-black text-ncc-navy dark:text-white truncate">
                            {cadet.name}
                        </h3>
                        <p className="text-xs text-gray-400 font-mono italic">
                            {cadet.regimentalNumber || cadet.enrollmentId}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                            {normRank && (
                                <span className="px-2.5 py-0.5 bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-ncc-gold text-[10px] font-black uppercase tracking-wider rounded-md border border-ncc-navy/20 dark:border-white/20">
                                    {normRank}
                                </span>
                            )}
                            {(cadet.certificate || cadet.B) && (
                                <span className="px-2.5 py-0.5 bg-ncc-gold/10 text-ncc-gold text-[10px] font-black uppercase tracking-wider rounded-md border border-ncc-gold/20">
                                    Cert {cadet.certificate || cadet.B}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-ncc-navy to-ncc-navy-mid dark:from-[#050b14] dark:to-ncc-navy/40 p-5 rounded-2xl text-center text-white mb-6 border border-ncc-gold/20 shadow-inner">
                    <p className="text-[10px] font-black text-ncc-gold uppercase tracking-[0.2em] mb-1">
                        Total Performance Index
                    </p>
                    <p className="text-4xl font-black text-white">
                        <CountUp end={totalPoints} duration={1.5} />
                    </p>
                    <p className="text-[10px] text-white/50 uppercase tracking-widest mt-1">Calculated Merit Rating</p>
                </div>

                <h4 className="text-xs font-black uppercase tracking-widest text-ncc-navy dark:text-white mb-3 flex items-center gap-2">
                    <Award className="w-4 h-4 text-ncc-gold" /> Performance Breakdown
                </h4>

                <div className="space-y-3">
                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-ncc-navy dark:text-white">Parade Attendance</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/60 mt-0.5">
                                {attendancePct}% attendance × 1.2 (Max 120 pts)
                            </p>
                        </div>
                        <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                            +{attendancePts} <span className="text-[9px] text-gray-400">pts</span>
                        </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-ncc-navy dark:text-white">Rank Appointment</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/60 mt-0.5">
                                Appointment Tier: {normRank} (Up to +50 pts)
                            </p>
                        </div>
                        <span className="text-base font-black text-ncc-gold">
                            +{rankBonus} <span className="text-[9px] text-gray-400">pts</span>
                        </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-ncc-navy dark:text-white">Awards & Commendations</p>
                            <p className="text-[10px] text-gray-400 dark:text-white/60 mt-0.5">
                                {awardsList.length} award{awardsList.length === 1 ? '' : 's'} × 50 pts
                            </p>
                        </div>
                        <span className="text-base font-black text-purple-600 dark:text-purple-400">
                            +{awardPoints} <span className="text-[9px] text-gray-400">pts</span>
                        </span>
                    </div>

                    {awardsList.length > 0 && (
                        <div className="mt-3 p-3 rounded-xl bg-ncc-gold/5 border border-ncc-gold/20">
                            <p className="text-[10px] font-black uppercase tracking-widest text-ncc-gold mb-2">Assigned Honors & Camp Awards</p>
                            <div className="space-y-1.5">
                                {awardsList.map((aw, idx) => {
                                    const title = typeof aw === 'string' ? aw : (aw.title || aw.name || 'Honor');
                                    const desc = typeof aw === 'object' && aw.description ? aw.description : '';
                                    const date = typeof aw === 'object' && (aw.date || aw.awardedAt) ? (aw.date || aw.awardedAt) : '';
                                    return (
                                        <div key={idx} className="flex flex-col gap-0.5 p-1.5 rounded-lg bg-white/40 dark:bg-white/5 border border-ncc-gold/10">
                                            <div className="flex items-center justify-between text-xs font-bold text-ncc-navy dark:text-white">
                                                <span className="flex items-center gap-1.5">
                                                    <Star className="w-3 h-3 text-ncc-gold fill-ncc-gold shrink-0" /> {title}
                                                </span>
                                                {date && <span className="text-[9px] text-gray-400 font-mono">{date}</span>}
                                            </div>
                                            {desc && <p className="text-[10px] text-gray-500 dark:text-white/60 pl-4">{desc}</p>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                <button 
                    onClick={onClose} 
                    className="w-full mt-6 py-3 bg-ncc-navy text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-ncc-navy-mid transition-all shadow-md cursor-pointer"
                >
                    Close Breakdown
                </button>
            </motion.div>
        </div>
    );
};

// Helper to aggregate all live awards from:
// 1. Live active camps[].roster[].achievements (matched live by id, enrollmentId, or regimentalNumber)
// 2. Direct manual awards assigned in Hall of Fame (excluding stale non-existent camp awards)
export const resolveCadetLiveAwards = (cadet, allCamps = []) => {
    if (!cadet) return [];
    const normReg = String(cadet.enrollmentId || cadet.regimentalNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const cadetId = String(cadet.id || cadet.cadetId || cadet.docId || '').trim();
    const cadetName = String(cadet.name || cadet.cadetName || '').trim().toLowerCase();

    const awardsMap = new Map();

    // 1. Live Camps Subscription: strictly scan current active camps and their rosters
    (allCamps || []).forEach(camp => {
        if (!camp || !Array.isArray(camp.roster)) return;
        const campName = camp.name || 'Camp';
        const campDate = camp.startDate || camp.dates || camp.date || '';

        camp.roster.forEach(r => {
            if (!r) return;
            const rReg = String(r.enrollmentId || r.regimentalNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const rId = String(r.cadetId || r.id || '').trim();
            const rName = String(r.cadetName || r.name || '').trim().toLowerCase();

            const isMatch = (normReg && rReg && normReg === rReg) ||
                            (cadetId && rId && cadetId === rId) ||
                            (!rReg && !rId && cadetName && rName && cadetName === rName);

            if (isMatch && Array.isArray(r.achievements) && r.achievements.length > 0) {
                r.achievements.forEach(ach => {
                    if (!ach) return;
                    const titleStr = typeof ach === 'string' ? ach : (ach.title || ach.name || '');
                    const key = titleStr.trim().toLowerCase();
                    if (key && !awardsMap.has(key)) {
                        awardsMap.set(key, {
                            title: titleStr,
                            description: `Awarded at ${campName}`,
                            date: campDate
                        });
                    }
                });
            }
        });
    });

    // 2. Direct manual honours assigned via Hall of Fame (non-camp awards)
    (cadet.awards || []).forEach(aw => {
        if (!aw) return;
        const titleStr = typeof aw === 'string' ? aw : (aw.title || aw.name || '');
        const desc = typeof aw === 'object' && aw.description ? aw.description : '';
        // Filter out stale awards from non-existent camps
        if (desc.includes('Awarded at ') && !allCamps.some(c => desc.includes(c.name))) {
            return;
        }
        const key = titleStr.trim().toLowerCase();
        if (key && !awardsMap.has(key)) {
            awardsMap.set(key, {
                title: titleStr,
                description: desc || 'Command Commendation',
                date: typeof aw === 'object' && (aw.date || aw.awardedAt) ? (aw.date || aw.awardedAt) : ''
            });
        }
    });

    return Array.from(awardsMap.values());
};

export const HallOfFame = () => {
    const { attendanceData, cadets, camps } = useDataContext();
    const { userRole, actualRole, isDelegatedCadet: isDelCadet, userEnrollmentId, userName, user, userInstitutionId } = useAuthContext();
    const isDelegatedCadet = isDelCadet || userRole === 'cadet' || actualRole === 'cadet';
    const isBattalionAdmin = userRole === 'battalion_admin' || userRole === 'superadmin' || actualRole === 'battalion_admin' || actualRole === 'superadmin';
    const isAno = !isDelegatedCadet && (userRole === 'admin' || userRole === 'officer' || actualRole === 'admin' || actualRole === 'officer');
    
    const [isAwardModalOpen, setIsAwardModalOpen] = useState(false);
    const [awardForm, setAwardForm] = useState({ cadetId: '', title: 'Best Cadet Award', description: '', date: new Date().toISOString().split('T')[0] });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCert, setFilterCert] = useState('All');
    const [filterDiv, setFilterDiv] = useState('All');

    const [showFormula, setShowFormula] = useState(false);
    const [selectedCadetForModal, setSelectedCadetForModal] = useState(null);

    const topCadets = useMemo(() => {
        const summaries = attendanceData?.individualSummaries || [];
        const summaryMap = new Map();
        summaries.forEach(s => {
            const reg = String(s.enrollmentId || s.regimentalNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            if (reg) summaryMap.set(reg, s);
            if (s.id) summaryMap.set(s.id, s);
        });

        // Use all active cadets from DataContext, falling back to summaries
        const sourceList = (cadets && cadets.length > 0) ? cadets : summaries;

        return sourceList
            .filter(c => {
                const lowerQuery = searchQuery.toLowerCase();
                const idStr = c.regimentalNumber || c.enrollmentId || '';
                const matchesSearch = !searchQuery || (c.name || '').toLowerCase().includes(lowerQuery) || idStr.toLowerCase().includes(lowerQuery);
                const cert = c.certificate || c.currentCertificate || 'NA';
                const matchesCert = filterCert === 'All' || cert === filterCert;
                const matchesDiv = filterDiv === 'All' || idStr.toUpperCase().includes(filterDiv);
                return matchesSearch && matchesCert && matchesDiv;
            })
            .map(c => {
                const reg = String(c.enrollmentId || c.regimentalNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                const summary = summaryMap.get(reg) || (c.id && summaryMap.get(c.id)) || {};

                // 1. Attendance Weightage (0–100% * 1.2 => up to 120 points)
                const rawPct = summary.percentage ?? c.attendancePercentage ?? c.percentage ?? 0;
                const attendancePct = parseFloat(Number(rawPct || 0).toFixed(2));
                const attendancePts = Math.round(attendancePct * 1.2);

                // 2. Rank Appointment Bonus (SUO: +50, JUO: +40, CSM: +35, CQMS: +30, SGT: +25, CPL: +20, LCPL: +15, CDT: +0)
                const normRank = String(c.rank || summary.rank || 'CDT').trim().toUpperCase();
                const rankBonus = getRankBonus(normRank);

                // 3. Awards & Commendations (+50 pts / award)
                const combinedAwards = resolveCadetLiveAwards({ ...summary, ...c }, camps);
                const awardPoints = combinedAwards.length * 50;

                const score = Math.round(attendancePts + rankBonus + awardPoints);

                return {
                    ...c,
                    ...summary,
                    percentage: attendancePct,
                    attendancePercentage: attendancePct,
                    attendancePts,
                    rankBonus,
                    rank: normRank,
                    awards: combinedAwards,
                    awardPoints,
                    score
                };
            })
            .sort((a, b) => {
                if (b.score !== a.score) {
                    return b.score - a.score;
                }
                const idA = a.regimentalNumber || a.enrollmentId || '';
                const idB = b.regimentalNumber || b.enrollmentId || '';
                
                const numA = parseInt(idA.match(/\d+$/)?.[0] || '0', 10);
                const numB = parseInt(idB.match(/\d+$/)?.[0] || '0', 10);
                
                if (numA !== numB) {
                    return numA - numB;
                }
                return idA.localeCompare(idB);
            })
            .slice(0, 15);
    }, [cadets, attendanceData, camps, searchQuery, filterCert, filterDiv]);

    const activeSelectedCadet = useMemo(() => {
        if (!selectedCadetForModal) return null;
        const fromTop = topCadets.find(c => 
            (c.id && selectedCadetForModal.id && c.id === selectedCadetForModal.id) ||
            (c.enrollmentId && selectedCadetForModal.enrollmentId && c.enrollmentId === selectedCadetForModal.enrollmentId)
        );
        if (fromTop) return fromTop;
        const liveAwards = resolveCadetLiveAwards(selectedCadetForModal, camps);
        const rawPct = selectedCadetForModal.percentage ?? selectedCadetForModal.attendancePercentage ?? 0;
        const attendancePct = parseFloat(Number(rawPct || 0).toFixed(2));
        const attendancePts = Math.round(attendancePct * 1.2);
        const normRank = String(selectedCadetForModal.rank || 'CDT').trim().toUpperCase();
        const rankBonus = getRankBonus(normRank);
        const awardPoints = liveAwards.length * 50;
        return {
            ...selectedCadetForModal,
            percentage: attendancePct,
            attendancePercentage: attendancePct,
            awards: liveAwards,
            attendancePts,
            rankBonus,
            rank: normRank,
            awardPoints,
            score: Math.round(attendancePts + rankBonus + awardPoints)
        };
    }, [selectedCadetForModal, topCadets, camps]);

    const handleAssignAward = async (e) => {
        e.preventDefault();
        if (!isBattalionAdmin) {
            toast.error("Permission Denied: Official awards and commendations can only be assigned by the Battalion Admin.");
            return;
        }
        if (!awardForm.cadetId) {
            toast.error("Select a cadet first.");
            return;
        }
        setIsSubmitting(true);
        try {
            const targetCadet = cadets.find(c => c.enrollmentId === awardForm.cadetId);
            if (!targetCadet || !targetCadet.id) throw new Error("Cadet not found");

            const docRef = doc(getCollectionRef('users'), targetCadet.id);
            await updateDoc(docRef, {
                awards: arrayUnion({
                    title: awardForm.title,
                    description: awardForm.description,
                    date: awardForm.date,
                    awardedAt: new Date().toISOString()
                })
            });

            toast.success("Award assigned successfully by Battalion HQ!");
            setIsAwardModalOpen(false);
            setAwardForm({ cadetId: '', title: 'Best Cadet Award', description: '', date: new Date().toISOString().split('T')[0] });
            setSearchQuery('');
        } catch (err) {
            console.error(err);
            toast.error("Failed to assign award.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const filteredCadetsForAward = useMemo(() => {
        if (!searchQuery) return [];
        const lower = searchQuery.toLowerCase();
        return cadets.filter(c => c.name?.toLowerCase().includes(lower) || c.enrollmentId?.toLowerCase().includes(lower)).slice(0, 5);
    }, [cadets, searchQuery]);

    return (
        <div className="space-y-8 relative">
            <header className="relative p-8 md:p-12 rounded-[3rem] bg-ncc-navy overflow-hidden shadow-2xl">
                <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent"></div>
                <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-ncc-gold/20 blur-[100px] rounded-full"></div>
                
                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
                    <div className="text-center lg:text-left flex-1 min-w-0">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-ncc-gold/20 border border-ncc-gold/30 rounded-full mb-6">
                            <Star className="w-4 h-4 text-ncc-gold fill-ncc-gold" />
                            <span className="text-ncc-gold text-xs font-black uppercase tracking-widest">Premium Recognition</span>
                        </div>
                        <h1 className="text-5xl md:text-6xl font-display font-black text-white mb-4 leading-tight">
                            Unit <span className="text-ncc-gold italic">Excellence</span>
                        </h1>
                        <p className="text-white/60 text-lg max-w-xl mx-auto lg:mx-0">
                            Recognizing elite discipline, unwavering attendance, and exceptional training performance within the unit.
                        </p>
                    </div>
                    {isBattalionAdmin && (
                        <div className="shrink-0 flex items-center justify-center mt-4 lg:mt-0">
                            <button 
                                onClick={() => setIsAwardModalOpen(true)}
                                className="bg-ncc-gold text-ncc-navy px-5 py-3 rounded-xl font-bold uppercase tracking-wider text-sm hover:scale-105 transition-all shadow-xl shadow-ncc-gold/20 flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Assign Award
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Performance Index Calculation Summary Card - ANO / Admin ONLY */}
            {(isBattalionAdmin || isAno) && (
                <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] p-6 shadow-sm">
                    <div 
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer select-none"
                        onClick={() => setShowFormula(prev => !prev)}
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-ncc-gold/10 text-ncc-gold flex items-center justify-center shrink-0">
                                <Info className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-ncc-navy dark:text-white text-sm flex items-center gap-2">
                                    Performance Index Calculation Summary
                                    <span className="text-[10px] font-black text-ncc-gold bg-ncc-gold/10 px-2.5 py-0.5 rounded-full uppercase tracking-wider">Formula</span>
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">
                                    Score = (Attendance % × 1.2) + Rank Appointment Bonus + Award Points
                                </p>
                            </div>
                        </div>
                        <button className="text-xs font-black text-ncc-gold uppercase tracking-widest hover:underline self-start sm:self-center shrink-0">
                            {showFormula ? 'Hide Summary ▲' : 'View Formula ▼'}
                        </button>
                    </div>

                    {showFormula && (
                        <div className="mt-6 pt-6 border-t border-[#ede8df] dark:border-white/10 grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in duration-200">
                            {/* 1. Attendance */}
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">1. Attendance Weightage</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-white/70 bg-white dark:bg-white/10 px-2 py-0.5 rounded-md border">Pct × 1.2</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-white/80 leading-relaxed">
                                    Calculated from total parade attendance (0–100%). A 100% attendance score yields up to <strong className="text-ncc-navy dark:text-white">120 points</strong>.
                                </p>
                            </div>

                            {/* 2. Rank Bonus */}
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">2. Rank Appointment Bonus</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-white/70 bg-white dark:bg-white/10 px-2 py-0.5 rounded-md border">Up to +50 pts</span>
                                </div>
                                <div className="text-xs text-gray-600 dark:text-white/80 space-y-1">
                                    <div className="flex justify-between"><span>SUO: <strong className="text-ncc-navy dark:text-white">+50</strong></span><span>JUO: <strong className="text-ncc-navy dark:text-white">+40</strong></span><span>CSM: <strong className="text-ncc-navy dark:text-white">+35</strong></span></div>
                                    <div className="flex justify-between"><span>CQMS: <strong className="text-ncc-navy dark:text-white">+30</strong></span><span>SGT: <strong className="text-ncc-navy dark:text-white">+25</strong></span><span>CPL: <strong className="text-ncc-navy dark:text-white">+20</strong></span></div>
                                    <div className="flex justify-between"><span>LCPL: <strong className="text-ncc-navy dark:text-white">+15</strong></span><span>CDT: <strong className="text-gray-400">+0</strong></span></div>
                                </div>
                            </div>

                            {/* 3. Awards */}
                            <div className="p-4 rounded-2xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/5">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">3. Awards & Commendations</span>
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-white/70 bg-white dark:bg-white/10 px-2 py-0.5 rounded-md border">+50 pts / award</span>
                                </div>
                                <p className="text-xs text-gray-600 dark:text-white/80 leading-relaxed">
                                    Each officially assigned award (e.g. Best Cadet, RDC, Shooting Champion) adds <strong className="text-ncc-navy dark:text-white">+50 points</strong>.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-4 bg-gray-50 dark:bg-white/5 p-4 rounded-3xl border border-gray-100 dark:border-white/10">
                <div className="flex-1 relative">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search cadets by name or regimental number..."
                        className="w-full bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-ncc-gold outline-none dark:text-white"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <select 
                    className="bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-ncc-gold outline-none dark:text-white font-bold text-xs md:text-sm uppercase tracking-widest text-ncc-navy"
                    value={filterCert}
                    onChange={(e) => setFilterCert(e.target.value)}
                >
                    <option value="All">All Certificates</option>
                    <option value="B1">B1 Certificate</option>
                    <option value="B2">B2 Certificate</option>
                    <option value="C">C Certificate</option>
                </select>
                <select 
                    className="bg-white dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-2xl px-4 py-3 focus:ring-2 focus:ring-ncc-gold outline-none dark:text-white font-bold text-xs md:text-sm uppercase tracking-widest text-ncc-navy"
                    value={filterDiv}
                    onChange={(e) => setFilterDiv(e.target.value)}
                >
                    <option value="All">All Divisions</option>
                    <option value="SD">SD (Senior Division)</option>
                    <option value="SW">SW (Senior Women)</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end max-w-4xl mx-auto py-12">
                <div className="order-2 md:order-1 h-auto md:h-[400px] mb-8 md:mb-0">
                    {topCadets[1] && <LeaderboardCard cadet={topCadets[1]} rank={2} points={topCadets[1].score} isTop3 onClick={(isAno || userRole === 'admin' || userRole === 'superadmin' || userRole === 'battalion_admin') ? setSelectedCadetForModal : undefined} />}
                </div>
                <div className="order-1 md:order-2 h-auto md:h-[480px] mb-8 md:mb-0">
                    {topCadets[0] && <LeaderboardCard cadet={topCadets[0]} rank={1} points={topCadets[0].score} isTop3 onClick={(isAno || userRole === 'admin' || userRole === 'superadmin' || userRole === 'battalion_admin') ? setSelectedCadetForModal : undefined} />}
                </div>
                <div className="order-3 md:order-3 h-auto md:h-[400px]">
                    {topCadets[2] && <LeaderboardCard cadet={topCadets[2]} rank={3} points={topCadets[2].score} isTop3 onClick={(isAno || userRole === 'admin' || userRole === 'superadmin' || userRole === 'battalion_admin') ? setSelectedCadetForModal : undefined} />}
                </div>
            </div>

            <div className="bg-white dark:bg-[#050b14] rounded-[2.5rem] border border-[#ddd8cc] p-8 shadow-sm">
                <div className="flex items-center justify-between mb-8">
                    <h2 className="text-2xl font-black text-ncc-navy dark:text-white flex items-center gap-3">
                        <TrendingUp className="w-6 h-6 text-ncc-gold" /> Performance Ranks
                    </h2>
                    <div className="flex items-center gap-4 text-xs font-black text-gray-400 uppercase tracking-widest">
                        <span>Total Participants: {attendanceData.individualSummaries.length}</span>
                        <div className="h-4 w-px bg-gray-200"></div>
                        <Users className="w-4 h-4" />
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {topCadets.slice(3, 15).map((cadet, index) => (
                        <LeaderboardCard 
                            key={cadet.id} 
                            cadet={cadet} 
                            rank={index + 4} 
                            points={cadet.score} 
                            onClick={(isAno || userRole === 'admin' || userRole === 'superadmin' || userRole === 'battalion_admin') ? setSelectedCadetForModal : undefined}
                        />
                    ))}
                </div>
            </div>

            {/* Admin Assign Award Modal */}
            <AnimatePresence>
                {isAwardModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                            onClick={() => setIsAwardModalOpen(false)}
                        ></motion.div>
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white dark:bg-[#0a1628] rounded-[2.5rem] border border-gray-100 dark:border-white/10 shadow-2xl p-8 max-w-lg w-full relative z-10"
                        >
                            <button onClick={() => setIsAwardModalOpen(false)} className="absolute top-6 right-6 p-2 bg-gray-100 dark:bg-white/5 rounded-full hover:bg-gray-200 dark:hover:bg-white/10 transition-colors">
                                <X className="w-5 h-5 text-gray-500 dark:text-white" />
                            </button>
                            
                            <h2 className="text-2xl font-black text-ncc-navy dark:text-white flex items-center gap-3 mb-6">
                                <Award className="w-7 h-7 text-ncc-gold" /> Assign Award
                            </h2>

                            <form onSubmit={handleAssignAward} className="space-y-4">
                                <div className="space-y-2 relative">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Cadet</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search by name or ID..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            className="w-full pl-10 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 outline-none text-sm dark:text-white"
                                        />
                                    </div>
                                    {searchQuery && !awardForm.cadetId && (
                                        <div className="absolute z-20 w-full mt-1 bg-white dark:bg-[#050b14] border border-gray-100 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
                                            {filteredCadetsForAward.map(c => (
                                                <button 
                                                    key={c.id} 
                                                    type="button"
                                                    onClick={() => {
                                                        setAwardForm({...awardForm, cadetId: c.enrollmentId});
                                                        setSearchQuery(c.name + ' (' + c.enrollmentId + ')');
                                                    }}
                                                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-white/5 border-b border-gray-50 dark:border-white/5 text-sm font-bold dark:text-white last:border-0"
                                                >
                                                    {c.name} <span className="text-gray-400 font-normal">({c.enrollmentId})</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Award Title</label>
                                    <select 
                                        value={awardForm.title}
                                        onChange={e => setAwardForm({...awardForm, title: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 outline-none text-sm dark:text-white font-bold"
                                    >
                                        <option>Best Cadet Award</option>
                                        <option>RDC Participant</option>
                                        <option>TSC Participant</option>
                                        <option>Shooting Champion</option>
                                        <option>Commanding Officer Commendation</option>
                                        <option>YEP Selection</option>
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Award Date</label>
                                    <input 
                                        type="date" required
                                        value={awardForm.date}
                                        onChange={e => setAwardForm({...awardForm, date: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 outline-none text-sm dark:text-white"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Description / Remarks (Optional)</label>
                                    <textarea 
                                        rows="3"
                                        placeholder="Specific reason for this award..."
                                        value={awardForm.description}
                                        onChange={e => setAwardForm({...awardForm, description: e.target.value})}
                                        className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 outline-none text-sm dark:text-white"
                                    />
                                </div>

                                <button 
                                    disabled={isSubmitting || !awardForm.cadetId}
                                    type="submit" 
                                    className="w-full bg-ncc-navy text-white py-4 rounded-xl font-black uppercase tracking-widest mt-4 hover:bg-ncc-navy-mid transition-all disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Assigning...' : 'Assign Award'}
                                </button>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Cadet Points Breakdown Modal */}
            <AnimatePresence>
                {activeSelectedCadet && (
                    <CadetPointsModal cadet={activeSelectedCadet} onClose={() => setSelectedCadetForModal(null)} />
                )}
            </AnimatePresence>
        </div>
    );
};

export default HallOfFame;
