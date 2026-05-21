import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { doc, updateDoc, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { Shield, Search, Save, User, Check } from '../../components/Icons.jsx';
import { sendPushToAll } from '../../firebase/pushNotifications.js';

const DELEGABLE_MODULES = [
    { id: 'hall_of_fame', name: 'Unit Excellence', category: 'Headquarters' },
    { id: 'list', name: 'Roster', category: 'Administration' },
    { id: 'rank_mgmt', name: 'Ranks', category: 'Administration' },
    { id: 'discipline', name: 'Discipline', category: 'Administration' },
    { id: 'kit_mgmt', name: 'Kit', category: 'Logistics' },
    { id: 'parade', name: 'Parade', category: 'Attendance' },
    { id: 'att_logs', name: 'Scan Logs', category: 'Attendance' },
    { id: 'leave_requests', name: 'Leave Requests', category: 'Attendance' },
    { id: 'training_calendar', name: 'Calendar', category: 'Training' },
    { id: 'exams', name: 'Exams', category: 'Training' },
    { id: 'camps', name: 'Camps', category: 'Training' },
    { id: 'library', name: 'Library', category: 'Training' },
    { id: 'notifications', name: 'Broadcast', category: 'Engagement' },
    { id: 'announcements', name: 'Notice Board', category: 'Engagement' },
    { id: 'events', name: 'Events', category: 'Engagement' },
    { id: 'social', name: 'Social', category: 'Engagement' },
    { id: 'blood_registry', name: 'Blood Bank', category: 'Engagement' },
    { id: 'career', name: 'Careers', category: 'Engagement' },
    { id: 'career_bridge', name: 'Job Board', category: 'Engagement' },
    { id: 'grievances', name: 'Grievances', category: 'Engagement' }
];

export const DutyRoster = () => {
    const { cadets } = useDataContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCert, setFilterCert] = useState('C');
    const [filterDiv, setFilterDiv] = useState('All');
    const [selectedCadet, setSelectedCadet] = useState(null);
    const [activeDelegations, setActiveDelegations] = useState([]);
    const [isSaving, setIsSaving] = useState(false);

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
            sendPushToAll('📋 Duty Roster Updated', 'The chain of command and duty delegations have been updated');
            selectedCadet.delegatedModules = activeDelegations;
        } catch (error) {
            console.error("Failed to save delegations", error);
            toast.error("Failed to save delegations. Make sure you have admin rights.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6 fade-in p-4 lg:p-0 h-[calc(100vh-100px)] flex flex-col">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-display font-black text-ncc-navy dark:text-white flex items-center gap-3">
                        <Shield className="w-8 h-8 text-ncc-gold" />
                        Chain of Command
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm">Delegate administrative access to senior cadets.</p>
                </div>
                {selectedCadet && (
                    <button 
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-ncc-navy text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-ncc-navy-mid transition-all shadow-lg shadow-ncc-navy/20 disabled:opacity-50"
                    >
                        <Save className="w-5 h-5" />
                        {isSaving ? 'Saving...' : 'Save Delegations'}
                    </button>
                )}
            </header>

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
                
                {/* Left Panel: Cadet Selection */}
                <div className="lg:w-1/3 flex flex-col bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-[#ddd8cc] dark:border-white/10 shrink-0 space-y-3">
                        <div className="relative">
                            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search cadets..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-2xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-ncc-navy outline-none dark:text-white text-sm"
                            />
                        </div>
                        <div className="flex gap-2">
                            <select 
                                value={filterCert}
                                onChange={e => setFilterCert(e.target.value)}
                                className="flex-1 bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-ncc-navy dark:text-white focus:ring-2 focus:ring-ncc-navy outline-none"
                            >
                                <option value="All">All Certs</option>
                                <option value="C">C Cert</option>
                                <option value="B2">B2 Cert</option>
                                <option value="B1">B1 Cert</option>
                            </select>
                            <select 
                                value={filterDiv}
                                onChange={e => setFilterDiv(e.target.value)}
                                className="flex-1 bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl py-2 px-3 text-xs font-bold text-ncc-navy dark:text-white focus:ring-2 focus:ring-ncc-navy outline-none"
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
                                    className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all ${
                                        isSelected 
                                            ? 'bg-ncc-navy text-white' 
                                            : 'hover:bg-gray-50 dark:hover:bg-white/5 text-ncc-navy dark:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-[#0a1628] text-ncc-navy dark:text-white'}`}>
                                            <User className="w-5 h-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="font-bold truncate text-sm">{cadet.name}</p>
                                            <p className={`text-xs truncate ${isSelected ? 'text-white/80' : 'text-gray-500 dark:text-white/60'}`}>
                                                {cadet.enrollmentId} • {cadet.certificate} Cert
                                            </p>
                                        </div>
                                    </div>
                                    {delegatedCount > 0 && (
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${isSelected ? 'bg-white text-ncc-navy' : 'bg-ncc-gold/20 text-ncc-gold'}`}>
                                            {delegatedCount}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Right Panel: Delegations */}
                <div className="lg:w-2/3 bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm overflow-hidden flex flex-col">
                    {selectedCadet ? (
                        <>
                            <div className="p-6 border-b border-[#ddd8cc] dark:border-white/10 shrink-0 bg-gray-50 dark:bg-white/5">
                                <h3 className="text-xl font-black text-ncc-navy dark:text-white">
                                    Delegating to {selectedCadet.name}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-white/70 mt-1">
                                    Toggle the modules you want this cadet to manage on your behalf.
                                </p>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-8">
                                    {Object.entries(modulesByCategory).map(([category, modules]) => (
                                        <div key={category} className="space-y-4">
                                            <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-2">
                                                <h4 className="font-black text-sm text-gray-400 dark:text-white/60 uppercase tracking-widest">
                                                    {category}
                                                </h4>
                                                <button 
                                                    onClick={() => toggleCategory(category)}
                                                    className="text-xs font-bold text-ncc-navy dark:text-white hover:text-ncc-gold transition-colors"
                                                >
                                                    Toggle All
                                                </button>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                                                {modules.map(mod => {
                                                    const isGranted = activeDelegations.includes(mod.id);
                                                    return (
                                                        <button
                                                            key={mod.id}
                                                            onClick={() => toggleModule(mod.id)}
                                                            className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all group ${
                                                                isGranted 
                                                                    ? 'bg-ncc-navy border-ncc-navy shadow-lg shadow-ncc-navy/20' 
                                                                    : 'bg-white dark:bg-[#0a1628] border-gray-200 dark:border-white/10 hover:border-ncc-gold'
                                                            }`}
                                                        >
                                                            <span className={`font-bold text-sm ${isGranted ? 'text-white' : 'text-ncc-navy dark:text-white'}`}>
                                                                {mod.name}
                                                            </span>
                                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                                                                isGranted ? 'border-white bg-white text-ncc-navy' : 'border-gray-300 dark:border-white/20 group-hover:border-ncc-gold text-transparent'
                                                            }`}>
                                                                <Check className="w-4 h-4" />
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
                        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-500 dark:text-white/60">
                            <Shield className="w-16 h-16 text-gray-200 dark:text-white/10 mb-4" />
                            <h3 className="text-xl font-bold text-ncc-navy dark:text-white mb-2">No Cadet Selected</h3>
                            <p className="max-w-sm mx-auto">Select a cadet from the roster to configure their administrative access and delegations.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};
