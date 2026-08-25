// src/features/Ranks/RankManagementView.jsx
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { Search, Award, TrendingUp, Filter, UserCheck, Shield, Clock, GraduationCap, Users, ChevronLeft } from '../../components/Icons.jsx';
import { updateCadetRank } from '../../firebase/firestoreService.js';
import { submitDelegatedTask } from '../../firebase/delegationWorkflowService.js';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToUser } from '../../firebase/pushNotifications.js';

const ranks = ['CDT', 'LCPL', 'CPL', 'SGT', 'CQMS', 'CSM', 'JUO', 'SUO'];

export const RankManagementView = () => {
    const { userRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const { cadets, units, loading, selectedCollege, setSelectedCollege } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRank, setFilterRank] = useState('All');
    const [filterCertificate, setFilterCertificate] = useState('All');
    const [filterDivision, setFilterDivision] = useState('All');
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [newRank, setNewRank] = useState('');
    const [reason, setReason] = useState('Merit-based promotion');
    const [processing, setProcessing] = useState(false);
    
    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';

    // Track selected college for Battalion Admin
    const [selectedCollegeId, setSelectedCollegeId] = useState(
        isBattalionAdmin ? (selectedCollege !== 'All' ? selectedCollege : null) : null
    );

    React.useEffect(() => {
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

    const selectedCollegeName = useMemo(() => {
        if (!selectedCollegeId) return '';
        return (units || []).find(u => u.subdomain === selectedCollegeId)?.collegeName || selectedCollegeId;
    }, [selectedCollegeId, units]);

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
            <div className="space-y-6 fade-in">
                <header className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
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
                                    <div className="absolute inset-0 bg-gradient-to-tr from-ncc-navy/5 to-ncc-gold/5 dark:from-ncc-gold/5 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                    
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
        <div className="space-y-4 fade-in">
            {isBattalionAdmin && (
                <button 
                    onClick={() => { setSelectedCollegeId(null); setSelectedCadet(null); }}
                    className="flex items-center gap-1.5 text-xs text-ncc-gold hover:text-ncc-navy dark:hover:text-white transition-colors font-black uppercase tracking-widest"
                >
                    <ChevronLeft className="w-4 h-4" /> Back to Colleges
                </button>
            )}

            <header className="flex flex-col md:flex-row md:justify-between md:items-center bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] dark:border-white/10 shadow-sm gap-4">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex flex-wrap items-center gap-2">
                        Rank & Promotions
                        {selectedCollegeName && (
                            <span className="text-xs font-black text-ncc-gold bg-ncc-gold/10 px-3 py-1 rounded-lg uppercase tracking-wider">
                                {selectedCollegeName}
                            </span>
                        )}
                        <span className="text-sm font-normal text-gray-400 dark:text-white/80 bg-gray-100 dark:bg-white/10 px-2.5 py-0.5 rounded-full">
                            {filteredCadets.length} {filteredCadets.length === 1 ? 'Cadet' : 'Cadets'}
                        </span>
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm mt-1">Administrative control for unit appointments and hierarchy.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Search & List */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="space-y-3">
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/85" />
                                <input 
                                    type="text" 
                                    placeholder="Search cadet to promote..." 
                                    className="ncc-input pl-10"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <select 
                                className="ncc-input w-full sm:flex-1 text-xs font-bold"
                                value={filterRank}
                                onChange={e => setFilterRank(e.target.value)}
                            >
                                <option value="All">All Ranks</option>
                                {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                            </select>
                            <select 
                                className="ncc-input w-full sm:flex-1 text-xs font-bold"
                                value={filterDivision}
                                onChange={e => setFilterDivision(e.target.value)}
                            >
                                <option value="All">All Div.</option>
                                <option value="SD">SD</option>
                                <option value="SW">SW</option>
                            </select>
                            <select 
                                className="ncc-input w-full sm:flex-1 text-xs font-bold"
                                value={filterCertificate}
                                onChange={e => setFilterCertificate(e.target.value)}
                            >
                                <option value="All">All Certs</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                                <option value="C">C</option>
                            </select>
                        </div>
                    </div>

                    <div className="ncc-card overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto ncc-scrollbar">
                            {filteredCadets.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 dark:text-white/80 italic">No cadets found.</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#f5f0e8] dark:bg-[#0a1628] z-10 border-b border-[#ede8df] dark:border-white/10">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-ncc-navy dark:text-white">Cadet</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-ncc-navy dark:text-white">Current Rank</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-ncc-navy dark:text-white text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede8df] dark:divide-white/10">
                                        {filteredCadets.map(cadet => (
                                            <tr key={cadet.id} className={`hover:bg-[#f9f7f2] dark:hover:bg-white/5 transition-colors ${selectedCadet?.id === cadet.id ? 'bg-ncc-gold/5' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-ncc-navy dark:text-white text-sm">{cadet.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] text-gray-400 dark:text-white/85 font-mono italic">{cadet.enrollmentId}</p>
                                                        {(cadet.certificate || cadet.B) && (
                                                            <span className="text-[9px] font-bold text-ncc-gold px-1.5 py-0.5 bg-ncc-gold/10 rounded-sm uppercase">
                                                                {cadet.certificate || cadet.B}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ncc-navy/5 text-ncc-navy dark:text-white text-[10px] font-black tracking-widest border border-ncc-navy/10 uppercase">
                                                        {cadet.rank || 'CDT'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={() => setSelectedCadet(cadet)}
                                                        className="text-ncc-gold hover:text-ncc-navy dark:text-white transition p-2"
                                                    >
                                                        <Award className="w-5 h-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>

                {/* Promotion Form */}
                <div className="lg:col-span-5">
                    {selectedCadet ? (
                        <div className="ncc-card p-6 border-2 border-ncc-gold/30 sticky top-6 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-14 h-14 bg-ncc-navy text-ncc-gold rounded-2xl flex items-center justify-center text-xl font-bold border-2 border-ncc-gold shadow-lg">
                                    {selectedCadet.name[0]}
                                </div>
                                <div>
                                    <h3 className="font-display font-bold text-ncc-navy dark:text-white">{selectedCadet.name}</h3>
                                    <p className="text-xs text-gray-400 dark:text-white/80 font-mono">{selectedCadet.enrollmentId}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="ncc-label flex items-center gap-2">
                                        <TrendingUp className="w-4 h-4 text-ncc-gold" /> New Appointment
                                    </label>
                                    <select 
                                        className="ncc-input text-xs font-bold"
                                        value={newRank}
                                        onChange={e => setNewRank(e.target.value)}
                                    >
                                        <option value="">Select Rank...</option>
                                        {ranks.map(r => (
                                            <option key={r} value={r} disabled={r === selectedCadet.rank}>{r}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="ncc-label">Reason for Promotion/Change</label>
                                    <textarea 
                                        className="ncc-input h-24 text-xs font-semibold"
                                        placeholder="Enter reason or authority..."
                                        value={reason}
                                        onChange={e => setReason(e.target.value)}
                                    />
                                </div>

                                <button 
                                    onClick={handleRankUpdate}
                                    disabled={processing || !newRank}
                                    className="ncc-btn ncc-btn-success w-full py-4 font-black uppercase tracking-widest flex items-center justify-center gap-2"
                                >
                                    {processing ? 'Processing...' : (
                                        <>
                                            <Shield className="w-4 h-4" /> {isDelegatedCadet ? 'Submit for ANO Verification' : 'Confirm Promotion'}
                                        </>
                                    )}
                                </button>

                                <button 
                                    onClick={() => setSelectedCadet(null)}
                                    className="w-full text-center text-xs text-gray-400 dark:text-white/80 hover:text-gray-600 dark:text-white/80 underline font-bold"
                                >
                                    Cancel Selection
                                </button>
                            </div>

                            {/* Rank History Preview */}
                            {selectedCadet.rankHistory && selectedCadet.rankHistory.length > 0 && (
                                <div className="mt-8 pt-6 border-t border-[#ddd8cc] dark:border-white/10">
                                    <h4 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <Clock className="w-3.5 h-3.5" /> Promotion History
                                    </h4>
                                    <div className="space-y-3">
                                        {selectedCadet.rankHistory.slice().reverse().map((h, i) => (
                                            <div key={i} className="flex gap-3 text-xs">
                                                <div className="w-1.5 h-1.5 rounded-full bg-ncc-gold mt-1.5 flex-shrink-0" />
                                                <div>
                                                    <p className="font-bold text-ncc-navy dark:text-white uppercase tracking-tighter">
                                                        {h.rank} <span className="font-normal normal-case text-gray-400 dark:text-white/80 ml-2">— {formatDate(h.date)}</span>
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 dark:text-white/70 italic mt-0.5">{h.reason}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-3xl border-2 border-dashed border-[#ddd8cc] dark:border-white/10">
                            <div className="w-20 h-20 bg-[#ede8df] dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                                <Award className="w-10 h-10 text-gray-300 dark:text-gray-650" />
                            </div>
                            <h3 className="text-ncc-navy dark:text-white font-bold">Select a Cadet</h3>
                            <p className="text-gray-400 dark:text-white/75 text-sm max-w-xs mt-2">Choose a cadet from the roster to manage their appointments and view history.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
