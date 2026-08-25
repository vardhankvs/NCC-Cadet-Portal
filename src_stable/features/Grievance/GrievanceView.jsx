import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { 
    getCollectionRef, submitGrievance, addGrievanceResponse, 
    updateGrievanceStatus, deleteGrievance, unsendGrievanceResponse,
    editGrievanceResponse, editGrievanceInitialMessage 
} from '../../firebase/firestoreService.js';
import { onSnapshot, query, orderBy, where } from 'firebase/firestore';
import { 
    MessageSquare, LifeBuoy, Send, Shield, AlertCircle, 
    CheckCircle, Clock, ChevronRight, User, X, Filter, Trash2, Edit2
} from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { formatDate } from '../../utils/dateUtils.js';

export const GrievanceView = () => {
    const { userRole, userEnrollmentId, userId, userInstitutionId } = useAuthContext();
    const { cadets, loading: contextLoading } = useDataContext();
    const [grievances, setGrievances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSubmitModal, setShowSubmitModal] = useState(false);
    const [selectedGrievance, setSelectedGrievance] = useState(null);
    const [filterStatus, setFilterStatus] = useState('All');
    const [messageActionSheet, setMessageActionSheet] = useState(null); // {index, text}
    const [editingMessage, setEditingMessage] = useState(null); // {index, text}
    const [searchQuery, setSearchQuery] = useState('');
    const [visibleCount, setVisibleCount] = useState(10);

    // New Grievance Form
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Response Form
    const [responseText, setResponseText] = useState('');
    const [responding, setResponding] = useState(false);

    const currentUser = useMemo(() => {
        return cadets.find(c => c.enrollmentId === userEnrollmentId);
    }, [cadets, userEnrollmentId]);

    useEffect(() => {
        const ref = getCollectionRef('grievances');
        if (!ref) return;

        // Simplify query to avoid composite index requirement
        // We get all (or admin gets all) and then filter in JS if needed
        const q = query(ref, orderBy('createdAt', 'desc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allGrievances = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            // Comprehensive Senior Rank List (Hierarchical Command Chain)
            const seniorRanks = ['LCPL', 'CPL', 'SGT', 'CSM', 'CQMS', 'BHM', 'CHM', 'JUO', 'SUO', 'UO'];
            
            // Check if user is a Senior Rank or Admin (ANO/Staff)
            const userRank = currentUser?.rank || '';
            const isSeniorRank = seniorRanks.some(rank => userRank.toUpperCase().includes(rank));
            const isStaff = userRole === 'admin' || userRank.toUpperCase().includes('ANO') || userRank.toUpperCase().includes('STAFF');
            const isBattalionHQ = userRole === 'superadmin' || userRole === 'battalion_admin';

            // First level: Filter by institutionId if not Battalion HQ
            let collegeGrievances = allGrievances;
            if (!isBattalionHQ) {
                const activeInstId = userInstitutionId || 'none';
                collegeGrievances = allGrievances.filter(g => g.institutionId === activeInstId);
            }

            const canSeeAllCollege = isSeniorRank || isStaff;

            if (isBattalionHQ || canSeeAllCollege) {
                setGrievances(collegeGrievances);
            } else {
                // Regular cadets see only their own within their college
                // Use multiple identifiers (ID, EnrollmentID, Name) to ensure visibility doesn't break
                setGrievances(collegeGrievances.filter(g => 
                    g.cadetId === userId || 
                    g.cadetId === userEnrollmentId ||
                    g.cadetName === currentUser?.name
                ));
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser, userRole, userInstitutionId]);

    // Update selectedGrievance when data changes in grievances list
    useEffect(() => {
        if (selectedGrievance) {
            const updated = grievances.find(g => g.id === selectedGrievance.id);
            if (updated) {
                // Only update if there's an actual change to prevent loops
                if (JSON.stringify(updated) !== JSON.stringify(selectedGrievance)) {
                    setSelectedGrievance(updated);
                }
            }
        }
    }, [grievances, selectedGrievance]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!currentUser) return toast.error("User identity not verified.");
        
        setSubmitting(true);
        try {
            await submitGrievance(
                currentUser.id,
                currentUser.name,
                currentUser.enrollmentId,
                subject,
                message,
                isAnonymous,
                userInstitutionId
            );
            toast.success("Issue reported to the chain of command.");
            setShowSubmitModal(false);
            setSubject('');
            setMessage('');
            setIsAnonymous(false);
        } catch (err) {
            toast.error("Submission failed: " + err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleAddResponse = async (e) => {
        e.preventDefault();
        if (!responseText.trim()) return;
        
        setResponding(true);
        try {
            await addGrievanceResponse(
                selectedGrievance.id,
                currentUser?.name || (userRole === 'admin' ? 'Unit Admin' : 'Cadet'),
                currentUser?.rank || (userRole === 'admin' ? 'ANO/Staff' : 'CDT'),
                responseText,
                userId || 'ADMIN'
            );
            setResponseText('');
            toast.success("Response recorded.");
        } catch (err) {
            toast.error("Failed to add response.");
        } finally {
            setResponding(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await updateGrievanceStatus(selectedGrievance.id, { status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
        } catch (err) {
            toast.error("Update failed.");
        }
    };

    const handleDelete = async () => {
        if (!window.confirm("Are you sure you want to permanently delete this report?")) return;
        try {
            await deleteGrievance(selectedGrievance.id);
            toast.success("Report deleted.");
            setSelectedGrievance(null);
        } catch (err) {
            toast.error("Delete failed.");
        }
    };

    const handleUnsend = async (index) => {
        const isInitial = index === -1;
        if (!window.confirm(isInitial ? "Unsend this report? This will delete the entire ticket." : "Unsend this message?")) return;
        try {
            if (isInitial) {
                await deleteGrievance(selectedGrievance.id);
                setSelectedGrievance(null);
                toast.success("Report unsent.");
            } else {
                await unsendGrievanceResponse(selectedGrievance.id, index);
                toast.success("Message unsent.");
            }
        } catch (err) {
            toast.error("Failed to unsend.");
        }
    };

    const handleEditSubmit = async (index, newText) => {
        const isInitial = index === -1;
        const oldText = isInitial ? selectedGrievance.message : selectedGrievance.responses[index].responseText;
        
        if (!newText.trim() || newText === oldText) {
            setEditingMessage(null);
            return;
        }
        try {
            if (isInitial) {
                await editGrievanceInitialMessage(selectedGrievance.id, newText);
            } else {
                await editGrievanceResponse(selectedGrievance.id, index, newText);
            }
            setEditingMessage(null);
            toast.success("Message edited.");
        } catch (err) {
            toast.error("Failed to edit.");
        }
    };

    const longPressRef = useRef(null);

    const startLongPress = (index, isMe, e) => {
        if (!isMe) return;
        
        // Prevent default only for touch to avoid ghost clicks, but be careful with scrolling
        if (e.pointerType === 'touch') {
            // e.preventDefault(); // Don't prevent default as it breaks scrolling
        }

        if (longPressRef.current) clearTimeout(longPressRef.current);
        
        longPressRef.current = setTimeout(() => {
            setMessageActionSheet({ 
                index, 
                text: index === -1 ? selectedGrievance.message : selectedGrievance.responses[index].responseText 
            });
            // Vibrate on mobile if supported
            if (window.navigator && window.navigator.vibrate) {
                window.navigator.vibrate(50);
            }
        }, 600);
    };

    const stopLongPress = () => {
        if (longPressRef.current) {
            clearTimeout(longPressRef.current);
            longPressRef.current = null;
        }
    };

    // Close menu on click outside
    useEffect(() => {
        const handleGlobalClick = (e) => {
            if (e.target.closest('.action-sheet-content')) return;
            setMessageActionSheet(null);
        };
        if (messageActionSheet !== null) {
            window.addEventListener('click', handleGlobalClick);
            return () => window.removeEventListener('click', handleGlobalClick);
        }
    }, [messageActionSheet]);

    const filteredGrievances = grievances.filter(g => {
        const matchesStatus = filterStatus === 'All' || g.status === filterStatus;
        const matchesSearch = !searchQuery || 
                             g.subject?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                             g.cadetName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                             g.message?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    const paginatedGrievances = filteredGrievances.slice(0, visibleCount);

    if (loading || contextLoading) return <div className="p-20 text-center"><LoadingIndicator /></div>;

    return (
        <div className="space-y-6 fade-in pb-20">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm mb-6">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                        <Shield className="w-7 h-7 text-ncc-gold" /> Grievance Cell
                    </h2>
                    <p className="text-gray-400 dark:text-white/80 text-sm">Official channel for cadet feedback, complaints & redressing.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-64">
                        <MessageSquare className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                        <input 
                            type="text" 
                            placeholder="Search logs..." 
                            className="ncc-input pl-10 py-2 text-sm"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    {userRole !== 'admin' && (
                        <button 
                            onClick={() => setShowSubmitModal(true)}
                            className="bg-ncc-navy text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <LifeBuoy className="w-4 h-4 text-ncc-gold" /> Submit New Issue
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-280px)]">
                {/* Left: List */}
                <div className="lg:col-span-5 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-2 gap-2">
                        <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest flex items-center gap-2">
                            <Filter className="w-3 h-3" /> Filter Status
                        </label>
                        <div className="flex flex-wrap gap-1">
                            {['All', 'Pending', 'Reviewed', 'Resolved'].map(s => (
                                <button 
                                    key={s}
                                    onClick={() => setFilterStatus(s)}
                                    className={`px-3 py-1 rounded-full text-[9px] font-bold transition-all whitespace-nowrap ${
                                        filterStatus === s 
                                            ? 'bg-ncc-navy text-white shadow-md' 
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-white/40 hover:bg-gray-200 dark:hover:bg-white/10 dark:hover:text-white'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3">
                        {paginatedGrievances.length === 0 ? (
                            <div className="bg-white dark:bg-[#050b14] p-12 text-center rounded-2xl border border-dashed border-gray-300">
                                <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                                <p className="text-gray-400 dark:text-white/80 text-sm">No active issues found.</p>
                            </div>
                        ) : (
                            <>
                                {paginatedGrievances.map(g => (
                                    <div 
                                        key={g.id}
                                        onClick={() => setSelectedGrievance(g)}
                                        className={`p-4 rounded-xl border-2 transition-all cursor-pointer group ${
                                            selectedGrievance?.id === g.id 
                                                ? 'bg-ncc-navy border-ncc-navy shadow-lg' 
                                                : 'bg-white dark:bg-[#050b14] border-transparent hover:border-gray-200 dark:border-white/10'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`text-[9px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                                                g.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                g.status === 'Reviewed' ? 'bg-blue-100 text-blue-700' :
                                                'bg-emerald-100 text-emerald-700'
                                            }`}>
                                                {g.status}
                                            </span>
                                            <span className={`text-[10px] font-medium ${selectedGrievance?.id === g.id ? 'text-white/40' : 'text-gray-400 dark:text-white/80'}`}>
                                                {g.createdAt ? formatDate(g.createdAt) : 'Just now'}
                                            </span>
                                        </div>
                                        <h4 className={`font-bold text-sm mb-1 truncate ${selectedGrievance?.id === g.id ? 'text-white' : 'text-ncc-navy dark:text-white'}`}>
                                            {g.subject}
                                        </h4>
                                        <p className={`text-xs line-clamp-2 ${selectedGrievance?.id === g.id ? 'text-white/60' : 'text-gray-500 dark:text-white/70'}`}>
                                            {g.message}
                                        </p>
                                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 bg-ncc-gold/20 rounded-full flex items-center justify-center">
                                                    <User className="w-3 h-3 text-ncc-gold" />
                                                </div>
                                                <span className={`text-[10px] font-bold ${selectedGrievance?.id === g.id ? 'text-ncc-gold' : 'text-gray-500 dark:text-white/70'}`}>
                                                    {g.anonymous ? 'Anonymous' : g.cadetName}
                                                </span>
                                            </div>
                                            <ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${selectedGrievance?.id === g.id ? 'text-ncc-gold' : 'text-gray-300'}`} />
                                        </div>
                                    </div>
                                ))}

                                {visibleCount < filteredGrievances.length && (
                                    <div className="p-4 text-center">
                                        <button 
                                            onClick={() => setVisibleCount(prev => prev + 10)}
                                            className="text-[10px] font-black text-ncc-navy dark:text-white hover:text-ncc-gold uppercase tracking-[0.2em] transition-colors"
                                        >
                                            Load More Logs ({filteredGrievances.length - visibleCount} remaining)
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right: Details & Chat */}
                <div className="lg:col-span-7">
                    {selectedGrievance ? (
                        <div className="bg-white dark:bg-[#050b14] rounded-2xl border border-[#ddd8cc] shadow-xl overflow-hidden flex flex-col h-[550px] sticky top-6">
                            {/* Detail Header */}
                            <div className="p-4 bg-gray-50 dark:bg-[#0a1628] border-b border-[#ddd8cc]">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[10px] font-black text-ncc-gold uppercase tracking-[0.2em]">Ticket #{selectedGrievance.id.slice(-6).toUpperCase()}</span>
                                            {selectedGrievance.priority === 'Critical' && (
                                                <span className="bg-red-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded flex items-center gap-1">
                                                    <AlertCircle className="w-2.5 h-2.5" /> CRITICAL
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-ncc-navy dark:text-white">{selectedGrievance.subject}</h3>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {userRole === 'cadet' && (selectedGrievance.cadetId === userId || selectedGrievance.cadetName === currentUser?.name) && (
                                            <button 
                                                onClick={handleDelete}
                                                className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                title="Delete My Report"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setSelectedGrievance(null)}
                                            className="p-2 text-gray-400 dark:text-white/80 hover:text-gray-600 dark:text-white/80 hover:bg-gray-100 dark:bg-[#0d2137] rounded-lg transition"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-4">
                                    <div className="flex items-center gap-2 bg-white dark:bg-[#050b14] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                                        <User className="w-3.5 h-3.5 text-gray-400 dark:text-white/80" />
                                        <div className="text-[10px]">
                                            <p className="text-gray-400 dark:text-white/80 leading-none mb-0.5 font-bold uppercase">Reported By</p>
                                            <p className="font-bold text-ncc-navy dark:text-white leading-none">{selectedGrievance.cadetName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white dark:bg-[#050b14] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                                        <Clock className="w-3.5 h-3.5 text-gray-400 dark:text-white/80" />
                                        <div className="text-[10px]">
                                            <p className="text-gray-400 dark:text-white/80 leading-none mb-0.5 font-bold uppercase">Date Logged</p>
                                            <p className="font-bold text-ncc-navy dark:text-white leading-none">{selectedGrievance.createdAt ? formatDate(selectedGrievance.createdAt) : 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white dark:bg-[#050b14] px-3 py-1.5 rounded-lg border border-gray-200 dark:border-white/10">
                                        <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                                        <div className="text-[10px]">
                                            <p className="text-gray-400 dark:text-white/80 leading-none mb-0.5 font-bold uppercase">Current Status</p>
                                            <p className="font-bold text-emerald-600 leading-none uppercase">{selectedGrievance.status}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Conversation */}
                            <div className="flex-1 overflow-y-auto ncc-scrollbar p-6 space-y-6 bg-[#fbfbfb] dark:bg-ncc-navy">
                                {/* Initial Message */}
                                <div className="flex gap-3 mb-6 group relative">
                                    <div className="w-8 h-8 rounded-full bg-ncc-navy flex items-center justify-center text-ncc-gold font-bold text-xs flex-shrink-0">
                                        {selectedGrievance.cadetName[0]}
                                    </div>
                                    <div 
                                        onPointerDown={(e) => {
                                            const isMyReport = (selectedGrievance.cadetId === userId) || 
                                                             (selectedGrievance.cadetName === currentUser?.name);
                                            startLongPress(-1, isMyReport, e);
                                        }}
                                        onPointerUp={stopLongPress}
                                        onPointerLeave={stopLongPress}
                                        className={`p-4 rounded-2xl rounded-tl-none border shadow-sm max-w-[85%] transition-all relative cursor-pointer active:scale-[0.98] select-none ${
                                            (selectedGrievance.cadetId === userId || selectedGrievance.cadetName === currentUser?.name) ? 'bg-white dark:bg-white/10 border-gray-100 dark:border-white/5 hover:border-ncc-gold/30' : 'bg-white dark:bg-white/10 border-gray-100 dark:border-white/5'
                                        }`}
                                    >
                                        {(selectedGrievance.cadetId === userId || selectedGrievance.cadetName === currentUser?.name) && !editingMessage && (
                                            <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-gray-800 text-white text-[8px] px-2 py-1 rounded shadow-lg">Hold for options</span>
                                            </div>
                                        )}

                                        {editingMessage?.index === -1 ? (
                                            <div className="flex flex-col gap-2">
                                                <textarea 
                                                    autoFocus
                                                    className="bg-gray-50 dark:bg-[#0a1628] text-ncc-navy dark:text-white border border-gray-200 dark:border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-ncc-gold min-w-[250px]"
                                                    value={editingMessage.text}
                                                    onChange={e => setEditingMessage({ ...editingMessage, text: e.target.value })}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter' && !e.shiftKey) {
                                                            e.preventDefault();
                                                            handleEditSubmit(-1, editingMessage.text);
                                                        }
                                                        if (e.key === 'Escape') setEditingMessage(null);
                                                    }}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingMessage(null)} className="text-[9px] font-bold uppercase opacity-60">Cancel</button>
                                                    <button onClick={() => handleEditSubmit(-1, editingMessage.text)} className="text-[9px] font-bold uppercase text-ncc-navy dark:text-white">Save</button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-gray-700 dark:text-white leading-relaxed whitespace-pre-wrap">
                                                {selectedGrievance.message}
                                                {selectedGrievance.edited && <span className="text-[9px] text-gray-400 dark:text-white/60 ml-2">(edited)</span>}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Responses */}
                                {selectedGrievance.responses?.map((res, i) => {
                                    const isMe = (res.responderId && res.responderId === userId) || 
                                                 (res.responderName === currentUser?.name) || 
                                                 (userRole === 'admin' && res.responderName === 'Unit Admin');
                                    
                                    return (
                                        <div 
                                            key={i} 
                                            className={`flex gap-3 ${isMe ? 'flex-row-reverse' : ''} group relative`}
                                        >
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-[10px] flex-shrink-0 ${
                                                res.responderRank.includes('ANO') || res.responderRank.includes('Staff') ? 'bg-ncc-gold text-ncc-navy dark:text-white' : 'bg-ncc-navy-mid text-white'
                                            }`}>
                                                {res.responderName[0]}
                                            </div>
                                            <div 
                                                onPointerDown={(e) => startLongPress(i, isMe, e)}
                                                onPointerUp={stopLongPress}
                                                onPointerLeave={stopLongPress}
                                                className={`p-4 rounded-2xl border shadow-sm max-w-[85%] transition-all relative cursor-pointer active:scale-[0.98] select-none ${
                                                    isMe 
                                                        ? 'bg-ncc-navy dark:bg-white/20 text-white border-transparent rounded-tr-none hover:bg-ncc-navy-mid dark:hover:bg-white/30' 
                                                        : 'bg-white dark:bg-white/10 text-gray-700 dark:text-white border-gray-100 dark:border-white/5 rounded-tl-none'
                                                }`}
                                            >
                                                {isMe && !editingMessage && (
                                                    <div className="absolute -top-2 right-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <span className="bg-gray-800 text-white text-[8px] px-2 py-1 rounded shadow-lg">Hold for options</span>
                                                    </div>
                                                )}
                                                
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-[9px] font-black uppercase tracking-widest ${isMe ? 'text-ncc-gold' : 'text-ncc-navy dark:text-white'}`}>
                                                        {res.responderRank} {res.responderName}
                                                    </span>
                                                    <span className={`text-[8px] opacity-40 ${isMe ? 'text-white/60' : ''}`}>
                                                        {new Date(res.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        {res.edited && " (edited)"}
                                                    </span>
                                                </div>

                                                {editingMessage?.index === i ? (
                                                    <div className="flex flex-col gap-2">
                                                        <textarea 
                                                            autoFocus
                                                            className="bg-white dark:bg-[#050b14]/10 text-white border border-white/20 rounded-lg p-2 text-sm focus:outline-none focus:border-ncc-gold min-w-[200px]"
                                                            value={editingMessage.text}
                                                            onChange={e => setEditingMessage({ ...editingMessage, text: e.target.value })}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter' && !e.shiftKey) {
                                                                    e.preventDefault();
                                                                    handleEditSubmit(i, editingMessage.text);
                                                                }
                                                                if (e.key === 'Escape') setEditingMessage(null);
                                                            }}
                                                        />
                                                        <div className="flex justify-end gap-2">
                                                            <button 
                                                                onClick={() => setEditingMessage(null)}
                                                                className="text-[9px] font-bold uppercase opacity-60 hover:opacity-100"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                onClick={() => handleEditSubmit(i, editingMessage.text)}
                                                                className="text-[9px] font-bold uppercase text-ncc-gold"
                                                            >
                                                                Save Changes
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                                        {res.responseText}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Response Input */}
                            <div className="p-4 border-t border-[#ddd8cc] bg-white dark:bg-[#050b14]">
                                {userRole === 'admin' && (
                                    <div className="flex gap-2 mb-4">
                                        <button 
                                            onClick={() => handleStatusChange('Reviewed')}
                                            className="ncc-btn-outline text-[9px] font-bold py-1 px-3"
                                        >
                                            Mark Reviewed
                                        </button>
                                        <button 
                                            onClick={() => handleStatusChange('Resolved')}
                                            className="ncc-btn-outline text-[9px] font-bold py-1 px-3 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-600"
                                        >
                                            Mark Resolved
                                        </button>
                                        <button 
                                            onClick={() => handleStatusChange('Escalated')}
                                            className="ncc-btn-outline text-[9px] font-bold py-1 px-3 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-200 hover:text-red-600"
                                        >
                                            Escalate to ANO
                                        </button>
                                    </div>
                                )}
                                <form onSubmit={handleAddResponse} className="relative">
                                    <textarea 
                                        placeholder="Type your response..."
                                        className="ncc-input pr-12 min-h-[80px] py-3 text-sm resize-none"
                                        value={responseText}
                                        onChange={e => setResponseText(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleAddResponse(e);
                                            }
                                        }}
                                    />
                                    <button 
                                        type="submit"
                                        disabled={responding || !responseText.trim()}
                                        className="absolute right-3 bottom-3 p-2 bg-ncc-navy text-ncc-gold rounded-xl hover:scale-110 active:scale-95 transition-all disabled:opacity-30"
                                    >
                                        <Send className="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        </div>
                    ) : (
                        <div className="h-[450px] bg-white dark:bg-[#050b14] rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center p-8 text-center sticky top-6">
                            <div className="w-16 h-16 bg-ncc-gold/10 rounded-full flex items-center justify-center mb-6">
                                <MessageSquare className="w-8 h-8 text-ncc-gold" />
                            </div>
                            <h3 className="text-lg font-bold text-ncc-navy dark:text-white mb-2">Select a Ticket</h3>
                            <p className="text-gray-500 dark:text-white/70 text-xs max-w-xs">
                                Choose an issue from the list to view its details, hierarchy trail, and official unit responses.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {showSubmitModal && (
                <ModalOverlay onClose={() => setShowSubmitModal(false)}>
                    <div className="bg-white dark:bg-[#050b14] rounded-3xl p-8 w-[500px] max-w-[95vw] max-h-[90vh] overflow-y-auto ncc-scrollbar relative shadow-2xl">
                        <button onClick={() => setShowSubmitModal(false)} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-50 dark:bg-white/10 flex items-center justify-center hover:bg-ncc-red hover:text-white dark:hover:bg-ncc-red dark:hover:text-white transition-all z-10 group">
                            <X className="w-4 h-4 text-ncc-navy dark:text-white group-hover:text-white" />
                        </button>
                        
                        <div className="mb-8 text-center">
                            <div className="w-16 h-16 bg-ncc-navy text-ncc-gold rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Report Unit Issue</h3>
                            <p className="text-sm text-gray-500 dark:text-white/70 mt-2">Your concern will be logged into the official record.</p>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Subject / Category</label>
                                <input 
                                    type="text" required
                                    className="ncc-input font-bold"
                                    placeholder="e.g. Uniform Shortage, Leave Application Issue..."
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Detailed Description</label>
                                <textarea 
                                    required
                                    className="ncc-input min-h-[120px] py-3 text-sm"
                                    placeholder="Provide clear details including dates, names, or specific locations if relevant..."
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-[#0a1628] rounded-xl border border-gray-200 dark:border-white/10">
                                <div 
                                    onClick={() => setIsAnonymous(!isAnonymous)}
                                    className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${isAnonymous ? 'bg-ncc-navy' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white dark:bg-[#050b14] rounded-full transition-all ${isAnonymous ? 'right-1' : 'left-1'}`} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-ncc-navy dark:text-white leading-none mb-0.5">Anonymous Submission</p>
                                    <p className="text-[10px] text-gray-400 dark:text-white/80 leading-none">Hide your identity from the general log.</p>
                                </div>
                            </div>

                            <button 
                                type="submit"
                                disabled={submitting}
                                className="w-full ncc-btn ncc-btn-primary justify-center py-4 text-sm font-black uppercase tracking-widest shadow-xl"
                            >
                                {submitting ? "SUBMITTING..." : "AUTHENTICATE & SEND"}
                            </button>
                        </form>
                    </div>
                </ModalOverlay>
            )}
            {/* Message Action Sheet (Overlay) */}
            {messageActionSheet && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-ncc-navy/20 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="action-sheet-content bg-white dark:bg-[#050b14] rounded-3xl shadow-2xl w-full max-w-xs overflow-hidden animate-in zoom-in slide-in-from-bottom-10 duration-300">
                        <div className="p-6 border-b border-gray-100 dark:border-white/5">
                            <p className="text-[10px] font-black uppercase text-gray-400 dark:text-white/80 tracking-widest mb-2">Message Actions</p>
                            <p className="text-sm text-gray-600 dark:text-white/80 line-clamp-2 italic">"{messageActionSheet.text}"</p>
                        </div>
                        <div className="p-2 space-y-1">
                            <button 
                                onClick={() => {
                                    setEditingMessage({ index: messageActionSheet.index, text: messageActionSheet.text });
                                    setMessageActionSheet(null);
                                }}
                                className="w-full flex items-center gap-4 p-4 text-ncc-navy dark:text-white hover:bg-gray-50 dark:bg-[#0a1628] rounded-2xl transition group"
                            >
                                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center group-hover:scale-110 transition">
                                    <Edit2 className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm">Edit Message</p>
                                    <p className="text-[10px] text-gray-400 dark:text-white/80">Correct typos or add info</p>
                                </div>
                            </button>
                            <button 
                                onClick={() => {
                                    handleUnsend(messageActionSheet.index);
                                    setMessageActionSheet(null);
                                }}
                                className="w-full flex items-center gap-4 p-4 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition group"
                            >
                                <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center group-hover:scale-110 transition">
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                </div>
                                <div className="text-left">
                                    <p className="font-bold text-sm">Unsend Message</p>
                                    <p className="text-[10px] text-red-400">Remove from registry</p>
                                </div>
                            </button>
                        </div>
                        <button 
                            onClick={() => setMessageActionSheet(null)}
                            className="w-full p-4 text-xs font-bold text-gray-400 dark:text-white/80 uppercase tracking-widest hover:bg-gray-50 dark:bg-[#0a1628] transition border-t border-gray-50"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
