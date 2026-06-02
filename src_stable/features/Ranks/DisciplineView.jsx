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
import { sendPushToUser } from '../../firebase/pushNotifications.js';

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
            sendPushToUser(
                selectedCadet.enrollmentId,
                pointType === 'merit' ? '⭐ Merit Points Updated' : '⚠️ Discipline Record Updated',
                `Your ${pointType} record has been updated to ${newAmount} points. Remark: ${remark || 'No remark'}`,
                'profile'
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
                    <div className="bg-white dark:bg-[#050b14] w-[500px] max-w-[95vw] relative rounded-b-2xl shadow-2xl overflow-hidden flex flex-col">
                        {/* Decorative glow */}
                        <div className={`absolute -top-32 -right-32 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none ${pointType === 'merit' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        <div className={`absolute -bottom-32 -left-32 w-64 h-64 rounded-full blur-[80px] opacity-20 pointer-events-none ${pointType === 'merit' ? 'bg-emerald-500' : 'bg-red-500'}`} />

                        <div className="p-8 relative z-10 flex-1 overflow-y-auto ncc-scrollbar">
                            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 p-2.5 bg-gray-50 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors group z-20">
                                <X className="w-5 h-5 text-gray-500 dark:text-white/60 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                            </button>
                            
                            <div className="mb-8 text-center pt-2">
                                <div className="inline-flex items-center justify-center mb-5 relative">
                                    <div className={`absolute inset-0 rounded-2xl blur-xl opacity-40 ${pointType === 'merit' ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
                                    <div className={`relative p-4 rounded-2xl shadow-lg border ${pointType === 'merit' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-red-500 border-red-400 text-white'}`}>
                                        {pointType === 'merit' ? <TrendingUp className="w-8 h-8" /> : <TrendingDown className="w-8 h-8" />}
                                    </div>
                                </div>
                                <h3 className="text-3xl font-display font-bold text-ncc-navy dark:text-white tracking-tight mb-2">
                                    Update {pointType === 'merit' ? 'Merit' : 'Discipline'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-white/70">
                                    Updating record for <span className="font-bold text-ncc-navy dark:text-white px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 ml-1">{selectedCadet?.name}</span>
                                </p>
                            </div>

                            <form onSubmit={handleUpdate} className="space-y-6">
                                <div className="bg-gray-50 dark:bg-[#0a1628] p-5 rounded-2xl border border-gray-200 dark:border-white/10">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest flex items-center gap-2">
                                            {pointType === 'merit' ? <Trophy className="w-3.5 h-3.5 text-emerald-500"/> : <AlertTriangle className="w-3.5 h-3.5 text-red-500"/>}
                                            New Total Points
                                        </label>
                                        <span className="text-[10px] text-gray-500 dark:text-white/50 uppercase tracking-widest font-bold">
                                            Previous: {pointType === 'merit' ? (selectedCadet?.meritPoints || 0) : (selectedCadet?.demeritPoints || 0)} pts
                                        </span>
                                    </div>
                                    <input 
                                        type="number" required
                                        className="w-full bg-white dark:bg-[#050b14] border-2 border-gray-200 dark:border-white/10 focus:border-ncc-gold dark:focus:border-ncc-gold rounded-xl px-5 py-4 text-3xl font-black text-ncc-navy dark:text-white transition-colors focus:outline-none text-center shadow-inner"
                                        value={newAmount}
                                        onChange={e => setNewAmount(parseInt(e.target.value))}
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black text-ncc-navy dark:text-white/70 uppercase tracking-widest mb-2 pl-1">Reason / Remark</label>
                                    <textarea 
                                        required
                                        className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 focus:border-ncc-gold dark:focus:border-ncc-gold rounded-xl px-4 py-3 text-sm text-ncc-navy dark:text-white transition-colors focus:outline-none min-h-[100px] resize-none"
                                        placeholder={pointType === 'merit' ? "e.g. Exceptional performance in Republic Day Parade..." : "e.g. Absent for mandatory parade without leave..."}
                                        value={remark}
                                        onChange={e => setRemark(e.target.value)}
                                    />
                                </div>

                                <button 
                                    type="submit"
                                    disabled={updating}
                                    className={`w-full group relative flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-black uppercase tracking-widest text-white overflow-hidden transition-all shadow-xl hover:shadow-2xl ${
                                        pointType === 'merit' 
                                            ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20' 
                                            : 'bg-red-600 hover:bg-red-500 shadow-red-500/20'
                                    }`}
                                >
                                    <div className="absolute inset-0 w-full h-full bg-white/20 scale-x-0 group-hover:scale-x-100 origin-left transition-transform duration-300 ease-out" />
                                    {updating ? (
                                        <><Loader className="animate-spin w-5 h-5 relative z-10" /> <span className="relative z-10">Authenticating...</span></>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-5 h-5 relative z-10" /> 
                                            <span className="relative z-10">Authenticate Update</span>
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                </ModalOverlay>
            )}

            {/* History Modal */}
            {viewHistoryCadet && (
                <ModalOverlay onClose={() => setViewHistoryCadet(null)}>
                    <div className="bg-white dark:bg-[#050b14] w-[600px] max-w-[95vw] relative max-h-[85vh] flex flex-col rounded-b-2xl shadow-2xl overflow-hidden">
                        <button onClick={() => setViewHistoryCadet(null)} className="absolute top-4 right-4 p-2.5 bg-gray-50 hover:bg-gray-200 dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors group z-20">
                            <X className="w-5 h-5 text-gray-500 dark:text-white/60 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                        </button>

                        <div className="p-8 pb-4 flex-shrink-0 text-center relative z-10 border-b border-gray-100 dark:border-white/5">
                            <h3 className="text-3xl font-display font-bold text-ncc-navy dark:text-white tracking-tight mb-1">Performance Audit Log</h3>
                            <p className="text-sm text-gray-500 dark:text-white/70">Historical trail for <span className="font-bold text-ncc-navy dark:text-white px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 ml-1">{viewHistoryCadet.name}</span></p>
                        </div>

                        <div className="overflow-y-auto p-8 pt-6 ncc-scrollbar flex-1">
                            {(!viewHistoryCadet.pointHistory || viewHistoryCadet.pointHistory.length === 0) ? (
                                <div className="py-20 text-center flex flex-col items-center">
                                    <History className="w-12 h-12 text-gray-200 dark:text-white/10 mb-4" />
                                    <p className="text-gray-400 dark:text-white/60 italic font-medium">No historical logs found for this cadet.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {viewHistoryCadet.pointHistory.slice().reverse().map((log, i) => (
                                        <div key={i} className="bg-gray-50 dark:bg-[#0a1628] p-5 rounded-2xl border border-gray-100 dark:border-white/5 relative group hover:border-ncc-gold/50 transition-colors">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex items-center gap-3">
                                                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest shadow-sm ${log.type === 'merit' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                        {log.type}
                                                    </span>
                                                    <span className="text-xs font-bold text-gray-400 dark:text-white/60 flex items-center gap-1.5">
                                                        <History className="w-3.5 h-3.5" />
                                                        {formatDate(log.date)}
                                                    </span>
                                                </div>
                                                <span className={`text-xl font-black ${log.type === 'merit' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {log.type === 'merit' ? '+' : '-'}{log.amount} <span className="text-[10px] uppercase tracking-widest opacity-50">Pts</span>
                                                </span>
                                            </div>
                                            <p className="text-sm text-ncc-navy dark:text-white/90 font-medium leading-relaxed bg-white dark:bg-[#050b14] p-3 rounded-xl border border-gray-100 dark:border-white/5">"{log.reason}"</p>
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
