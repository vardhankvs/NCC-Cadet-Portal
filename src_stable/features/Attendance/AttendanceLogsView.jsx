import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, limit, doc, getDoc, setDoc, updateDoc, deleteField, addDoc, serverTimestamp, writeBatch, where } from 'firebase/firestore';
import { db } from '../../firebase/config.js';
import { getCollectionRef, deleteItem, addNotification, checkAndSendLowAttendanceAlert } from '../../firebase/firestoreService.js';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { UserCheck, Clock, Calendar, Download, Search, Filter, Trash2, Plus, X as XIcon } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';
import * as XLSX from 'xlsx';
import { formatDate, normalizeDate, getTodayDateString } from '../../utils/dateUtils.js';
import { sendPushToCadets } from '../../firebase/pushNotifications.js';

export const AttendanceLogsView = () => {
    const { cadets, allCadets } = useDataContext();
    const { userRole, actualRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const isCadetUser = isDelegatedCadet || userRole === 'cadet' || actualRole === 'cadet';
    const cadetRoster = (allCadets && allCadets.length > 0) ? allCadets : (cadets || []);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState(getTodayDateString());
    const [selectedCert, setSelectedCert] = useState('All');
    const [selectedDiv, setSelectedDiv] = useState('All');
    
    // Manual Mark State
    const [showManualMark, setShowManualMark] = useState(false);
    const [manualSearch, setManualSearch] = useState('');
    const [manualCert, setManualCert] = useState('All');
    const [manualDiv, setManualDiv] = useState('All');
    const [selectedCadetIds, setSelectedCadetIds] = useState([]);
    const [manualDate, setManualDate] = useState(getTodayDateString());
    const [marking, setMarking] = useState(false);
    const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);

    const normalizeReg = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

    useEffect(() => {
        const attRef = getCollectionRef('attendance');
        if (!attRef) return;

        const q = query(attRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            // Filter for current institution or active cadets roster if restricted
            if (userRole !== 'superadmin' && userRole !== 'battalion_admin' && userInstitutionId) {
                const activeCadetRegs = new Set(
                    cadetRoster.map(c => normalizeReg(c.enrollmentId || c.regimentalNumber)).filter(Boolean)
                );
                const activeCadetIds = new Set(cadetRoster.map(c => c.id).filter(Boolean));

                list = list.filter(log => {
                    if (log.institutionId === userInstitutionId) return true;
                    if (log.cadetId && activeCadetIds.has(log.cadetId)) return true;
                    const norm = normalizeReg(log.enrollmentId);
                    if (norm && activeCadetRegs.has(norm)) return true;
                    return false;
                });
            }

            // Client-side sorting to latest first
            list.sort((a, b) => {
                const timeA = a.timestamp?.seconds || (a.timestamp ? new Date(a.timestamp).getTime() / 1000 : 0);
                const timeB = b.timestamp?.seconds || (b.timestamp ? new Date(b.timestamp).getTime() / 1000 : 0);
                return timeB - timeA;
            });

            // Client-side deduplication by (enrollmentId || cadetId) + date keeping the latest record
            const seen = new Set();
            const deduplicatedList = [];
            for (const log of list) {
                const reg = normalizeReg(log.enrollmentId);
                const normD = normalizeDate(log.date);
                const key = reg ? `${reg}_${normD}` : `${log.cadetId}_${normD}`;
                if (!seen.has(key)) {
                    seen.add(key);
                    deduplicatedList.push(log);
                }
            }

            setLogs(deduplicatedList);
            setLoading(false);
        }, (err) => {
            console.error("Attendance logs snapshot notice:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userRole, userInstitutionId, cadetRoster]);

    const handleManualMark = async () => {
        if (selectedCadetIds.length === 0) return toast.error("Please select at least one cadet.");
        
        setMarking(true);

        // If performing action under delegated cadet access, route to ANO verification
        if (isCadetUser) {
            try {
                const selectedNames = selectedCadetIds.map(id => {
                    const c = cadets.find(x => x.id === id);
                    return c ? `${c.name} (${c.enrollmentId})` : id;
                });
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'att_logs',
                    moduleName: 'Attendance Scan Logs',
                    actionType: 'create',
                    title: `Mark Attendance for ${selectedCadetIds.length} Cadet(s) on ${manualDate}`,
                    payload: {
                        action: 'bulk_mark_present',
                        date: manualDate,
                        cadetIds: selectedCadetIds,
                        cadetNames: selectedNames,
                        status: 'Present'
                    }
                });
                toast.success(`Attendance for ${selectedCadetIds.length} cadet(s) submitted for ANO verification!`);
                setShowManualMark(false);
                setSelectedCadetIds([]);
            } catch (err) {
                console.error("Delegated bulk mark error:", err);
                toast.error("Failed to submit attendance: " + err.message);
            } finally {
                setMarking(false);
            }
            return;
        }

        try {
            const attRef = getCollectionRef('attendance');
            const cadetsRef = getCollectionRef('cadets');

            let batch = writeBatch(db);
            let opCount = 0;
            let processedCount = 0;

            for (const cadetId of selectedCadetIds) {
                const cadet = cadets.find(c => c.id === cadetId);
                if (!cadet) continue;

                const regId = cadet.enrollmentId || cadet.regimentalNumber || '';
                const normRegId = normalizeReg(regId);
                const division = regId.toUpperCase().includes('SW') ? 'SW' : 'SD';
                const instId = userInstitutionId || cadet.institutionId || '14a-bn-srikakulam';

                // Check if a log entry already exists locally in logs state
                const existingLog = logs.find(l => (l.cadetId === cadetId || normalizeReg(l.enrollmentId) === normRegId) && l.date === manualDate);
                
                // 1. Set/Update Log Entry
                const logRef = existingLog ? doc(attRef, existingLog.id) : doc(attRef);
                batch.set(logRef, {
                    cadetId: cadet.id,
                    cadetName: cadet.name,
                    enrollmentId: regId,
                    certificate: cadet.certificate || cadet.currentCertificate || cadet.B || 'NA',
                    division: division,
                    timestamp: serverTimestamp(),
                    markedBy: 'ANO (Manual Bulk)',
                    institutionId: instId,
                    date: manualDate
                }, { merge: true });
                opCount++;

                // 2. Update Cadet Profile document
                const cadetDocRef = doc(cadetsRef, cadet.id);
                batch.update(cadetDocRef, {
                    [`attendance.${manualDate}`]: 'Present',
                    updatedAt: serverTimestamp()
                });
                opCount++;

                processedCount++;

                // Chunk batch writes every 400 operations to respect Firestore's 500 max limit
                if (opCount >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            }

            if (opCount > 0) {
                await batch.commit();
            }
            
            // Send real-time notification
            try {
                sendPushToCadets(selectedCadetIds, '✅ Attendance Marked', `Your attendance was marked for today's class.`, 'attendance');
            } catch (e) {
                console.error("Push failed:", e);
            }

            toast.success(`Successfully marked ${processedCount} cadets present.`);
            setShowManualMark(false);
            setSelectedCadetIds([]);
        } catch (err) {
            console.error("Bulk mark error:", err);
            toast.error("Failed to process manual attendance: " + err.message);
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
    }); // Showing full roster for bulk operations

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this record?")) return;
        
        const logToDelete = logs.find(l => l.id === id);
        if (!logToDelete) return;

        // If performing deletion under delegated cadet access, route to ANO verification
        if (isCadetUser) {
            try {
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'att_logs',
                    moduleName: 'Attendance Scan Logs',
                    actionType: 'delete',
                    targetDocId: logToDelete.id,
                    title: `Mark Absent (Remove Attendance) for ${logToDelete.cadetName || logToDelete.enrollmentId} on ${logToDelete.date}`,
                    payload: {
                        action: 'delete_attendance_log',
                        logId: logToDelete.id,
                        cadetId: logToDelete.cadetId,
                        cadetName: logToDelete.cadetName,
                        enrollmentId: logToDelete.enrollmentId,
                        date: logToDelete.date
                    }
                });
                toast.success("Attendance removal request submitted for ANO verification!");
            } catch (err) {
                toast.error("Failed to submit attendance removal: " + err.message);
            }
            return;
        }

        try {
            // 1. Remove from Cadet document attendance map (inspect for any date format key variants)
            if (logToDelete.cadetId) {
                const cadetRef = doc(getCollectionRef('cadets'), logToDelete.cadetId);
                const cadetSnap = await getDoc(cadetRef);
                const updates = {};
                const targetNorm = normalizeDate(logToDelete.date);
                
                if (cadetSnap.exists()) {
                    const cadetData = cadetSnap.data();
                    const attMap = cadetData.attendance || {};
                    const keysToRemove = Object.keys(attMap).filter(k => normalizeDate(k) === targetNorm || k === logToDelete.date);
                    if (keysToRemove.length > 0) {
                        keysToRemove.forEach(k => {
                            updates[`attendance.${k}`] = deleteField();
                        });
                    } else {
                        updates[`attendance.${logToDelete.date}`] = deleteField();
                    }
                } else {
                    updates[`attendance.${logToDelete.date}`] = deleteField();
                }
                await updateDoc(cadetRef, updates);
            }

            // 2. Delete original log if it exists in collection
            if (!logToDelete.isVirtual) {
                await deleteItem('attendance', id);
            }

            // 3. Send real-time Absent notification & in-app warning
            if (logToDelete.cadetId) {
                const title = "⚠️ Attendance Alert: Marked Absent";
                const dateStr = formatDate(logToDelete.date);
                const body = `Your attendance record for ${dateStr} was removed. You are marked ABSENT for today's class. Please contact your ANO if you have a valid leave.`;
                try {
                    sendPushToCadets([logToDelete.cadetId], title, body, 'attendance');
                    const cadet = cadets.find(c => c.id === logToDelete.cadetId || c.enrollmentId === logToDelete.enrollmentId);
                    addNotification(
                        logToDelete.cadetId,
                        title,
                        body,
                        'warning',
                        logToDelete.institutionId || cadet?.institutionId || 'gmrit',
                        logToDelete.enrollmentId || cadet?.enrollmentId
                    );
                    if (cadet) {
                        const cadetAtt = { ...(cadet.attendance || {}) };
                        delete cadetAtt[logToDelete.date];
                        let presentCount = 0;
                        Object.values(cadetAtt).forEach(s => {
                            const str = String(s).trim().toUpperCase();
                            if (str === 'PRESENT' || str === 'P' || str === 'VERIFIED' || str === 'LATE' || str === 'ATTENDED' || str === 'EXEMPT' || str === '1') {
                                presentCount++;
                            }
                        });
                        const totalPeriods = Object.keys(cadetAtt).length;
                        const updatedPercentage = totalPeriods > 0 ? (presentCount / totalPeriods) * 100 : 0;
                        const certLevel = cadet.certificate || cadet.currentCertificate || cadet.B || 'B1';
                        checkAndSendLowAttendanceAlert(cadet.id, updatedPercentage, certLevel, null, cadet.institutionId || 'gmrit', cadet.enrollmentId);
                    }
                } catch (e) {
                    console.error("Push failed:", e);
                }
            }

            toast.success("Record deleted successfully.");
        } catch (err) {
            console.error("Delete error:", err);
            toast.error("Cleanup failed: " + err.message);
        }
    };
    
    const handleBulkDelete = async () => {
        if (!window.confirm(`Are you sure you want to delete ${selectedHistoryIds.length} records?`)) return;
        
        setLoading(true);

        // If performing bulk deletion under delegated cadet access, route to ANO verification
        if (isCadetUser) {
            try {
                const selectedLogs = logs.filter(l => selectedHistoryIds.includes(l.id));
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'att_logs',
                    moduleName: 'Attendance Scan Logs',
                    actionType: 'delete',
                    title: `Bulk Remove Attendance for ${selectedHistoryIds.length} Cadet Record(s)`,
                    payload: {
                        action: 'bulk_delete_attendance',
                        logIds: selectedHistoryIds,
                        items: selectedLogs.map(l => ({ logId: l.id, cadetId: l.cadetId, date: l.date, name: l.cadetName, enrollmentId: l.enrollmentId }))
                    }
                });
                toast.success(`Bulk attendance removal for ${selectedHistoryIds.length} records submitted for ANO verification!`);
                setSelectedHistoryIds([]);
            } catch (err) {
                toast.error("Failed to submit bulk removal: " + err.message);
            } finally {
                setLoading(false);
            }
            return;
        }
        try {
            const cadetsRef = getCollectionRef('cadets');
            const attRef = getCollectionRef('attendance');
            
            let batch = writeBatch(db);
            let opCount = 0;
            const deletedLogs = [];

            for (const id of selectedHistoryIds) {
                const log = logs.find(l => l.id === id);
                if (!log) continue;
                deletedLogs.push(log);
                
                // Remove date from cadet attendance map
                if (log.cadetId) {
                    const cadetDocRef = doc(cadetsRef, log.cadetId);
                    const cadet = cadetRoster.find(c => c.id === log.cadetId);
                    const attMap = cadet?.attendance || {};
                    const targetNorm = normalizeDate(log.date);
                    const keysToRemove = Object.keys(attMap).filter(k => normalizeDate(k) === targetNorm || k === log.date);

                    const updates = {};
                    if (keysToRemove.length > 0) {
                        keysToRemove.forEach(k => {
                            updates[`attendance.${k}`] = deleteField();
                        });
                    } else {
                        updates[`attendance.${log.date}`] = deleteField();
                    }
                    batch.update(cadetDocRef, updates);
                    opCount++;
                }
                
                // Delete the log
                if (!log.isVirtual) {
                    const logDocRef = doc(attRef, id);
                    batch.delete(logDocRef);
                    opCount++;
                }

                // Commit in chunks of 400 ops to avoid Firestore limits
                if (opCount >= 400) {
                    await batch.commit();
                    batch = writeBatch(db);
                    opCount = 0;
                }
            }
            
            if (opCount > 0) {
                await batch.commit();
            }

            // Send real-time Absent notification & in-app warning to all affected cadets
            for (const log of deletedLogs) {
                if (log.cadetId) {
                    const title = "⚠️ Attendance Alert: Marked Absent";
                    const dateStr = formatDate(log.date);
                    const body = `Your attendance record for ${dateStr} was removed. You are marked ABSENT for today's class. Contact your ANO if you have a valid leave.`;
                    try {
                        sendPushToCadets([log.cadetId], title, body, 'attendance');
                        const cadet = cadets.find(c => c.id === log.cadetId || c.enrollmentId === log.enrollmentId);
                        addNotification(
                            log.cadetId,
                            title,
                            body,
                            'warning',
                            log.institutionId || cadet?.institutionId || 'gmrit',
                            log.enrollmentId || cadet?.enrollmentId
                        );
                    } catch (e) { console.error("Push failed:", e); }
                }
            }

            toast.success(`Deleted ${selectedHistoryIds.length} records.`);
            setSelectedHistoryIds([]);
        } catch (err) {
            console.error("Bulk delete error:", err);
            toast.error("Failed to perform bulk deletion: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredLogs = logs.filter(log => {
        // Enforce date filter first using normalized date comparison
        if (filterDate && normalizeDate(log.date) !== normalizeDate(filterDate)) return false;

        // Determine cert/div (use log value or fallback to joining with cadet data)
        const logCert = log.certificate || cadets.find(c => c.id === log.cadetId)?.certificate || 'NA';
        const regId = String(log.enrollmentId || '');
        const logDiv = log.division || (regId.toUpperCase().includes('SW') ? 'SW' : 'SD');
        const cadetName = String(log.cadetName || '');

        const matchesSearch = cadetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            regId.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCert = selectedCert === 'All' || logCert === selectedCert;
        const matchesDiv = selectedDiv === 'All' || logDiv === selectedDiv;

        return matchesSearch && matchesCert && matchesDiv;
    });

    // Reset selection when filters change to avoid orphaned IDs
    useEffect(() => {
        setSelectedHistoryIds([]);
    }, [filterDate, selectedCert, selectedDiv, searchTerm]);

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
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Attendance History</h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm">Review and export digital attendance logs.</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setShowManualMark(true)}
                        className="ncc-btn ncc-btn-primary px-6 flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Manual Mark
                    </button>
                    {selectedHistoryIds.length > 0 && (
                        <button 
                            onClick={handleBulkDelete}
                            className="ncc-btn bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 px-6 flex items-center gap-2 animate-in slide-in-from-right-4"
                        >
                            <Trash2 className="w-4 h-4" /> Delete Selected ({selectedHistoryIds.length})
                        </button>
                    )}
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
                <div className="bg-white dark:bg-[#050b14] border-2 border-ncc-gold/30 p-6 rounded-2xl shadow-xl space-y-6 animate-in zoom-in-95 duration-200">
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
                                <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2 block">Search Roster</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 dark:text-white/80" />
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
                                    <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2 block tracking-tighter">Division</label>
                                    <select value={manualDiv} onChange={e => setManualDiv(e.target.value)} className="ncc-input text-[10px] h-9">
                                        <option value="All">All Div.</option>
                                        <option value="SD">SD</option>
                                        <option value="SW">SW</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2 block tracking-tighter">Cert</label>
                                    <select value={manualCert} onChange={e => setManualCert(e.target.value)} className="ncc-input text-[10px] h-9">
                                        <option value="All">All Cert.</option>
                                        <option value="B1">B1</option>
                                        <option value="B2">B2</option>
                                        <option value="C">C</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2 block">Mark for Date</label>
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
                                <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase block">Available Roster ({manualFilteredCadets.length})</label>
                                {selectedCadetIds.length === manualFilteredCadets.length && manualFilteredCadets.length > 0 ? (
                                    <button 
                                        onClick={() => setSelectedCadetIds([])}
                                        className="text-[10px] font-bold text-ncc-red hover:underline"
                                    >
                                        Deselect All
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => setSelectedCadetIds(manualFilteredCadets.map(c => c.id))}
                                        className="text-[10px] font-bold text-ncc-gold hover:underline"
                                    >
                                        Select All Visible
                                    </button>
                                )}
                            </div>
                            <div className="flex-1 overflow-y-auto ncc-scrollbar border border-[#ddd8cc] rounded-xl bg-[#f5f0e8] dark:bg-[#0a1628]/50 p-2 grid grid-cols-1 sm:grid-cols-2 gap-2 content-start">
                                {manualFilteredCadets.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-gray-400 dark:text-white/80 text-xs italic">
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
                                                        : 'bg-white dark:bg-[#050b14] border-transparent hover:border-gray-200 dark:border-white/10 opacity-70 hover:opacity-100'
                                                }`}
                                            >
                                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                    isSelected ? 'bg-emerald-500 border-emerald-500' : 'bg-white dark:bg-[#050b14] border-gray-300'
                                                }`}>
                                                    {isSelected && <UserCheck className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className={`text-xs font-bold truncate ${isSelected ? 'text-emerald-700' : 'text-ncc-navy dark:text-white'}`}>
                                                        {cadet.name}
                                                    </p>
                                                    <p className="text-[9px] text-gray-500 dark:text-white/70 font-mono">{cadet.enrollmentId}</p>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/80" />
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
                    <div className="relative w-full sm:w-56 flex items-center gap-1">
                        <div className="relative flex-1">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/80" />
                            <input 
                                type="date" 
                                className="ncc-input pl-10 text-xs"
                                value={filterDate}
                                onChange={e => setFilterDate(e.target.value)}
                            />
                        </div>
                        {filterDate && (
                            <button 
                                onClick={() => setFilterDate('')}
                                className="px-2.5 py-2 text-[10px] font-black bg-gray-200 dark:bg-white/10 text-gray-700 dark:text-white rounded-lg hover:bg-gray-300 transition uppercase"
                                title="Show All Dates"
                            >
                                All
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#050b14] p-4 rounded-xl border border-[#ddd8cc] shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-ncc-gold/10 text-ncc-gold rounded-full flex items-center justify-center">
                        <UserCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase tracking-tighter">Total Present</p>
                        <p className="text-2xl font-black text-ncc-navy dark:text-white leading-none">{filteredLogs.length}</p>
                    </div>
                </div>
                {/* Additional mini stats can go here if needed */}
            </div>

            <div className="ncc-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-[#f5f0e8] dark:bg-[#0a1628] border-b border-[#ddd8cc]">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input 
                                        type="checkbox" 
                                        className="w-4 h-4 rounded border-gray-300 text-ncc-navy dark:text-white focus:ring-ncc-navy transition-all"
                                        checked={filteredLogs.length > 0 && selectedHistoryIds.length === filteredLogs.length}
                                        onChange={(e) => {
                                            if (e.target.checked) {
                                                setSelectedHistoryIds(filteredLogs.map(l => l.id));
                                            } else {
                                                setSelectedHistoryIds([]);
                                            }
                                        }}
                                    />
                                </th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white">Cadet Details</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white">Marked By</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ede8df]">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-gray-400 dark:text-white/80 text-sm italic">
                                        No attendance records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                 filteredLogs.map((log) => (
                                    <tr key={log.id} className={`transition-colors group ${selectedHistoryIds.includes(log.id) ? 'bg-ncc-gold/5' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                        <td className="px-6 py-4">
                                            <input 
                                                type="checkbox" 
                                                className="w-4 h-4 rounded border-gray-300 text-ncc-navy dark:text-white focus:ring-ncc-navy transition-all cursor-pointer"
                                                checked={selectedHistoryIds.includes(log.id)}
                                                onChange={() => {
                                                    setSelectedHistoryIds(prev => 
                                                        prev.includes(log.id) ? prev.filter(id => id !== log.id) : [...prev, log.id]
                                                    );
                                                }}
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-ncc-navy text-ncc-gold rounded-lg flex items-center justify-center font-bold text-[10px]">
                                                    {log.cadetName.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-ncc-navy dark:text-white text-sm">{log.cadetName}</p>
                                                    <p className="text-[10px] text-gray-400 dark:text-white/80 font-mono tracking-tighter">{log.enrollmentId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-ncc-gold" />
                                                <span className="text-xs font-semibold text-gray-700 dark:text-white/90">{log.markedBy}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-black tracking-widest border border-emerald-100 uppercase">
                                                <UserCheck className="w-3 h-3" /> VERIFIED
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-ncc-navy dark:text-white">
                                                <Clock className="w-3.5 h-3.5 opacity-40" />
                                                <span className="text-xs font-bold">
                                                    {log.timestamp ? `${formatDate(log.timestamp)} ${new Date(log.timestamp.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'N/A'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleDelete(log.id)}
                                                className="p-2 text-gray-400 dark:text-white/80 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
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
                <div className="bg-[#f5f0e8] dark:bg-[#0a1628] px-6 py-3 border-t border-[#ddd8cc] flex justify-between items-center">
                    <p className="text-[10px] font-bold text-gray-500 dark:text-white/70 uppercase tracking-widest">
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
