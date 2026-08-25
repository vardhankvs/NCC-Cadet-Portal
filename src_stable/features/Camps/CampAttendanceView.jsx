// src/features/Camps/CampAttendanceView.jsx
// Battalion Admin view: per-camp attendance breakdown by college, division, certificate

import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { Tent, Users, GraduationCap, ChevronLeft, Activity } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';

export function CampAttendanceView() {
    const { camps = [], allCadets = [], units = [] } = useDataContext();

    const [selectedCampId, setSelectedCampId]   = useState('');
    const [collegeFilter, setCollegeFilter]       = useState('All');
    const [divisionFilter, setDivisionFilter]     = useState('All');
    const [certFilter, setCertFilter]             = useState('All');

    // Only non-battalion colleges for filter list
    const colleges = useMemo(() => units.filter(u => !u.isBattalion), [units]);

    // Sorted camps newest-first for the dropdown
    const sortedCamps = useMemo(() =>
        [...camps].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)),
        [camps]
    );

    const selectedCamp = useMemo(() =>
        camps.find(c => c.id === selectedCampId) || null,
        [camps, selectedCampId]
    );

    // Build enriched roster: join camp roster entries with allCadets for institutionId/cert/wing
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

    // Per-college summary for the summary cards
    const perCollegeSummary = useMemo(() => {
        const map = {};
        enrichedRoster.forEach(r => {
            if (!map[r.institutionId]) {
                map[r.institutionId] = {
                    institutionId: r.institutionId,
                    collegeName: r.collegeName,
                    total: 0, sd: 0, sw: 0, b1: 0, b2: 0, c: 0,
                };
            }
            const s = map[r.institutionId];
            s.total++;
            if (r.wing === 'SD') s.sd++;
            if (r.wing === 'SW') s.sw++;
            if (r.cert === 'B1') s.b1++;
            if (r.cert === 'B2') s.b2++;
            if (r.cert === 'C')  s.c++;
        });
        return Object.values(map).sort((a, b) => b.total - a.total);
    }, [enrichedRoster]);

    // Filtered roster for the detail table
    const filteredRoster = useMemo(() => {
        return enrichedRoster.filter(r => {
            const matchCollege  = collegeFilter === 'All' || r.institutionId === collegeFilter;
            const matchDivision = divisionFilter === 'All' || r.wing === divisionFilter;
            const matchCert     = certFilter === 'All' || r.cert === certFilter;
            return matchCollege && matchDivision && matchCert;
        });
    }, [enrichedRoster, collegeFilter, divisionFilter, certFilter]);

    const certBadge = (cert) => {
        const cls = cert === 'B1' ? 'bg-emerald-500/10 text-emerald-600'
                  : cert === 'B2' ? 'bg-blue-500/10 text-blue-600'
                  : cert === 'C'  ? 'bg-yellow-500/10 text-yellow-600'
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
        <div className="space-y-6 animate-fade-in pb-10">

            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-[#050b14] border border-[#ddd8cc] shadow-sm">
                    <Tent className="w-5 h-5 text-ncc-navy dark:text-white" />
                </div>
                <div>
                    <h2 className="text-xl font-black font-display text-ncc-navy dark:text-white tracking-tight">
                        Camp Attendance — College Breakdown
                    </h2>
                    <p className="text-xs text-gray-400 dark:text-white/60 mt-0.5">
                        See how many cadets from each college attended a specific camp
                    </p>
                </div>
            </div>

            {/* Camp Selector */}
            <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-5 shadow-sm">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 block mb-2">
                    Select Camp
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
                <div className="text-center py-16 text-gray-400 dark:text-white/40">
                    <Tent className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-bold">Select a camp above to view the attendance breakdown.</p>
                </div>
            )}

            {selectedCamp && (
                <>
                    {/* Camp Summary Banner */}
                    <div className="bg-gradient-to-r from-ncc-navy to-[#1a365d] rounded-2xl p-5 text-white shadow-lg">
                        <p className="text-[10px] uppercase tracking-widest text-ncc-gold font-black mb-1">{selectedCamp.type}</p>
                        <h3 className="text-2xl font-black font-display">{selectedCamp.name}</h3>
                        <p className="text-white/60 text-xs mt-1">
                            {selectedCamp.location} · {formatDate(selectedCamp.startDate)} – {formatDate(selectedCamp.endDate)}
                        </p>
                        <div className="mt-4 flex items-center gap-6">
                            <div>
                                <p className="text-3xl font-black">{enrichedRoster.length}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Total Cadets</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black">{perCollegeSummary.length}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Colleges</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black">{enrichedRoster.filter(r => r.wing === 'SD').length}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">SD</p>
                            </div>
                            <div>
                                <p className="text-3xl font-black">{enrichedRoster.filter(r => r.wing === 'SW').length}</p>
                                <p className="text-[10px] uppercase tracking-widest text-white/50 font-bold">SW</p>
                            </div>
                        </div>
                    </div>

                    {/* Per-College Summary Cards */}
                    {perCollegeSummary.length === 0 ? (
                        <div className="text-center py-10 text-gray-400 text-sm">
                            No cadets on the roster for this camp yet.
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            {perCollegeSummary.map(col => (
                                <button
                                    key={col.institutionId}
                                    onClick={() => setCollegeFilter(
                                        collegeFilter === col.institutionId ? 'All' : col.institutionId
                                    )}
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
                                    <h4 className="font-black text-sm text-ncc-navy dark:text-white leading-tight mb-2">
                                        {col.collegeName}
                                    </h4>
                                    <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase tracking-wider">
                                        <span className="bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white px-2 py-0.5 rounded">
                                            SD: {col.sd}
                                        </span>
                                        <span className="bg-pink-500/10 text-pink-600 px-2 py-0.5 rounded">
                                            SW: {col.sw}
                                        </span>
                                        <span className="bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded">
                                            B1: {col.b1}
                                        </span>
                                        <span className="bg-blue-500/10 text-blue-600 px-2 py-0.5 rounded">
                                            B2: {col.b2}
                                        </span>
                                        <span className="bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded">
                                            C: {col.c}
                                        </span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Detail Table with filters */}
                    {enrichedRoster.length > 0 && (
                        <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-3xl shadow-sm overflow-hidden">
                            {/* Filter bar */}
                            <div className="p-5 border-b dark:border-white/10 flex flex-wrap items-end gap-4">
                                <div className="flex-1 min-w-[140px]">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                        College
                                    </label>
                                    <select
                                        value={collegeFilter}
                                        onChange={e => setCollegeFilter(e.target.value)}
                                        className="w-full text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm"
                                    >
                                        <option value="All">All Colleges</option>
                                        {perCollegeSummary.map(col => (
                                            <option key={col.institutionId} value={col.institutionId}>
                                                {col.collegeName} ({col.total})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                        Division
                                    </label>
                                    <select
                                        value={divisionFilter}
                                        onChange={e => setDivisionFilter(e.target.value)}
                                        className="text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm"
                                    >
                                        <option value="All">All Divisions</option>
                                        <option value="SD">SD (Senior Division)</option>
                                        <option value="SW">SW (Senior Wing)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 block mb-1">
                                        Certificate
                                    </label>
                                    <select
                                        value={certFilter}
                                        onChange={e => setCertFilter(e.target.value)}
                                        className="text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm"
                                    >
                                        <option value="All">All Certificates</option>
                                        <option value="B1">B1 Certificate</option>
                                        <option value="B2">B2 Certificate</option>
                                        <option value="C">C Certificate</option>
                                    </select>
                                </div>
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest self-center ml-auto">
                                    Showing {filteredRoster.length} of {enrichedRoster.length} cadets
                                </p>
                            </div>

                            {/* Table */}
                            {filteredRoster.length === 0 ? (
                                <div className="py-12 text-center text-gray-400 text-sm">
                                    No cadets match the selected filters.
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-xs border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50 dark:bg-white/5 text-gray-400 uppercase font-black tracking-wider text-[10px] border-b dark:border-white/10">
                                                <th className="px-4 py-3">#</th>
                                                <th className="px-4 py-3">Regimental No.</th>
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
                                                            : r.status === 'Reserve'  ? 'bg-amber-100 text-amber-800'
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
