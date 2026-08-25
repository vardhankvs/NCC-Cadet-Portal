import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import {
    Tent, Plus, Calendar, MapPin, Users, Search,
    Trash2, Edit2, Activity, GraduationCap, ChevronLeft,
    BarChart2, List
} from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { deleteCamp } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

import { CampForm } from './CampForm.jsx';
import { CampDetailsModal } from './CampDetailsModal.jsx';

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
            <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-5 shadow-sm">
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
                    className="w-full text-sm font-bold border dark:border-white/10 rounded-xl px-4 py-3 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm"
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
                    {/* Banner */}
                    <div className="bg-gradient-to-r from-ncc-navy to-[#1a365d] rounded-2xl p-5 text-white shadow-lg">
                        <p className="text-[10px] uppercase tracking-widest text-ncc-gold font-black mb-1">{selectedCamp.type}</p>
                        <h3 className="text-2xl font-black font-display">{selectedCamp.name}</h3>
                        <p className="text-white/60 text-xs mt-1">
                            {selectedCamp.location} · {formatDate(selectedCamp.startDate)} – {formatDate(selectedCamp.endDate)}
                        </p>
                        <div className="mt-4 flex items-center gap-6 flex-wrap">
                            {[
                                { val: enrichedRoster.length, label: 'Total Cadets' },
                                { val: perCollegeSummary.length, label: 'Colleges' },
                                { val: enrichedRoster.filter(r => r.wing === 'SD').length, label: 'SD' },
                                { val: enrichedRoster.filter(r => r.wing === 'SW').length, label: 'SW' },
                            ].map(({ val, label }) => (
                                <div key={label}>
                                    <p className="text-3xl font-black">{val}</p>
                                    <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">{label}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Per-College Cards */}
                    {perCollegeSummary.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            No cadets on the roster for this camp yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {perCollegeSummary.map(col => (
                                <button
                                    key={col.institutionId}
                                    onClick={() => setCollegeFilter(collegeFilter === col.institutionId ? 'All' : col.institutionId)}
                                    className={`text-left p-5 rounded-2xl border shadow-sm transition-all ${
                                        collegeFilter === col.institutionId
                                            ? 'border-ncc-gold bg-ncc-gold/5 dark:bg-ncc-gold/10 ring-1 ring-ncc-gold'
                                            : 'border-[#ddd8cc] dark:border-white/10 bg-white dark:bg-[#050b14] hover:shadow-md'
                                    }`}
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-ncc-navy/10 dark:bg-white/10 flex items-center justify-center">
                                            <GraduationCap className="w-5 h-5 text-ncc-navy dark:text-white" />
                                        </div>
                                        <span className="text-3xl font-black text-ncc-navy dark:text-white">{col.total}</span>
                                    </div>
                                    <h4 className="font-black text-sm text-ncc-navy dark:text-white leading-tight mb-2">{col.collegeName}</h4>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                                        <span className="bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white px-2 py-0.5 rounded">SD: {col.sd}</span>
                                        <span className="bg-pink-500/10 text-pink-600 px-2 py-0.5 rounded">SW: {col.sw}</span>
                                        <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">B1: {col.b1}</span>
                                        <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">B2: {col.b2}</span>
                                        <span className="bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded">C: {col.c}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Detail Table */}
                    {enrichedRoster.length > 0 && (
                        <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
                            <div className="p-5 border-b dark:border-white/10 flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[140px]">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">College</label>
                                    <select value={collegeFilter} onChange={e => setCollegeFilter(e.target.value)}
                                        className="w-full text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                        <option value="All">All Colleges</option>
                                        {perCollegeSummary.map(col => (
                                            <option key={col.institutionId} value={col.institutionId}>{col.collegeName} ({col.total})</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Division</label>
                                    <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)}
                                        className="text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                        <option value="All">All Divisions</option>
                                        <option value="SD">SD (Senior Division)</option>
                                        <option value="SW">SW (Senior Wing)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">Certificate</label>
                                    <select value={certFilter} onChange={e => setCertFilter(e.target.value)}
                                        className="text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
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
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-white/5 text-gray-400 uppercase font-black tracking-wider text-[10px] border-b dark:border-white/10">
                                                <th className="px-4 py-3">#</th>
                                                <th className="px-4 py-3">Reg. No.</th>
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">College</th>
                                                <th className="px-4 py-3">Division</th>
                                                <th className="px-4 py-3">Certificate</th>
                                                <th className="px-4 py-3">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y dark:divide-white/10 text-ncc-navy dark:text-gray-300">
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

    // internal sub-tabs: 'list' | 'attendance' | 'nominations'
    const [activeTab, setActiveTab] = useState('list');
    const [showForm, setShowForm] = useState(false);
    const [editingCamp, setEditingCamp] = useState(null);
    const [selectedCamp, setSelectedCamp] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const visibleCamps = useMemo(() => {
        let filtered = [...(camps || [])];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c =>
                (c.name || '').toLowerCase().includes(q) ||
                (c.type || '').toLowerCase().includes(q) ||
                (c.location || '').toLowerCase().includes(q)
            );
        }
        return filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    }, [camps, searchQuery]);

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
        { id: 'list', label: 'Camps', icon: Tent },
        ...(isBattalionAdmin ? [{ id: 'attendance', label: 'Attendance', icon: BarChart2 }] : []),
    ];

    return (
        <div className="space-y-6 fade-in">
            {/* ── Top Bar ── */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-[#050b14] border border-[#ddd8cc] shadow-sm">
                        <Tent className="w-5 h-5 text-ncc-navy dark:text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-ncc-navy dark:text-white">Camp Management</h2>
                        <p className="text-sm text-gray-500 dark:text-white/70">Track deployments, selections, and achievements.</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                    {/* Sub-tabs pill */}
                    <div className="flex bg-ncc-navy/5 dark:bg-white/5 p-1 rounded-2xl">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    activeTab === tab.id
                                        ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-sm'
                                        : 'text-ncc-navy dark:text-white/40 hover:text-ncc-navy dark:hover:text-white'
                                }`}
                            >
                                <tab.icon className="w-3.5 h-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Create Camp — Admin only, only on Camps tab */}
                    {isBattalionAdmin && activeTab === 'list' && (
                        <button
                            onClick={() => setShowForm(true)}
                            className="ncc-btn ncc-btn-primary whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Create Camp
                        </button>
                    )}
                </div>
            </div>

            {/* ── Tab: Camps List ── */}
            {activeTab === 'list' && (
                <div className="space-y-6">
                    {camps.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
                            <input
                                type="text"
                                placeholder="Search by name, type, or location..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy focus:ring-1 focus:ring-ncc-navy transition-all dark:text-white shadow-sm"
                            />
                        </div>
                    )}

                    {visibleCamps.length === 0 ? (
                        <div className="bg-white dark:bg-[#050b14] rounded-2xl shadow-sm border border-[#ddd8cc] p-16 text-center">
                            <Tent className="w-14 h-14 text-gray-300 dark:text-white/20 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-white/60 font-semibold">
                                {searchQuery ? 'No camps match your search.' : 'No camps have been published yet.'}
                            </p>
                            {isBattalionAdmin && !searchQuery && (
                                <button
                                    onClick={() => setShowForm(true)}
                                    className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-ncc-navy text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-ncc-navy/90 transition"
                                >
                                    <Plus className="w-4 h-4" /> Create First Camp
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {visibleCamps.map(camp => {
                                const rosterCount = camp.roster ? camp.roster.length : 0;
                                const isPast = new Date(camp.endDate) < new Date();

                                // Vacancy Calculations:
                                let vacancyText = '';
                                if (isBattalionAdmin) {
                                    const totalAllocated = Object.values(camp.vacancies || {}).reduce((s, n) => s + (parseInt(n) || 0), 0);
                                    const excludedCount = camp.disallowedColleges?.length || 0;
                                    const excludedText = excludedCount > 0 ? ` (${excludedCount} excluded)` : '';
                                    if (totalAllocated > 0) {
                                        vacancyText = `${rosterCount} / ${totalAllocated} Seats Filled${excludedText}`;
                                    } else {
                                        vacancyText = `${rosterCount} Assigned${excludedText}`;
                                    }
                                } else {
                                    const userSubdomain = userInstitutionId;
                                    const isDisallowed = camp.disallowedColleges?.includes(userSubdomain);
                                    if (isDisallowed) {
                                        vacancyText = 'Excluded for your college';
                                    } else {
                                        const allocated = camp.vacancies?.[userSubdomain] || 0;
                                        if (allocated > 0) {
                                            const filled = (camp.roster || []).filter(r => {
                                                const cadetDoc = cadets.find(c => c.id === r.cadetId);
                                                return (cadetDoc?.institutionId || r.institutionId) === userSubdomain;
                                            }).length;
                                            vacancyText = `${filled} / ${allocated} Seats Filled`;
                                        } else {
                                            vacancyText = 'No vacancies allocated';
                                        }
                                    }
                                }

                                let cadetStatusBadge = null;
                                if (userRole === 'cadet') {
                                    const myEntry = camp.roster?.find(r => r.enrollmentId === userEnrollmentId);
                                    if (myEntry) {
                                        cadetStatusBadge = (
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                                                myEntry.status === 'Selected' || myEntry.status === 'Attended'
                                                    ? 'bg-emerald-100 text-emerald-800'
                                                    : 'bg-blue-100 text-blue-800'
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
                                        className="group bg-white dark:bg-[#050b14] rounded-xl shadow-sm border border-[#ddd8cc] overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer flex flex-col relative focus:outline-none focus:ring-2 focus:ring-ncc-navy"
                                    >
                                        {/* Status bar at top */}
                                        <div className={`h-1 w-full ${isPast ? 'bg-gray-300 dark:bg-white/20' : 'bg-gradient-to-r from-ncc-navy via-ncc-gold to-ncc-red'}`} />

                                        <div className="p-5 flex-1">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded ${
                                                    isPast ? 'bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60' : 'bg-ncc-navy text-white'
                                                }`}>
                                                    {camp.type}
                                                </span>
                                                {cadetStatusBadge}
                                                {isPast && (
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-white/40 uppercase tracking-widest">
                                                        Completed
                                                    </span>
                                                )}
                                            </div>

                                            <h3 className="font-bold text-lg text-ncc-navy dark:text-white leading-tight mb-3">{camp.name}</h3>

                                            <div className="space-y-2 mt-3">
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
                                                    <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span>{formatDate(camp.startDate)} → {formatDate(camp.endDate)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/70">
                                                    <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                                                    <span>{camp.location}</span>
                                                </div>
                                            </div>

                                            {/* Admin controls */}
                                            {isBattalionAdmin && (
                                                <div className="absolute top-5 right-4 flex gap-1 bg-white/90 dark:bg-[#0a1628]/90 backdrop-blur-sm rounded-lg border border-[#ddd8cc] dark:border-white/10 p-1 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setEditingCamp(camp); }}
                                                        className="p-1.5 text-gray-600 hover:text-ncc-navy hover:bg-gray-100 dark:text-white/70 dark:hover:text-white dark:hover:bg-white/20 rounded transition"
                                                        title="Edit Camp"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={e => handleDeleteCamp(e, camp)}
                                                        className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/40 rounded transition"
                                                        title="Delete Camp"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] px-5 py-3 border-t border-[#ddd8cc] flex items-center justify-between text-xs font-semibold text-ncc-navy dark:text-white">
                                            <div className="flex items-center gap-1.5" title={isBattalionAdmin ? "Total camp roster size" : "College vacancies filled"}>
                                                <Users className="w-3.5 h-3.5 text-ncc-gold" />
                                                <span>{vacancyText}</span>
                                            </div>
                                            <span className="text-ncc-gold group-hover:underline text-[10px] uppercase tracking-widest font-black">Details →</span>
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
