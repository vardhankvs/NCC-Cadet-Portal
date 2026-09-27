import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { deleteAnnouncement } from '../../firebase/firestoreService.js';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import {
    Bell, Megaphone, Clock, Shield, CheckCircle, Plus, Edit2, Trash2, User,
    GraduationCap, Building, Filter, Search
} from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { AnnouncementForm } from '../Announcements/AnnouncementForm.jsx';
// Helper to extract text recursively from React elements (for search/filtering)
const getReactTextContent = (node) => {
    if (!node) return '';
    if (typeof node === 'string' || typeof node === 'number') return String(node);
    if (Array.isArray(node)) return node.map(getReactTextContent).join(' ');
    if (node.props && node.props.children) return getReactTextContent(node.props.children);
    return '';
};

// Searchable Table Wrapper Component
const SearchableTable = ({ children }) => {
    const [search, setSearch] = useState('');

    const newChildren = React.Children.map(children, (child) => {
        if (!child) return child;
        if (child.type === 'tbody') {
            const rows = React.Children.toArray(child.props.children);
            const filteredRows = rows.filter(row => {
                if (!search) return true;
                const text = getReactTextContent(row).toLowerCase();
                return text.includes(search.toLowerCase());
            });
            return React.cloneElement(child, {}, filteredRows);
        }
        return child;
    });

    return (
        <div className="space-y-3">
            <div className="relative max-w-xs">
                <input
                    type="text"
                    placeholder="Search in this table..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    className="w-full text-[11px] font-bold border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] text-ncc-navy dark:text-white rounded-xl pl-8 pr-3 py-1.5 outline-none hover:border-ncc-gold focus:border-ncc-gold transition"
                />
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs">🔍</span>
            </div>
            <div className="overflow-x-auto my-4 rounded-2xl border border-gray-200 dark:border-white/10">
                <table className="w-full text-xs border-collapse">
                    {newChildren}
                </table>
            </div>
        </div>
    );
};

export const AnnouncementsView = ({ onTabChange }) => {
    const { userRole, userEnrollmentId, userInstitutionId, actualRole } = useAuthContext();
    const { announcements, loading: dataLoading, cadets, units = [] } = useDataContext();
    const { tenant } = useTenant();

    const [showNoticeForm, setShowNoticeForm] = useState(false);
    const [editingNotice, setEditingNotice] = useState(null);

    // ANO-specific filters and common search
    const [certFilter, setCertFilter] = useState('All');
    const [divFilter, setDivFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    const isCadet = userRole === 'cadet' || actualRole === 'cadet';

    // Role flags
    const isBattalionAdmin = useMemo(() => {
        if (isCadet) return false;
        const role = userRole?.toLowerCase();
        return role === 'superadmin' || role === 'battalion_admin';
    }, [userRole, isCadet]);

    const isANO = useMemo(() => {
        if (isCadet) return false;
        const role = userRole?.toLowerCase();
        return role === 'admin' || role === 'officer' || role === 'unit officer';
    }, [userRole, isCadet]);

    const currentCadet = useMemo(() => {
        return userRole === 'cadet' ? cadets.find(c => c.enrollmentId === userEnrollmentId) : null;
    }, [userRole, cadets, userEnrollmentId]);

    // College lookup for badge labels
    const collegeMap = useMemo(() => {
        const map = {};
        units.forEach(u => {
            const id = u.subdomain || u.id;
            if (id) map[id] = u.collegeName || u.name || id;
        });
        return map;
    }, [units]);

    // Normalise timestamps
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
                    sender: a.sender || 'Unit Command',
                };
            })
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [announcements]);

    // ─── TWO-TIER VISIBILITY FILTER ───────────────────────────────────────────
    const filteredItems = useMemo(() => {
        const certF = certFilter;
        const divF = divFilter;
        const queryStr = searchQuery.trim().toLowerCase();
        
        return processedAnnouncements.filter(n => {
            // Apply search query filter first (if present)
            if (queryStr) {
                const titleMatch = (n.subject || '').toLowerCase().includes(queryStr);
                const msgMatch = (n.message || '').toLowerCase().includes(queryStr);
                if (!titleMatch && !msgMatch) return false;
            }

            const sr = n.senderRole; // 'battalion_admin' | 'ano' | undefined (legacy)
            /* certF and divF are captured from the outer scope */

            // ── BATTALION ADMIN: see only their own notices ──────────────────
            if (isBattalionAdmin) {
                return sr === 'battalion_admin' || !sr; // include legacy notices without senderRole
            }

            // ── ANO: see battalion notices targeted to their college OR their own notices
            if (isANO) {
                const activeSubdomain = userInstitutionId || tenant?.subdomain;
                let visible = false;
                if (sr === 'battalion_admin' || !sr) {
                    const tc = n.targetCollege;
                    if (!tc || tc === 'All') visible = true;
                    else if (Array.isArray(tc)) visible = tc.includes(activeSubdomain);
                    else visible = tc === activeSubdomain;
                } else if (sr === 'ano') {
                    visible = n.institutionId === activeSubdomain;
                }
                if (!visible) return false;

                // Apply certificate filter
                if (certF !== 'All') {
                    const tc = n.targetCertificate;
                    if (tc && tc !== 'All' && tc !== certF) return false;
                }
                // Apply division filter
                if (divF !== 'All') {
                    const td = n.targetDivision;
                    if (td && td !== 'All' && td !== divF) return false;
                }
                return true;
            }

            // ── CADET: see only ANO notices from their college
            if (userRole === 'cadet') {
                if (sr === 'battalion_admin') return false; // battalion notices not for cadets
                if (!currentCadet) return false;
                
                // Show notices posted by their college's ANO
                if (n.institutionId !== currentCadet.institutionId) return false;

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
            }

            return true;
        });
    }, [processedAnnouncements, isBattalionAdmin, isANO, userRole, userInstitutionId, currentCadet, certFilter, divFilter, searchQuery, tenant]);

    const handleAcknowledge = async (notifId) => {
        if (userRole !== 'cadet') return;
        try {
            const docRef = doc(getCollectionRef('notifications'), notifId);
            await updateDoc(docRef, { acknowledgedBy: arrayUnion(userEnrollmentId) });
            toast.success('Notice acknowledged.');
        } catch {
            toast.error('Failed to acknowledge.');
        }
    };

    const handleDelete = async (id) => {
        if (isCadet || (!isANO && !isBattalionAdmin)) {
            toast.error('Cadets cannot delete notices.');
            return;
        }
        if (!window.confirm('Are you sure you want to delete this notice? This action cannot be undone.')) return;
        try {
            await deleteAnnouncement(id);
            toast.success('Notice deleted successfully.');
        } catch {
            toast.error('Failed to delete notice.');
        }
    };

    // Who can post notices?
    const canPost = isBattalionAdmin || isANO;

    // Post button label
    const postBtnLabel = isBattalionAdmin ? 'Post Notice to ANOs' : 'Post Notice to Cadets';

    // Header subtitle
    const headerSubtitle = isBattalionAdmin
        ? 'Post official orders to college ANOs — all colleges or specific ones.'
        : isANO
            ? 'Official orders from Battalion HQ for your college. You may also post to your cadets.'
            : 'Official standing orders and notices from your unit.';

    const isSilent =
        filteredItems.length === 0 ||
        new Date() - new Date(filteredItems[0]?.timestamp) > 48 * 60 * 60 * 1000;

    if (dataLoading) {
        return (
            <div className="p-20 text-center flex flex-col items-center gap-4">
                <Bell className="animate-bounce w-12 h-12 text-ncc-navy dark:text-ncc-gold" />
                <p className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-[0.2em]">Synchronizing Board...</p>
            </div>
        );
    }

    return (
        <div className="w-full max-w-none space-y-6 fade-in p-4 lg:p-0 mb-10">
            {(showNoticeForm || editingNotice) && (
                <AnnouncementForm
                    initialData={editingNotice}
                    onClose={() => {
                        setShowNoticeForm(false);
                        setEditingNotice(null);
                    }}
                />
            )}

            {/* ── Header ── */}
            <header className="flex flex-col sm:flex-row sm:items-center gap-4 bg-ncc-navy text-white p-6 rounded-[2rem] shadow-xl border border-white/10 relative overflow-hidden group">
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-colors duration-700" />
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/10 shadow-inner">
                    <Megaphone className="w-7 h-7 text-ncc-gold" />
                </div>
                <div className="flex-1 relative">
                    <h2 className="text-2xl font-display font-black text-white uppercase tracking-tight">Unit Notice Board</h2>
                    <p className="text-white/60 text-xs font-medium mt-0.5">{headerSubtitle}</p>
                </div>
                {canPost && (
                    <button
                        onClick={() => setShowNoticeForm(true)}
                        className="relative bg-ncc-gold hover:bg-white text-ncc-navy px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-ncc-gold/20"
                    >
                        <Plus className="w-4 h-4" /> {postBtnLabel}
                    </button>
                )}
            </header>

            {/* ── ANO info pill: they see what battalion sent ── */}
            {isANO && (
                <div className="bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-400/20 rounded-2xl px-5 py-3 flex items-center gap-3">
                    <Building className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                        Showing notices from <span className="font-black">Battalion HQ</span> addressed to your college. Use the button above to post notices to your cadets.
                    </p>
                </div>
            )}

            {/* ── Search Bar and Filters ── */}
            <div className="bg-white dark:bg-slate-900 border border-gray-100 dark:border-white/10 rounded-[2rem] p-6 flex flex-col md:flex-row items-stretch md:items-center gap-4 shadow-sm">
                <div className="relative flex-1">
                    <input
                        type="text"
                        placeholder="Search notices by cadet name, regNo or keywords..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] text-ncc-navy dark:text-white rounded-xl pl-10 pr-4 py-3 outline-none hover:border-ncc-gold focus:border-ncc-gold focus:ring-1 focus:ring-ncc-gold transition-all"
                    />
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-ncc-red text-xs font-black uppercase tracking-widest transition"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {isANO && (
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-1.5 text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] rounded-xl px-3 py-2 text-ncc-navy dark:text-white">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Cert:</span>
                            <select
                                value={certFilter}
                                onChange={e => setCertFilter(e.target.value)}
                                className="bg-transparent outline-none cursor-pointer text-xs font-bold"
                            >
                                {['All', 'A', 'B', 'C'].map(opt => (
                                    <option key={opt} value={opt} className="bg-white dark:bg-[#0a1628] text-black dark:text-white">
                                        {opt === 'All' ? 'All Certs' : `${opt} Cert`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs font-bold border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] rounded-xl px-3 py-2 text-ncc-navy dark:text-white">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mr-1">Div:</span>
                            <select
                                value={divFilter}
                                onChange={e => setDivFilter(e.target.value)}
                                className="bg-transparent outline-none cursor-pointer text-xs font-bold"
                            >
                                {['All', 'SD', 'SW', 'NCC'].map(opt => (
                                    <option key={opt} value={opt} className="bg-white dark:bg-[#0a1628] text-black dark:text-white">
                                        {opt === 'All' ? 'All Divs' : `${opt} Div`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {(certFilter !== 'All' || divFilter !== 'All' || searchQuery) && (
                            <button
                                onClick={() => { setCertFilter('All'); setDivFilter('All'); setSearchQuery(''); }}
                                className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest px-3 py-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                            >
                                Clear All
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ── Silent / empty state ── */}
            {isSilent && userRole === 'cadet' && (
                <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2.5rem] relative overflow-hidden group shadow-sm">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700" />
                    <div className="relative flex items-start gap-3">
                        <Shield className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-sm text-amber-800 leading-relaxed font-medium">
                            No recent notice has been issued by the Unit ANO. Cadets are to follow standard daily routines and contact their seniors for any urgent instructions.
                        </p>
                    </div>
                </div>
            )}

            {/* ── Notice list ── */}
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
                        const isBnNotice = n.senderRole === 'battalion_admin';
                        const isMyNotice =
                            (isBattalionAdmin && isBnNotice) ||
                            (isANO && !isBnNotice);

                        // College label for battalion admin notices
                        let collegeLabel = null;
                        if (isBnNotice) {
                            const tc = n.targetCollege;
                            if (!tc || tc === 'All') {
                                collegeLabel = 'All Colleges';
                            } else if (Array.isArray(tc)) {
                                collegeLabel = tc.map(id => collegeMap[id] || id).join(', ');
                            } else {
                                collegeLabel = collegeMap[tc] || tc;
                            }
                        }

                        return (
                            <div
                                key={n.id}
                                className="bg-white dark:bg-[#050b14] rounded-[2.5rem] border border-[#ddd8cc] dark:border-white/10 shadow-md overflow-hidden group transition-all hover:shadow-xl hover:border-ncc-gold/40"
                            >
                                <div className="flex">
                                    {/* Accent bar: gold for battalion, navy for ANO */}
                                    <div className={`w-2.5 shrink-0 ${isBnNotice ? 'bg-ncc-gold' : 'bg-ncc-navy dark:bg-blue-500'}`} />
                                    <div className="p-6 sm:p-8 flex-1">
                                        {/* Top row */}
                                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isBnNotice ? 'bg-amber-50 dark:bg-ncc-gold/10' : 'bg-blue-50 dark:bg-blue-500/10'}`}>
                                                    {isBnNotice
                                                        ? <Shield className="w-4 h-4 text-ncc-gold" />
                                                        : <GraduationCap className="w-4 h-4 text-ncc-navy dark:text-blue-400" />
                                                    }
                                                </div>
                                                <div>
                                                    <span className={`text-[10px] font-black uppercase tracking-[0.2em] block ${isBnNotice ? 'text-ncc-gold' : 'text-ncc-navy dark:text-blue-400'}`}>
                                                        {isBnNotice ? '📡 From Battalion HQ' : '🏫 College Notice'}
                                                    </span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <Clock className="w-3 h-3 text-gray-400" />
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-white/40">
                                                            {new Date(n.timestamp).toLocaleDateString()} at {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Manage buttons (only for the notice's author role) */}
                                            {isMyNotice && (
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

                                        {/* Notice body */}
                                        <h3 className="text-xl font-display font-black text-ncc-navy dark:text-white mb-3 tracking-tight">{n.subject}</h3>
                                        <div className="text-sm text-gray-600 dark:text-white/80 leading-relaxed font-medium markdown-content">
                                            <ReactMarkdown
                                                remarkPlugins={[remarkGfm]}
                                                components={{
                                                    table: ({ children }) => (
                                                        <SearchableTable>{children}</SearchableTable>
                                                    ),
                                                    thead: ({ node, ...props }) => (
                                                        <thead className="bg-ncc-navy text-white" {...props} />
                                                    ),
                                                    th: ({ node, ...props }) => (
                                                        <th className="px-4 py-2.5 text-left font-black uppercase tracking-widest text-[10px] border-b border-white/20" {...props} />
                                                    ),
                                                    tr: ({ node, ...props }) => (
                                                        <tr className="border-b border-gray-100 dark:border-white/5 even:bg-gray-50 dark:even:bg-white/[0.03] hover:bg-ncc-gold/5 transition-colors" {...props} />
                                                    ),
                                                    td: ({ node, ...props }) => (
                                                        <td className="px-4 py-2.5 text-gray-700 dark:text-white/80 font-medium" {...props} />
                                                    ),
                                                }}
                                            >{n.message}</ReactMarkdown>
                                        </div>

                                        {/* Footer */}
                                        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                {/* Sender */}
                                                <div className="px-3 py-1 bg-gray-100 dark:bg-white/5 rounded-lg">
                                                    <p className="text-[10px] font-black text-gray-500 dark:text-white/50 uppercase tracking-widest flex items-center gap-2">
                                                        <User className="w-3 h-3" /> {n.sender}
                                                    </p>
                                                </div>
                                                {/* College target badge (for battalion admin's own notices) */}
                                                {isBattalionAdmin && collegeLabel && (
                                                    <div className="px-3 py-1 bg-ncc-gold/10 rounded-lg border border-ncc-gold/20">
                                                        <p className="text-[10px] font-black text-amber-700 dark:text-ncc-gold uppercase tracking-widest flex items-center gap-2">
                                                            <GraduationCap className="w-3 h-3" /> {collegeLabel}
                                                        </p>
                                                    </div>
                                                )}
                                                {/* Ack count for admins */}
                                                {isMyNotice && (
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1 rounded-lg uppercase tracking-widest border border-emerald-100 dark:border-emerald-500/20">
                                                        <CheckCircle className="w-3.5 h-3.5" /> {ackCount} Acknowledged
                                                    </div>
                                                )}
                                            </div>

                                            {/* Cadet acknowledge button */}
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
