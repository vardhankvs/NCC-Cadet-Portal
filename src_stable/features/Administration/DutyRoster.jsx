import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Shield, Search, Save, User, Check, Clock, CheckCircle } from '../../components/Icons.jsx';
import { sendPushToAll, sendPushToUser } from '../../firebase/pushNotifications.js';
import { AnoTaskVerificationHub } from '../../components/delegation/AnoTaskVerificationHub.jsx';
import { useDelegatedSubmissions } from '../../firebase/delegationWorkflowService.js';

const DELEGABLE_MODULES = [
    { id: 'hall_of_fame', name: 'Unit Excellence', category: 'Headquarters' },
    { id: 'list', name: 'Roster', category: 'Administration' },
    { id: 'rank_mgmt', name: 'Ranks', category: 'Administration' },
    { id: 'discipline', name: 'Discipline', category: 'Administration' },
    { id: 'kit_mgmt', name: 'Kit', category: 'Logistics' },
    { id: 'summary', name: 'Attendance', category: 'Attendance' },
    { id: 'parade', name: 'Parade', category: 'Attendance' },
    { id: 'att_logs', name: 'Scan Logs', category: 'Attendance' },
    { id: 'leave_requests', name: 'Leave Requests', category: 'Attendance' },
    { id: 'training_calendar', name: 'Calendar', category: 'Training' },
    { id: 'camps', name: 'Camps', category: 'Training' },
    { id: 'library', name: 'Library', category: 'Training' },
    { id: 'announcements', name: 'Notice Board', category: 'Engagement' },
    { id: 'events', name: 'Events', category: 'Engagement' },
    { id: 'social', name: 'Social', category: 'Engagement' },
    { id: 'blood_registry', name: 'Blood Bank', category: 'Engagement' },
    { id: 'career', name: 'Careers', category: 'Engagement' },
    { id: 'career_bridge', name: 'Job Board', category: 'Engagement' },
    { id: 'grievances', name: 'Grievances', category: 'Engagement' }
];

export const DutyRoster = ({ initialSubTab = null }) => {
    const { userInstitutionId, userName } = useAuthContext();
    const { cadets } = useDataContext();
    const { pendingCount } = useDelegatedSubmissions(userInstitutionId);

    const [activeSection, setActiveSection] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        return params.get('subtab') === 'verifications' || initialSubTab === 'verifications' ? 'verifications' : 'delegations';
    });

    const [searchQuery, setSearchQuery] = useState('');
    const [filterCert, setFilterCert] = useState('C');
    const [filterDiv, setFilterDiv] = useState('All');
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [activeDelegations, setActiveDelegations] = useState([]);
    const [isSaving, setIsSaving] = useState(false);
    const [mobileTab, setMobileTab] = useState('cadets'); // 'cadets' | 'delegations'

    // Filter senior cadets (usually C and B certs, but we'll show all for flexibility)
    const filteredCadets = useMemo(() => {
        if (!cadets) return [];
        return cadets
            .filter(c => c.role !== 'admin')
            .filter(c => {
                const q = searchQuery.toLowerCase();
                const matchesSearch = (c.name || '').toLowerCase().includes(q) || 
                       (c.enrollmentId || '').toLowerCase().includes(q);
                
                const cert = (c.certificate || 'NA').toUpperCase();
                const matchesCert = filterCert === 'All' || cert === filterCert;
                
                const enrollStr = (c.enrollmentId || '').toUpperCase();
                const isSD = enrollStr.includes('SDA') || enrollStr.includes('SD');
                const isSW = enrollStr.includes('SWA') || enrollStr.includes('SW');
                let matchesDiv = true;
                if (filterDiv === 'SD') matchesDiv = isSD;
                if (filterDiv === 'SW') matchesDiv = isSW;

                return matchesSearch && matchesCert && matchesDiv;
            })
            .sort((a, b) => (a.enrollmentId || '').localeCompare(b.enrollmentId || ''));
    }, [cadets, searchQuery, filterCert, filterDiv]);

    // Group modules by category for UI
    const modulesByCategory = useMemo(() => {
        return DELEGABLE_MODULES.reduce((acc, mod) => {
            if (!acc[mod.category]) acc[mod.category] = [];
            acc[mod.category].push(mod);
            return acc;
        }, {});
    }, []);

    const handleSelectCadet = (cadet) => {
        setSelectedCadet(cadet);
        setActiveDelegations(cadet.delegatedModules || []);
        setMobileTab('delegations');
    };

    const toggleModule = (moduleId) => {
        setActiveDelegations(prev => 
            prev.includes(moduleId) 
                ? prev.filter(id => id !== moduleId)
                : [...prev, moduleId]
        );
    };

    const toggleCategory = (category) => {
        const categoryModuleIds = modulesByCategory[category].map(m => m.id);
        const allSelected = categoryModuleIds.every(id => activeDelegations.includes(id));
        
        if (allSelected) {
            // Deselect all in category
            setActiveDelegations(prev => prev.filter(id => !categoryModuleIds.includes(id)));
        } else {
            // Select all in category
            setActiveDelegations(prev => {
                const newSet = new Set([...prev, ...categoryModuleIds]);
                return Array.from(newSet);
            });
        }
    };

    const handleSave = async () => {
        if (!selectedCadet) return;
        setIsSaving(true);
        try {
            // 1. Update the cadet document
            const cadetRef = doc(getCollectionRef('cadets'), selectedCadet.id);
            await updateDoc(cadetRef, {
                delegatedModules: activeDelegations
            });

            // 2. Try to update the user document if they have already signed up
            const usersRef = getCollectionRef('users');
            const q = query(usersRef, where('enrollmentId', '==', selectedCadet.enrollmentId));
            const userSnap = await getDocs(q);
            
            if (!userSnap.empty) {
                const userDocRef = doc(usersRef, userSnap.docs[0].id);
                await updateDoc(userDocRef, {
                    delegatedModules: activeDelegations
                });
            }

            toast.success("Delegations saved successfully!");
            sendPushToUser(selectedCadet.enrollmentId, '📋 Duty Delegated', 'You have been assigned new administrative duties in the chain of command.', 'hierarchy');
            selectedCadet.delegatedModules = activeDelegations;
        } catch (error) {
            console.error("Failed to save delegations", error);
            toast.error("Failed to save delegations. Make sure you have admin rights.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="w-full space-y-4 sm:space-y-6 fade-in p-3 sm:p-6 lg:p-8 min-h-[calc(100vh-140px)] lg:h-[calc(100vh-100px)] flex flex-col pb-24 lg:pb-8">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-xl sm:text-2xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-3">
                        <Shield className="w-7 h-7 sm:w-8 sm:h-8 text-ncc-gold" />
                        Chain of Command & Cadet Verification
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-xs sm:text-sm">
                        Manage cadet access permissions and verify delegated administrative task submissions.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    {/* Top Switcher between Delegations & Verifications */}
                    <div className="flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10">
                        <button
                            onClick={() => setActiveSection('delegations')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeSection === 'delegations'
                                    ? 'bg-ncc-navy text-white shadow-md'
                                    : 'text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                        >
                            <Shield className="w-4 h-4 text-ncc-gold" />
                            <span>1. Access Delegations</span>
                        </button>
                        <button
                            onClick={() => setActiveSection('verifications')}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                                activeSection === 'verifications'
                                    ? 'bg-ncc-navy text-white shadow-md'
                                    : 'text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10'
                            }`}
                        >
                            <CheckSquare className="w-4 h-4 text-ncc-gold" />
                            <span>2. Task Verifications</span>
                            {pendingCount > 0 && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-ncc-red text-white animate-pulse">
                                    {pendingCount}
                                </span>
                            )}
                        </button>
                    </div>

                    {activeSection === 'delegations' && selectedCadet && (
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="hidden md:flex bg-ncc-navy text-white px-5 py-2.5 rounded-xl font-bold items-center gap-2 hover:bg-ncc-navy-mid transition-all shadow-lg shadow-ncc-navy/20 disabled:opacity-50 text-xs"
                        >
                            <Save className="w-4 h-4" />
                            {isSaving ? 'Saving...' : 'Save Delegations'}
                        </button>
                    )}
                </div>
            </header>

            {activeSection === 'verifications' ? (
                <div className="flex-1 min-h-0 overflow-y-auto">
                    <AnoTaskVerificationHub institutionId={userInstitutionId} anoName={userName || 'Institution ANO'} />
                </div>
            ) : (
                <>
                    {/* Mobile Segmented Tab Switcher */}
            <div className="lg:hidden flex bg-gray-100 dark:bg-white/5 p-1 rounded-2xl border border-gray-200 dark:border-white/10 shrink-0">
                <button
                    onClick={() => setMobileTab('cadets')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        mobileTab === 'cadets' 
                            ? 'bg-ncc-navy text-white shadow-md' 
                            : 'text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                >
                    <User className="w-4 h-4" />
                    1. Select Cadet
                </button>
                <button
                    onClick={() => setMobileTab('delegations')}
                    className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                        mobileTab === 'delegations' 
                            ? 'bg-ncc-navy text-white shadow-md' 
                            : 'text-gray-600 dark:text-white/70 hover:bg-gray-200 dark:hover:bg-white/10'
                    }`}
                >
                    <Shield className="w-4 h-4 text-ncc-gold" />
                    2. Delegations {selectedCadet ? `(${selectedCadet.name.split(' ')[0]})` : ''}
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                
                {/* Left Panel: Cadet Selection */}
                <div className={`w-full lg:w-80 xl:w-96 shrink-0 flex flex-col bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm overflow-hidden ${mobileTab === 'cadets' ? 'flex h-[calc(100vh-280px)] lg:h-auto' : 'hidden lg:flex'}`}>
                    <div className="p-3 sm:p-4 border-b border-[#ddd8cc] dark:border-white/10 shrink-0 space-y-3">
                        <div className="relative">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search cadets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-2xl py-2.5 sm:py-3 pl-10 pr-4 focus:ring-2 focus:ring-ncc-navy outline-none dark:text-white text-xs sm:text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={filterCert}
                                onChange={e => setFilterCert(e.target.value)}
                                className="flex-1 bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl py-2 px-2.5 text-xs font-bold text-ncc-navy dark:text-white focus:ring-2 focus:ring-ncc-navy outline-none"
                            >
                                <option value="All">All Certs</option>
                                <option value="C">C Cert</option>
                                <option value="B2">B2 Cert</option>
                                <option value="B1">B1 Cert</option>
                            </select>
                            <select 
                                value={filterDiv}
                                onChange={e => setFilterDiv(e.target.value)}
                                className="flex-1 bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl py-2 px-2.5 text-xs font-bold text-ncc-navy dark:text-white focus:ring-2 focus:ring-ncc-navy outline-none"
                            >
                                <option value="All">All Divs</option>
                                <option value="SD">SD (Boys)</option>
                                <option value="SW">SW (Girls)</option>
                            </select>
                        </div>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {filteredCadets.map(cadet => {
                            const isSelected = selectedCadet?.enrollmentId === cadet.enrollmentId;
                            const delegatedCount = (cadet.delegatedModules || []).length;
                            
                            return (
                                <button
                                    key={cadet.enrollmentId}
                                    onClick={() => handleSelectCadet(cadet)}
                                    className={`w-full text-left p-2.5 sm:p-3 rounded-2xl flex items-center justify-between transition-all ${
                                        isSelected 
                                            ? 'bg-ncc-navy text-white shadow-md' 
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5 text-ncc-navy dark:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-[#0a1628] text-ncc-navy dark:text-white'}`}>
                                            <User className="w-4 h-4 sm:w-5 sm:h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold truncate text-xs sm:text-sm">{cadet.name}</p>
                                            <p className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-white/60'}`}>
                                                {cadet.enrollmentId} • {cadet.certificate} Cert
                                            </p>
                                        </div>
                                    </div>
                                    {delegatedCount > 0 && (
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${isSelected ? 'bg-white text-ncc-navy' : 'bg-ncc-gold/20 text-ncc-gold'}`}>
                                            {delegatedCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Delegations */}
                <div className={`w-full flex-1 bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm overflow-hidden flex flex-col ${mobileTab === 'delegations' ? 'flex h-[calc(100vh-280px)] lg:h-auto' : 'hidden lg:flex'}`}>
                    {selectedCadet ? (
                        <>
                            <div className="p-4 sm:p-6 border-b border-[#ddd8cc] dark:border-white/10 shrink-0 bg-gray-50 dark:bg-white/5 flex items-center justify-between">
                                <div>
                                    <h3 className="text-base sm:text-xl font-black text-ncc-navy dark:text-white">
                                        Delegating to {selectedCadet.name}
                                    </h3>
                                    <p className="text-xs sm:text-sm text-gray-500 dark:text-white/70 mt-0.5">
                                        Toggle the modules you want this cadet to manage.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setMobileTab('cadets')}
                                    className="lg:hidden text-xs font-bold text-ncc-navy dark:text-ncc-gold bg-gray-200 dark:bg-white/10 px-3 py-1.5 rounded-lg shrink-0"
                                >
                                    Change Cadet
                                </button>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                                <div className="space-y-6 sm:space-y-8">
                                    {Object.entries(modulesByCategory).map(([category, modules]) => (
                                        <div key={category} className="space-y-3 sm:space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                                                <h4 className="font-black text-xs sm:text-sm text-gray-400 dark:text-white/60 uppercase tracking-widest">
                                                    {category}
                                                </h4>
                                                <button 
                                                    onClick={() => toggleCategory(category)}
                                                    className="text-xs font-bold text-ncc-navy dark:text-white hover:text-ncc-gold transition-colors"
                                                >
                                                    Toggle All
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2.5 sm:gap-3.5">
                                                {modules.map(mod => {
                                                    const isGranted = activeDelegations.includes(mod.id);
                                                    return (
                                                        <button
                                                            key={mod.id}
                                                            onClick={() => toggleModule(mod.id)}
                                                            className={`p-3 sm:p-4 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                                                                isGranted 
                                                                    ? 'bg-ncc-navy border-ncc-navy shadow-lg shadow-ncc-navy/20' 
                                                                    : 'bg-white dark:bg-[#0a1628] border-gray-200 dark:border-white/10 hover:border-ncc-gold'
                                                            }`}
                                                        >
                                                            <span className={`font-bold text-xs sm:text-sm truncate pr-1 ${isGranted ? 'text-white' : 'text-ncc-navy dark:text-white'}`}>
                                                                {mod.name}
                                                            </span>
                                                            <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                                                                isGranted ? 'border-white bg-white text-ncc-navy' : 'border-gray-300 dark:border-white/20 group-hover:border-ncc-gold text-transparent'
                                                            }`}>
                                                                <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 text-gray-500 dark:text-white/60">
                            <Shield className="w-12 h-12 sm:w-16 sm:h-16 text-gray-200 dark:text-white/10 mb-4" />
                            <h3 className="text-lg sm:text-xl font-bold text-ncc-navy dark:text-white mb-2">No Cadet Selected</h3>
                            <p className="max-w-sm mx-auto text-xs sm:text-sm mb-4">Select a cadet from the roster to configure their administrative access and delegations.</p>
                            <button
                                onClick={() => setMobileTab('cadets')}
                                className="lg:hidden bg-ncc-navy text-white px-5 py-2.5 rounded-xl text-xs font-bold"
                            >
                                Select Cadet Now
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Mobile Bottom Floating Save Action Bar */}
            {selectedCadet && (
                <div className="md:hidden fixed bottom-16 left-4 right-4 z-30 bg-ncc-navy text-white p-3 rounded-2xl shadow-2xl flex items-center justify-between border border-white/10 backdrop-blur-lg">
                    <div className="min-w-0 pr-2">
                        <p className="text-xs font-bold truncate">Saving for {selectedCadet.name}</p>
                        <p className="text-[10px] text-white/70">{activeDelegations.length} modules granted</p>
                    </div>
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-ncc-gold text-ncc-navy px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 shadow-md disabled:opacity-50"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            )}
                </>
            )}
        </div>
    );
};
