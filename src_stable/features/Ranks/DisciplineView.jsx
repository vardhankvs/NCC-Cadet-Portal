// src/features/Ranks/DisciplineView.jsx
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { 
    Trophy, AlertTriangle, Search, TrendingUp, TrendingDown, 
    Star, Award, Shield, Loader, X, CheckCircle, Info, History
} from '../../components/Icons.jsx';
import { updateCadetPoints } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

export const DisciplineView = () => {
    const { cadets, loading } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [viewHistoryCadet, setViewHistoryCadet] = useState(null);

    // Form state
    const [updating, setUpdating] = useState(false);
    const [pointType, setPointType] = useState('merit');
    const [newAmount, setNewAmount] = useState(0);
    const [remark, setRemark] = useState('');

    const filteredCadets = useMemo(() => {
        return cadets.filter(c => c.status !== 'alumni' && (
            c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            c.enrollmentId.toLowerCase().includes(searchTerm.toLowerCase())
        ));
    }, [cadets, searchTerm]);

    const leaderboard = useMemo(() => {
        return cadets.filter(c => c.status !== 'alumni')
            .sort((a, b) => (b.meritPoints || 0) - (a.meritPoints || 0))
            .slice(0, 5);
    }, [cadets]);

    const openEditModal = (cadet, type) => {
        setSelectedCadet(cadet);
        setPointType(type);
        setNewAmount(type === 'merit' ? (cadet.meritPoints || 0) : (cadet.demeritPoints || 0));
        setRemark('');
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        setUpdating(true);
        try {
            await updateCadetPoints(selectedCadet.id, pointType, newAmount, remark);
            toast.success(`${pointType === 'merit' ? 'Merit' : 'Discipline'} updated!`);
            sendPushToAll(
                pointType === 'merit' ? '⭐ Merit Points Updated' : '⚠️ Discipline Record Updated',
                `${selectedCadet.name}'s ${pointType} record has been updated`
            );
            setIsEditModalOpen(false);
        } catch (err) {
            toast.error("Update failed.");
        } finally {
            setUpdating(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 fade-in">
            {/* Left: Leaderboard & Stats */}
            <div className="lg:col-span-4 space-y-6">
                <div className="ncc-card p-6 bg-ncc-navy border-none shadow-2xl relative overflow-hidden">
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-ncc-gold/10 rounded-full blur-3xl" />
                    <h3 className="text-white font-display font-bold text-xl mb-6 relative flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-ncc-gold" /> Unit Leaderboard
                    </h3>
                    
                    <div className="space-y-4 relative">
                        {leaderboard.map((cadet, i) => (
                            <div key={cadet.id} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all cursor-default group">
                                <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black ${i === 0 ? 'bg-ncc-gold text-ncc-navy' : 'bg-white/10 text-white/40'}`}>
                                        {i + 1}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white group-hover:text-ncc-gold transition-colors">{cadet.name}</p>
                                        <p className="text-[9px] text-white/40 font-mono tracking-tighter uppercase">{cadet.rank || 'CDT'} • {cadet.enrollmentId}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm font-black text-ncc-gold">{cadet.meritPoints || 0}</p>
                                    <p className="text-[8px] text-white/40 uppercase tracking-widest">Points</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="ncc-card p-6 bg-white dark:bg-[#050b14] border-[#ddd8cc]">
                    <h4 className="text-ncc-navy dark:text-white font-bold text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info className="w-4 h-4 text-ncc-gold" /> Grading Matrix
                    </h4>
                    <div className="space-y-4">
                        {[
                            { label: 'Exemplary', min: 100, desc: 'Eligible for Unit SUO/JUO', color: 'bg-emerald-50 text-emerald-700' },
                            { label: 'Superior', min: 70, desc: 'Eligible for SGT/CQMS', color: 'bg-blue-50 text-blue-700' },
                            { label: 'Standard', min: 30, desc: 'Satisfactory Performance', color: 'bg-gray-50 dark:bg-[#0a1628] text-gray-700 dark:text-white/90' },
                            { label: 'Deficient', min: 0, desc: 'Review Required', color: 'bg-red-50 text-red-700' }
                        ].map((s, i) => (
                            <div key={i} className={`p-3 rounded-xl ${s.color}`}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                                    <span className="text-xs font-bold">{s.min}+ Pts</span>
                                </div>
                                <p className="text-[10px] opacity-70 italic">{s.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Management Table */}
            <div className="lg:col-span-8 space-y-6">
                <header className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Merit & Discipline Registry</h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm">Official performance and conduct tracking for 14(A) BN.</p>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/80" />
                        <input 
                            type="text" 
                            placeholder="Search by ID or Name..." 
                            className="ncc-input pl-10 text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </header>

                <div className="ncc-card overflow-hidden">
                    <div className="overflow-x-auto ncc-scrollbar">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white text-[10px] font-black uppercase tracking-widest border-b-2 border-ncc-navy/10 sticky top-0 z-10">
                                    <th className="px-6 py-6 text-left">Nominal Roll Details</th>
                                    <th className="px-6 py-6 text-center">Merit Registry</th>
                                    <th className="px-6 py-6 text-center">Demerit Log</th>
                                    <th className="px-6 py-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#ede8df]">
                                {filteredCadets.map(cadet => (
                                    <tr key={cadet.id} className="hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-[#0a1628]/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-ncc-navy text-ncc-gold rounded-xl flex items-center justify-center font-bold text-xs ring-2 ring-ncc-navy/5">
                                                    {cadet.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-ncc-navy dark:text-white">{cadet.name}</p>
                                                    <p className="text-[10px] text-gray-400 dark:text-white/80 font-mono uppercase tracking-tighter">{cadet.rank || 'CDT'} • {cadet.enrollmentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-lg font-black text-emerald-600 leading-none">{cadet.meritPoints || 0}</span>
                                                <span className="text-[8px] font-bold text-emerald-600/50 uppercase mt-1">Certified</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex flex-col items-center">
                                                <span className="text-lg font-black text-ncc-red leading-none">{cadet.demeritPoints || 0}</span>
                                                <span className="text-[8px] font-bold text-ncc-red/50 uppercase mt-1">Warnings</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex justify-end gap-1.5">
                                                <button 
                                                    onClick={() => setViewHistoryCadet(cadet)}
                                                    className="p-2 text-ncc-navy dark:text-white hover:bg-ncc-navy/5 rounded-xl transition"
                                                    title="View Log"
                                                >
                                                    <History className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => openEditModal(cadet, 'merit')}
                                                    className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-xl transition"
                                                    title="Award Merit"
                                                >
                                                    <TrendingUp className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => openEditModal(cadet, 'demerit')}
                                                    className="p-2 text-ncc-red hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition"
                                                    title="Issue Demerit"
                                                >
                                                    <TrendingDown className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Points Modal */}
            {isEditModalOpen && (
                <ModalOverlay onClose={() => setIsEditModalOpen(false)}>
                    <div className="p-8 w-[500px] max-w-[90vw] relative">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-0 right-0 p-2 hover:bg-gray-100 dark:bg-[#0d2137] rounded-full transition">
                            <X className="w-5 h-5 text-gray-400 dark:text-white/80" />
                        </button>
                        {/* Content stays here, bg-white dark:bg-[#050b14] provided by Overlay */}
                        <div className="mb-8 text-center">
                            <div className="flex flex-col items-center gap-3 mb-2">
                                <div className={`p-3 rounded-2xl ${pointType === 'merit' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-ncc-red'}`}>
                                    {pointType === 'merit' ? <TrendingUp className="w-6 h-6" /> : <TrendingDown className="w-6 h-6" />}
                                </div>
                                <h3 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Update {pointType === 'merit' ? 'Merit' : 'Discipline'}</h3>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-white/70">Updating record for <span className="font-bold text-ncc-navy dark:text-white">{selectedCadet?.name}</span></p>
                        </div>

                        <form onSubmit={handleUpdate} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">New Total Points</label>
                                <input 
                                    type="number" required
                                    className="ncc-input text-lg font-bold"
                                    value={newAmount}
                                    onChange={e => setNewAmount(parseInt(e.target.value))}
                                />
                                <p className="text-[10px] text-gray-400 dark:text-white/80 mt-2 italic">Previous: {pointType === 'merit' ? (selectedCadet?.meritPoints || 0) : (selectedCadet?.demeritPoints || 0)} pts</p>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Reason / Remark</label>
                                <textarea 
                                    required
                                    className="ncc-input text-sm min-h-[100px] py-3"
                                    placeholder="e.g. Exceptional performance in Republic Day Parade"
                                    value={remark}
                                    onChange={e => setRemark(e.target.value)}
                                />
                            </div>

                            <button 
                                type="submit"
                                disabled={updating}
                                className={`w-full ncc-btn justify-center py-4 text-sm shadow-xl font-black uppercase tracking-widest ${pointType === 'merit' ? 'ncc-btn-primary' : 'bg-ncc-red text-white hover:bg-red-700'}`}
                            >
                                {updating ? <><Loader className="animate-spin w-4 h-4 mr-2" /> Saving...</> : 'Authenticate Update'}
                            </button>
                        </form>
                    </div>
                </ModalOverlay>
            )}

            {/* History Modal */}
            {viewHistoryCadet && (
                <ModalOverlay onClose={() => setViewHistoryCadet(null)}>
                    <div className="p-8 w-[600px] max-w-[90vw] relative max-h-[80vh] flex flex-col">
                        <button onClick={() => setViewHistoryCadet(null)} className="absolute top-0 right-0 p-2 hover:bg-gray-100 dark:bg-[#0d2137] rounded-full transition">
                            <X className="w-5 h-5 text-gray-400 dark:text-white/80" />
                        </button>

                        <div className="mb-8 flex-shrink-0 text-center">
                            <h3 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Performance Audit Log</h3>
                            <p className="text-sm text-gray-500 dark:text-white/70">Historical trail for <span className="font-bold text-ncc-navy dark:text-white">{viewHistoryCadet.name}</span></p>
                        </div>

                        <div className="overflow-y-auto pr-2 ncc-scrollbar flex-1">
                            {(!viewHistoryCadet.pointHistory || viewHistoryCadet.pointHistory.length === 0) ? (
                                <div className="py-20 text-center text-gray-400 dark:text-white/80 italic">No historical logs found for this cadet.</div>
                            ) : (
                                <div className="space-y-4">
                                    {viewHistoryCadet.pointHistory.slice().reverse().map((log, i) => (
                                        <div key={i} className="bg-gray-50 dark:bg-[#0a1628] p-4 rounded-2xl border border-gray-100 dark:border-white/5 relative group">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${log.type === 'merit' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                                        {log.type}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-white/80">{formatDate(log.date)}</span>
                                                </div>
                                                <span className="text-sm font-black text-ncc-navy dark:text-white">{log.amount} Pts</span>
                                            </div>
                                            <p className="text-xs text-ncc-navy dark:text-white/80 font-medium leading-relaxed italic">"{log.reason}"</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
};
