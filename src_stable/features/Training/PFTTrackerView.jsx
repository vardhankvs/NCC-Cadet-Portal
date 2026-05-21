
import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { submitPFTScores } from '../../firebase/firestoreService.js';
import { Activity, Award, TrendingUp, Clock, User, BarChart2, CheckCircle, AlertCircle, Search } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';

export const PFTTrackerView = () => {
    const { user, userRole, userEnrollmentId, userName } = useAuthContext();
    const { cadets = [] } = useDataContext();
    const isAdmin = userRole === 'admin' || userRole === 'officer';

    const currentCadet = cadets.find(c => c.enrollmentId === userEnrollmentId);
    const [loading, setLoading] = useState(false);
    const [scores, setScores] = useState({
        runTime: '',
        pushups: '',
        situps: '',
        chinUps: '',
        shuttle: ''
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedCertificate, setSelectedCertificate] = useState('All');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await submitPFTScores(currentCadet.id, scores);
            toast.success("PFT Scores logged successfully!");
            setScores({ runTime: '', pushups: '', situps: '', chinUps: '', shuttle: '' });
        } catch (err) {
            toast.error("Failed to log scores");
        } finally {
            setLoading(false);
        }
    };

    const filteredRosterCadets = useMemo(() => {
        let list = cadets;
        if (selectedCertificate !== 'All') {
            list = list.filter((c) => {
                const rawCert = c.certificate || c.B || '';
                const cadetCert = typeof rawCert === 'string' ? rawCert.trim().toUpperCase() : String(rawCert);
                return cadetCert === selectedCertificate.toUpperCase();
            });
        }
        if (selectedCategory !== 'All') {
            list = list.filter((c) => (c.enrollmentId || c.regimentalNumber || '').toUpperCase().includes(selectedCategory));
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter((c) => c.name?.toLowerCase().includes(q) || (c.enrollmentId || c.regimentalNumber || '').toLowerCase().includes(q));
        }
        return list;
    }, [cadets, selectedCertificate, selectedCategory, searchTerm]);

    if (isAdmin) {
        return (
            <div className="space-y-6 fade-in">
                <header className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-ncc-navy/5 shadow-sm">
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-2">Unit Physical Fitness Index</h2>
                    <p className="text-gray-500 dark:text-white/70">Monitoring tactical physical readiness and performance benchmarks.</p>
                </header>

                <div className="flex flex-wrap gap-2">
                    <div className="ncc-filter-group">
                        {['All', 'SD', 'SW'].map((cat) => (
                            <button key={cat} onClick={() => setSelectedCategory(cat)} className={`ncc-filter-btn ${selectedCategory === cat ? 'active' : ''}`}>
                                {cat === 'All' ? 'All Div.' : cat}
                            </button>
                        ))}
                    </div>
                    <div className="ncc-filter-group">
                        {['All', 'B1', 'B2', 'C'].map((cert) => (
                            <button key={cert} onClick={() => setSelectedCertificate(cert)} className={`ncc-filter-btn ${selectedCertificate === cert ? 'active' : ''}`}>
                                {cert === 'All' ? 'All Certs' : cert}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1" />
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/80" />
                        <input type="text" placeholder="Search name, reg. no..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)} className="ncc-input pl-9 text-xs" />
                    </div>
                </div>

                {/* --- Dynamic Stats Computed from Records --- */}
                {(() => {
                    const cadetsWithPFT = filteredRosterCadets.filter(c => c.pftHistory?.length > 0);

                    // Average 1.6KM run time
                    const runTimes = cadetsWithPFT
                        .map(c => c.pftHistory[c.pftHistory.length - 1]?.runTime)
                        .filter(Boolean)
                        .map(t => {
                            const parts = t.split(':');
                            return parseInt(parts[0]) * 60 + parseInt(parts[1] || 0);
                        })
                        .filter(s => !isNaN(s));
                    const avgRunSecs = runTimes.length > 0 ? Math.round(runTimes.reduce((a, b) => a + b, 0) / runTimes.length) : null;
                    const avgRun = avgRunSecs !== null
                        ? `${String(Math.floor(avgRunSecs / 60)).padStart(2, '0')}:${String(avgRunSecs % 60).padStart(2, '0')}`
                        : 'N/A';

                    // Top pushups (highest single entry)
                    const allPushups = cadetsWithPFT.flatMap(c => c.pftHistory.map(h => parseInt(h.pushups) || 0));
                    const topPushups = allPushups.length > 0 ? Math.max(...allPushups) : 0;
                    const avgPushups = allPushups.length > 0 ? Math.round(allPushups.reduce((a, b) => a + b, 0) / allPushups.length) : 0;

                    // Pass percentage (cadets who have logged PFT / total filtered cadets)
                    const passPercent = filteredRosterCadets.length > 0 ? Math.round((cadetsWithPFT.length / filteredRosterCadets.length) * 100) : 0;

                    return (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="ncc-card p-6 bg-ncc-navy text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-ncc-gold mb-1">Average 1.6KM Run</p>
                                    <p className="text-3xl font-display font-bold">{avgRun} <span className="text-xs font-sans font-normal opacity-60">mins</span></p>
                                    <p className="text-[10px] text-white/40 mt-1 uppercase">{runTimes.length} cadets logged</p>
                                </div>
                                <Activity className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5" />
                            </div>
                            <div className="ncc-card p-6 bg-ncc-gold text-ncc-navy dark:text-white relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Top Pushups Reps</p>
                                    <p className="text-3xl font-display font-bold">{topPushups} <span className="text-xs font-sans font-normal opacity-60">max</span></p>
                                    <p className="text-[10px] opacity-50 mt-1 uppercase">Avg: {avgPushups} reps</p>
                                </div>
                                <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-ncc-navy dark:text-white/5" />
                            </div>
                            <div className="ncc-card p-6 bg-white dark:bg-[#050b14] border border-ncc-navy/5 relative overflow-hidden">
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white/30 mb-1">Pass Percentage</p>
                                    <p className="text-3xl font-display font-bold text-ncc-navy dark:text-white">{passPercent}%</p>
                                    <p className="text-[10px] text-gray-400 dark:text-white/80 mt-1 uppercase">{cadetsWithPFT.length} of {filteredRosterCadets.length} cadets</p>
                                </div>
                                <CheckCircle className="absolute -right-4 -bottom-4 w-24 h-24 text-ncc-navy dark:text-white/[0.03]" />
                            </div>
                        </div>
                    );
                })()}

                <div className="bg-white dark:bg-[#050b14] rounded-[2rem] border border-ncc-navy/5 shadow-xl overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-ncc-navy text-white">
                            <tr>
                                <th className="px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Cadet</th>
                                <th className="px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Run (1.6K)</th>
                                <th className="px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Pushups</th>
                                <th className="px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Situps</th>
                                <th className="px-6 py-4 font-display font-bold uppercase tracking-widest text-[10px]">Latest Log</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-ncc-navy/5">
                            {filteredRosterCadets.filter(c => c.pftHistory?.length > 0).map(cadet => {
                                const latest = cadet.pftHistory[cadet.pftHistory.length - 1];
                                return (
                                    <tr key={cadet.id} className="hover:bg-ncc-navy/[0.02] transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-ncc-navy dark:text-white">{cadet.name}</div>
                                            <div className="text-[10px] text-ncc-gold font-black uppercase tracking-widest">{cadet.enrollmentId}</div>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-gray-500 dark:text-white/70">{latest.runTime || '-'}</td>
                                        <td className="px-6 py-4 font-mono text-gray-500 dark:text-white/70">{latest.pushups || '-'}</td>
                                        <td className="px-6 py-4 font-mono text-gray-500 dark:text-white/70">{latest.situps || '-'}</td>
                                        <td className="px-6 py-4 text-[10px] text-gray-400 dark:text-white/80 font-bold uppercase">{formatDate(latest.timestamp)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-8 fade-in">
            <header className="text-center space-y-4">
                <div className="w-16 h-16 bg-ncc-navy rounded-2xl flex items-center justify-center mx-auto shadow-2xl shadow-ncc-navy/20">
                    <Activity className="w-8 h-8 text-ncc-gold" />
                </div>
                <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white">My Fitness Hub</h2>
                <p className="text-gray-500 dark:text-white/70">Track your PFT performance and strive for excellence in physical training.</p>
            </header>

            <form onSubmit={handleSubmit} className="ncc-card p-10 space-y-8">
                <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">1.6 KM Run (MM:SS)</label>
                        <input 
                            type="text" 
                            placeholder="06:30"
                            value={scores.runTime}
                            onChange={(e) => setScores({...scores, runTime: e.target.value})}
                            className="w-full bg-ncc-navy/5 border-2 border-transparent focus:border-ncc-gold/30 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Pushups (Reps)</label>
                        <input 
                            type="number" 
                            placeholder="45"
                            value={scores.pushups}
                            onChange={(e) => setScores({...scores, pushups: e.target.value})}
                            className="w-full bg-ncc-navy/5 border-2 border-transparent focus:border-ncc-gold/30 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Situps (Reps)</label>
                        <input 
                            type="number" 
                            placeholder="50"
                            value={scores.situps}
                            onChange={(e) => setScores({...scores, situps: e.target.value})}
                            className="w-full bg-ncc-navy/5 border-2 border-transparent focus:border-ncc-gold/30 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Chin-ups (Reps)</label>
                        <input 
                            type="number" 
                            placeholder="12"
                            value={scores.chinUps}
                            onChange={(e) => setScores({...scores, chinUps: e.target.value})}
                            className="w-full bg-ncc-navy/5 border-2 border-transparent focus:border-ncc-gold/30 rounded-xl px-4 py-3 text-sm font-bold outline-none transition-all"
                        />
                    </div>
                </div>

                <button 
                    type="submit"
                    disabled={loading}
                    className="w-full ncc-btn ncc-btn-primary justify-center py-4 text-sm font-black uppercase tracking-widest shadow-xl shadow-ncc-navy/20 group"
                >
                    {loading ? 'Logging Performance...' : 'Submit PFT Scores'}
                    <TrendingUp className="w-4 h-4 ml-2 group-hover:translate-y-[-2px] group-hover:translate-x-[2px] transition-transform" />
                </button>
            </form>

            {currentCadet?.pftHistory?.length > 0 && (
                <div className="ncc-card p-8">
                    <h3 className="text-xs font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-ncc-gold" /> Performance History
                    </h3>
                    <div className="space-y-4">
                        {[...currentCadet.pftHistory].reverse().map((log, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 rounded-xl bg-ncc-navy/5 border border-ncc-navy/5">
                                <div className="grid grid-cols-3 gap-8">
                                    <div>
                                        <p className="text-[9px] font-black text-ncc-navy dark:text-white/30 uppercase mb-0.5">Run</p>
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">{log.runTime}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-ncc-navy dark:text-white/30 uppercase mb-0.5">Pushups</p>
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">{log.pushups}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-ncc-navy dark:text-white/30 uppercase mb-0.5">Situps</p>
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">{log.situps}</p>
                                    </div>
                                </div>
                                <span className="text-[9px] font-bold text-gray-400 dark:text-white/80 uppercase">{formatDate(log.timestamp)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
