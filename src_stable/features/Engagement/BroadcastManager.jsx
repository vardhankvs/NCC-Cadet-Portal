import React, { useState, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { addDoc, onSnapshot, query, orderBy, limit, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { Megaphone, Send, Users, Mail, Bell, MessageSquare, CheckCircle, Trash2, Edit3, Clock, Shield } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { requestNotificationPermission } from '../../firebase/messagingService.js';
export const BroadcastManager = () => {
    const { cadets, allCadets, alumni } = useDataContext();
    const { userInstitutionId, user, userRole } = useAuthContext();
    const [selectedGroup, setSelectedGroup] = useState('All');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedDivision, setSelectedDivision] = useState('All');
    const [pastBroadcasts, setPastBroadcasts] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [searchDate, setSearchDate] = useState('');
    
    // Safety Net Settings
    const [safetyEnabled, setSafetyEnabled] = useState(false);
    const [safetyDeadline, setSafetyDeadline] = useState('20:00');
    const [safetyMessage, setSafetyMessage] = useState('Cadets are reminded to follow standard daily routines tomorrow. No specific changes in orders.');
    const [safetyCert, setSafetyCert] = useState('All');
    const [safetyDiv, setSafetyDiv] = useState('All');
    const [isSavingSafety, setIsSavingSafety] = useState(false);

    useEffect(() => {
        // Load Safety Settings
        const safetyRef = doc(getCollectionRef('settings'), 'broadcast_safety');
        const unsubSafety = onSnapshot(safetyRef, (snap) => {
            if (snap.exists()) {
                const d = snap.data();
                setSafetyEnabled(d.enabled || false);
                setSafetyDeadline(d.deadline || '20:00');
                setSafetyMessage(d.message || '');
                setSafetyCert(d.targetCert || 'All');
                setSafetyDiv(d.targetDiv || 'All');
            }
        });

        const q = query(getCollectionRef('notifications'), orderBy('timestamp', 'desc'), limit(10));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPastBroadcasts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => {
            unsubscribe();
            unsubSafety();
        };
    }, []);

    const handleSaveSafety = async () => {
        setIsSavingSafety(true);
        try {
            const safetyRef = doc(getCollectionRef('settings'), 'broadcast_safety');
            await setDoc(safetyRef, {
                enabled: safetyEnabled,
                deadline: safetyDeadline,
                message: safetyMessage,
                targetCert: safetyCert,
                targetDiv: safetyDiv,
                updatedAt: new Date().toISOString(),
                updatedBy: 'Unit Admin'
            }, { merge: true });
            toast.success("Safety Broadcast configuration updated!");
        } catch (err) {
            toast.error("Failed to update safety settings.");
        } finally {
            setIsSavingSafety(false);
        }
    };

    const lastBroadcastDate = pastBroadcasts.length > 0 ? new Date(pastBroadcasts[0].timestamp) : null;
    const isOverdue = !lastBroadcastDate || (new Date() - lastBroadcastDate) > (24 * 60 * 60 * 1000);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;
        
        setSending(true);
        try {
            if (editingId) {
                await updateDoc(doc(getCollectionRef('notifications'), editingId), {
                    subject: subject || 'Unit Update',
                    message: message,
                    channel: 'app',
                    target: selectedGroup,
                    targetCertificate: selectedCertificate,
                    targetDivision: selectedDivision,
                    timestamp: new Date().toISOString(), // Update timestamp to trigger new notification
                    updatedAt: new Date().toISOString(),
                    institutionId: userInstitutionId
                });
                toast.success("Broadcast updated and cadets notified!");
                setEditingId(null);
            } else {
                await addDoc(getCollectionRef('notifications'), {
                    subject: subject || 'Unit Update',
                    message: message,
                    channel: 'app',
                    target: selectedGroup,
                    targetCertificate: selectedCertificate,
                    targetDivision: selectedDivision,
                    sender: 'Unit Admin',
                    timestamp: new Date().toISOString(),
                    cadetCount: filteredCadets.length,
                    institutionId: userInstitutionId
                });

                // Trigger Vercel Push Notification API
                const tokens = filteredCadets.flatMap(c => c.fcmTokens || []);
                if (tokens.length > 0) {
                    try {
                        const response = await fetch('/api/sendBroadcast', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                subject: subject || 'Unit Update',
                                message: message,
                                tokens: tokens
                            })
                        });
                        const data = await response.json();
                        if (data.success) {
                            console.log(`Pushed to ${data.successCount} devices.`);
                        } else {
                            console.error('Push warning:', data);
                        }
                    } catch (e) {
                        console.error('Vercel API request failed:', e);
                    }
                }

                toast.success(`Broadcast sent to ${filteredCadets.length} cadets!`);
            }
            setMessage('');
            setSubject('');
        } catch (err) {
            toast.error("Failed to process broadcast.");
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Remove this broadcast from the notice board?")) return;
        try {
            await deleteDoc(doc(getCollectionRef('notifications'), id));
            toast.info("Broadcast removed.");
        } catch (err) {
            toast.error("Failed to delete.");
        }
    };

    const startEdit = (b) => {
        setEditingId(b.id);
        setSubject(b.subject);
        setMessage(b.message);
        setSelectedGroup(b.target);
        setSelectedCertificate(b.targetCertificate || 'All');
        setSelectedDivision(b.targetDivision || 'All');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const groups = ['All', 'Alpha', 'Bravo', 'Charlie', 'Delta', 'Ex-Cadets'];
    const certificates = ['All', 'B1', 'B2', 'C'];
    const divisions = ['All', 'SD', 'SW'];
    
    const filteredCadets = allCadets.filter(c => {
        let match = true;
        if (selectedGroup === 'All') {
            // Default "All" to active cadets only
            match = match && c.status !== 'alumni';
        } else if (selectedGroup === 'Ex-Cadets') {
            match = match && c.status === 'alumni';
        } else {
            // Specific company selected: usually means active cadets in that company
            match = match && c.company === selectedGroup && c.status !== 'alumni';
        }

        if (selectedCertificate !== 'All') {
            const cert = c.certificate || c.B;
            match = match && cert === selectedCertificate;
        }
        if (selectedDivision !== 'All') {
            const regNo = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            match = match && regNo.includes(selectedDivision);
        }
        return match;
    });

    return (
        <div className="space-y-8 fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                        <Megaphone className="w-8 h-8 text-ncc-red" /> Unit Broadcast Center
                    </h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm">Send real-time push notifications to Home & Lock screens.</p>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                            <Shield className="w-3 h-3" /> Push System: Active
                        </span>
                        <span className="text-[10px] font-bold text-ncc-navy bg-gray-100 px-2.5 py-1 rounded-full">
                            Active: {cadets.length}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                            Ex-Cadets: {alumni.length}
                        </span>
                        <span className="text-[10px] font-bold text-gray-400 dark:text-white/60 flex items-center gap-1.5">
                            <Bell className="w-3 h-3" /> {allCadets.filter(c => c.fcmTokens?.length > 0).length} Reachable
                        </span>
                        <button 
                            onClick={async () => {
                                const token = await requestNotificationPermission(user?.uid, userRole === 'admin' || userRole === 'staff' ? 'staff' : 'cadets');
                                if (token) {
                                    toast.success("Permissions granted! Sending test push...");
                                    try {
                                        const res = await fetch('/api/sendBroadcast', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                subject: 'Test Notification',
                                                message: 'Push notifications are working perfectly on this device!',
                                                tokens: [token]
                                            })
                                        });
                                        const data = await res.json();
                                        if(data.successCount > 0) {
                                            toast.success("Test push sent! Check your notification bar.");
                                        } else {
                                            toast.error("Vercel Error: " + (data.details || data.error || "Token failed delivery. Is VAPID key correct?"));
                                            console.error("Vercel Response:", data);
                                        }
                                    } catch(e) { toast.error("Network Error: " + e.message); }
                                } else {
                                    toast.error("Please allow notifications in your browser popup first.");
                                }
                            }}
                            className="text-[10px] font-bold bg-ncc-red text-white px-3 py-1 rounded-full flex items-center gap-1.5 hover:bg-red-700 transition-colors shadow-sm"
                            type="button"
                        >
                            <Send className="w-3 h-3" /> Test Push to Me
                        </button>
                        <button 
                            onClick={async () => {
                                if (!window.confirm("Are you sure you want to clear all notification tokens from the database? This fixes duplicate notifications.")) return;
                                try {
                                    toast.info("Clearing tokens...");
                                    const { getDocs, updateDoc, deleteField } = await import('firebase/firestore');
                                    const collections = ['cadets', 'staff', 'users'];
                                    let total = 0;
                                    for (const col of collections) {
                                        const querySnapshot = await getDocs(getCollectionRef(col));
                                        for (const docSnap of querySnapshot.docs) {
                                            const data = docSnap.data();
                                            if (data.fcmTokens && Array.isArray(data.fcmTokens) && data.fcmTokens.length > 0) {
                                                await updateDoc(docSnap.ref, { fcmTokens: deleteField() });
                                                total++;
                                            }
                                        }
                                    }
                                    toast.success(`Cleared tokens from ${total} accounts! Please tap Enable Notifications again.`);
                                } catch (e) {
                                    console.error(e);
                                    toast.error("Error clearing tokens.");
                                }
                            }}
                            className="text-[10px] font-bold bg-amber-500 text-white px-3 py-1 rounded-full flex items-center gap-1.5 hover:bg-amber-600 transition-colors shadow-sm"
                            type="button"
                        >
                            <Trash2 className="w-3 h-3" /> Clear Duplicate Tokens
                        </button>
                    </div>
                </div>
                {isOverdue && (
                    <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center gap-4 animate-pulse">
                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-900 uppercase tracking-widest">Broadcast Reminder</p>
                            <p className="text-xs text-amber-700 font-bold">No update sent in 24h. Post today's instructions now.</p>
                        </div>
                        <button 
                            onClick={() => {
                                setSubject('Daily Routine Reminder');
                                setMessage('Cadets are reminded to check the Unit Notice Board for latest parade instructions and study materials. Fall-in on time tomorrow.');
                            }}
                            className="ml-auto px-4 py-1.5 bg-amber-600 text-white text-[10px] font-black rounded-lg hover:bg-amber-700 transition-colors uppercase tracking-widest"
                        >
                            Quick Remind
                        </button>
                    </div>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Composer */}
                <div className="lg:col-span-2 space-y-8">
                    <form onSubmit={handleSend} className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-[#ddd8cc] shadow-sm space-y-6 relative overflow-hidden">
                        {editingId && (
                            <div className="absolute top-0 left-0 w-full h-1 bg-ncc-gold animate-pulse" />
                        )}
                        <div className="flex justify-end items-center">
                            {editingId && (
                                <button type="button" onClick={() => {setEditingId(null); setMessage(''); setSubject('');}} className="text-xs font-bold text-ncc-red hover:underline">Cancel Edit</button>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Target Group</label>
                                <select 
                                    className="ncc-input text-sm"
                                    value={selectedGroup}
                                    onChange={e => setSelectedGroup(e.target.value)}
                                >
                                    {groups.map(g => <option key={g} value={g}>{g === 'All' ? 'Whole Unit' : `${g} Company`}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Certificate</label>
                                <select 
                                    className="ncc-input text-sm"
                                    value={selectedCertificate}
                                    onChange={e => setSelectedCertificate(e.target.value)}
                                >
                                    {certificates.map(c => <option key={c} value={c}>{c === 'All' ? 'All Certs' : c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Division</label>
                                <select 
                                    className="ncc-input text-sm"
                                    value={selectedDivision}
                                    onChange={e => setSelectedDivision(e.target.value)}
                                >
                                    {divisions.map(d => <option key={d} value={d}>{d === 'All' ? 'All Div.' : d}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        <div>
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Subject (Optional)</label>
                            <input 
                                type="text" 
                                className="ncc-input text-sm"
                                placeholder="e.g. Parade Instruction"
                                value={subject}
                                onChange={e => setSubject(e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-2">Message Content</label>
                            <textarea 
                                className="ncc-input text-sm h-40"
                                placeholder="Type your broadcast message here..."
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                required
                            />
                        </div>

                        <button 
                            type="submit" 
                            disabled={sending || filteredCadets.length === 0}
                            className="ncc-btn ncc-btn-primary w-full py-4 justify-center text-sm shadow-xl"
                        >
                            {sending ? 'Processing...' : editingId ? 'Update Broadcast' : `Send Broadcast to ${filteredCadets.length} Cadets`}
                            {!sending && <Send className="w-4 h-4 ml-2" />}
                        </button>
                    </form>

                    {/* History Section */}
                    <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] shadow-sm overflow-hidden">
                        <div className="bg-gray-50 dark:bg-[#0a1628] px-8 py-4 border-b border-[#ddd8cc] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <h3 className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-widest">Recent Broadcast History</h3>
                            <div className="flex items-center gap-2">
                                <label className="text-[10px] font-bold text-gray-500 dark:text-white/70 uppercase tracking-widest">Filter by Date</label>
                                <input 
                                    type="date" 
                                    className="ncc-input text-xs py-1"
                                    value={searchDate}
                                    onChange={(e) => setSearchDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="divide-y divide-[#ddd8cc]">
                            {pastBroadcasts.filter(b => !searchDate || new Date(b.timestamp).toISOString().split('T')[0] === searchDate).length === 0 ? (
                                <p className="p-12 text-center text-gray-400 dark:text-white/80 italic">No past broadcasts found for the selected criteria.</p>
                            ) : (
                                pastBroadcasts.filter(b => !searchDate || new Date(b.timestamp).toISOString().split('T')[0] === searchDate).map(b => (
                                    <div key={b.id} className="p-6 hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-[#0a1628] transition-all group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h4 className="font-bold text-ncc-navy dark:text-white">{b.subject}</h4>
                                                <div className="flex items-center gap-3 mt-1">
                                                    <span className="text-[9px] font-bold bg-ncc-navy text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                                        <Clock className="w-3 h-3 text-white" /> <span className="text-white font-bold">{new Date(b.timestamp).toLocaleDateString()}</span>
                                                    </span>
                                                    <span className="text-[9px] font-bold text-gray-400 dark:text-white/80">Target: {b.target} {b.targetCertificate !== 'All' && b.targetCertificate ? `| ${b.targetCertificate}` : ''} {b.targetDivision !== 'All' && b.targetDivision ? `| ${b.targetDivision}` : ''}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all">
                                                <button onClick={() => startEdit(b)} className="p-2 hover:bg-ncc-navy hover:text-white rounded-lg transition-all text-gray-400 dark:text-white/80">
                                                    <Edit3 className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(b.id)} className="p-2 hover:bg-ncc-red hover:text-white rounded-lg transition-all text-gray-400 dark:text-white/80">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-500 dark:text-white/70 line-clamp-2">{b.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Info & Presets */}
                <div className="space-y-6">
                    <div className="bg-ncc-navy p-6 rounded-3xl text-white">
                        <h3 className="text-base font-display font-bold mb-4 flex items-center gap-2 text-ncc-gold">
                            <Bell className="w-5 h-5" /> Quick Presets
                        </h3>
                        <div className="space-y-3">
                            {[
                                "Parade tomorrow at 06:00. Wear Uniform No. 1.",
                                "New Study Material uploaded to Digital Library.",
                                "Camp forms deadline extended to Saturday.",
                                "Mock Exam results are out. Check Honour Roll!"
                            ].map((preset, i) => (
                                <button 
                                    key={i}
                                    onClick={() => setMessage(preset)}
                                    className="w-full text-left p-3 rounded-xl bg-white/10 border border-white/10 text-[10px] text-white hover:bg-white/20 transition-all leading-relaxed"
                                >
                                    {preset}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                        <div className="flex items-center gap-3 mb-4">
                            <CheckCircle className="w-6 h-6 text-emerald-600" />
                            <h3 className="text-sm font-bold text-emerald-900">Broadcasting Status</h3>
                        </div>
                        <p className="text-xs text-emerald-800 leading-relaxed">
                            System is ready to deliver push notifications. Editing a broadcast will update the message on all cadets' Notice Boards instantly.
                        </p>
                    </div>

                    {/* Automatic Safety Settings */}
                    <div className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-[#ddd8cc] shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-widest flex items-center gap-2">
                                <Shield className="w-4 h-4 text-emerald-500" /> Safety Net
                            </h3>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    className="sr-only peer"
                                    checked={safetyEnabled}
                                    onChange={e => setSafetyEnabled(e.target.checked)}
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white dark:bg-[#050b14] after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                            </label>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2">Deadline Time (Daily)</label>
                                <input 
                                    type="time" 
                                    className="ncc-input text-sm"
                                    value={safetyDeadline}
                                    onChange={e => setSafetyDeadline(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2">Target Cert</label>
                                    <select className="ncc-input text-xs" value={safetyCert} onChange={e => setSafetyCert(e.target.value)}>
                                        {certificates.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2">Target Div</label>
                                    <select className="ncc-input text-xs" value={safetyDiv} onChange={e => setSafetyDiv(e.target.value)}>
                                        {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase mb-2">Fallback Message</label>
                                <textarea 
                                    className="ncc-input text-xs h-24"
                                    placeholder="Enter safety message..."
                                    value={safetyMessage}
                                    onChange={e => setSafetyMessage(e.target.value)}
                                />
                            </div>
                            <button 
                                onClick={handleSaveSafety}
                                disabled={isSavingSafety}
                                className="w-full py-2 bg-ncc-navy text-white text-[10px] font-black rounded-xl uppercase tracking-widest hover:bg-black transition-all"
                            >
                                {isSavingSafety ? 'Saving...' : 'Update Safety Net'}
                            </button>
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-white/80 italic text-center">
                            If no manual broadcast is sent by {safetyDeadline}, the fallback message will be automatically triggered.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
