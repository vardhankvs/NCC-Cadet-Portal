import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { deleteAnnouncement } from '../../firebase/firestoreService.js';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { Bell, Megaphone, Clock, MessageSquare, Mail, Calendar, Shield, CheckCircle, FileText, Download, Plus, Edit2, Trash2, User } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { AnnouncementForm } from '../Announcements/AnnouncementForm.jsx';

export const AnnouncementsView = ({ onTabChange }) => {
    const { userRole, userEnrollmentId } = useAuthContext();
    const { announcements, loading: dataLoading, cadets } = useDataContext();
    
    const [showNoticeForm, setShowNoticeForm] = useState(false);
    const [editingNotice, setEditingNotice] = useState(null);

    const isAdmin = useMemo(() => {
        const role = userRole?.toLowerCase();
        return role === 'admin' || role === 'officer' || role === 'unit officer';
    }, [userRole]);

    const currentCadet = useMemo(() => {
        return userRole === 'cadet' ? cadets.find(c => c.enrollmentId === userEnrollmentId) : null;
    }, [userRole, cadets, userEnrollmentId]);

    // Process announcements — collection is already institution-scoped via getCollectionRef
    const processedAnnouncements = useMemo(() => {
        return (announcements || [])
            .map(a => {
                let ts;
                if (a.createdAt?.toDate) ts = a.createdAt.toDate().toISOString();
                else if (a.createdAt?.seconds) ts = new Date(a.createdAt.seconds * 1000).toISOString();
                else if (typeof a.createdAt === 'string') ts = a.createdAt;
                else ts = new Date().toISOString();
                return {
                    ...a,
                    id: a.id,
                    type: 'notice',
                    subject: a.title || a.subject || 'No Title',
                    message: a.content || a.message || '',
                    timestamp: ts,
                    sender: a.sender || 'Unit Command'
                };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [announcements]);

    const handleAcknowledge = async (notifId) => {
        if (userRole !== 'cadet') return;
        try {
            const docRef = doc(getCollectionRef('notifications'), notifId);
            await updateDoc(docRef, {
                acknowledgedBy: arrayUnion(userEnrollmentId)
            });
            toast.success("Notice acknowledged.");
        } catch (err) {
            toast.error("Failed to acknowledge.");
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this notice? This action cannot be undone.")) return;
        try {
            await deleteAnnouncement(id);
            toast.success("Notice deleted successfully.");
        } catch (err) {
            toast.error("Failed to delete notice.");
        }
    };

    const filteredItems = useMemo(() => {
        return processedAnnouncements.filter(n => {
            if (isAdmin) return true;
            if (!currentCadet) return false;
            
            let match = true;
            if (n.target && n.target !== 'All') {
                if (n.target === 'Ex-Cadets') match = match && currentCadet.status === 'alumni';
                else match = match && currentCadet.company === n.target;
            }
            if (n.targetCertificate && n.targetCertificate !== 'All') {
                const cert = currentCadet.certificate || currentCadet.B;
                match = match && cert === n.targetCertificate;
            }
            if (n.targetDivision && n.targetDivision !== 'All') {
                const regNo = (currentCadet.enrollmentId || currentCadet.regimentalNumber || '').toUpperCase();
                match = match && regNo.includes(n.targetDivision);
            }
            return match;
        });
    }, [processedAnnouncements, isAdmin, currentCadet]);

    const isSilent = filteredItems.length === 0 || (new Date() - new Date(filteredItems[0]?.timestamp)) > (48 * 60 * 60 * 1000);

    if (dataLoading) {
        return (
            <div className="p-20 text-center flex flex-col items-center gap-4">
                <Bell className="animate-bounce w-12 h-12 text-ncc-navy dark:text-ncc-gold" />
                <p className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-[0.2em]">Synchronizing Board...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 fade-in p-4 lg:p-0 mb-10">
            {(showNoticeForm || editingNotice) && (
                <AnnouncementForm 
                    initialData={editingNotice} 
                    onClose={() => {
                        setShowNoticeForm(false);
                        setEditingNotice(null);
                    }} 
                />
            )}
            
            <header className="flex flex-col sm:flex-row sm:items-center gap-4 bg-ncc-navy text-white p-6 rounded-[2rem] shadow-xl border border-white/10 relative overflow-hidden group">
                {/* Header Decoration */}
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700" />
                
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                    <Megaphone className="w-7 h-7 text-ncc-gold" />
                </div>
                <div className="flex-1 relative">
                    <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">Unit Notice Board</h2>
                    <p className="text-white/60 text-xs font-medium">Strategic Communications & Standing Orders Registry.</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => setShowNoticeForm(true)}
                        className="relative bg-ncc-gold hover:bg-white text-ncc-navy hover:text-ncc-navy px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-ncc-gold/20"
                    >
                        <Plus className="w-4 h-4" /> Post Formal Notice
                    </button>
                )}
            </header>

            {isSilent && userRole === 'cadet' && (
                <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative">
                        <div className="flex items-center gap-3 mb-4">
                            <Shield className="w-6 h-6 text-amber-600" />
                            <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest">Unit Standing Orders</h3>
                        </div>
                        <p className="text-sm text-amber-800 leading-relaxed font-medium">
                            No recent broadcast has been issued by the Unit Command. Cadets are to follow standard daily routines, maintain discipline, and contact their respective Seniors for any urgent parade instructions.
                        </p>
                    </div>
                </div>
            )}

            <div className="space-y-5">
                {filteredItems.length === 0 ? (
                    <div className="bg-white dark:bg-[#050b14] p-20 text-center rounded-[3rem] border-2 border-dashed border-gray-200 dark:border-white/5">
                        <Bell className="w-16 h-16 text-gray-100 dark:text-white/5 mx-auto mb-6" />
                        <p className="text-gray-400 dark:text-white/40 font-black uppercase tracking-widest text-sm">Registry is currently empty</p>
                    </div>
                ) : (
                    filteredItems.map((n) => {
                        const isAcknowledged = n.acknowledgedBy?.includes(userEnrollmentId);
                        const ackCount = n.acknowledgedBy?.length || 0;

                        return (
                            <div key={n.id} className="bg-white dark:bg-[#050b14] rounded-[2.5rem] border border-[#ddd8cc] dark:border-white/10 shadow-md overflow-hidden group transition-all hover:shadow-xl hover:border-ncc-gold/40">
                                <div className="flex">
                                    <div className="w-2.5 bg-ncc-gold shrink-0" />
                                    <div className="p-6 sm:p-8 flex-1">
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-ncc-gold/10 flex items-center justify-center">
                                                    <Shield className="w-4 h-4 text-ncc-gold" />
                                                </div>
                                                <div>
                                                    <span className="text-[10px] font-black text-ncc-gold uppercase tracking-[0.2em] block">Official Notice</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-white/40">
                                                            {new Date(n.timestamp).toLocaleDateString()} at {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            {isAdmin && (
                                                <div className="flex items-center gap-2 bg-gray-50 dark:bg-white/5 p-1.5 rounded-2xl border border-gray-100 dark:border-white/5">
                                                    <span className="text-[9px] font-black text-gray-400 px-2 uppercase tracking-tighter border-r border-gray-200 dark:border-white/10">Manage</span>
                                                    <button 
                                                        onClick={() => setEditingNotice(n)}
                                                        className="p-2 text-ncc-navy dark:text-white hover:bg-white dark:hover:bg-white/10 rounded-xl transition-all hover:shadow-sm"
                                                        title="Edit Notice"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button 
                                                        onClick={() => handleDelete(n.id)}
                                                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all"
                                                        title="Delete Notice"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-display font-black text-ncc-navy dark:text-white mb-3 tracking-tight">{n.subject}</h3>
                                        <p className="text-sm text-gray-600 dark:text-white/80 leading-relaxed whitespace-pre-wrap font-medium">{n.message}</p>
                                        
                                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-4">
                                                <div className="px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-lg">
                                                    <p className="text-[10px] font-black text-gray-500 dark:text-white/50 uppercase tracking-widest flex items-center gap-2">
                                                        <User className="w-3 h-3" /> {n.sender}
                                                    </p>
                                                </div>
                                                {isAdmin && (
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                                                        <CheckCircle className="w-3.5 h-3.5" /> {ackCount} Acknowledged
                                                    </div>
                                                )}
                                            </div>
                                            
                                            {userRole === 'cadet' && (
                                                <button 
                                                    onClick={() => handleAcknowledge(n.id)}
                                                    disabled={isAcknowledged}
                                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                                        isAcknowledged 
                                                            ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 cursor-default border border-emerald-100 dark:border-emerald-500/20' 
                                                            : 'bg-ncc-navy text-white hover:bg-ncc-navy-mid shadow-lg hover:shadow-ncc-navy/30 active:scale-95'
                                                    }`}
                                                >
                                                    <CheckCircle className={`w-4 h-4 ${isAcknowledged ? 'text-emerald-500' : 'text-white'}`} />
                                                    {isAcknowledged ? 'Acknowledged' : 'Acknowledge Receipt'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
