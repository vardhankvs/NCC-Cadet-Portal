// src/features/Engagement/Leaderboard.jsx
import React from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { Trophy, Award, TrendingUp, Star, Medal, Shield, Clock } from '../../components/Icons.jsx';

export const Leaderboard = () => {
    const { cadets, loading, attendanceData } = useDataContext();
    const summaries = attendanceData?.individualSummaries || [];

    // Feature 4: Automated Gamification Points Calculation
    const enhancedCadets = cadets.map(cadet => {
        const summary = summaries.find(s => s.enrollmentId === cadet.enrollmentId);
        const attendancePercentage = summary?.percentage || 0;
        // Automated points: Base Merit + 1 point per % of attendance
        const computedMeritPoints = (cadet.meritPoints || 0) + attendancePercentage;
        
        return {
            ...cadet,
            computedMeritPoints,
            summary
        };
    });

    const topMerit = [...enhancedCadets]
        .sort((a, b) => b.computedMeritPoints - a.computedMeritPoints)
        .slice(0, 10);

    const topAttendance = [...summaries]
        .filter(c => c.percentage !== undefined)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 5);

    // Badge Logic
    const getBadges = (cadet, summary) => {
        const badges = [];
        if (cadet.computedMeritPoints > 150) badges.push({ icon: <Trophy className="w-3 h-3" />, label: 'Vanguard', color: 'bg-ncc-gold' });
        if (summary?.percentage === 100) badges.push({ icon: <TrendingUp className="w-3 h-3" />, label: 'Invincible', color: 'bg-emerald-500' });
        if (cadet.rank === 'SUO' || cadet.rank === 'JUO') badges.push({ icon: <Shield className="w-3 h-3" />, label: 'Command', color: 'bg-ncc-navy' });
        if (cadet.computedMeritPoints > 200) badges.push({ icon: <Star className="w-3 h-3" />, label: 'Legend', color: 'bg-purple-600' });
        return badges;
    };

    if (loading) return <div className="p-20 text-center text-gray-400 dark:text-white/80">Scanning ranks...</div>;

    return (
        <div className="space-y-8 fade-in">
            <header className="flex flex-col md:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-4xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-3">
                        <Trophy className="w-12 h-12 text-ncc-gold" /> Vanguard Leaderboard
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 font-medium">The elite percentile of 14(A) BN NCC Srikakulam.</p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-ncc-navy rounded-xl text-white text-[10px] font-black uppercase tracking-[0.2em]">
                    <Clock className="w-3.5 h-3.5 text-ncc-gold" /> Monthly Reset: 15 Days Left
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Top 3 Podium */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-10 opacity-5">
                            <Trophy className="w-64 h-64 text-ncc-navy dark:text-white" />
                        </div>
                        
                        <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white mb-8 flex items-center gap-2 uppercase tracking-tighter">
                            <Star className="w-5 h-5 text-ncc-gold" /> Distinguished Merit List
                        </h3>

                        <div className="space-y-4 max-h-[520px] overflow-y-auto px-4 ncc-scrollbar">
                            {topMerit.map((cadet, index) => {
                                const summary = cadet.summary;
                                const badges = getBadges(cadet, summary);
                                
                                return (
                                    <div 
                                        key={cadet.id} 
                                        className={`group flex items-center gap-4 p-3 rounded-2xl border transition-all duration-500 ${
                                            index === 0 ? 'bg-ncc-navy text-white border-ncc-navy shadow-2xl scale-[1.02] ring-2 ring-ncc-gold/20' : 
                                            'bg-white dark:bg-[#050b14] border-[#ddd8cc] hover:border-ncc-navy/20 hover:shadow-xl hover:-translate-y-0.5'
                                        }`}
                                    >
                                        <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-base transition-transform group-hover:scale-105 ${
                                            index === 0 ? 'bg-ncc-gold text-ncc-navy dark:text-white shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 
                                            index === 1 ? 'bg-slate-200 text-slate-600' : 
                                            index === 2 ? 'bg-orange-100 text-orange-900' : 'bg-gray-50 dark:bg-[#0a1628] text-gray-400 dark:text-white/80'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-base font-black tracking-tight truncate ${index === 0 ? 'text-white' : 'text-ncc-navy dark:text-white'}`}>{cadet.name}</p>
                                                {index === 0 && <Award className="w-4 h-4 text-ncc-gold animate-bounce" />}
                                            </div>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <p className={`text-[9px] font-mono uppercase tracking-widest ${index === 0 ? 'text-white/50' : 'text-gray-400 dark:text-white/80'}`}>{cadet.enrollmentId} • {cadet.rank || 'Cadet'}</p>
                                                <div className="flex gap-1 flex-wrap">
                                                    {badges.map((b, i) => (
                                                        <div key={i} className={`${b.color} text-white px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-tighter flex items-center gap-1`}>
                                                            {/* Scale down icons in badges if needed, but they are already w-3 */}
                                                            {b.icon} {b.label}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right flex-shrink-0" title="Includes base points + attendance points">
                                            <p className={`text-xl font-black ${index === 0 ? 'text-ncc-gold' : 'text-ncc-navy dark:text-white'}`}>{cadet.computedMeritPoints}</p>
                                            <p className={`text-[7px] font-black uppercase tracking-widest ${index === 0 ? 'text-white/40' : 'text-ncc-gold'}`}>Points</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Side Stats */}
                <div className="space-y-6">
                    <div className="bg-ncc-navy p-6 rounded-3xl text-white shadow-xl">
                        <h3 className="text-lg font-display font-bold mb-6 flex items-center gap-2 text-ncc-gold">
                            <TrendingUp className="w-5 h-5" /> Discipline Stats
                        </h3>
                        <div className="space-y-5">
                            {topAttendance.map((cadet, i) => (
                                <div key={i} className="flex justify-between items-center border-b border-white/10 pb-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-bold truncate">{cadet.name}</p>
                                        <p className="text-[10px] text-white/40 uppercase font-mono">{cadet.enrollmentId}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-base font-black text-ncc-gold">{cadet.percentage}%</p>
                                        <p className="text-[8px] text-white/30 uppercase font-bold tracking-tighter">Attendance</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] shadow-sm">
                        <h3 className="text-base font-display font-bold text-ncc-navy dark:text-white mb-4 flex items-center gap-2">
                            <Award className="w-5 h-5 text-ncc-gold" /> Recognition Program
                        </h3>
                        <p className="text-xs text-gray-500 dark:text-white/70 leading-relaxed italic">
                            "Excellence is not an act, but a habit. The Honour Roll recognizes those who demonstrate superior discipline and selfless service to the unit."
                        </p>
                        <div className="mt-6 p-4 bg-ncc-gold/10 rounded-2xl border border-ncc-gold/20">
                            <p className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">Current Reward</p>
                            <p className="text-xs font-bold text-gray-700 dark:text-white/90">Top 3 cadets will be nominated for the Best Cadet Award at the next ATC.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
