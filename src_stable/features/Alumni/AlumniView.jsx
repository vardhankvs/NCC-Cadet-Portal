// src/features/Alumni/AlumniView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { Search, Filter, UserCheck, GraduationCap, Users, ShieldCheck, Mail, Phone, Award, Star, X } from '../../components/Icons.jsx';
import { transitionCadetsToAlumni, getCollectionRef, toggleMentorStatus, toggleHallOfFame, deleteMultipleCadets } from '../../firebase/firestoreService.js';
import { onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';

export const AlumniView = () => {
    const { cadets, loading, alumni } = useDataContext();
    const { userRole } = useAuthContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [filterYear, setFilterYear] = useState('All');
    const [showTransitionTool, setShowTransitionTool] = useState(false);
    const [activeTab, setActiveTab] = useState('directory');
    const [selectedForTransition, setSelectedForTransition] = useState([]);
    const [selectedForDeletion, setSelectedForDeletion] = useState([]);
    const [careerNotices, setCareerNotices] = useState([]);
    const [showMentorshipModal, setShowMentorshipModal] = useState(false);
    const [mentorshipStep, setMentorshipStep] = useState(1); // 1: Info, 2: Success
    const [hallOfFameModal, setHallOfFameModal] = useState(null);

    const [transitionSearchTerm, setTransitionSearchTerm] = useState('');
    const [transitionDivisionFilter, setTransitionDivisionFilter] = useState('All');
    const [transitionCertificateFilter, setTransitionCertificateFilter] = useState('All');

    const activeCadets = cadets;

    const filteredActiveCadets = useMemo(() => {
        return activeCadets.filter(c => {
            const matchesSearch = c.name.toLowerCase().includes(transitionSearchTerm.toLowerCase()) || 
                                  c.enrollmentId.toLowerCase().includes(transitionSearchTerm.toLowerCase());
            const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const matchesDiv = transitionDivisionFilter === 'All' || reg.includes(transitionDivisionFilter);
            const cert = c.currentCertificate || c.certificate;
            const matchesCert = transitionCertificateFilter === 'All' || cert === transitionCertificateFilter;
            return matchesSearch && matchesDiv && matchesCert;
        });
    }, [activeCadets, transitionSearchTerm, transitionDivisionFilter, transitionCertificateFilter]);

    const filteredAlumni = alumni.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             c.enrollmentId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesYear = filterYear === 'All' || c.year === filterYear;
        return matchesSearch && matchesYear;
    });

    const hallOfFameAlumni = useMemo(() => alumni.filter(c => c.isHallOfFame), [alumni]);

    const years = useMemo(() => {
        const y = new Set(alumni.map(a => a.year).filter(Boolean));
        return ['All', ...Array.from(y).sort()];
    }, [alumni]);

    useEffect(() => {
        const ref = getCollectionRef('career_notices');
        if (!ref) return;
        const q = query(ref, orderBy('updatedAt', 'desc'), limit(3));
        const unsubscribe = onSnapshot(q, (snap) => {
            setCareerNotices(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return unsubscribe;
    }, []);

    const handleTransition = async () => {
        if (selectedForTransition.length === 0) return;
        if (!window.confirm(`Are you sure you want to transition ${selectedForTransition.length} cadets to Alumni status? This will move them out of active duty.`)) return;

        try {
            await transitionCadetsToAlumni(selectedForTransition);
            toast.success("Cadets transitioned to Alumni successfully.");
            setSelectedForTransition([]);
            setShowTransitionTool(false);
        } catch (err) {
            toast.error("Transition failed: " + err.message);
        }
    };

    const toggleSelection = (id) => {
        setSelectedForTransition(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleToggleMentor = async (id, currentStatus) => {
        try {
            await toggleMentorStatus(id, currentStatus);
            toast.success(currentStatus ? "Mentor removed." : "Alumni promoted to Mentor!");
        } catch (err) {
            toast.error("Failed to update status.");
        }
    };

    const handleToggleHallOfFame = async (e) => {
        e.preventDefault();
        const { id, isHallOfFame, achievement, organization, description } = hallOfFameModal;
        try {
            await toggleHallOfFame(id, !isHallOfFame, isHallOfFame ? null : { achievement, organization, description });
            toast.success(isHallOfFame ? "Removed from Hall of Fame" : "Added to Hall of Fame!");
            setHallOfFameModal(null);
        } catch (err) {
            toast.error("Failed to update Hall of Fame status.");
        }
    };

    const handleRemoveFromHallOfFame = async (id) => {
        if (!window.confirm("Remove this alumnus from the Hall of Fame?")) return;
        try {
            await toggleHallOfFame(id, false);
            toast.success("Removed from Hall of Fame");
        } catch (err) {
            toast.error("Failed to remove.");
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedForDeletion.length === 0) return;
        if (!window.confirm(`Are you sure you want to permanently delete ${selectedForDeletion.length} alumni? This action cannot be undone.`)) return;

        try {
            await deleteMultipleCadets(selectedForDeletion);
            toast.success(`${selectedForDeletion.length} alumni deleted successfully.`);
            setSelectedForDeletion([]);
        } catch (err) {
            toast.error("Failed to delete alumni: " + err.message);
        }
    };

    const toggleDeletionSelection = (id) => {
        setSelectedForDeletion(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-6 fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                        {activeTab === 'directory' ? <GraduationCap className="w-8 h-8 text-ncc-gold" /> : <Award className="w-8 h-8 text-ncc-gold" />}
                        {activeTab === 'directory' ? 'Alumni Directory' : 'Hall of Fame'}
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm">
                        {activeTab === 'directory' 
                            ? `A network of ${alumni.length} ex-cadets of 14(A) BN NCC.` 
                            : `Honoring ${hallOfFameAlumni.length} alumni who achieved excellence.`}
                    </p>
                </div>
                {userRole === 'admin' && activeTab === 'directory' && (
                    <button 
                        onClick={() => setShowTransitionTool(!showTransitionTool)}
                        className={`ncc-btn ${showTransitionTool ? 'ncc-btn-secondary' : 'ncc-btn-primary'} flex items-center gap-2`}
                    >
                        <UserCheck className="w-4 h-4" /> 
                        {showTransitionTool ? 'Back to Directory' : 'Graduate Batch'}
                    </button>
                )}
            </header>

            {!showTransitionTool && (
                <div className="flex border-b border-[#ddd8cc] dark:border-white/10 mb-6">
                    <button 
                        onClick={() => setActiveTab('directory')}
                        className={`pb-3 px-6 text-sm font-bold tracking-widest uppercase transition-all ${
                            activeTab === 'directory' ? 'border-b-2 border-ncc-gold text-ncc-gold' : 'text-gray-400 dark:text-white/60 hover:text-ncc-navy dark:hover:text-white'
                        }`}
                    >
                        Directory
                    </button>
                    <button 
                        onClick={() => setActiveTab('hallOfFame')}
                        className={`pb-3 px-6 text-sm font-bold tracking-widest uppercase transition-all flex items-center gap-2 ${
                            activeTab === 'hallOfFame' ? 'border-b-2 border-ncc-gold text-ncc-gold' : 'text-gray-400 dark:text-white/60 hover:text-ncc-navy dark:hover:text-white'
                        }`}
                    >
                        <Star className="w-4 h-4" /> Hall of Fame
                    </button>
                </div>
            )}

            {showTransitionTool ? (
                <div className="ncc-card p-6 animate-in slide-in-from-top-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                            <h3 className="font-bold text-ncc-navy dark:text-white uppercase tracking-widest text-xs">Graduate Batch Tool</h3>
                            <p className="text-xs text-gray-500 dark:text-white/70">Select active cadets to move to Alumni status.</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                            <div className="relative flex-1 sm:w-48 sm:flex-none">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search cadet..."
                                    className="ncc-input pl-10 text-xs w-full"
                                    value={transitionSearchTerm}
                                    onChange={e => setTransitionSearchTerm(e.target.value)}
                                />
                            </div>
                            <select 
                                className="ncc-input text-xs w-28"
                                value={transitionDivisionFilter}
                                onChange={e => setTransitionDivisionFilter(e.target.value)}
                            >
                                <option value="All">All Div.</option>
                                <option value="SD">SD</option>
                                <option value="SW">SW</option>
                            </select>
                            <select 
                                className="ncc-input text-xs w-28"
                                value={transitionCertificateFilter}
                                onChange={e => setTransitionCertificateFilter(e.target.value)}
                            >
                                <option value="All">All Cert.</option>
                                <option value="B1">B1</option>
                                <option value="B2">B2</option>
                                <option value="C">C</option>
                            </select>
                            <div className="flex gap-3 border-l border-gray-200 dark:border-white/10 pl-3">
                                <button 
                                    onClick={() => setSelectedForTransition(filteredActiveCadets.map(c => c.id))}
                                    className="text-xs text-ncc-gold font-bold hover:underline"
                                >
                                    Select All
                                </button>
                                <button 
                                    onClick={() => setSelectedForTransition([])}
                                    className="text-xs text-gray-400 dark:text-white/80 font-bold hover:underline"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-2 ncc-scrollbar">
                        {filteredActiveCadets.length === 0 ? (
                            <div className="col-span-full py-10 text-center text-gray-400 dark:text-white/60 italic text-sm">
                                No active cadets found matching the current filters.
                            </div>
                        ) : (
                            filteredActiveCadets.map(cadet => (
                            <label 
                                key={cadet.id} 
                                className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                    selectedForTransition.includes(cadet.id) 
                                    ? 'bg-ncc-gold/10 border-ncc-gold ring-2 ring-ncc-gold/20' 
                                    : 'bg-white dark:bg-[#050b14] border-[#ede8df] hover:border-ncc-gold/30'
                                }`}
                            >
                                <input 
                                    type="checkbox" 
                                    className="hidden"
                                    checked={selectedForTransition.includes(cadet.id)}
                                    onChange={() => toggleSelection(cadet.id)}
                                />
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                                    selectedForTransition.includes(cadet.id) ? 'bg-ncc-gold text-white' : 'bg-ncc-navy/5 text-ncc-navy dark:text-white'
                                }`}>
                                    {cadet.name[0]}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-ncc-navy dark:text-white truncate">{cadet.name}</p>
                                    <p className="text-[9px] text-gray-400 dark:text-white/80 font-mono italic">{cadet.enrollmentId}</p>
                                </div>
                            </label>
                        ))
                        )}
                    </div>

                    <div className="mt-8 pt-6 border-t border-[#ddd8cc] flex justify-end">
                        <button 
                            onClick={handleTransition}
                            disabled={selectedForTransition.length === 0}
                            className="ncc-btn ncc-btn-success px-8 flex items-center gap-2"
                        >
                            <ShieldCheck className="w-4 h-4" />
                            Transition {selectedForTransition.length} Cadets to Alumni
                        </button>
                    </div>
                </div>
            ) : activeTab === 'directory' ? (
                <>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/80" />
                            <input 
                                type="text" 
                                placeholder="Search by name or regimental number..." 
                                className="ncc-input pl-10"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select 
                            className="ncc-input w-full sm:w-48"
                            value={filterYear}
                            onChange={e => setFilterYear(e.target.value)}
                        >
                            {years.map(y => <option key={y} value={y}>{y === 'All' ? 'All Batches' : `Batch of ${y}`}</option>)}
                        </select>
                        {userRole === 'admin' && (
                            <div className="flex items-center gap-3 border-l border-[#ddd8cc] dark:border-white/10 pl-4 ml-2">
                                <button 
                                    onClick={() => setSelectedForDeletion(filteredAlumni.map(a => a.id))}
                                    className="text-xs text-ncc-gold font-bold hover:underline whitespace-nowrap"
                                >
                                    Select All
                                </button>
                                <button 
                                    onClick={() => setSelectedForDeletion([])}
                                    className="text-xs text-gray-400 dark:text-white/80 font-bold hover:underline whitespace-nowrap"
                                >
                                    Clear
                                </button>
                                {selectedForDeletion.length > 0 && (
                                    <button 
                                        onClick={handleDeleteSelected}
                                        className="text-xs text-red-500 font-bold hover:underline whitespace-nowrap bg-red-50 dark:bg-red-500/10 px-3 py-1.5 rounded-lg ml-2"
                                    >
                                        Delete ({selectedForDeletion.length})
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredAlumni.length === 0 ? (
                            <div className="col-span-full py-20 text-center text-gray-400 dark:text-white/80 italic bg-white dark:bg-[#050b14] rounded-3xl border-2 border-dashed border-[#ddd8cc]">
                                No alumni found matching your criteria.
                            </div>
                        ) : (
                            filteredAlumni.map(alumnus => (
                                <div key={alumnus.id} className="ncc-card p-5 group hover:border-ncc-gold transition-all relative">
                                    {userRole === 'admin' && (
                                        <div className="absolute top-4 right-4 z-10">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-gray-300 text-ncc-gold focus:ring-ncc-gold cursor-pointer"
                                                checked={selectedForDeletion.includes(alumnus.id)}
                                                onChange={() => toggleDeletionSelection(alumnus.id)}
                                            />
                                        </div>
                                    )}
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 bg-ncc-navy text-ncc-gold rounded-2xl flex items-center justify-center text-xl font-bold border border-ncc-gold/20 group-hover:border-ncc-gold shadow-sm transition-all">
                                            {alumnus.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <h4 className="font-display font-bold text-ncc-navy dark:text-white truncate group-hover:text-ncc-gold transition-colors">{alumnus.name}</h4>
                                            <p className="text-[10px] text-gray-400 dark:text-white/80 font-mono italic mb-2">{alumnus.enrollmentId}</p>
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ncc-navy/5 text-ncc-navy dark:text-white text-[9px] font-black tracking-widest uppercase">
                                                {alumnus.rank || 'CDT'} • BATCH OF {alumnus.year || 'N/A'}
                                            </span>
                                            {alumnus.isMentor && (
                                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ncc-gold/10 text-ncc-gold text-[9px] font-black tracking-widest uppercase border border-ncc-gold/20">
                                                    Mentor
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-[#ede8df] flex justify-between items-center">
                                        <div className="flex gap-2">
                                            {alumnus.personalEmail && (
                                                <a href={`mailto:${alumnus.personalEmail}`} className="p-2 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-lg text-ncc-navy dark:text-white hover:bg-ncc-navy hover:text-white transition-all">
                                                    <Mail className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                            {alumnus.phonePersonal && (
                                                <a href={`tel:${alumnus.phonePersonal}`} className="p-2 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-lg text-ncc-navy dark:text-white hover:bg-ncc-navy hover:text-white transition-all">
                                                    <Phone className="w-3.5 h-3.5" />
                                                </a>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            <button className="text-[10px] font-black text-ncc-gold uppercase tracking-widest hover:underline">
                                                View Profile
                                            </button>
                                            {userRole === 'admin' && (
                                                <>
                                                    <button 
                                                        onClick={() => handleToggleMentor(alumnus.id, alumnus.isMentor)}
                                                        className={`text-[10px] font-black uppercase tracking-widest hover:underline ${alumnus.isMentor ? 'text-red-500' : 'text-ncc-navy dark:text-white'}`}
                                                    >
                                                        {alumnus.isMentor ? 'Remove Mentor' : 'Make Mentor'}
                                                    </button>
                                                    {!alumnus.isHallOfFame && (
                                                        <button 
                                                            onClick={() => setHallOfFameModal({ ...alumnus, achievement: '', organization: '', description: '' })}
                                                            className="text-[10px] font-black text-amber-600 uppercase tracking-widest hover:underline ml-2"
                                                        >
                                                            Add to HOF
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {hallOfFameAlumni.length === 0 ? (
                        <div className="col-span-full py-20 text-center text-gray-400 dark:text-white/80 italic bg-white dark:bg-[#050b14] rounded-3xl border-2 border-dashed border-[#ddd8cc]">
                            <Star className="w-12 h-12 mx-auto mb-4 text-ncc-gold opacity-50" />
                            No alumni have been inducted into the Hall of Fame yet.
                        </div>
                    ) : (
                        hallOfFameAlumni.map(alumnus => (
                            <div key={alumnus.id} className="bg-gradient-to-br from-[#0a1628] to-[#11233e] p-1 rounded-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Star className="w-24 h-24 text-ncc-gold" />
                                </div>
                                <div className="bg-[#0a1628]/90 backdrop-blur-sm p-6 rounded-xl h-full relative z-10 border border-ncc-gold/20 hover:border-ncc-gold transition-colors">
                                    <div className="flex gap-4 items-start mb-4">
                                        <div className="w-14 h-14 bg-ncc-gold text-ncc-navy rounded-2xl flex items-center justify-center text-xl font-black shadow-lg shadow-ncc-gold/20">
                                            {alumnus.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                        </div>
                                        <div>
                                            <h4 className="font-display font-bold text-white text-lg leading-tight">{alumnus.name}</h4>
                                            <p className="text-ncc-gold text-[10px] font-black uppercase tracking-widest">Batch of {alumnus.year || 'N/A'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-4 pt-4 border-t border-white/10">
                                        <p className="text-white/90 text-sm font-bold mb-1">{alumnus.hallOfFameDetails?.achievement}</p>
                                        <p className="text-white/60 text-xs mb-3">{alumnus.hallOfFameDetails?.organization}</p>
                                        <p className="text-white/50 text-[10px] leading-relaxed italic line-clamp-3">
                                            "{alumnus.hallOfFameDetails?.description}"
                                        </p>
                                    </div>

                                    {userRole === 'admin' && (
                                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleRemoveFromHallOfFame(alumnus.id)}
                                                className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
                                                title="Remove from Hall of Fame"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
            {hallOfFameModal && (
                <ModalOverlay>
                    <form onSubmit={handleToggleHallOfFame} className="bg-white dark:bg-[#050b14] p-8 rounded-[2.5rem] max-w-md w-full shadow-2xl animate-in zoom-in-95 border border-[#ddd8cc] dark:border-white/10 relative overflow-hidden z-[100]">
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-gold" />
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-2xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-2">
                                    <Award className="w-6 h-6 text-ncc-gold" /> Hall of Fame
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-white/70 uppercase tracking-widest mt-1">Honoring {hallOfFameModal.name}</p>
                            </div>
                            <button type="button" onClick={() => setHallOfFameModal(null)} className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-ncc-red transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-8">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5">Achievement / Rank *</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Lieutenant, IAS Officer" 
                                    className="ncc-input text-sm"
                                    value={hallOfFameModal.achievement || ''}
                                    onChange={e => setHallOfFameModal({...hallOfFameModal, achievement: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5">Organization *</label>
                                <input 
                                    type="text" 
                                    required 
                                    placeholder="e.g. Indian Army, Civil Services" 
                                    className="ncc-input text-sm"
                                    value={hallOfFameModal.organization || ''}
                                    onChange={e => setHallOfFameModal({...hallOfFameModal, organization: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1.5">Brief Description</label>
                                <textarea 
                                    placeholder="Short note about their achievement..." 
                                    className="ncc-input text-sm min-h-[80px]"
                                    value={hallOfFameModal.description || ''}
                                    onChange={e => setHallOfFameModal({...hallOfFameModal, description: e.target.value})}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button type="button" onClick={() => setHallOfFameModal(null)} className="px-6 py-3 text-xs font-black text-gray-500 uppercase tracking-widest hover:text-ncc-navy dark:hover:text-white">Cancel</button>
                            <button type="submit" className="flex-1 ncc-btn ncc-btn-primary py-3 flex items-center justify-center gap-2">
                                <Star className="w-4 h-4" /> Induct to Hall of Fame
                            </button>
                        </div>
                    </form>
                </ModalOverlay>
            )}

            {showMentorshipModal && (
                <ModalOverlay>
                    <div className="bg-white dark:bg-[#050b14] p-8 rounded-3xl max-w-md w-full shadow-2xl animate-in zoom-in-95">
                        {mentorshipStep === 1 ? (
                            <>
                                <div className="w-16 h-16 bg-ncc-navy/5 rounded-2xl flex items-center justify-center mb-6">
                                    <Users className="w-8 h-8 text-ncc-navy dark:text-white" />
                                </div>
                                <h3 className="text-2xl font-display font-bold text-ncc-navy dark:text-white mb-2">Request Mentorship</h3>
                                <p className="text-sm text-gray-500 dark:text-white/70 mb-6 leading-relaxed">
                                    Our alumni network provides one-on-one guidance for SSB, technical entries, and corporate careers.
                                </p>
                                <div className="space-y-4 mb-8">
                                    <div className="p-4 bg-gray-50 dark:bg-[#0a1628] rounded-xl border border-gray-100 dark:border-white/5">
                                        <p className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-1">How it works</p>
                                        <p className="text-xs text-gray-600 dark:text-white/80">We will match you with a senior based on your career interests and share your contact details with them.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button onClick={() => setShowMentorshipModal(false)} className="flex-1 px-6 py-3 text-xs font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Cancel</button>
                                    <button 
                                        onClick={() => setMentorshipStep(2)}
                                        className="flex-1 ncc-btn ncc-btn-primary py-3"
                                    >
                                        Confirm Request
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-6">
                                <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-6 mx-auto">
                                    <ShieldCheck className="w-8 h-8 text-emerald-500" />
                                </div>
                                <h3 className="text-2xl font-display font-bold text-ncc-navy dark:text-white mb-2">Request Sent!</h3>
                                <p className="text-sm text-gray-500 dark:text-white/70 mb-8 px-4">
                                    Jai Hind! Your request has been logged. An alumni mentor will reach out to you within 3-5 working days.
                                </p>
                                <button 
                                    onClick={() => { setShowMentorshipModal(false); setMentorshipStep(1); }}
                                    className="ncc-btn ncc-btn-navy w-full"
                                >
                                    Understood
                                </button>
                            </div>
                        )}
                    </div>
                </ModalOverlay>
            )}

            {!showTransitionTool && (
                <div className="mt-12">
                    <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white mb-6 flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-ncc-gold" /> Mentorship & Opportunities
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-gradient-to-br from-ncc-navy to-blue-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10">
                                <span className="bg-ncc-gold text-ncc-navy dark:text-white text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">Alumni Network</span>
                                <h4 className="text-2xl font-bold mt-4 mb-2 font-display">Connect with Seniors</h4>
                                <p className="text-sm text-white/70 mb-6">Our alumni in the Indian Army and various corporate sectors are ready to guide you for SSB and job placements.</p>
                                <button 
                                    onClick={() => setShowMentorshipModal(true)}
                                    className="ncc-btn ncc-btn-primary w-full sm:w-auto"
                                >
                                    Request Mentorship
                                </button>
                            </div>
                            <Users className="absolute -right-8 -bottom-8 w-40 h-40 opacity-10 rotate-12" />
                        </div>
                        <div className="bg-white dark:bg-[#050b14] border border-[#ddd8cc] p-8 rounded-3xl shadow-sm">
                            <h4 className="text-lg font-bold text-ncc-navy dark:text-white mb-4 font-display">Recent Career Hub Alerts</h4>
                            <div className="space-y-4">
                                {careerNotices.length === 0 ? (
                                    <p className="text-xs text-gray-400 dark:text-white/80 italic py-4">No recent career alerts. Sync with the Career Hub to see more.</p>
                                ) : (
                                    careerNotices.map((job, i) => (
                                        <div key={i} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-[#0a1628] rounded-xl border border-gray-100 dark:border-white/5">
                                            <div className="min-w-0 flex-1 pr-4">
                                                <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{job.title}</p>
                                                <p className="text-[10px] text-gray-500 dark:text-white/70 font-bold uppercase tracking-tighter">{job.category}</p>
                                            </div>
                                            {job.link ? (
                                                <a 
                                                    href={job.link} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer" 
                                                    className="text-xs font-black text-ncc-gold hover:underline uppercase shrink-0"
                                                >
                                                    View
                                                </a>
                                            ) : (
                                                <span className="text-[9px] text-gray-300 uppercase font-black">Link Pending</span>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
