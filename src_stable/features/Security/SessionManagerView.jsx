// src/features/Security/SessionManagerView.jsx
import React, { useState, useEffect } from 'react';
import { getActiveSessions, getAllSessions, terminateSession } from '../../firebase/firestoreService';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { ShieldCheck, Users, Clock, User, LogOut, RefreshCcw, Loader, Globe, CheckCircle } from '../../components/Icons.jsx';

function parseUA(ua = '') {
    if (!ua) return { browser: 'Unknown', os: 'Unknown' };
    let browser = 'Unknown', os = 'Unknown';
    if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari')) browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    return { browser, os };
}

function timeAgo(isoString) {
    if (!isoString) return '—';
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
}

function formatTime(isoString) {
    if (!isoString) return '—';
    return new Date(isoString).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

export const SessionManagerView = () => {
    const { user, userRole } = useAuthContext();
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [terminating, setTerminating] = useState(null);
    const [showAll, setShowAll] = useState(false);

    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';

    const fetchSessions = async () => {
        setLoading(true);
        try {
            const data = showAll ? await getAllSessions(100) : await getActiveSessions();
            setSessions(data);
        } catch (e) {
            console.error('Failed to fetch sessions:', e);
        }
        setLoading(false);
    };

    useEffect(() => { fetchSessions(); }, [showAll]);

    const handleTerminate = async (sessionId, email) => {
        if (!isBattalionAdmin) {
            alert('Unauthorized: Only Battalion Admins can terminate other sessions.');
            return;
        }
        if (!window.confirm(`Force logout session for ${email}?`)) return;
        setTerminating(sessionId);
        try {
            await terminateSession(sessionId);
            setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, isActive: false } : s));
        } catch (e) {
            console.error('Failed to terminate session:', e);
        }
        setTerminating(null);
    };

    const activeSessions = sessions.filter(s => s.isActive);
    const inactiveSessions = sessions.filter(s => !s.isActive);

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1B3A6B, #0A1628)' }}>
                        <Users className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold" style={{ color: 'var(--text-main)' }}>Session Manager</h2>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                            {activeSessions.length} active {activeSessions.length === 1 ? 'session' : 'sessions'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2 items-center">
                    <label className="flex items-center gap-1.5 text-xs cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="accent-ncc-gold" />
                        Show all (including ended)
                    </label>
                    <button onClick={fetchSessions} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition" style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}>
                        <RefreshCcw className="w-3.5 h-3.5" /> Refresh
                    </button>
                </div>
            </div>

            {/* Stats bar */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: 'Active Now', value: activeSessions.length, color: '#22c55e' },
                    { label: 'Ended', value: inactiveSessions.length, color: '#94a3b8' },
                    { label: 'Total', value: sessions.length, color: '#b8830e' },
                ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-3 border text-center" style={{ borderColor: 'var(--border-main)', background: 'var(--bg-secondary)' }}>
                        <div className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</div>
                        <div className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: 'var(--text-muted)' }}>{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Session Cards */}
            <div className="flex-1 overflow-auto space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-32 gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Loader className="animate-spin w-5 h-5" /> Loading sessions...
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 gap-2" style={{ color: 'var(--text-muted)' }}>
                        <ShieldCheck className="w-10 h-10 opacity-30" />
                        <p className="text-sm">No sessions found.</p>
                    </div>
                ) : (
                    sessions.map(session => {
                        const { browser, os } = parseUA(session.userAgent);
                        const isCurrentUser = session.uid === user?.uid;
                        const isActive = session.isActive;
                        return (
                            <div key={session.id}
                                className="rounded-xl border p-4 flex items-start justify-between gap-4 transition"
                                style={{
                                    borderColor: isCurrentUser ? '#b8830e' : 'var(--border-main)',
                                    background: isCurrentUser ? 'rgba(184,131,14,0.05)' : 'var(--bg-secondary)',
                                    opacity: isActive ? 1 : 0.6,
                                }}>
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center ${isActive ? 'bg-green-500/20' : 'bg-gray-500/20'}`}>
                                        <User className={`w-4 h-4 ${isActive ? 'text-green-400' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-semibold text-sm truncate" style={{ color: 'var(--text-main)' }}>{session.email || 'Unknown'}</span>
                                            {isCurrentUser && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-ncc-gold/20 text-ncc-gold border border-ncc-gold/30 font-bold">YOU</span>
                                            )}
                                            <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${isActive ? 'text-green-400 bg-green-400/10 border-green-400/30' : 'text-gray-400 bg-gray-400/10 border-gray-400/30'}`}>
                                                {isActive ? '● Active' : '○ Ended'}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-3 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                            <span className="capitalize">{session.role || 'unknown'}</span>
                                            <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{browser} / {os}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 mt-1.5 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                                            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Login: {formatTime(session.loginAtISO)}</span>
                                            {isActive && <span className="flex items-center gap-1 text-green-400"><CheckCircle className="w-3 h-3" />Last seen: {timeAgo(session.lastSeenISO)}</span>}
                                            {!isActive && session.logoutAtISO && <span>Ended: {timeAgo(session.logoutAtISO)}</span>}
                                        </div>
                                    </div>
                                </div>
                                {isActive && !isCurrentUser && isBattalionAdmin && (
                                    <button
                                        onClick={() => handleTerminate(session.id, session.email)}
                                        disabled={terminating === session.id}
                                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 disabled:opacity-50"
                                        style={{ borderColor: 'var(--border-main)', color: 'var(--text-muted)' }}
                                        title="Force logout this session"
                                    >
                                        {terminating === session.id ? <Loader className="animate-spin w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
                                        Force Logout
                                    </button>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};
