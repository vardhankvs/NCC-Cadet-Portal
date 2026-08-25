import React, { useState, useMemo } from 'react';
import { X, Search, Award, Download, Trash2 } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { generateNominalRollPDF } from '../../utils/pdfGenerator.js';

import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { addCadetsToCampBulk, updateCampRoster, logCampAchievement, addCampAchievementsBulk, deleteCamp, removeCampAchievement, updateCampAchievement, removeCadetFromCamp } from '../../firebase/firestoreService.js';
import { submitDelegatedTask } from '../../firebase/delegationWorkflowService.js';
import { toast } from 'react-toastify';

export const CampDetailsModal = ({ camp, onClose, onEditCamp }) => {
    const { userRole, actualRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const isCadetUser = isDelegatedCadet || userRole === 'cadet' || actualRole === 'cadet';
    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';
    const isANO = !isCadetUser && (userRole === 'admin' || userRole === 'officer');
    const { cadets, camps, units = [] } = useDataContext();
    
    // Always use the latest camp data from context so the UI updates instantly
    const currentCamp = camps?.find(c => c.id === camp.id) || camp;
    
    const [searchTerm, setSearchTerm] = useState('');
    const roster = currentCamp.roster || [];

    const displayRoster = useMemo(() => {
        if (!isANO) return roster;
        return roster.filter(r => {
            const cadetDoc = cadets.find(c => c.id === r.cadetId);
            return cadetDoc !== undefined;
        });
    }, [roster, cadets, isANO]);

    // College vacancy details for ANO
    const collegeSubdomain = userInstitutionId;
    const isExcludedForUser = currentCamp.disallowedColleges?.includes(collegeSubdomain);
    const totalAllocatedVacancies = isExcludedForUser ? 0 : (currentCamp.vacancies?.[collegeSubdomain] || 0);
    const collegeRosterCount = useMemo(() => {
        return roster.filter(r => {
            const cadetDoc = cadets.find(c => c.id === r.cadetId);
            const instId = cadetDoc?.institutionId || r.institutionId || 'unknown';
            return instId === collegeSubdomain;
        }).length;
    }, [roster, cadets, collegeSubdomain]);
    const remainingVacancies = Math.max(0, totalAllocatedVacancies - collegeRosterCount);

    // College vacancy summary for Battalion Admin
    const colleges = useMemo(() => units.filter(u => !u.isBattalion), [units]);
    const collegeVacanciesSummary = useMemo(() => {
        return colleges.map(col => {
            const subdomain = col.subdomain || col.id;
            const isExcluded = currentCamp.disallowedColleges?.includes(subdomain);
            const allocated = isExcluded ? 0 : (currentCamp.vacancies?.[subdomain] || 0);
            const filled = roster.filter(r => {
                const cadetDoc = cadets.find(c => c.id === r.cadetId);
                return (cadetDoc?.institutionId || r.institutionId) === subdomain;
            }).length;
            return {
                id: subdomain,
                name: col.collegeName || col.name || subdomain,
                allocated,
                filled,
                isExcluded,
                remaining: isExcluded ? 0 : Math.max(0, allocated - filled)
            };
        });
    }, [colleges, currentCamp.vacancies, currentCamp.disallowedColleges, roster, cadets]);
    
    // For adding cadets
    const [selectedCandidateIds, setSelectedCandidateIds] = useState([]);
    const [candidateStatus, setCandidateStatus] = useState('Selected');
    const [selectedDivision, setSelectedDivision] = useState('All');
    const [selectedCert, setSelectedCert] = useState('All');
    
    // For adding achievements individually
    const [achievementTarget, setAchievementTarget] = useState(null);
    const [achievementText, setAchievementText] = useState('');

    // For bulk achievements in Final Roster
    const [rosterSelectedIds, setRosterSelectedIds] = useState([]);
    const [bulkAchievementText, setBulkAchievementText] = useState('');

    // Toggle for adding view
    const [showAddCadets, setShowAddCadets] = useState(false);

    const unassignedCadets = useMemo(() => {
        let list = cadets.filter(c => !roster.some(r => r.cadetId === c.id));
        if (isANO) {
            list = list.filter(c => c.institutionId === userInstitutionId);
        }
        return list;
    }, [cadets, roster, isANO, userInstitutionId]);

    const filteredCandidates = useMemo(() => {
        return unassignedCadets
            .filter(c => {
                let match = true;
                if (searchTerm) {
                    const q = searchTerm.toLowerCase();
                    match = match && (c.name?.toLowerCase().includes(q) || 
                                      c.enrollmentId?.toLowerCase().includes(q) || 
                                      c.regimentalNumber?.toLowerCase().includes(q));
                }
                if (selectedDivision !== 'All') {
                    const num = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
                    match = match && num.includes(selectedDivision);
                }
                if (selectedCert !== 'All') {
                    const cert = c.certificate || c.B || '';
                    match = match && cert === selectedCert;
                }
                return match;
            })
            .sort((a, b) => {
                const countA = (a.campsAttended || []).length;
                const countB = (b.campsAttended || []).length;
                
                // Prioritize 0 or 1 camps
                const priorityA = countA <= 1 ? 1 : 0;
                const priorityB = countB <= 1 ? 1 : 0;
                
                if (priorityA !== priorityB) {
                    return priorityB - priorityA; // 1 (Priority) comes first
                }
                
                // Secondary sort: number of camps (ascending)
                if (countA !== countB) {
                    return countA - countB;
                }
                
                // Tertiary sort: Regimental number
                const regA = a.enrollmentId || a.regimentalNumber || '';
                const regB = b.enrollmentId || b.regimentalNumber || '';
                return regA.localeCompare(regB);
            });
    }, [unassignedCadets, searchTerm, selectedDivision, selectedCert]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCandidateIds(prev => {
                const unique = new Set([...prev, ...filteredCandidates.map(c => c.id)]);
                return Array.from(unique);
            });
        } else {
            const filteredIds = filteredCandidates.map(c => c.id);
            setSelectedCandidateIds(prev => prev.filter(id => !filteredIds.includes(id)));
        }
    };

    const handleBulkAdd = async () => {
        if (selectedCandidateIds.length === 0) return;
        if (isANO) {
            if (totalAllocatedVacancies > 0 && selectedCandidateIds.length > remainingVacancies) {
                toast.error(`Cannot assign cadets. You have ${remainingVacancies} vacancies remaining, but selected ${selectedCandidateIds.length}.`);
                return;
            }
        }
        try {
            const cadetsToAdd = unassignedCadets.filter(c => selectedCandidateIds.includes(c.id));

            if (isCadetUser) {
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'camps',
                    moduleName: 'Camps & Deployments',
                    actionType: 'update',
                    targetDocId: camp.id,
                    title: `Assign ${cadetsToAdd.length} Cadets to Camp: ${camp.name}`,
                    payload: {
                        action: 'add_candidates',
                        campId: camp.id,
                        campName: camp.name,
                        cadetIds: selectedCandidateIds,
                        status: candidateStatus
                    }
                });
                toast.success(`Cadet camp assignment submitted for ANO verification!`);
                setSelectedCandidateIds([]);
                setShowAddCadets(false);
                return;
            }

            await addCadetsToCampBulk(camp.id, cadetsToAdd, candidateStatus);
            toast.success(`Successfully added ${cadetsToAdd.length} cadets to roster!`);
            setSelectedCandidateIds([]);
            setSearchTerm('');
            setSelectedDivision('All');
            setSelectedCert('All');
        } catch (err) {
            console.error(err);
            toast.error(err.message);
        }
    };

    const handleRemoveFromRoster = async (cadetId, cadetName) => {
        if (window.confirm(`Are you sure you want to remove ${cadetName} from this camp roster?`)) {
            try {
                if (isCadetUser) {
                    await submitDelegatedTask({
                        institutionId: userInstitutionId,
                        cadetEnrollmentId: userEnrollmentId,
                        cadetName: userName,
                        cadetUid: user?.uid,
                        moduleId: 'camps',
                        moduleName: 'Camps & Deployments',
                        actionType: 'update',
                        targetDocId: camp.id,
                        title: `Remove ${cadetName} from Camp: ${camp.name}`,
                        payload: {
                            action: 'update_roster_status',
                            campId: camp.id,
                            cadetId,
                            cadetName,
                            status: 'Removed'
                        }
                    });
                    toast.success(`Cadet removal request submitted for ANO verification!`);
                    return;
                }

                await removeCadetFromCamp(camp.id, cadetId);
                toast.success(`${cadetName} removed from camp roster.`);
            } catch (err) {
                toast.error(`Failed to remove cadet: ${err.message}`);
            }
        }
    };

    const handleAddAchievement = async () => {
        if (!achievementTarget || !achievementText.trim()) return;
        try {
            if (isCadetUser) {
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'camps',
                    moduleName: 'Camps & Deployments',
                    actionType: 'update',
                    targetDocId: camp.id,
                    title: `Camp Award in ${camp.name}: ${achievementText.trim()}`,
                    payload: {
                        action: 'log_achievement',
                        campId: camp.id,
                        cadetId: achievementTarget,
                        achievement: achievementText.trim()
                    }
                });
                toast.success(`Camp achievement submitted for ANO verification!`);
                setAchievementTarget(null);
                setAchievementText('');
                return;
            }

            await logCampAchievement(camp.id, achievementTarget, achievementText.trim());
            toast.success("Achievement logged!");
            setAchievementTarget(null);
            setAchievementText('');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleRemoveAchievement = async (cadetId, achievementText) => {
        if (window.confirm(`Remove award "${achievementText}" from this cadet?`)) {
            try {
                await removeCampAchievement(camp.id, cadetId, achievementText);
                toast.success('Award removed');
            } catch (err) {
                toast.error(err.message);
            }
        }
    };

    const handleEditAchievement = async (cadetId, oldText) => {
        const newText = window.prompt(`Edit award "${oldText}":`, oldText);
        if (newText !== null && newText.trim() !== '' && newText.trim() !== oldText) {
            try {
                await updateCampAchievement(camp.id, cadetId, oldText, newText.trim());
                toast.success('Award updated');
            } catch (err) {
                toast.error(err.message);
            }
        }
    };

    const handleBulkAchievement = async () => {
        if (rosterSelectedIds.length === 0 || !bulkAchievementText.trim()) return;
        try {
            if (isCadetUser) {
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'camps',
                    moduleName: 'Camps & Deployments',
                    actionType: 'update',
                    targetDocId: camp.id,
                    title: `Camp Bulk Award for ${rosterSelectedIds.length} Cadets in ${camp.name}: ${bulkAchievementText.trim()}`,
                    payload: {
                        action: 'bulk_achievement',
                        campId: camp.id,
                        cadetIds: rosterSelectedIds,
                        achievement: bulkAchievementText.trim()
                    }
                });
                toast.success(`Bulk achievements submitted for ANO verification!`);
                setRosterSelectedIds([]);
                setBulkAchievementText('');
                return;
            }

            await addCampAchievementsBulk(camp.id, rosterSelectedIds, bulkAchievementText.trim());
            toast.success(`Achievement logged for ${rosterSelectedIds.length} cadets!`);
            setRosterSelectedIds([]);
            setBulkAchievementText('');
        } catch (err) {
            console.error(err);
            toast.error(err.message);
        }
    };

    const handleRosterSelectAll = (e) => {
        if (e.target.checked) setRosterSelectedIds(roster.map(r => r.cadetId));
        else setRosterSelectedIds([]);
    };

    const handleDeleteCamp = async () => {
        if (window.confirm(`Are you sure you want to delete ${camp.name}? This cannot be undone.`)) {
            try {
                if (isCadetUser) {
                    await submitDelegatedTask({
                        institutionId: userInstitutionId,
                        cadetEnrollmentId: userEnrollmentId,
                        cadetName: userName,
                        cadetUid: user?.uid,
                        moduleId: 'camps',
                        moduleName: 'Camps & Deployments',
                        actionType: 'delete',
                        targetDocId: camp.id,
                        title: `Delete Camp: ${camp.name}`,
                        payload: {
                            campId: camp.id,
                            campName: camp.name
                        }
                    });
                    toast.success(`Camp deletion request submitted for ANO verification!`);
                    onClose();
                    return;
                }

                await deleteCamp(camp.id);
                toast.success('Camp deleted successfully!');
                onClose();
            } catch (err) {
                toast.error(`Failed to delete: ${err.message}`);
            }
        }
    };

    const getStatusColor = (status) => {
        switch(status) {
            case 'Selected': return 'bg-emerald-100 text-emerald-800';
            case 'Attended': return 'bg-blue-100 text-blue-800';
            case 'Reserve': return 'bg-amber-100 text-amber-800';
            case 'Rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 dark:bg-[#0d2137] text-gray-800 dark:text-white';
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 fade-in">
            <div className="bg-white dark:bg-[#050b14] rounded-[2rem] shadow-2xl w-full max-w-5xl max-h-[95vh] modal-in flex flex-col overflow-hidden border border-gray-200 dark:border-white/10">
                <div className="relative px-8 py-6 bg-gradient-to-r from-ncc-navy via-[#1a365d] to-ncc-navy flex-shrink-0 border-b border-white/10">
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                    <div className="relative z-10 pr-12">
                        <p className="text-[10px] uppercase tracking-widest text-ncc-gold font-bold border border-ncc-gold/50 bg-ncc-gold/10 inline-block px-2 py-0.5 rounded mb-2 shadow-sm">{camp.type}</p>
                        <h2 className="text-3xl font-black font-display text-white tracking-tight mb-1">{camp.name}</h2>
                        <p className="text-sm font-medium text-white/70 flex items-center gap-2">
                            <span>{camp.location}</span>
                            <span className="w-1 h-1 rounded-full bg-ncc-gold"></span>
                            <span>{formatDate(camp.startDate)} to {formatDate(camp.endDate)}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 p-2.5 bg-white/5 hover:bg-white/20 rounded-full transition-colors group z-20">
                        <X className="w-5 h-5 text-white/60 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0a1628] flex flex-col gap-6">
                    
                    {/* College Vacancy Summary (Battalion Admin only) */}
                    {isBattalionAdmin && collegeVacanciesSummary.length > 0 && (
                        <div className="bg-white dark:bg-[#050b14] p-5 rounded-2xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                            <h4 className="text-xs font-black uppercase tracking-widest text-ncc-navy dark:text-white mb-3">College Participation Summary</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {collegeVacanciesSummary.map(item => (
                                    <div key={item.id} className={`p-3 rounded-xl border flex flex-col ${
                                        item.isExcluded 
                                            ? 'bg-red-500/5 border-red-500/20 text-red-500' 
                                            : 'bg-gray-50 dark:bg-[#0a1628] border-gray-200 dark:border-white/5'
                                    }`}>
                                        <span className={`text-[10px] font-black truncate ${item.isExcluded ? 'text-red-500/80 dark:text-red-400/80' : 'text-ncc-navy dark:text-white'}`} title={item.name}>{item.name}</span>
                                        <div className="flex justify-between items-baseline mt-1">
                                            {item.isExcluded ? (
                                                <span className="text-[9px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 font-black uppercase tracking-wider px-1.5 py-0.5 rounded mt-1">Not Allowed</span>
                                            ) : (
                                                <>
                                                    <span className="text-lg font-black text-ncc-gold">{item.filled} <span className="text-xs text-gray-400 font-bold">/ {item.allocated}</span></span>
                                                    {item.allocated > 0 ? (
                                                        item.remaining === 0 ? (
                                                            <span className="text-[9px] bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 font-black uppercase tracking-wider px-1.5 py-0.5 rounded">Full</span>
                                                        ) : (
                                                            <span className="text-[9px] text-gray-400 font-bold">{item.remaining} left</span>
                                                        )
                                                    ) : (
                                                        <span className="text-[9px] text-gray-400 font-bold">Unallocated</span>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Excluded Warning for ANOs */}
                    {isANO && isExcludedForUser && (
                        <div className="bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/40 text-red-600 dark:text-red-400 p-4 rounded-xl text-center text-sm font-black uppercase tracking-wider">
                            ⚠️ Your college has been excluded from this camp.
                        </div>
                    )}

                    {/* Actions Bar */}
                    {(isBattalionAdmin || (isANO && !isExcludedForUser)) && (
                        <div className="flex justify-between items-center bg-white dark:bg-[#050b14] p-3 rounded-xl border border-[#ddd8cc] shadow-sm">
                            <button 
                                onClick={() => setShowAddCadets(!showAddCadets)}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all focus:outline-none ${showAddCadets ? 'bg-gray-200 text-gray-700 dark:text-white/90 hover:bg-gray-300' : 'bg-ncc-navy text-white hover:bg-ncc-navy/90'}`}
                            >
                                {showAddCadets 
                                    ? '↓ Hide Add Cadets Panel' 
                                    : isBattalionAdmin 
                                        ? '+ Assign Cadets' 
                                        : (totalAllocatedVacancies > 0 ? `+ Nominate Cadets (${remainingVacancies} vacancies)` : '+ Nominate Cadets')}
                            </button>
                            {isBattalionAdmin && (
                                <div className="flex gap-2">
                                    <button onClick={onEditCamp} className="px-4 py-2 text-sm font-bold text-ncc-navy dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg transition">
                                        Edit Camp
                                    </button>
                                    <button onClick={handleDeleteCamp} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition">
                                        Delete Camp
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Add Cadet Tool */}
                    {(isBattalionAdmin || (isANO && !isExcludedForUser)) && showAddCadets && (
                        <div className="bg-white dark:bg-[#050b14] p-5 rounded-xl border border-[#ddd8cc] shadow-sm flex flex-col max-h-[400px]">
                            {isANO && totalAllocatedVacancies > 0 && (
                                <div className="mb-3 p-3 bg-ncc-navy/5 dark:bg-white/5 rounded-xl text-xs flex justify-between items-center">
                                    <span className="font-semibold text-ncc-navy dark:text-white">Vacancies:</span>
                                    <span className="font-mono text-ncc-gold font-bold">{collegeRosterCount} / {totalAllocatedVacancies} Filled ({remainingVacancies} Remaining)</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-sm uppercase tracking-widest text-ncc-navy dark:text-white">
                                    {isANO ? `Available College Cadets (${filteredCandidates.length})` : `Available Cadets (${filteredCandidates.length})`}
                                </h3>
                                <div className="flex items-center gap-2">
                                    <select 
                                        className="ncc-input py-1 text-xs sm:w-32" 
                                        value={candidateStatus} 
                                        onChange={(e) => setCandidateStatus(e.target.value)}
                                    >
                                        <option value="Selected">Selected</option>
                                        <option value="Reserve">Reserve</option>
                                        <option value="Attended">Attended</option>
                                    </select>
                                    <button 
                                        className="ncc-btn ncc-btn-primary ncc-btn-sm whitespace-nowrap py-1"
                                        disabled={selectedCandidateIds.length === 0}
                                        onClick={handleBulkAdd}
                                    >
                                        Add Selected ({selectedCandidateIds.length})
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 mb-3">
                                <div className="relative flex-1">
                                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/80" />
                                    <input 
                                        type="text" 
                                        placeholder="Search by Name or Reg. No" 
                                        className="ncc-input pl-9 py-1 text-sm h-9"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <select 
                                    className="ncc-input py-1 text-sm h-9 w-24"
                                    value={selectedDivision}
                                    onChange={(e) => setSelectedDivision(e.target.value)}
                                >
                                    <option value="All">All Div</option>
                                    <option value="SD">SD</option>
                                    <option value="SW">SW</option>
                                </select>
                                <select 
                                    className="ncc-input py-1 text-sm h-9 w-28"
                                    value={selectedCert}
                                    onChange={(e) => setSelectedCert(e.target.value)}
                                >
                                    <option value="All">All Certs</option>
                                    <option value="B1">B1</option>
                                    <option value="B2">B2</option>
                                    <option value="C">C</option>
                                </select>
                            </div>

                            <div className="overflow-y-auto border border-[#ddd8cc] rounded-lg bg-gray-50 dark:bg-[#0a1628] flex-1 ncc-scrollbar">
                                {filteredCandidates.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-gray-500 dark:text-white/70">No eligible cadets found. Try adjusting filters.</div>
                                ) : (
                                    <table className="w-full text-left text-sm">
                                        <thead className="bg-[#f5f0e8] dark:bg-[#0a1628] sticky top-0 border-b border-[#ddd8cc] shadow-[0_1px_0_#ddd8cc] z-10 text-xs">
                                            <tr>
                                                <th className="px-3 py-2 w-10 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300"
                                                        checked={filteredCandidates.length > 0 && filteredCandidates.every(c => selectedCandidateIds.includes(c.id))}
                                                        onChange={handleSelectAll}
                                                    />
                                                </th>
                                                <th className="px-3 py-2 font-bold text-gray-600 dark:text-white/80">Reg. No</th>
                                                <th className="px-3 py-2 font-bold text-gray-600 dark:text-white/80">Name</th>
                                                <th className="px-3 py-2 font-bold text-gray-600 dark:text-white/80">Camps</th>
                                                <th className="px-3 py-2 font-bold text-gray-600 dark:text-white/80">Year</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#ddd8cc]">
                                            {filteredCandidates.map(c => {
                                                const campsCount = (c.campsAttended || []).length;
                                                return (
                                                    <tr key={c.id} className={`ncc-tr transition-all ${selectedCandidateIds.includes(c.id) ? 'ncc-tr-selected' : ''}`}>
                                                        <td className="px-3 py-2 text-center">
                                                            <input 
                                                                type="checkbox" 
                                                                className="rounded border-gray-300"
                                                                checked={selectedCandidateIds.includes(c.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) setSelectedCandidateIds(prev => [...prev, c.id]);
                                                                    else setSelectedCandidateIds(prev => prev.filter(id => id !== c.id));
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="px-3 py-2 font-mono text-xs text-gray-500 dark:text-white/70">{c.enrollmentId || c.regimentalNumber}</td>
                                                        <td className="px-3 py-2 font-bold text-ncc-navy dark:text-white">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span>{c.name}</span>
                                                                {campsCount <= 1 && (
                                                                    <span className="bg-red-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shadow-sm">
                                                                        Priority ({campsCount} {campsCount === 1 ? 'camp' : 'camps'})
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-xs font-bold text-ncc-navy dark:text-ncc-gold">{campsCount}</td>
                                                        <td className="px-3 py-2 text-xs text-gray-500 dark:text-white/70">{c.year || '-'}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Roster Table */}
                    <div className="bg-white dark:bg-[#050b14] rounded-[1.5rem] border border-gray-200 dark:border-white/10 shadow-sm flex-1 flex flex-col overflow-hidden min-h-[480px]">
                        <div className="px-6 py-5 border-b border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] flex justify-between items-center relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 dark:via-white/5 to-transparent skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000" />
                            <div className="flex items-center gap-4 relative z-10 flex-wrap">
                                <h3 className="font-black text-xl font-display text-ncc-navy dark:text-white tracking-tight">Final Roster</h3>
                                <span className="text-[10px] font-black text-ncc-gold uppercase tracking-widest px-2.5 py-1 bg-ncc-gold/10 border border-ncc-gold/20 rounded shadow-sm">{displayRoster.length} Cadets</span>
                                {isBattalionAdmin && roster.length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                const rosterCadets = roster.map(r => 
                                                    cadets.find(c => c.id === r.cadetId)
                                                ).filter(Boolean);
                                                generateNominalRollPDF(
                                                    rosterCadets, 
                                                    `Nominal Roll - ${camp.name}`, 
                                                    `${camp.name}_Roll_Regtl.pdf`,
                                                    'regimental',
                                                    camp.location,
                                                    `${formatDate(camp.startDate)} to ${formatDate(camp.endDate)}`
                                                );
                                            }}
                                            className="flex items-center gap-1.5 text-[9px] font-black text-ncc-navy dark:text-white bg-white dark:bg-[#050b14] border border-[#ddd8cc] px-2.5 py-1.5 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors uppercase tracking-widest"
                                        >
                                            <Download className="w-3 h-3 text-ncc-gold" /> Regtl Roll
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const rosterCadets = roster.map(r => 
                                                    cadets.find(c => c.id === r.cadetId)
                                                ).filter(Boolean);
                                                generateNominalRollPDF(
                                                    rosterCadets, 
                                                    `Nominal Roll - ${camp.name}`, 
                                                    `${camp.name}_Roll_JNTU.pdf`,
                                                    'jntu',
                                                    camp.location,
                                                    `${formatDate(camp.startDate)} to ${formatDate(camp.endDate)}`
                                                );
                                            }}
                                            className="flex items-center gap-1.5 text-[9px] font-black text-ncc-navy dark:text-white bg-white dark:bg-[#050b14] border border-[#ddd8cc] px-2.5 py-1.5 rounded shadow-sm hover:bg-gray-50 dark:hover:bg-white/10 transition-colors uppercase tracking-widest"
                                        >
                                            <Download className="w-3 h-3 text-ncc-gold" /> JNTU Roll
                                        </button>
                                    </div>
                                )}
                            </div>

                            
                            {/* Bulk Awards Tools */}
                            {isBattalionAdmin && roster.length > 0 && (
                                <div className="flex items-center gap-2 bg-white dark:bg-[#050b14] px-3 py-1.5 rounded-lg border border-[#ddd8cc] shadow-sm">
                                    <input 
                                        type="text" 
                                        placeholder="Achievement name..." 
                                        className="ncc-input text-xs h-7 py-1 w-48 border border-gray-300 rounded px-2"
                                        value={bulkAchievementText}
                                        onChange={(e) => setBulkAchievementText(e.target.value)}
                                    />
                                    <button 
                                        className={`text-xs h-7 px-3 font-bold rounded flex items-center gap-1 ${
                                            rosterSelectedIds.length === 0 || !bulkAchievementText.trim() 
                                                ? 'bg-gray-100 dark:bg-[#0d2137] text-gray-400 dark:text-white/80 cursor-not-allowed' 
                                                : 'bg-ncc-gold text-ncc-navy dark:text-white hover:bg-[#d4a83a]/90 cursor-pointer'
                                        }`}
                                        onClick={handleBulkAchievement}
                                        disabled={rosterSelectedIds.length === 0 || !bulkAchievementText.trim()}
                                    >
                                        <Award className="w-3.5 h-3.5" />
                                        Award Selected ({rosterSelectedIds.length})
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="overflow-x-auto overflow-y-auto ncc-scrollbar" style={{ minHeight: '380px' }}>
                            {displayRoster.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 dark:text-white/80 font-medium">No cadets added to this camp yet.</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-100 dark:bg-[#11233c] text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white/70 border-b border-gray-200 dark:border-white/10 sticky top-0 z-10">
                                        <tr>
                                            {isBattalionAdmin && (
                                                <th className="px-4 py-4 w-10 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300 dark:border-white/20 dark:bg-[#050b14] text-ncc-navy focus:ring-ncc-navy"
                                                        checked={roster.length > 0 && rosterSelectedIds.length === roster.length}
                                                        onChange={handleRosterSelectAll}
                                                    />
                                                </th>
                                            )}
                                            <th className="px-4 py-4">Regimental No.</th>
                                            <th className="px-4 py-4">Name</th>
                                            <th className="px-4 py-4">Status</th>
                                            <th className="px-4 py-4 w-2/5">Achievements / Awards</th>
                                            {(isBattalionAdmin || isANO) && <th className="px-4 py-4 text-right">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {displayRoster.map((r, i) => (
                                            <tr key={r.cadetId} className={`ncc-tr transition-all ${rosterSelectedIds.includes(r.cadetId) ? 'ncc-tr-selected' : ''}`}>
                                                {isBattalionAdmin && (
                                                    <td className="px-4 py-3 text-center">
                                                        <input 
                                                            type="checkbox" 
                                                            className="rounded border-gray-300"
                                                            checked={rosterSelectedIds.includes(r.cadetId)}
                                                            onChange={(e) => {
                                                                if (e.target.checked) setRosterSelectedIds(prev => [...prev, r.cadetId]);
                                                                else setRosterSelectedIds(prev => prev.filter(id => id !== r.cadetId));
                                                            }}
                                                        />
                                                    </td>
                                                )}
                                                <td className="px-4 py-3 font-mono text-xs text-gray-500 dark:text-white/70 whitespace-nowrap">{r.enrollmentId}</td>
                                                <td className="px-4 py-3 font-bold text-ncc-navy dark:text-white">{r.cadetName}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-2 py-1 text-[10px] font-bold rounded ${getStatusColor(r.status)}`}>
                                                        {r.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.achievements && r.achievements.length > 0 ? (
                                                        <ul className="space-y-1">
                                                            {[...new Set(r.achievements)].map((ach, idx) => (
                                                                <li key={idx} className="group relative flex items-center gap-1.5 text-xs text-emerald-800 font-medium bg-emerald-50 px-3 py-1.5 rounded-full inline-flex mr-2 mt-1 transition-all pr-12 border border-emerald-200">
                                                                    <Award className="w-3.5 h-3.5 shrink-0" />
                                                                    <span>{ach}</span>
                                                                    {isBattalionAdmin && (
                                                                        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                                                            <button onClick={(e) => { e.stopPropagation(); handleEditAchievement(r.cadetId, ach); }} className="w-5 h-5 flex items-center justify-center bg-white border border-emerald-200 rounded-full text-emerald-600 hover:text-emerald-900 hover:bg-emerald-100 transition-colors shadow-sm" title="Edit Award">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                                                            </button>
                                                                            <button onClick={(e) => { e.stopPropagation(); handleRemoveAchievement(r.cadetId, ach); }} className="w-5 h-5 flex items-center justify-center bg-white border border-red-200 rounded-full text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors shadow-sm" title="Remove Award">
                                                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <span className="text-gray-300 text-xs">-</span>}
                                                    
                                                    {isBattalionAdmin && achievementTarget === r.cadetId && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <input type="text" placeholder="e.g. Best Drill" className="ncc-input text-xs py-1 px-2 h-7" value={achievementText} onChange={(e) => setAchievementText(e.target.value)} />
                                                            <button onClick={handleAddAchievement} className="ncc-btn ncc-btn-primary ncc-btn-sm h-7 text-xs px-2">Save</button>
                                                            <button onClick={() => setAchievementTarget(null)} className="text-gray-400 dark:text-white/80 hover:text-red-500 hover:bg-gray-100 dark:bg-[#0d2137] p-1 rounded"><X className="w-4 h-4"/></button>
                                                        </div>
                                                    )}
                                                </td>
                                                {(isBattalionAdmin || isANO) && (
                                                    <td className="px-4 py-3 text-right">
                                                        <div className="flex justify-end items-center gap-2">
                                                            {isBattalionAdmin && (
                                                                <button 
                                                                    onClick={() => {setAchievementTarget(r.cadetId); setAchievementText('');}}
                                                                    className="text-[10px] font-black uppercase tracking-widest text-ncc-gold hover:text-[#b8830e] hover:bg-ncc-gold/10 px-2.5 py-1.5 rounded transition-colors"
                                                                    disabled={achievementTarget === r.cadetId}
                                                                >
                                                                    + Award
                                                                </button>
                                                            )}
                                                            {(isBattalionAdmin || (isANO && (cadets.find(c => c.id === r.cadetId)?.institutionId === userInstitutionId))) && (
                                                                <button
                                                                    onClick={() => handleRemoveFromRoster(r.cadetId, r.cadetName)}
                                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 dark:text-red-400 rounded transition"
                                                                    title="Remove from Camp"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
