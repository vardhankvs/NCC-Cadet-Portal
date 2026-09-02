import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import {
    Tent, Plus, Calendar, MapPin, Users, Search,
    Trash2, Edit2, Activity, GraduationCap, ChevronLeft,
    BarChart2, List, Clock, Sparkles, Filter, X, ArrowRight, ShieldCheck
} from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { deleteCamp } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

import { CampForm } from './CampForm.jsx';
import { CampDetailsModal } from './CampDetailsModal.jsx';

const campTypeColors = {
    'CATC': 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    'ATC': 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    'TSC': 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    'RDC': 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    'EBSB': 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    'ALC': 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    'Trekking': 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    'NIC': 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

// Helper: Calculate camp duration in days
function getCampDurationDays(start, end) {
    if (!start || !end) return null;
    const s = new Date(start);
    const e = new Date(end);
    const diff = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1;
    return diff > 0 ? `${diff} Days` : null;
}

// Helper: Determine live camp status
function getCampStatus(start, end) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const s = new Date(start);
    const e = new Date(end);
    e.setHours(23, 59, 59, 999);

    if (now > e) return 'completed';
    if (now >= s && now <= e) return 'active';
    return 'upcoming';
}

// ─── Sub-component: Camp Attendance (inline) ──────────────────────────────────
function AttendanceTab() {
    const { camps = [], allCadets = [], units = [] } = useDataContext();
    const [selectedCampId, setSelectedCampId] = useState('');
    const [collegeFilter, setCollegeFilter] = useState('All');
    const [divisionFilter, setDivisionFilter] = useState('All');
    const [certFilter, setCertFilter] = useState('All');

    const colleges = useMemo(() => units.filter(u => !u.isBattalion), [units]);
    const sortedCamps = useMemo(() =>
        [...camps].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)),
        [camps]
    );
    const selectedCamp = useMemo(() =>
        camps.find(c => c.id === selectedCampId) || null,
        [camps, selectedCampId]
    );

    const enrichedRoster = useMemo(() => {
        if (!selectedCamp) return [];
        return (selectedCamp.roster || []).map(r => {
            const cadetDoc = allCadets.find(c => c.id === r.cadetId);
            const reg = (r.enrollmentId || cadetDoc?.enrollmentId || cadetDoc?.regimentalNumber || '').toUpperCase();
            const wing = reg.includes('SD') ? 'SD' : reg.includes('SW') ? 'SW' : 'Unknown';
            const cert = cadetDoc?.certificate || cadetDoc?.B || '—';
            const institutionId = cadetDoc?.institutionId || r.institutionId || 'unknown';
            const collegeName = colleges.find(col => col.subdomain === institutionId)?.collegeName || institutionId;
            return { ...r, reg, wing, cert, institutionId, collegeName };
        });
    }, [selectedCamp, allCadets, colleges]);

    const perCollegeSummary = useMemo(() => {
        const map = {};
        enrichedRoster.forEach(r => {
            if (!map[r.institutionId]) {
                map[r.institutionId] = { institutionId: r.institutionId, collegeName: r.collegeName, total: 0, sd: 0, sw: 0, b1: 0, b2: 0, c: 0 };
            }
            const s = map[r.institutionId];
            s.total++;
            if (r.wing === 'SD') s.sd++;
            if (r.wing === 'SW') s.sw++;
            if (r.cert === 'B1') s.b1++;
            if (r.cert === 'B2') s.b2++;
            if (r.cert === 'C') s.c++;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [enrichedRoster]);

    const filteredRoster = useMemo(() => enrichedRoster.filter(r => {
        const matchCollege = collegeFilter === 'All' || r.institutionId === collegeFilter;
        const matchDivision = divisionFilter === 'All' || r.wing === divisionFilter;
        const matchCert = certFilter === 'All' || r.cert === certFilter;
        return matchCollege && matchDivision && matchCert;
    }), [enrichedRoster, collegeFilter, divisionFilter, certFilter]);

    const certBadge = (cert) => {
        const cls = cert === 'B1' ? 'bg-emerald-500/10 text-emerald-600'
            : cert === 'B2' ? 'bg-blue-500/10 text-blue-600'
            : cert === 'C' ? 'bg-yellow-500/10 text-yellow-600'
            : 'bg-gray-100 text-gray-400 dark:bg-white/5';
        return <span className={`px-2 py-0.5 rounded text-[10px] font-black ${cls}`}>{cert}</span>;
    };

    const wingBadge = (wing) => {
        const cls = wing === 'SD' ? 'bg-ncc-navy/10 text-ncc-navy dark:bg-white/10 dark:text-white'
            : wing === 'SW' ? 'bg-pink-500/10 text-pink-600'
            : 'bg-gray-100 text-gray-400';
        return <span className={`px-2 py-0.5 rounded text-[10px] font-black ${cls}`}>{wing}</span>;
    };

    return (
        <div className="space-y-6 pb-10">
            {/* Camp Selector */}
            <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-3xl p-6 shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                    Select Camp to View Attendance
                </label>
                <select
                    value={selectedCampId}
                    onChange={e => {
                        setSelectedCampId(e.target.value);
                        setCollegeFilter('All');
                        setDivisionFilter('All');
                        setCertFilter('All');
                    }}
                    className="w-full text-sm font-bold border border-[#ddd8cc] dark:border-white/10 rounded-2xl px-4 py-3 bg-[#f5f0e8] dark:bg-[#0a1628] text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm"
                >
                    <option value="">— Choose a Camp —</option>
                    {sortedCamps.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.name} ({c.type}) · {formatDate(c.startDate)} to {formatDate(c.endDate)}
                        </option>
                    ))}
                </select>
            </div>

            {!selectedCamp && (
                <div className="text-center py-20 text-gray-400 dark:text-white/40">
                    <Activity className="w-14 h-14 mx-auto mb-4 opacity-20" />
                    <p className="text-sm font-bold">Select a camp above to view the college-wise attendance breakdown.</p>
                </div>
            )}

            {selectedCamp && (
                <>
                    {/* College breakdown badges */}
                    {perCollegeSummary.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {perCollegeSummary.map(col => (
                                <div key={col.institutionId} className="bg-white dark:bg-[#050b14] p-5 rounded-2xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                                    <h4 className="text-xs font-bold text-ncc-navy dark:text-white truncate">{col.collegeName}</h4>
                                    <p className="text-2xl font-black text-ncc-gold mt-1">{col.total} <span className="text-xs text-gray-400 font-normal">Cadets</span></p>
                                    <div className="flex gap-2 text-[10px] text-gray-500 dark:text-white/60 font-semibold mt-2 pt-2 border-t border-gray-100 dark:border-white/5">
                                        <span>SD: {col.sd}</span> · <span>SW: {col.sw}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {enrichedRoster.length > 0 && (
                        <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b dark:border-white/10 flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[140px]">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">College</label>
                                    <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}
                                        className="w-full text-xs font-bold border border-[#ddd8cc] dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#0a1628] text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                        <option value="All">All Colleges</option>
                                        {perCollegeSummary.map(col => (
                                            <option key={col.institutionId} value={col.institutionId}>{col.collegeName} ({col.total})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Division</label>
                                    <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}
                                        className="text-xs font-bold border border-[#ddd8cc] dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#0a1628] text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                        <option value="All">All Divisions</option>
                                        <option value="SD">SD (Senior Division)</option>
                                        <option value="SW">SW (Senior Wing)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Certificate</label>
                                    <select value={certFilter} onChange={e => setCertFilter(e.target.value)}
                                        className="text-xs font-bold border border-[#ddd8cc] dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-[#0a1628] text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                        <option value="All">All Certificates</option>
                                        <option value="B1">B1 Certificate</option>
                                        <option value="B2">B2 Certificate</option>
                                        <option value="C">C Certificate</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest self-center ml-auto">
                                    {filteredRoster.length} of {enrichedRoster.length} cadets
                                </p>
                            </div>
                            {filteredRoster.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 text-sm">No cadets match the selected filters.</div>
                            ) : (
                                <div className="overflow-x-auto ncc-scrollbar">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-[#f5f0e8] dark:bg-[#0a1628] text-gray-500 dark:text-white/70 uppercase font-black tracking-wider text-[10px] border-b border-[#ddd8cc] dark:border-white/10">
                                                <th className="px-4 py-3">#</th>
                                                <th className="px-4 py-3">Reg. No.</th>
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">College</th>
                                                <th className="px-4 py-3">Division</th>
                                                <th className="px-4 py-3">Certificate</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#ddd8cc]/60 dark:divide-white/10 text-ncc-navy dark:text-gray-300">
                                            {filteredRoster.map((r, i) => (
                                                <tr key={r.cadetId} className="hover:bg-gray-50 dark:hover:bg-white/5 transition">
                                                    <td className="px-4 py-3 text-gray-400 font-bold">{i + 1}</td>
                                                    <td className="px-4 py-3 font-mono font-bold">{r.reg || r.enrollmentId || '—'}</td>
                                                    <td className="px-4 py-3 font-bold">{r.cadetName}</td>
                                                    <td className="px-4 py-3 text-gray-500 dark:text-white/60">{r.collegeName}</td>
                                                    <td className="px-4 py-3">{wingBadge(r.wing)}</td>
                                                    <td className="px-4 py-3">{certBadge(r.cert)}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                                            r.status === 'Attended' ? 'bg-blue-100 text-blue-800'
                                                            : r.status === 'Selected' ? 'bg-emerald-100 text-emerald-800'
                                                            : r.status === 'Reserve' ? 'bg-amber-100 text-amber-800'
                                                            : 'bg-gray-100 text-gray-600'
                                                        }`}>{r.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ─── Main CampsView ───────────────────────────────────────────────────────────
export const CampsView = () => {
    const { userRole, userEnrollmentId, userInstitutionId } = useAuthContext();
    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';
    const { camps = [], cadets = [] } = useDataContext();

    // internal sub-tabs: 'list' | 'attendance'
    const [activeTab, setActiveTab] = useState('list');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'upcoming' | 'active' | 'completed'
    const [typeFilter, setTypeFilter] = useState('all');
    const [showForm, setShowForm] = useState(false);
    const [editingCamp, setEditingCamp] = useState(null);
    const [selectedCamp, setSelectedCamp] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    // Available Camp Types
    const availableCampTypes = useMemo(() => {
        const types = new Set((camps || []).map(c => c.type).filter(Boolean));
        return Array.from(types);
    }, [camps]);

    // Statistics Calculations
    const campStats = useMemo(() => {
        let active = 0;
        let upcoming = 0;
        let completed = 0;
        let totalEnrolled = 0;

        (camps || []).forEach(c => {
            const status = getCampStatus(c.startDate, c.endDate);
            if (status === 'active') active++;
            else if (status === 'upcoming') upcoming++;
            else if (status === 'completed') completed++;

            totalEnrolled += (c.roster ? c.roster.length : 0);
        });

        return {
            total: (camps || []).length,
            active,
            upcoming,
            completed,
            totalEnrolled
        };
    }, [camps]);

    // Visible / Filtered Camps
    const visibleCamps = useMemo(() => {
        let filtered = [...(camps || [])];

        // Search query filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                (c.name || '').toLowerCase().includes(q) ||
                (c.type || '').toLowerCase().includes(q) ||
                (c.location || '').toLowerCase().includes(q)
            );
        }

        // Status filter
        if (statusFilter !== 'all') {
            filtered = filtered.filter(c => {
                const s = getCampStatus(c.startDate, c.endDate);
                if (statusFilter === 'active_or_upcoming') {
                    return s === 'active' || s === 'upcoming';
                }
                return s === statusFilter;
            });
        }

        // Type filter
        if (typeFilter !== 'all') {
            filtered = filtered.filter(c => (c.type || '').toUpperCase() === typeFilter.toUpperCase());
        }

        return filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }, [camps, searchQuery, statusFilter, typeFilter]);

    const handleDeleteCamp = async (e, camp) => {
        e.stopPropagation();
        if (window.confirm(`Delete "${camp.name}"? This cannot be undone.`)) {
            try {
                await deleteCamp(camp.id);
                toast.success('Camp deleted successfully!');
            } catch (err) {
                toast.error(`Failed to delete: ${err.message}`);
            }
        }
    };

    const tabs = [
        { id: 'list', label: 'Camps Roster', icon: Tent },
        ...(isBattalionAdmin ? [{ id: 'attendance', label: 'Unit Attendance', icon: BarChart2 }] : []),
    ];

    return (
        <div className="space-y-6 fade-in w-full">
            {/* ── Top Hero & Actions ── */}
            <div className="bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-ncc-navy dark:text-ncc-gold text-xs font-bold uppercase tracking-wider mb-3">
                            <Tent className="w-3.5 h-3.5" />
                            Expeditions & Training Camps
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                            Camp Deployments
                        </h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm mt-1 max-w-2xl">
                            Track annual training camps, national expeditions, cadet nominations, and official battalion attendance records.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        {/* Sub-tabs switch */}
                        <div className="flex bg-[#f5f0e8] dark:bg-[#0a1628] p-1.5 rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                            {tabs.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                        activeTab === tab.id
                                            ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                            : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    <tab.icon className="w-3.5 h-3.5" />
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Create Camp — Admin only */}
                        {isBattalionAdmin && activeTab === 'list' && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="px-5 py-3 bg-ncc-gold hover:bg-ncc-gold/90 text-ncc-navy font-bold rounded-2xl transition-all shadow-[0_0_20px_rgba(184,131,14,0.3)] hover:scale-105 uppercase text-xs tracking-wider flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" /> Create Camp
                            </button>
                        )}
                    </div>
                </div>

                {/* ── KPI Metric Badges ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#ddd8cc] dark:border-white/10">
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                        <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Total Camps</p>
                        <p className="text-2xl sm:text-3xl font-black text-ncc-navy dark:text-white mt-1">{campStats.total}</p>
                    </div>
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                        <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Active / Upcoming</p>
                        <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{campStats.active + campStats.upcoming}</p>
                    </div>
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                        <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Cadets Enrolled</p>
                        <p className="text-2xl sm:text-3xl font-black text-ncc-gold mt-1">{campStats.totalEnrolled}</p>
                    </div>
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-2xl border border-[#ddd8cc] dark:border-white/10">
                        <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Completed</p>
                        <p className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">{campStats.completed}</p>
                    </div>
                </div>
            </div>

            {/* ── Tab: Camps List ── */}
            {activeTab === 'list' && (
                <div className="space-y-6">
                    {/* ── Search & Filter Controls ── */}
                    <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                        {/* Status Filter Chips */}
                        <div className="flex items-center gap-2 overflow-x-auto ncc-scrollbar pb-1 md:pb-0">
                            <button
                                onClick={() => setStatusFilter('all')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    statusFilter === 'all'
                                        ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                        : 'bg-white dark:bg-[#050b14] text-gray-600 dark:text-white/70 border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold'
                                }`}
                            >
                                All Camps ({camps.length})
                            </button>
                            <button
                                onClick={() => setStatusFilter('active_or_upcoming')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    statusFilter === 'active_or_upcoming'
                                        ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                        : 'bg-white dark:bg-[#050b14] text-gray-600 dark:text-white/70 border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold'
                                }`}
                            >
                                Active & Upcoming ({campStats.active + campStats.upcoming})
                            </button>
                            <button
                                onClick={() => setStatusFilter('completed')}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                    statusFilter === 'completed'
                                        ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-md'
                                        : 'bg-white dark:bg-[#050b14] text-gray-600 dark:text-white/70 border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold'
                                }`}
                            >
                                Completed ({campStats.completed})
                            </button>
                        </div>

                        {/* Search & Type Filters */}
                        <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center">
                            {availableCampTypes.length > 0 && (
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value)}
                                    className="px-3.5 py-2.5 rounded-xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none text-xs font-bold text-ncc-navy dark:text-white cursor-pointer shadow-sm"
                                >
                                    <option value="all">All Types</option>
                                    {availableCampTypes.map(t => (
                                        <option key={t} value={t}>{t}</option>
                                    ))}
                                </select>
                            )}

                            <div className="relative min-w-[240px] sm:min-w-[280px]">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                                <input
                                    type="text"
                                    placeholder="Search by name, location, type..."
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
                    </div>

                    {/* ── Camps Grid ── */}
                    {visibleCamps.length === 0 ? (
                        <div className="bg-white dark:bg-[#050b14] rounded-3xl shadow-sm border border-[#ddd8cc] dark:border-white/10 p-16 text-center">
                            <Tent className="w-16 h-16 text-gray-300 dark:text-white/20 mx-auto mb-4" />
                            <h3 className="text-lg font-bold font-display text-ncc-navy dark:text-white">No camps found</h3>
                            <p className="text-gray-500 dark:text-white/60 text-sm mt-1 max-w-sm mx-auto">
                                {searchQuery ? 'No camps match your search criteria.' : 'No training camps have been published for this period.'}
                            </p>
                            {isBattalionAdmin && !searchQuery && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="mt-5 inline-flex items-center gap-2 px-6 py-3 bg-ncc-navy text-white rounded-2xl text-xs font-bold uppercase tracking-wider hover:bg-ncc-navy/90 transition shadow-md"
                                >
                                    <Plus className="w-4 h-4" /> Create Camp
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
                            {visibleCamps.map(camp => {
                                const rosterCount = camp.roster ? camp.roster.length : 0;
                                const status = getCampStatus(camp.startDate, camp.endDate);
                                const isPast = status === 'completed';
                                const durationText = getCampDurationDays(camp.startDate, camp.endDate);
                                const typeBadgeClass = campTypeColors[camp.type] || 'bg-ncc-navy/10 text-ncc-navy dark:text-white border-ncc-navy/20';

                                // Vacancy Calculations:
                                let vacancyCount = rosterCount;
                                let vacancyMax = 0;
                                let vacancyText = '';
                                let fillPercent = 0;

                                if (isBattalionAdmin) {
                                    const totalAllocated = Object.values(camp.vacancies || {}).reduce((s, n) => s + (parseInt(n) || 0), 0);
                                    const excludedCount = camp.disallowedColleges?.length || 0;
                                    const excludedText = excludedCount > 0 ? ` (${excludedCount} excl)` : '';
                                    vacancyMax = totalAllocated;
                                    if (totalAllocated > 0) {
                                        fillPercent = Math.min(100, Math.round((rosterCount / totalAllocated) * 100));
                                        vacancyText = `${rosterCount} / ${totalAllocated} Seats Filled${excludedText}`;
                                    } else {
                                        vacancyText = `${rosterCount} Nominated${excludedText}`;
                                    }
                                } else {
                                    const userSubdomain = userInstitutionId;
                                    const isDisallowed = camp.disallowedColleges?.includes(userSubdomain);
                                    if (isDisallowed) {
                                        vacancyText = 'Excluded for college';
                                    } else {
                                        const allocated = camp.vacancies?.[userSubdomain] || 0;
                                        vacancyMax = allocated;
                                        if (allocated > 0) {
                                            const filled = (camp.roster || []).filter(r => {
                                                const cadetDoc = cadets.find(c => c.id === r.cadetId);
                                                return (cadetDoc?.institutionId || r.institutionId) === userSubdomain;
                                            }).length;
                                            fillPercent = Math.min(100, Math.round((filled / allocated) * 100));
                                            vacancyText = `${filled} / ${allocated} Seats Filled`;
                                        } else {
                                            vacancyText = 'Open Allocation';
                                        }
                                    }
                                }

                                let cadetStatusBadge = null;
                                if (userRole === 'cadet') {
                                    const myEntry = camp.roster?.find(r => r.enrollmentId === userEnrollmentId);
                                    if (myEntry) {
                                        cadetStatusBadge = (
                                            <span className={`px-2.5 py-1 text-[10px] font-black rounded-lg ${
                                                myEntry.status === 'Selected' || myEntry.status === 'Attended'
                                                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                                    : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                            }`}>
                                                You: {myEntry.status}
                                            </span>
                                        );
                                    }
                                }

                                return (
                                    <div
                                        key={camp.id}
                                        onClick={() => setSelectedCamp(camp)}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={e => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                setSelectedCamp(camp);
                                            }
                                        }}
                                        className="group bg-white dark:bg-[#050b14] rounded-3xl shadow-sm border border-[#ddd8cc] dark:border-white/10 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col relative focus:outline-none focus:ring-2 focus:ring-ncc-gold isolate"
                                    >
                                        {/* Status Header Strip */}
                                        <div className={`h-1.5 w-full ${
                                            status === 'active'
                                                ? 'bg-emerald-500'
                                                : status === 'upcoming'
                                                    ? 'bg-gradient-to-r from-ncc-navy via-ncc-gold to-ncc-red'
                                                    : 'bg-gray-300 dark:bg-white/10'
                                        }`} />

                                        <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between">
                                            <div>
                                                {/* Top Badge Row */}
                                                <div className="flex justify-between items-center mb-4">
                                                    <span className={`px-3 py-1 text-[10px] font-black tracking-wider uppercase rounded-xl border ${typeBadgeClass}`}>
                                                        {camp.type}
                                                    </span>

                                                    <div className="flex items-center gap-2">
                                                        {cadetStatusBadge}

                                                        {status === 'active' && (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                                                                Active Now
                                                            </span>
                                                        )}

                                                        {status === 'upcoming' && (
                                                            <span className="px-2.5 py-1 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-600 dark:text-blue-400 text-[10px] font-black uppercase tracking-wider">
                                                                Upcoming
                                                            </span>
                                                        )}

                                                        {status === 'completed' && (
                                                            <span className="px-2.5 py-1 rounded-xl bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/50 text-[10px] font-black uppercase tracking-wider">
                                                                Completed
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Camp Title */}
                                                <h3 className="font-display font-bold text-xl text-ncc-navy dark:text-white leading-tight group-hover:text-ncc-gold transition-colors line-clamp-1 mb-3">
                                                    {camp.name}
                                                </h3>

                                                {/* Details list */}
                                                <div className="space-y-2.5 mt-4">
                                                    <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-white/70">
                                                        <Calendar className="w-4 h-4 text-ncc-gold flex-shrink-0" />
                                                        <span>{formatDate(camp.startDate)} → {formatDate(camp.endDate)}</span>
                                                        {durationText && (
                                                            <span className="ml-auto text-[10px] font-bold text-gray-400 dark:text-white/50 bg-[#f5f0e8] dark:bg-white/5 px-2 py-0.5 rounded-md">
                                                                {durationText}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2.5 text-xs text-gray-600 dark:text-white/70">
                                                        <MapPin className="w-4 h-4 text-ncc-gold flex-shrink-0" />
                                                        <span className="truncate">{camp.location || 'Battalion Grounds'}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Vacancy Progress Bar */}
                                            {vacancyMax > 0 && (
                                                <div className="mt-5 pt-4 border-t border-[#ddd8cc]/60 dark:border-white/5">
                                                    <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 dark:text-white/60 mb-1.5">
                                                        <span>Roster Capacity</span>
                                                        <span>{fillPercent}% Filled</span>
                                                    </div>
                                                    <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-white/10 overflow-hidden">
                                                        <div 
                                                            className="h-full rounded-full bg-ncc-gold transition-all duration-500"
                                                            style={{ width: `${fillPercent}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Admin controls */}
                                            {isBattalionAdmin && (
                                                <div className="absolute top-5 right-4 flex gap-1.5 bg-white/95 dark:bg-[#0a1628]/95 backdrop-blur-sm rounded-xl border border-[#ddd8cc] dark:border-white/10 p-1 shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setEditingCamp(camp); }}
                                                        className="p-2 text-gray-600 hover:text-ncc-navy hover:bg-gray-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/20 rounded-lg transition"
                                                        title="Edit Camp"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={e => handleDeleteCamp(e, camp)}
                                                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 rounded-lg transition"
                                                        title="Delete Camp"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Bottom Action Footer */}
                                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] px-6 py-4 border-t border-[#ddd8cc] dark:border-white/10 flex items-center justify-between text-xs font-bold text-ncc-navy dark:text-white">
                                            <div className="flex items-center gap-2" title={isBattalionAdmin ? "Total camp roster size" : "College vacancies filled"}>
                                                <Users className="w-4 h-4 text-ncc-gold" />
                                                <span>{vacancyText}</span>
                                            </div>
                                            <span className="text-ncc-gold group-hover:translate-x-1 transition-transform text-xs uppercase tracking-wider font-black flex items-center gap-1">
                                                Details &rarr;
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Tab: Attendance ── */}
            {activeTab === 'attendance' && <AttendanceTab />}

            {/* ── Modals ── */}
            {showForm && <CampForm onClose={() => setShowForm(false)} />}
            {editingCamp && <CampForm initialData={editingCamp} onClose={() => setEditingCamp(null)} />}
            {selectedCamp && (
                <CampDetailsModal
                    camp={selectedCamp}
                    onClose={() => setSelectedCamp(null)}
                    onEditCamp={() => {
                        setEditingCamp(selectedCamp);
                        setSelectedCamp(null);
                    }}
                />
            )}
        </div>
    );
};
