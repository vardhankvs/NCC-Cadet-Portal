// src/features/Security/AuditTrailView.jsx
import React, { useState, useEffect } from 'react';
import { getCollectionRef } from '../../firebase/firestoreService';
import { query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { ShieldCheck, Filter, Download, Search, Clock, User, FileText, Loader, RefreshCcw } from '../../components/Icons.jsx';

const ACTION_COLORS = {
    CREATE: 'text-green-400 bg-green-400/10 border-green-400/30',
    UPDATE: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
    DELETE: 'text-red-400 bg-red-400/10 border-red-400/30',
    LOGIN: 'text-ncc-gold bg-ncc-gold/10 border-ncc-gold/30',
    LOGOUT: 'text-gray-400 bg-gray-400/10 border-gray-400/30',
    OTP_SENT: 'text-purple-400 bg-purple-400/10 border-purple-400/30',
    OTP_VERIFIED: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/30',
};

const ACTION_LABELS = {
    CREATE: 'Created',
    UPDATE: 'Updated',
    DELETE: 'Deleted',
    LOGIN: 'Login',
    LOGOUT: 'Logout',
    OTP_SENT: 'OTP Sent',
    OTP_VERIFIED: '2FA Verified',
};

function formatTime(isoString) {
    if (!isoString) return '—';
    const d = new Date(isoString);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

function timeAgo(isoString) {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

export const AuditTrailView = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [filterAction, setFilterAction] = useState('ALL');
    const [filterCollection, setFilterCollection] = useState('ALL');

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const ref = getCollectionRef('audit_logs');
            if (!ref) { setLoading(false); return; }
            const q = query(ref, orderBy('timestamp', 'desc'), limit(200));
            const snap = await getDocs(q);
            setLogs(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        } catch (e) {
            console.error('Failed to load audit logs:', e);
        }
        setLoading(false);
    };

    useEffect(() => { fetchLogs(); }, []);

    const collections = ['ALL', ...new Set(logs.map(l => l.collection).filter(Boolean))];
    const actions = ['ALL', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'OTP_SENT', 'OTP_VERIFIED'];

    const filtered = logs.filter(l => {
        if (filterAction !== 'ALL' && l.action !== filterAction) return false;
        if (filterCollection !== 'ALL' && l.collection !== filterCollection) return false;
        if (search) {
            const s = search.toLowerCase();
            return (l.adminEmail || '').toLowerCase().includes(s) ||
                   (l.summary || '').toLowerCase().includes(s) ||
                   (l.collection || '').toLowerCase().includes(s);
        }
        return true;
    });

    const exportCSV = () => {
        const rows = [['Timestamp', 'Action', 'Collection', 'Summary', 'Admin Email']];
        filtered.forEach(l => rows.push([
            l.timestampISO || '',
            l.action || '',
            l.collection || '',
            (l.summary || '').replace(/,/g, ';'),
            l.adminEmail || '',
        ]));
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url;
        a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
        a.click(); URL.revokeObjectURL(url);
    };

    return (
        <div className="flex flex-col h-full gap-4 p-0">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #b8830e, #0A1628)' }}>
                        <FileText className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Audit Trail</h2>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{filtered.length} of {logs.length} events</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchLogs} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                        <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                    </button>
                    <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                        <Download className="w-3.5 h-3.5" /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
                <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                    <input
                        value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search email, summary..."
                        className="pl-8 pr-3 py-1.5 text-xs rounded-lg border outline-none"
                        style={{ background: 'var(--bg-input, var(--bg-secondary))', borderColor: 'var(--border-main)', color: 'var(--text-main)', width: 200 }}
                    />
                </div>
                <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                    {actions.map(a => <option key={a} value={a}>{a === 'ALL' ? 'All Actions' : (ACTION_LABELS[a] || a)}</option>)}
                </select>
                <select value={filterCollection} onChange={e => setFilterCollection(e.target.value)} className="px-2 py-1.5 text-xs rounded-lg border outline-none" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-main)', color: 'var(--text-main)' }}>
                    {collections.map(c => <option key={c} value={c}>{c === 'ALL' ? 'All Collections' : c}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto rounded-xl border" style={{ borderColor: 'var(--border-main)' }}>
                {loading ? (
                    <div className="flex items-center justify-center h-48 gap-3" style={{ color: 'var(--text-muted)' }}>
                        <Loader className="animate-spin w-5 h-5" /> Loading audit logs...
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-2" style={{ color: 'var(--text-muted)' }}>
                        <ShieldCheck className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No audit events found.</p>
                        <p className="text-xs opacity-60">Audit logs appear as admins take actions.</p>
                    </div>
                ) : (
                    <table className="w-full text-xs">
                        <thead>
                            <tr style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-main)' }}>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Time</th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Action</th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Module</th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Description</th>
                                <th className="text-left px-4 py-3 font-semibold" style={{ color: 'var(--text-muted)' }}>Admin</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((log, i) => (
                                <tr key={log.id}
                                    style={{ borderBottom: '1px solid var(--border-main)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-secondary)' }}
                                    className="hover:bg-white/5 transition">
                                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                                        <div>{formatTime(log.timestampISO)}</div>
                                        <div className="text-[10px] opacity-60">{timeAgo(log.timestampISO)}</div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex px-2 py-0.5 rounded border text-[10px] font-bold uppercase ${ACTION_COLORS[log.action] || 'text-gray-400 bg-gray-400/10 border-gray-400/30'}`}>
                                            {ACTION_LABELS[log.action] || log.action}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 font-mono" style={{ color: 'var(--text-secondary)' }}>
                                        {log.collection || '—'}
                                    </td>
                                    <td className="px-4 py-3 max-w-xs" style={{ color: 'var(--text-main)' }}>
                                        <span className="line-clamp-2">{log.summary || '—'}</span>
                                    </td>
                                    <td className="px-4 py-3" style={{ color: 'var(--text-muted)' }}>
                                        {log.adminEmail ? (
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3 h-3 flex-shrink-0" />
                                                <span className="truncate max-w-[140px]">{log.adminEmail}</span>
                                            </div>
                                        ) : '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};
