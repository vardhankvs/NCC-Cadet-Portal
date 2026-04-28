import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, doc, updateDoc, deleteField, addDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import { getCollectionRef, deleteItem } from '../../firebase/firestoreService.js';
import { useDataContext } from '../../context/DataContext.jsx';
import { UserCheck, Clock, Calendar, Download, Search, Filter, Trash2, Plus, X as XIcon } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';
import * as XLSX from 'xlsx';
import { formatDate } from '../../utils/dateUtils.js';


export const AttendanceLogsView = () => {
    const { cadets } = useDataContext();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedCert, setSelectedCert] = useState('All');
    const [selectedDiv, setSelectedDiv] = useState('All');
    
    // Manual Mark State
    const [showManualMark, setShowManualMark] = useState(false);
    const [manualSearch, setManualSearch] = useState('');
    const [manualCert, setManualCert] = useState('All');
    const [manualDiv, setManualDiv] = useState('All');
    const [selectedCadetIds, setSelectedCadetIds] = useState([]);
    const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
    const [marking, setMarking] = useState(false);



    useEffect(() => {
        const attRef = getCollectionRef('attendance');
        if (!attRef) return;

        const q = query(
            attRef,
            orderBy('timestamp', 'desc'),
            limit(500)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleManualMark = async () => {
        if (selectedCadetIds.length === 0) return toast.error("Please select at least one cadet.");
        
        setMarking(true);
        try {
            const batch = writeBatch(db);
            const attRef = getCollectionRef('attendance');
            const cadetsRef = getCollectionRef('cadets');

            for (const cadetId of selectedCadetIds) {
                const cadet = cadets.find(c => c.id === cadetId);
                if (!cadet) continue;

                // Check for duplicate locally first
                const alreadyMarked = logs.find(l => l.cadetId === cadetId && l.date === manualDate);
                if (alreadyMarked) continue;

                const division = cadet.enrollmentId.toUpperCase().includes('SW') ? 'SW' : 'SD';
                
                // 1. Add Log
                const logRef = doc(attRef);
                batch.set(logRef, {
                    cadetId: cadet.id,
                    cadetName: cadet.name,
                    enrollmentId: cadet.enrollmentId,
                    certificate: cadet.certificate || 'NA',
                    division: division,
                    timestamp: serverTimestamp(),
                    markedBy: 'ANO (Manual Bulk)',
                    institutionId: cadet.institutionId || 'gmrit',
                    date: manualDate
                });

                // 2. Update Cadet Profile
                const cadetDocRef = doc(cadetsRef, cadet.id);
                batch.update(cadetDocRef, {
                    [`attendance.${manualDate}`]: 'Present',
                    updatedAt: serverTimestamp()
                });
            }

            await batch.commit();
            toast.success(`Marked ${selectedCadetIds.length} cadets present.`);
            setShowManualMark(false);
            setSelectedCadetIds([]);
        } catch (err) {
            console.error("Bulk mark error:", err);
            toast.error("Failed to process manual attendance.");
        } finally {
            setMarking(false);
        }
    };

    const toggleCadetSelection = (id) => {
        setSelectedCadetIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };

    const manualFilteredCadets = cadets.filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(manualSearch.toLowerCase()) || 
                            c.enrollmentId.toLowerCase().includes(manualSearch.toLowerCase());
        const matchesCert = manualCert === 'All' || c.certificate === manualCert;
        const matchesDiv = manualDiv === 'All' || (c.enrollmentId.toUpperCase().includes(manualDiv));
        return matchesSearch && matchesCert && matchesDiv;
    }).slice(0, 50); // Limit UI for performance

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        
        const logToDelete = logs.find(l => l.id === id);
        if (!logToDelete) return;

        try {
            // 1. Remove from Cadet document attendance map
            const cadetRef = doc(getCollectionRef('cadets'), logToDelete.cadetId);
            await updateDoc(cadetRef, {
                [`attendance.${logToDelete.date}`]: deleteField()
            });

            // 2. Delete original log
            await deleteItem('attendance', id);
            toast.success("Record deleted successfully.");
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Cleanup failed: " + err.message);
        }
    };

    const filteredLogs = logs.filter(log => {
        // Enforce date filter first (User requirement: total on this specific date)
        if (filterDate && log.date !== filterDate) return false;

        // Determine cert/div (use log value or fallback to joining with cadet data)
        const logCert = log.certificate || cadets.find(c => c.id === log.cadetId)?.certificate || 'NA';
        const logDiv = log.division || (log.enrollmentId.toUpperCase().includes('SW') ? 'SW' : 'SD');

        const matchesSearch = log.cadetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.enrollmentId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCert = selectedCert === 'All' || logCert === selectedCert;
        const matchesDiv = selectedDiv === 'All' || logDiv === selectedDiv;

        return matchesSearch && matchesCert && matchesDiv;
    });

    const exportToExcel = () => {
        const data = filteredLogs.map(log => ({
            'Cadet Name': log.cadetName,
            'Enrollment ID': log.enrollmentId,
            'Marked By': log.markedBy,
            'Date': log.date,
            'Time': log.timestamp?.toDate ? log.timestamp.toDate().toLocaleTimeString() : 'N/A'
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Attendance");
        XLSX.writeFile(wb, `NCC_Attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    if (loading) return <div className="p-20 text-center"><LoadingIndicator /></div>;

    return (
        <div className="space-y-6 fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy">Attendance History</h2>
                    <p className="text-gray-500 text-sm">Review and export digital attendance logs.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowManualMark(true)}
                        className="ncc-btn ncc-btn-primary px-6 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Manual Mark
                    </button>
                    <button 
                        onClick={exportToExcel}
                        className="ncc-btn ncc-btn-secondary px-6 flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Export Excel
                    </button>

                </div>
            </header>

            {/* Manual Mark Panel */}
            {showManualMark && (
                <div className="bg-white border-2 border-ncc-gold/30 p-6 rounded-2xl shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
                    <div className="flex justify-between items-center bg-ncc-navy -mx-6 -mt-6 p-4 rounded-t-xl mb-4">
                        <h3 className="font-bold text-white uppercase tracking-widest text-sm flex items-center gap-2">
                             <Plus className="w-4 h-4 text-ncc-gold" /> Bulk Attendance Registry
                        </h3>
                        <button onClick={() => setShowManualMark(false)} className="text-white/50 hover:text-white transition">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Filters Column */}
                        <div className="lg:col-span-4 space-y-4 border-r border-[#ddd8cc] pr-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Search Roster</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                                    <input 
                                        type="text" 
                                        placeholder="Name or ID..."
                                        className="ncc-input pl-9 text-xs"
                                        value={manualSearch}
                                        onChange={e => setManualSearch(e.target.value)}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-tighter">Division</label>
                                    <select value={manualDiv} onChange={e => setManualDiv(e.target.value)} className="ncc-input text-[10px] h-9">
                                        <option value="All">All Div.</option>
                                        <option value="SD">SD</option>
                                        <option value="SW">SW</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block tracking-tighter">Cert</label>
                                    <select value={manualCert} onChange={e => setManualCert(e.target.value)} className="ncc-input text-[10px] h-9">
                                        <option value="All">All Cert.</option>
                                        <option value="B1">B1</option>
                                        <option value="B2">B2</option>
                                        <option value="C">C</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase mb-2 block">Mark for Date</label>
                                <input 
                                    type="date" 
                                    className="ncc-input text-xs"
                                    value={manualDate}
                                    onChange={e => setManualDate(e.target.value)}
                                />
                            </div>

                            <div className="pt-4 mt-4 border-t border-[#ddd8cc]">
                                <button 
                                    onClick={handleManualMark}
                                    disabled={marking || selectedCadetIds.length === 0}
                                    className="ncc-btn ncc-btn-success w-full py-4 flex flex-col items-center justify-center gap-1 shadow-lg disabled:opacity-30 transition-all hover:scale-[1.02]"
                                >
                                    <span className="font-black text-sm">{marking ? 'PROCESSING...' : 'SUBMIT ATTENDANCE'}</span>
                                    <span className="text-[10px] opacity-70 uppercase tracking-tighter">
                                        {selectedCadetIds.length} Cadet(s) Selected
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Checklist Column */}
                        <div className="lg:col-span-8 flex flex-col h-[400px]">
                            <div className="flex justify-between items-end mb-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase block">Available Roster ({manualFilteredCadets.length})</label>
                                <button 
                                    onClick={() => setSelectedCadetIds(manualFilteredCadets.map(c => c.id))}
                                    className="text-[10px] font-bold text-ncc-gold hover:underline"
                                >
                                    Select All Visible
                                </button>
                            </div>
                            <div className="flex-1 overflow-y-auto ncc-scrollbar border border-[#ddd8cc] rounded-xl bg-[#f5f0e8]/50 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                                {manualFilteredCadets.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-gray-400 text-xs italic">
                                        No cadets match these filters.
                                    </div>
                                ) : (
                                    manualFilteredCadets.map(cadet => {
                                        const isSelected = selectedCadetIds.includes(cadet.id);
                                        return (
                                            <div 
                                                key={cadet.id}
                                                onClick={() => toggleCadetSelection(cadet.id)}
                                                className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                                                    isSelected 
                                                        ? 'bg-emerald-50 border-emerald-500 shadow-md translate-x-1' 
                                                        : 'bg-white border-transparent hover:border-gray-200 opacity-70 hover:opacity-100'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                    isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-gray-300'
                                                }`}>
                                                    {isSelected && <UserCheck className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-700' : 'text-ncc-navy'}`}>
                                                        {cadet.name}
                                                    </p>
                                                    <p className="text-[9px] text-gray-500 font-mono">{cadet.enrollmentId}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                            <p className="text-[9px] text-gray-400 italic mt-3">* Showing top 50 results. Use search/filters to find specific cadets.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input 
                        type="text" 
                        placeholder="Search cadet or enrollment ID..." 
                        className="ncc-input pl-10"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="ncc-filter-group">
                        {['All', 'SD', 'SW'].map(div => (
                            <button key={div} onClick={() => setSelectedDiv(div)} className={`ncc-filter-btn ${selectedDiv === div ? 'active' : ''}`}>{div}</button>
                        ))}
                    </div>
                    <div className="ncc-filter-group">
                        {['All', 'B1', 'B2', 'C'].map(cert => (
                            <button key={cert} onClick={() => setSelectedCert(cert)} className={`ncc-filter-btn ${selectedCert === cert ? 'active' : ''}`}>{cert}</button>
                        ))}
                    </div>
                    <div className="relative w-full sm:w-48">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input 
                            type="date" 
                            className="ncc-input pl-10"
                            value={filterDate}
                            onChange={e => setFilterDate(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-[#ddd8cc] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-ncc-gold/10 text-ncc-gold rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Total Present</p>
                        <p className="text-2xl font-black text-ncc-navy leading-none">{filteredLogs.length}</p>
                    </div>
                </div>
                {/* Additional mini stats can go here if needed */}
            </div>

            <div className="ncc-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f5f0e8] border-b border-[#ddd8cc]">
                            <tr>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy">Cadet Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy">Marked By</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ede8df]">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400 text-sm italic">
                                        No attendance records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[#f9f7f2] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-ncc-navy text-ncc-gold rounded-lg flex items-center justify-center font-bold text-[10px]">
                                                    {log.cadetName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-ncc-navy text-sm">{log.cadetName}</p>
                                                    <p className="text-[10px] text-gray-400 font-mono tracking-tighter">{log.enrollmentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-ncc-gold" />
                                                <span className="text-xs font-semibold text-gray-700">{log.markedBy}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black tracking-widest border border-emerald-100 uppercase">
                                                <UserCheck className="w-3 h-3" /> VERIFIED
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-ncc-navy">
                                                <Clock className="w-3.5 h-3.5 opacity-40" />
                                                <span className="text-xs font-bold">
                                                    {log.timestamp ? `${formatDate(log.timestamp)} ${new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(log.id)}
                                                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                                title="Delete Record"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-[#f5f0e8] px-6 py-3 border-t border-[#ddd8cc] flex justify-between items-center">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                        Showing {filteredLogs.length} verified scans
                    </p>
                    <div className="flex gap-2">
                        {/* Pagination placeholder */}
                    </div>
                </div>
            </div>
        </div>
    );
};
