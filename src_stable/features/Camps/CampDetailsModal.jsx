import React, { useState } from 'react';
import { X, Search, Award, Download } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { generateNominalRollPDF } from '../../utils/pdfGenerator.js';

import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { addCadetsToCampBulk, updateCampRoster, logCampAchievement, addCampAchievementsBulk, deleteCamp } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';

export const CampDetailsModal = ({ camp, onClose, onEditCamp }) => {
    const { userRole } = useAuthContext();
    const { cadets } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const roster = camp.roster || [];
    
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

    const unassignedCadets = cadets.filter(c => !roster.some(r => r.cadetId === c.id));
    const filteredCandidates = unassignedCadets.filter(c => {
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
    });

    const handleSelectAll = (e) => {
        if (e.target.checked) setSelectedCandidateIds(filteredCandidates.map(c => c.id));
        else setSelectedCandidateIds([]);
    };

    const handleBulkAdd = async () => {
        if (selectedCandidateIds.length === 0) return;
        try {
            const cadetsToAdd = unassignedCadets.filter(c => selectedCandidateIds.includes(c.id));
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

    const handleAddAchievement = async () => {
        if (!achievementTarget || !achievementText.trim()) return;
        try {
            await logCampAchievement(camp.id, achievementTarget, achievementText.trim());
            toast.success("Achievement logged!");
            setAchievementTarget(null);
            setAchievementText('');
        } catch (err) {
            toast.error(err.message);
        }
    };

    const handleBulkAchievement = async () => {
        if (rosterSelectedIds.length === 0 || !bulkAchievementText.trim()) return;
        try {
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
            <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] modal-in flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 bg-ncc-navy text-white flex-shrink-0">
                    <div>
                        <p className="text-[10px] uppercase tracking-widest text-[#d4a83a] font-bold border border-[#d4a83a] inline-block px-1.5 py-0.5 rounded mb-1">{camp.type}</p>
                        <h2 className="text-xl font-bold font-display leading-tight">{camp.name}</h2>
                        <p className="text-xs text-white/60 mt-0.5">{camp.location} | {formatDate(camp.startDate)} to {formatDate(camp.endDate)}</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-white/70 hover:text-white hover:bg-white dark:bg-[#050b14]/10 rounded-lg transition">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-[#0a1628] flex flex-col gap-6">
                    
                    {/* Admin Actions */}
                    {userRole === 'admin' && (
                        <div className="flex justify-between items-center bg-white dark:bg-[#050b14] p-3 rounded-xl border border-[#ddd8cc] shadow-sm">
                            <button 
                                onClick={() => setShowAddCadets(!showAddCadets)}
                                className={`px-4 py-2 text-sm font-bold rounded-lg transition-all focus:outline-none ${showAddCadets ? 'bg-gray-200 text-gray-700 dark:text-white/90 hover:bg-gray-300' : 'bg-ncc-navy text-white hover:bg-ncc-navy/90'}`}
                            >
                                {showAddCadets ? '↓ Hide Add Cadets Panel' : '+ Assign Cadets to Roster'}
                            </button>
                            <div className="flex gap-2">
                                <button onClick={onEditCamp} className="px-4 py-2 text-sm font-bold text-ncc-navy dark:text-white bg-gray-100 dark:bg-white/10 hover:bg-gray-200 dark:hover:bg-white/20 rounded-lg transition">
                                    Edit Camp
                                </button>
                                <button onClick={handleDeleteCamp} className="px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40 rounded-lg transition">
                                    Delete Camp
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Admin Add Cadet Tool */}
                    {userRole === 'admin' && showAddCadets && (
                        <div className="bg-white dark:bg-[#050b14] p-5 rounded-xl border border-[#ddd8cc] shadow-sm flex flex-col max-h-[400px]">
                            <div className="flex justify-between items-center mb-3">
                                <h3 className="font-bold text-sm uppercase tracking-widest text-ncc-navy dark:text-white">Available Cadets ({filteredCandidates.length})</h3>
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
                                                        checked={filteredCandidates.length > 0 && selectedCandidateIds.length === filteredCandidates.length}
                                                        onChange={handleSelectAll}
                                                    />
                                                </th>
                                                <th className="px-3 py-2 font-bold text-gray-600 dark:text-white/80">Reg. No</th>
                                                <th className="px-3 py-2 font-bold text-gray-600 dark:text-white/80">Name</th>
                                                <th className="px-3 py-2 font-bold text-gray-600 dark:text-white/80">Year</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-[#ddd8cc]">
                                            {filteredCandidates.map(c => (
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
                                                    <td className="px-3 py-2 font-bold text-ncc-navy dark:text-white">{c.name}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500 dark:text-white/70">{c.year || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Roster Table */}
                    <div className="bg-white dark:bg-[#050b14] rounded-xl border border-[#ddd8cc] shadow-sm flex-1 flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-[#ddd8cc] bg-[#f5f0e8] dark:bg-[#0a1628] flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <h3 className="font-bold text-ncc-navy dark:text-white">Final Roster</h3>
                                <span className="text-xs font-bold text-gray-500 dark:text-white/70">{roster.length} Cadets</span>
                                {userRole === 'admin' && roster.length > 0 && (
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
                            {userRole === 'admin' && roster.length > 0 && (
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
                        <div className="overflow-x-auto ncc-scrollbar">
                            {roster.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 dark:text-white/80 font-medium">No cadets added to this camp yet.</div>
                            ) : (
                                <table className="w-full text-sm text-left">
                                    <thead className="ncc-table-head">
                                        <tr>
                                            {userRole === 'admin' && (
                                                <th className="ncc-th w-10 text-center">
                                                    <input 
                                                        type="checkbox" 
                                                        className="rounded border-gray-300"
                                                        checked={roster.length > 0 && rosterSelectedIds.length === roster.length}
                                                        onChange={handleRosterSelectAll}
                                                    />
                                                </th>
                                            )}
                                            <th className="ncc-th">Regimental No.</th>
                                            <th className="ncc-th">Name</th>
                                            <th className="ncc-th">Status</th>
                                            <th className="ncc-th w-2/5">Achievements / Awards</th>
                                            {userRole === 'admin' && <th className="ncc-th">Action</th>}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                        {roster.map((r, i) => (
                                            <tr key={r.cadetId} className={`ncc-tr transition-all ${rosterSelectedIds.includes(r.cadetId) ? 'ncc-tr-selected' : ''}`}>
                                                {userRole === 'admin' && (
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
                                                            {r.achievements.map((ach, idx) => (
                                                                <li key={idx} className="flex items-start gap-1.5 text-xs text-emerald-800 font-medium bg-emerald-50 px-2 py-1 rounded inline-flex mr-2 mt-1">
                                                                    <Award className="w-3.5 h-3.5 shrink-0" />
                                                                    <span>{ach}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    ) : <span className="text-gray-300 text-xs">-</span>}
                                                    
                                                    {userRole === 'admin' && achievementTarget === r.cadetId && (
                                                        <div className="mt-2 flex items-center gap-2">
                                                            <input type="text" placeholder="e.g. Best Drill" className="ncc-input text-xs py-1 px-2 h-7" autoFocus value={achievementText} onChange={(e) => setAchievementText(e.target.value)} />
                                                            <button onClick={handleAddAchievement} className="ncc-btn ncc-btn-primary ncc-btn-sm h-7 text-xs px-2">Save</button>
                                                            <button onClick={() => setAchievementTarget(null)} className="text-gray-400 dark:text-white/80 hover:text-red-500 hover:bg-gray-100 dark:bg-[#0d2137] p-1 rounded"><X className="w-4 h-4"/></button>
                                                        </div>
                                                    )}
                                                </td>
                                                {userRole === 'admin' && (
                                                    <td className="px-4 py-3">
                                                        <button 
                                                            onClick={() => {setAchievementTarget(r.cadetId); setAchievementText('');}}
                                                            className="text-xs font-bold text-ncc-gold hover:underline"
                                                            disabled={achievementTarget === r.cadetId}
                                                        >
                                                            + Award
                                                        </button>
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
