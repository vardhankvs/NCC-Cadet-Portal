import React, { useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { Users, Award, Shield, PieChart, BarChart2, VisibilityIcon, RotateCcw } from '../../components/Icons.jsx';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart as RePieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { toast } from 'react-toastify';
import CountUp from 'react-countup';
import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';

const StatRow = ({ label, value, total, color, onClick }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div 
            className={`space-y-1 ${onClick ? 'cursor-pointer hover:translate-x-1 transition-transform' : ''}`}
            onClick={(e) => { if (onClick) { e.stopPropagation(); onClick(); } }}
        >
            <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-500 dark:text-white/70 uppercase tracking-wider">{label}</span>
                <span className="text-sm font-black text-gray-800 dark:text-white">{value} <span className="text-xs text-gray-400 dark:text-white/80 font-semibold">({pct}%)</span></span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-[#0d2137] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
        </div>
    );
};

import { db } from '../../firebase/config';
import { onSnapshot, writeBatch, getDocs, deleteDoc } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService';

export const UnitAnalytics = ({ onDrillDown, onTabChange }) => {
    const { cadets, grievances } = useDataContext();
    const [isMounted, setIsMounted] = React.useState(false);
    const [visitorCount, setVisitorCount] = React.useState(0);

    React.useEffect(() => {
        setIsMounted(true);
        
        // Listen to visitor logs
        const statsRef = getCollectionRef('visitor_logs');
        if (statsRef) {
            const unsub = onSnapshot(statsRef, (snapshot) => {
                setVisitorCount(snapshot.size);
            }, (error) => {
                console.error('Visitor stats listener error:', error);
            });
            return () => unsub();
        }
    }, []);

    const handleResetVisitors = async () => {
        if (!window.confirm('Are you sure you want to reset the Unique Visitor count to 0? This will permanently clear all visitor logs.')) return;

        try {
            const statsRef = getCollectionRef('visitor_logs');
            if (!statsRef) return;

            const snapshot = await getDocs(statsRef);
            const batch = writeBatch(db);

            snapshot.docs.forEach((doc) => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            toast.success('Visitor logs reset successfully');
        } catch (error) {
            console.error('Error resetting visitors:', error);
            toast.error('Failed to reset visitor logs');
        }
    };

    const CERT_COLOR_MAP = {
        'Cert A': '#64748b',
        'Cert B1': '#10b981',
        'Cert B2': '#3b82f6',
        'Cert C': '#d4af37',
    };
    const CERT_COLORS = ['#64748b', '#10b981', '#3b82f6', '#d4af37'];

    const stats = useMemo(() => {
        const activeCadets = (cadets || []).filter(c => c && c.status !== 'alumni');

        let sd = 0, sw = 0;
        let b1_total = 0, b1_sd = 0, b1_sw = 0;
        let b2_total = 0, b2_sd = 0, b2_sw = 0;
        let c_total = 0, c_sd = 0, c_sw = 0;
        const certs = { 'A': 0, 'B1': 0, 'B2': 0, 'C': 0 };

        activeCadets.forEach(c => {
            const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const isSW = reg.includes('SW') || (c.division || '').toUpperCase() === 'SW' || (c.wing || '').toUpperCase() === 'SW' || (c.gender || '').toLowerCase() === 'female' || (c.gender || '').toLowerCase() === 'f';
            const isSD = !isSW;
            
            const rawCert = (c.currentCertificate || c.certificate || c.B || '').trim().toUpperCase();
            const cert = rawCert.replace(/^CERT(IFICATE)?\s*/i, '').replace(/[-\s]/g, '');

            if (isSD) sd++;
            if (isSW) sw++;

            if (cert === 'B1' || cert === 'B') { 
                b1_total++; 
                if (isSD) b1_sd++; 
                if (isSW) b1_sw++; 
                certs['B1']++;
            } else if (cert === 'B2') { 
                b2_total++; 
                if (isSD) b2_sd++; 
                if (isSW) b2_sw++; 
                certs['B2']++;
            } else if (cert === 'C') { 
                c_total++; 
                if (isSD) c_sd++; 
                if (isSW) c_sw++; 
                certs['C']++;
            } else if (cert === 'A') {
                certs['A']++;
            }
        });

        const ranks = { 'CDT': 0, 'LCPL': 0, 'CPL': 0, 'SGT': 0, 'CSM': 0, 'CQMS': 0, 'JUO': 0, 'SUO': 0 };
        activeCadets.forEach(c => {
            const r = (c.rank || 'CDT').toUpperCase().trim();
            if (ranks[r] !== undefined) {
                ranks[r]++;
            } else if (r === 'L/CPL' || r === 'L-CPL') {
                ranks['LCPL']++;
            } else if (r === 'UO') {
                ranks['JUO']++;
            } else {
                ranks['CDT']++;
            }
        });

        const rankChartData = Object.keys(ranks).map(key => ({ name: key, count: ranks[key] }));
        const certChartData = Object.keys(certs).map(key => ({ name: `Cert ${key}`, value: certs[key] }));

        const grievanceStats = {
            pending: (grievances || []).filter(g => (g.status || '').toLowerCase() === 'pending').length,
            reviewed: (grievances || []).filter(g => {
                const s = (g.status || '').toLowerCase();
                return s === 'reviewed' || s === 'escalated' || s === 'in progress' || s === 'in-progress';
            }).length,
            resolved: (grievances || []).filter(g => (g.status || '').toLowerCase() === 'resolved').length,
            total: (grievances || []).length
        };

        return { total: activeCadets.length, sd, sw, b1_total, b1_sd, b1_sw, b2_total, b2_sd, b2_sw, c_total, c_sd, c_sw, rankChartData, certChartData, grievanceStats };
    }, [cadets, grievances]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-[#050b14] border border-gray-200 dark:border-white/10 rounded-2xl shadow-xl px-4 py-3">
                    <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-1">{label}</p>
                    <p className="text-xl font-black text-ncc-navy dark:text-white">{payload[0].value} <span className="text-sm font-bold text-gray-400 dark:text-white/80">Cadets</span></p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="space-y-8 fade-in">
            {/* Header */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.25em] mb-1">Admin Portal</p>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                        <PieChart className="w-7 h-7 text-ncc-red" /> Unit Analytics
                    </h2>
                    <p className="text-gray-400 dark:text-white/80 text-sm mt-1">Live strength, demographics &amp; certificate overview</p>
                </div>
                <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-green-700 font-black text-xs uppercase tracking-wider">Live Data</span>
                </div>
            </header>

            {/* Strength Breakdown — Premium insight cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">

                {/* Unique Visitor Tracking */}
                <Tilt perspective={1000} scale={1.02} transitionSpeed={1000} className="h-full">
                    <div className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm relative overflow-hidden hover:shadow-lg transition-all duration-300 group h-full">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 via-pink-500 to-purple-400"></div>
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-purple-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center shadow-md">
                                    <VisibilityIcon className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em]">Portal Reach</h3>
                            </div>
                            <button 
                                onClick={handleResetVisitors}
                                title="Reset Count"
                                className="p-2 hover:bg-purple-50 text-purple-300 hover:text-purple-600 rounded-lg transition-all active:scale-90"
                            >
                                <RotateCcw className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-6xl font-black text-ncc-navy dark:text-white leading-none mb-1">
                            <CountUp end={visitorCount} duration={2} />
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest mb-8">Unique Visitors</p>
                        <div className="space-y-4 relative z-10">
                            <div className="flex items-center gap-2 text-purple-700 bg-purple-50 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider">
                                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                                Live Tracking Active
                            </div>
                        </div>
                    </div>
                </Tilt>

                {/* Overall */}
                <Tilt perspective={1000} scale={1.02} transitionSpeed={1000} className="h-full">
                    <div 
                        onClick={() => onDrillDown('All')}
                        className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm relative overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer h-full"
                    >
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ncc-navy via-blue-500 to-ncc-navy"></div>
                        <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-xl bg-ncc-navy flex items-center justify-center shadow-md">
                                <Users className="w-5 h-5 text-white" />
                            </div>
                            <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em]">Overall Strength</h3>
                        </div>
                        <p className="text-6xl font-black text-ncc-navy dark:text-white leading-none mb-1">
                            <CountUp end={stats.total} duration={2} />
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest mb-8">Active Cadets</p>
                        <div className="space-y-4 relative z-10">
                            <StatRow label="SD" value={stats.sd} total={stats.total} color="#0f2e4a" onClick={() => onDrillDown('All', 'SD')} />
                            <StatRow label="SW" value={stats.sw} total={stats.total} color="#457b9d" onClick={() => onDrillDown('All', 'SW')} />
                        </div>
                    </div>
                </Tilt>

                {/* B1 Certificate */}
                <div 
                    onClick={() => onDrillDown('B1')}
                    className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm relative overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-400"></div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-emerald-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center shadow-md">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em]">B1 Certificate</h3>
                    </div>
                    <p className="text-6xl font-black text-emerald-600 leading-none mb-1">{stats.b1_total}</p>
                    <p className="text-xs text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest mb-8">B1 Cadets</p>
                    <div className="space-y-4 relative z-10">
                        <StatRow label="SD" value={stats.b1_sd} total={stats.b1_total} color="#059669" onClick={() => onDrillDown('B1', 'SD')} />
                        <StatRow label="SW" value={stats.b1_sw} total={stats.b1_total} color="#34d399" onClick={() => onDrillDown('B1', 'SW')} />
                    </div>
                </div>

                {/* B2 Certificate */}
                <div 
                    onClick={() => onDrillDown('B2')}
                    className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm relative overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-indigo-500 to-blue-400"></div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-md">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em]">B2 Certificate</h3>
                    </div>
                    <p className="text-6xl font-black text-blue-600 leading-none mb-1">{stats.b2_total}</p>
                    <p className="text-xs text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest mb-8">B2 Cadets</p>
                    <div className="space-y-4 relative z-10">
                        <StatRow label="SD" value={stats.b2_sd} total={stats.b2_total} color="#2563eb" onClick={() => onDrillDown('B2', 'SD')} />
                        <StatRow label="SW" value={stats.b2_sw} total={stats.b2_total} color="#60a5fa" onClick={() => onDrillDown('B2', 'SW')} />
                    </div>
                </div>

                {/* C Certificate */}
                <div 
                    onClick={() => onDrillDown('C')}
                    className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm relative overflow-hidden hover:shadow-lg transition-all duration-300 group cursor-pointer"
                >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ncc-gold via-yellow-300 to-ncc-gold"></div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-yellow-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-xl bg-ncc-gold flex items-center justify-center shadow-md">
                            <Award className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em]">C Certificate</h3>
                    </div>
                    <p className="text-6xl font-black text-ncc-gold leading-none mb-1">{stats.c_total}</p>
                    <p className="text-xs text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest mb-8">C Cadets</p>
                    <div className="space-y-4 relative z-10">
                        <StatRow label="SD" value={stats.c_sd} total={stats.c_total} color="#d4af37" onClick={() => onDrillDown('C', 'SD')} />
                        <StatRow label="SW" value={stats.c_sw} total={stats.c_total} color="#f59e0b" onClick={() => onDrillDown('C', 'SW')} />
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                {/* Rank Distribution */}
                <div className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ncc-navy via-blue-400 to-ncc-navy"></div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-blue-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <BarChart2 className="w-4 h-4 text-ncc-navy dark:text-white" /> Unit Rank Distribution
                    </h3>
                    <p className="text-gray-400 dark:text-white/80 text-xs mb-6">Strength across all ranks</p>
                    <div className="h-72 min-h-[288px] min-w-0 relative z-10">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.rankChartData} barGap={4}>
                                <defs>
                                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#1d4ed8" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#0f2e4a" stopOpacity={1} />
                                    </linearGradient>
                                    <linearGradient id="barGradGold" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={1} />
                                        <stop offset="100%" stopColor="#d4af37" stopOpacity={1} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 8 }} />
                                <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={36}>
                                    {stats.rankChartData.map((entry, index) => (
                                        <Cell
                                            key={`cell-${index}`}
                                            fill={['JUO', 'SUO', 'CSM', 'CQMS'].includes(entry.name) ? 'url(#barGradGold)' : 'url(#barGrad)'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        )}
                    </div>
                </div>

                {/* Certificate Progress */}
                <div className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm hover:shadow-lg transition-all duration-300 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-ncc-gold via-yellow-300 to-ncc-gold"></div>
                    <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-yellow-50 rounded-full group-hover:scale-150 transition-transform duration-700"></div>
                    <h3 className="text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                        <Award className="w-4 h-4 text-ncc-gold" /> Certificate Progress
                    </h3>
                    <p className="text-gray-400 dark:text-white/80 text-xs mb-6">Breakdown by certificate level</p>
                    <div className="flex items-center gap-6 h-72 min-h-[288px] min-w-0 relative z-10">
                        <div className="flex-shrink-0 w-52 h-52">
                            {isMounted && (
                                <ResponsiveContainer width="100%" height="100%">
                                <RePieChart>
                                    <Pie
                                        data={stats.certChartData.filter(d => d.value > 0)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius="58%"
                                        outerRadius="82%"
                                        paddingAngle={6}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={6}
                                    >
                                        {stats.certChartData.filter(d => d.value > 0).map((entry) => (
                                            <Cell key={`cell-${entry.name}`} fill={CERT_COLOR_MAP[entry.name] || '#3b82f6'} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip content={<CustomTooltip />} />
                                </RePieChart>
                            </ResponsiveContainer>
                            )}
                        </div>
                        <div className="flex-1 space-y-4">
                            {stats.certChartData.map((entry, index) => (
                                <div key={entry.name} className="flex items-center gap-3 group/row hover:translate-x-1 transition-transform duration-200">
                                    <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: CERT_COLORS[index % CERT_COLORS.length] }} />
                                    <div className="flex-1">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">{entry.name}</span>
                                            <span className="text-xs font-black text-gray-700 dark:text-white/90">{entry.value}</span>
                                        </div>
                                        <div className="h-1.5 bg-gray-100 dark:bg-[#0d2137] rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${stats.total > 0 ? Math.round((entry.value / stats.total) * 100) : 0}%`,
                                                    backgroundColor: CERT_COLORS[index % CERT_COLORS.length]
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Welfare & Grievance Overview */}
            <div className="bg-white dark:bg-[#050b14] p-8 rounded-[3rem] border border-[#ddd8cc] shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold"></div>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                    <div>
                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                            <Shield className="w-6 h-6 text-ncc-gold" /> Welfare & Grievance Overview
                        </h3>
                        <p className="text-gray-400 dark:text-white/80 text-xs mt-1">Real-time status of cadet issues and unit feedback</p>
                    </div>
                    <button 
                        onClick={() => onTabChange && onTabChange('grievances')}
                        className="px-6 py-2.5 bg-ncc-navy text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg"
                    >
                        View Grievance Cell
                    </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="p-6 bg-gray-50 dark:bg-[#0a1628] rounded-3xl border border-gray-100 dark:border-white/5">
                        <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-1">Total Logs</p>
                        <h4 className="text-3xl font-black text-ncc-navy dark:text-white">{stats.grievanceStats.total}</h4>
                    </div>
                    <div className="p-6 bg-red-50 rounded-3xl border border-red-100">
                        <p className="text-[10px] font-black text-red-400 uppercase tracking-widest mb-1">Pending Action</p>
                        <h4 className="text-3xl font-black text-red-600">{stats.grievanceStats.pending}</h4>
                    </div>
                    <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Under Review</p>
                        <h4 className="text-3xl font-black text-blue-600">{stats.grievanceStats.reviewed}</h4>
                    </div>
                    <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Resolved</p>
                        <h4 className="text-3xl font-black text-emerald-600">{stats.grievanceStats.resolved}</h4>
                    </div>
                </div>
            </div>

        </div>
    );
};
