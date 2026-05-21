// src/features/Ranks/RankManagementView.jsx
import React, { useState } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { Search, Award, TrendingUp, Filter, UserCheck, Shield, Clock } from '../../components/Icons.jsx';
import { updateCadetRank } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const RankManagementView = () => {
    const { cadets, loading } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRank, setFilterRank] = useState('All');
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [newRank, setNewRank] = useState('');
    const [reason, setReason] = useState('Merit-based promotion');
    const [processing, setProcessing] = useState(false);

    const ranks = ['CDT', 'LCPL', 'CPL', 'SGT', 'CQMS', 'C-SGT', 'JUO', 'SUO'];

    const filteredCadets = cadets.filter(c => {
        if (c.status === 'alumni') return false;
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.enrollmentId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRank = filterRank === 'All' || (c.rank || 'CDT') === filterRank;
        return matchesSearch && matchesRank;
    });

    const handleRankUpdate = async () => {
        if (!selectedCadet || !newRank) return;
        setProcessing(true);
        try {
            await updateCadetRank(selectedCadet.id, newRank, reason);
            toast.success(`${selectedCadet.name} promoted to ${newRank}`);
            sendPushToAll('⭐ Rank Update', `${selectedCadet.name} has been promoted to ${newRank}`);
            setSelectedCadet(null);
            setNewRank('');
            setReason('Merit-based promotion');
        } catch (err) {
            toast.error("Promotion failed: " + err.message);
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="space-y-6 fade-in">
            <header className="flex justify-between items-center bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Rank & Promotions</h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm">Administrative control for unit appointments and hierarchy.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Search & List */}
                <div className="lg:col-span-7 space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/80" />
                            <input 
                                type="text" 
                                placeholder="Search cadet to promote..." 
                                className="ncc-input pl-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="ncc-input w-full sm:w-40"
                            value={filterRank}
                            onChange={e => setFilterRank(e.target.value)}
                        >
                            <option value="All">All Ranks</option>
                            {ranks.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>

                    <div className="ncc-card overflow-hidden">
                        <div className="max-h-[600px] overflow-y-auto ncc-scrollbar">
                            {filteredCadets.length === 0 ? (
                                <div className="p-12 text-center text-gray-400 dark:text-white/80 italic">No cadets found.</div>
                            ) : (
                                <table className="w-full text-left border-collapse">
                                    <thead className="sticky top-0 bg-[#f5f0e8] dark:bg-[#0a1628] z-10">
                                        <tr>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-ncc-navy dark:text-white">Cadet</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-ncc-navy dark:text-white">Current Rank</th>
                                            <th className="px-6 py-3 text-[10px] font-black uppercase text-ncc-navy dark:text-white text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#ede8df]">
                                        {filteredCadets.map(cadet => (
                                            <tr key={cadet.id} className={`hover:bg-[#f9f7f2] dark:hover:bg-white/5 transition-colors ${selectedCadet?.id === cadet.id ? 'bg-ncc-gold/5' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-ncc-navy dark:text-white text-sm">{cadet.name}</p>
                                                    <p className="text-[10px] text-gray-400 dark:text-white/80 font-mono italic">{cadet.enrollmentId}</p>
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
                                        className="ncc-input"
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
                                        className="ncc-input h-24"
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
                                            <Shield className="w-4 h-4" /> Confirm Promotion
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
                                <div className="mt-8 pt-6 border-t border-[#ddd8cc]">
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
                        <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-3xl border-2 border-dashed border-[#ddd8cc]">
                            <div className="w-20 h-20 bg-[#ede8df] rounded-full flex items-center justify-center mb-4">
                                <Award className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-ncc-navy dark:text-white font-bold">Select a Cadet</h3>
                            <p className="text-gray-400 dark:text-white/80 text-sm max-w-xs mt-2">Choose a cadet from the roster to manage their appointments and view history.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
