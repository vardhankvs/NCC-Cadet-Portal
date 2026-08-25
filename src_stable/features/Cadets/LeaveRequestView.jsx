import React, { useState, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { getCollectionRef, recordAttendance } from '../../firebase/firestoreService.js';
import { onSnapshot, addDoc, updateDoc, doc, query, orderBy, where } from 'firebase/firestore';
import { Calendar, FileText, CheckCircle, XCircle, Clock, Send, Plus, User, MessageSquare, Search } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { sendPushToUser } from '../../firebase/pushNotifications.js';

const compressImageToBase64 = (file, maxWidth = 800, quality = 0.6) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const LeaveRequestView = () => {
    const { userRole, userEnrollmentId, user, hasPermission } = useAuthContext();
    const isCadet = userRole === 'cadet';
    const isAdminView = !isCadet && (userRole === 'admin' || userRole === 'superadmin' || userRole === 'battalion_admin' || userRole === 'officer' || userRole === 'ano' || hasPermission('leave_requests'));
    const { cadets } = useDataContext();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [expandedCadetId, setExpandedCadetId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCert, setFilterCert] = useState('All');
    const [filterDiv, setFilterDiv] = useState('All');
    const [cadetSearchQuery, setCadetSearchQuery] = useState('');
    const [proofFile, setProofFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const currentCadet = cadets.find(c => c.enrollmentId === userEnrollmentId);

    // Group requests by cadet for admin view
    const groupedRequests = React.useMemo(() => {
        if (!isAdminView) return {};
        const groups = requests.reduce((acc, req) => {
            const cid = req.cadetId;
            const cadetData = cadets.find(c => c.enrollmentId === cid);
            if (!acc[cid]) {
                acc[cid] = {
                    cadetName: req.cadetName || cadetData?.name || 'Unknown Cadet',
                    certificate: cadetData?.certificate || 'NA',
                    requests: []
                };
            }
            acc[cid].requests.push(req);
            return acc;
        }, {});

        const lowerQuery = searchQuery.toLowerCase();
        const filtered = {};
        for (const [cid, group] of Object.entries(groups)) {
            // Apply Search Filter
            if (searchQuery && !cid.toLowerCase().includes(lowerQuery) && !group.cadetName.toLowerCase().includes(lowerQuery)) {
                continue;
            }
            
            // Apply Certificate Filter
            if (filterCert !== 'All' && group.certificate !== filterCert) {
                continue;
            }
            
            // Apply Division Filter
            if (filterDiv !== 'All' && !cid.toUpperCase().includes(filterDiv)) {
                continue;
            }
            
            filtered[cid] = group;
        }
        return filtered;
    }, [requests, isAdminView, cadets, searchQuery, filterCert, filterDiv]);

    // Filter requests for cadet view
    const filteredCadetRequests = React.useMemo(() => {
        if (isAdminView) return [];
        if (!searchQuery) return requests;
        
        const q = searchQuery.toLowerCase();
        return requests.filter(req => {
            const startFormatted = req.startDate ? req.startDate.split('-').reverse().join('-') : '';
            const endFormatted = req.endDate ? req.endDate.split('-').reverse().join('-') : '';

            return (req.type || '').toLowerCase().includes(q) || 
                   (req.startDate || '').includes(q) || 
                   startFormatted.includes(q) ||
                   (req.endDate || '').includes(q) ||
                   endFormatted.includes(q) ||
                   (req.timestamp || '').includes(q);
        });
    }, [requests, isAdminView, searchQuery]);

    // Form state
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        reason: '',
        type: 'Sick Leave'
    });

    useEffect(() => {
        let q;
        if (isAdminView) {
            q = query(getCollectionRef('leave_requests'));
        } else {
            const cadId = (userEnrollmentId || currentCadet?.enrollmentId || user?.uid || '').toString().trim().toUpperCase();
            if (cadId) {
                q = query(getCollectionRef('leave_requests'), where('cadetId', '==', cadId));
            } else {
                q = query(getCollectionRef('leave_requests'));
            }
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort in frontend to avoid composite index requirement
            data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setRequests(data);
            setLoading(false);
        }, (err) => {
            console.error('Leave requests subscription error:', err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isAdminView, userEnrollmentId, currentCadet?.enrollmentId, user?.uid]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsUploading(true);
        try {
            let proofUrl = null;
            if (proofFile) {
                // Resize and compress image to base64 to store in Firestore (bypassing Storage)
                proofUrl = await compressImageToBase64(proofFile);
            }

            await addDoc(getCollectionRef('leave_requests'), {
                ...formData,
                cadetId: userEnrollmentId,
                cadetName: currentCadet?.name || user?.displayName || 'Unknown Cadet',
                status: 'pending',
                timestamp: new Date().toISOString(),
                adminRemarks: '',
                proofUrl: proofUrl || null
            });
            toast.success("Leave request submitted successfully!");
            setShowForm(false);
            setFormData({ startDate: '', endDate: '', reason: '', type: 'Sick Leave' });
            setProofFile(null);
        } catch (err) {
            console.error(err);
            toast.error("Failed to submit request.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleAction = async (id, status, req, attendanceStatus = 'Exempt') => {
        const remarks = prompt(`Enter remarks for ${status}:`);
        if (remarks === null) return;
        
        try {
            const docRef = doc(getCollectionRef('leave_requests'), id);
            await updateDoc(docRef, {
                status,
                adminRemarks: remarks,
                processedAt: new Date().toISOString()
            });

            // If approved, mark attendance for the requested dates
            if (status === 'approved' && req && attendanceStatus) {
                const start = new Date(req.startDate);
                const end = new Date(req.endDate);
                // Ensure dates are valid
                if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        const dateStr = d.toISOString().split('T')[0];
                        // If cadetId is valid, record attendance
                        const targetCadet = cadets.find(c => c.enrollmentId === req.cadetId || c.id === req.cadetId);
                        const targetDocId = targetCadet?.id;
                        if (targetDocId) {
                            await recordAttendance(targetDocId, dateStr, attendanceStatus);
                        } else {
                            console.warn('Cadet document not found for attendance update', req.cadetId);
                        }
                    }
                }
            }

            toast.success(`Request ${status}`);
            // Notify only the cadet whose leave was actioned
            const cadetEnrollment = req.cadetId || req.enrollmentId;
            sendPushToUser(
                cadetEnrollment,
                status === 'approved' ? '✅ Leave Approved' : '❌ Leave Rejected',
                `Your leave request (${req.type || 'Leave'}: ${req.startDate} to ${req.endDate}) has been ${status}${req.adminRemarks ? '. Remarks: ' + req.adminRemarks : ''}.`,
                'leave_requests'
            );
        } catch (err) {
            console.error(err);
            toast.error("Action failed.");
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-amber-100 text-amber-700 border-amber-200';
        }
    };

    const renderRequestCard = (req) => (
        <div key={req.id} className="bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] p-6 shadow-sm hover:shadow-md transition-all">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                            {req.status}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase tracking-tighter">
                            {new Date(req.timestamp).toLocaleDateString()}
                        </span>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-bold text-ncc-navy dark:text-white flex items-center gap-2 flex-wrap">
                            {isAdminView ? (
                                <>
                                    <User className="w-5 h-5 text-ncc-red" />
                                    <span className="text-ncc-red dark:text-white">
                                        {req.cadetName || cadets.find(c => c.enrollmentId === req.cadetId)?.name || 'Unknown Cadet'}
                                    </span>
                                    <span className="text-gray-400 dark:text-white/80 font-medium text-xs">({req.cadetId})</span>
                                    <span className="text-gray-300 mx-1">|</span>
                                </>
                            ) : null}
                            {req.type}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-white/80 mt-2 leading-relaxed">{req.reason}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-2 text-ncc-navy dark:text-white bg-gray-50 dark:bg-[#0a1628] px-3 py-2 rounded-lg">
                            <Calendar className="w-3.5 h-3.5" />
                            <span className="font-bold">{req.startDate}</span>
                            <span className="text-gray-400 dark:text-white/80">to</span>
                            <span className="font-bold">{req.endDate}</span>
                        </div>
                    </div>

                    {req.adminRemarks && (
                        <div className="bg-gray-50 dark:bg-[#0a1628] p-4 rounded-xl border border-gray-100 dark:border-white/5 flex gap-3">
                            <MessageSquare className="w-4 h-4 text-gray-400 dark:text-white/80 mt-1" />
                            <div>
                                <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase">Admin Remarks</p>
                                <p className="text-sm text-gray-600 dark:text-white/80 italic">"{req.adminRemarks}"</p>
                            </div>
                        </div>
                    )}

                    {req.proofUrl && (
                        <div className="mt-4">
                            <a href={req.proofUrl} download={`Proof_${req.cadetId}.jpg`} className="inline-flex items-center gap-2 bg-ncc-navy/10 text-ncc-navy dark:bg-white/10 dark:text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-ncc-navy/20 dark:hover:bg-white/20 transition-all">
                                <FileText className="w-4 h-4" /> Download Attached Proof
                            </a>
                        </div>
                    )}
                </div>

                {isAdminView && req.status === 'pending' && (
                    <div className="flex flex-col gap-2 min-w-[200px]">
                        <button 
                            onClick={() => handleAction(req.id, 'approved', req, 'Present')}
                            className="w-full bg-ncc-navy text-white p-3 rounded-xl hover:bg-ncc-navy-mid transition-colors flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="w-5 h-5" /> <span className="font-bold text-sm">Mark Present (Duty)</span>
                        </button>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleAction(req.id, 'approved', req, 'Exempt')}
                                className="flex-1 bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <CheckCircle className="w-5 h-5" /> <span className="font-bold text-sm">Approve</span>
                            </button>
                            <button 
                                onClick={() => handleAction(req.id, 'rejected', req, null)}
                                className="flex-1 bg-red-500 text-white p-3 rounded-xl hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
                            >
                                <XCircle className="w-5 h-5" /> <span className="font-bold text-sm">Reject</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    if (loading) return <div className="p-20 text-center animate-pulse text-ncc-navy dark:text-white font-bold">Loading applications...</div>;

    return (
        <div className="max-w-5xl mx-auto space-y-6 fade-in p-4 lg:p-0">
            <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 sm:p-8 bg-gradient-to-r from-ncc-navy via-[#1a365d] to-ncc-navy dark:from-[#050b14] dark:via-[#0a1628] dark:to-[#050b14] rounded-[2.5rem] shadow-xl relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 w-72 h-72 bg-ncc-gold/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                <div className="absolute bottom-0 left-0 w-56 h-56 bg-ncc-red/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                            <Calendar className="w-7 h-7 text-ncc-gold" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-ncc-gold">
                                {isCadet ? 'CADET PORTAL' : '14(A) BN NCC HEADQUARTERS'}
                            </span>
                            <h2 className="text-2xl sm:text-3xl font-display font-black text-white">
                                {isCadet ? 'Apply Leave & Permissions' : 'Leave & Permissions Desk'}
                            </h2>
                        </div>
                    </div>
                    <p className="text-white/70 text-xs sm:text-sm">
                        {isCadet ? 'Submit parade leave, academic exam exemption, or duty permission requests directly to your ANO.' : 'Review, approve, and manage cadet parade leave and duty applications.'}
                    </p>
                </div>
                {!isAdminView && (
                    <div className="relative z-10">
                        <button 
                            onClick={() => setShowForm(!showForm)}
                            className="px-6 py-3.5 bg-ncc-gold text-ncc-navy font-bold rounded-2xl flex items-center gap-2 hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(184,131,14,0.3)] group"
                        >
                            {showForm ? <XCircle className="w-5 h-5" /> : <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />}
                            {showForm ? 'Cancel Application' : '+ Apply Leave'}
                        </button>
                    </div>
                )}
            </header>

            {isAdminView && (
                <div className="flex flex-col md:flex-row gap-4 mb-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
                        <input 
                            type="text"
                            placeholder="Search by Cadet Name or Regimental Number..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy focus:ring-1 focus:ring-ncc-navy transition-all dark:text-white shadow-sm"
                        />
                    </div>
                    <select 
                        value={filterCert}
                        onChange={(e) => setFilterCert(e.target.value)}
                        className="p-4 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none dark:text-white shadow-sm font-bold min-w-[130px]"
                    >
                        <option value="All">All Certs</option>
                        <option value="B1">B1</option>
                        <option value="B2">B2</option>
                        <option value="C">C</option>
                    </select>
                    <select 
                        value={filterDiv}
                        onChange={(e) => setFilterDiv(e.target.value)}
                        className="p-4 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none dark:text-white shadow-sm font-bold min-w-[130px]"
                    >
                        <option value="All">All Divs</option>
                        <option value="SD">SD</option>
                        <option value="SW">SW</option>
                        <option value="JD">JD</option>
                        <option value="JW">JW</option>
                    </select>
                </div>
            )}

            {(!isAdminView) && !showForm && requests.length > 0 && (
                <div className="relative mb-2">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
                    <input 
                        type="text"
                        placeholder="Search your requests by Date (DD-MM-YYYY) or Type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy focus:ring-1 focus:ring-ncc-navy transition-all dark:text-white shadow-sm"
                    />
                </div>
            )}

            {showForm && (!isAdminView) && (
                <div className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-xl slide-down">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Leave Type</label>
                                <select 
                                    className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl p-3 focus:ring-2 focus:ring-ncc-navy outline-none dark:text-white"
                                    value={formData.type}
                                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                                >
                                    <option className="dark:bg-[#0a1628]">Sick Leave</option>
                                    <option className="dark:bg-[#0a1628]">Personal/Family Reason</option>
                                    <option className="dark:bg-[#0a1628]">Academic/Exam Leave</option>
                                    <option className="dark:bg-[#0a1628]">Camp Conflict</option>
                                    <option className="dark:bg-[#0a1628]">Other Permission</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Start Date</label>
                                    <input 
                                        type="date" required
                                        className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl p-3"
                                        value={formData.startDate}
                                        onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">End Date</label>
                                    <input 
                                        type="date" required
                                        className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl p-3"
                                        value={formData.endDate}
                                        onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Reason for Leave</label>
                            <textarea 
                                required rows="4"
                                placeholder="Explain clearly why you need leave..."
                                className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl p-4 focus:ring-2 focus:ring-ncc-navy outline-none"
                                value={formData.reason}
                                onChange={(e) => setFormData({...formData, reason: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Attach Proof (Image Only)</label>
                            <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => setProofFile(e.target.files[0])}
                                className="w-full bg-gray-50 dark:bg-[#0a1628] border border-gray-200 dark:border-white/10 rounded-xl p-3 text-sm dark:text-white"
                            />
                        </div>
                        <button disabled={isUploading} type="submit" className="w-full bg-ncc-red text-white py-4 rounded-xl font-black uppercase tracking-widest hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                            <Send className="w-5 h-5" /> {isUploading ? 'Uploading & Submitting...' : 'Submit Application'}
                        </button>
                    </form>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {requests.length === 0 ? (
                    <div className="bg-white dark:bg-[#050b14] p-16 text-center rounded-[2.5rem] border border-dashed border-[#ddd8cc] dark:border-white/10">
                        <div className="w-16 h-16 bg-ncc-navy/10 dark:bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4 text-ncc-navy dark:text-ncc-gold">
                            <Calendar className="w-8 h-8" />
                        </div>
                        <h4 className="text-lg font-bold text-ncc-navy dark:text-white mb-1">
                            {isCadet ? 'No Leave Applications' : 'No Leave Requests Found'}
                        </h4>
                        <p className="text-gray-500 dark:text-white/60 text-sm max-w-md mx-auto mb-6">
                            {isCadet ? "You haven't submitted any leave or duty exemption requests yet." : 'There are currently no active or pending leave applications from cadets.'}
                        </p>
                        {isCadet && !showForm && (
                            <button onClick={() => setShowForm(true)} className="px-6 py-3.5 bg-ncc-gold text-ncc-navy font-bold rounded-2xl hover:bg-white hover:scale-105 transition-all shadow-[0_0_20px_rgba(184,131,14,0.3)] inline-flex items-center gap-2">
                                <Plus className="w-5 h-5" /> Apply For Leave
                            </button>
                        )}
                    </div>
                ) : isAdminView ? (
                    Object.entries(groupedRequests).map(([cadetId, group]) => (
                        <div key={cadetId} className="bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] shadow-sm overflow-hidden">
                            <button 
                                onClick={() => {
                                    setExpandedCadetId(expandedCadetId === cadetId ? null : cadetId);
                                    setCadetSearchQuery('');
                                }}
                                className="w-full p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="w-10 h-10 bg-ncc-navy text-white rounded-full flex items-center justify-center font-bold">
                                            <User className="w-5 h-5" />
                                        </div>
                                        {group.requests.some(r => r.status === 'pending') && (
                                            <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-ncc-red border-2 border-white dark:border-[#050b14] rounded-full animate-pulse shadow-sm"></span>
                                        )}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-lg font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                                            {group.cadetName}
                                        </h3>
                                        <p className="text-sm font-mono text-gray-500 dark:text-white/70">{cadetId}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${group.requests.some(r => r.status === 'pending') ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white'}`}>
                                        {group.requests.length} Request{group.requests.length !== 1 && 's'}
                                    </span>
                                    <svg className={`w-5 h-5 transform transition-transform ${expandedCadetId === cadetId ? 'rotate-180' : ''} text-gray-400`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </button>
                            
                            {expandedCadetId === cadetId && (
                                <div className="p-6 pt-0 border-t border-[#ddd8cc] dark:border-white/10 bg-gray-50 dark:bg-[#0a1628]/50 space-y-4">
                                    <div className="pt-6">
                                        <div className="relative mb-4">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <input 
                                                type="text"
                                                placeholder="Search requests by Date (DD-MM-YYYY) or Type..."
                                                value={cadetSearchQuery}
                                                onChange={e => setCadetSearchQuery(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 rounded-xl bg-white dark:bg-[#050b14] border border-gray-200 dark:border-white/5 outline-none focus:border-ncc-navy text-sm dark:text-white shadow-sm"
                                            />
                                        </div>
                                        <div className="space-y-4">
                                            {group.requests.filter(req => {
                                                if (!cadetSearchQuery) return true;
                                                const q = cadetSearchQuery.toLowerCase();
                                                const startFormatted = req.startDate ? req.startDate.split('-').reverse().join('-') : '';
                                                const endFormatted = req.endDate ? req.endDate.split('-').reverse().join('-') : '';

                                                return (req.type || '').toLowerCase().includes(q) || 
                                                       (req.startDate || '').includes(q) || 
                                                       startFormatted.includes(q) ||
                                                       (req.endDate || '').includes(q) ||
                                                       endFormatted.includes(q) ||
                                                       (req.timestamp || '').includes(q);
                                            }).map(req => renderRequestCard(req))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    filteredCadetRequests.length > 0 ? (
                        filteredCadetRequests.map(req => renderRequestCard(req))
                    ) : (
                        <div className="bg-white dark:bg-[#050b14] p-10 text-center rounded-3xl border border-dashed border-gray-300">
                            <p className="text-gray-400 dark:text-white/80 font-bold italic">No requests match your search.</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};
