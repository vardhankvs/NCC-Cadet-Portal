// src/features/Security/SecurityDashboard.jsx
import React, { useState } from 'react';
import { ShieldCheck, FileText, Users, Key } from '../../components/Icons.jsx';
import { AuditTrailView } from './AuditTrailView.jsx';
import { SessionManagerView } from './SessionManagerView.jsx';

const TABS = [
    { id: 'audit', label: 'Audit Trail', icon: FileText, desc: 'All admin actions logged' },
    { id: 'sessions', label: 'Sessions', icon: Users, desc: 'Active login sessions' },
];

export const SecurityDashboard = () => {
    const [activeTab, setActiveTab] = useState('audit');

    return (
        <div className="flex flex-col h-full gap-4">
            {/* Page header */}
            <div className="flex items-center gap-4 pb-2 border-b" style={{ borderColor: 'var(--border-main)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, #C0152A, #0A1628)' }}>
                    <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-black" style={{ color: 'var(--text-main)' }}>Security &amp; Compliance</h1>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                        Audit logs, active sessions, and 2FA status
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs" style={{ borderColor: 'var(--border-main)', background: 'rgba(34,197,94,0.05)' }}>
                    <Key className="w-3.5 h-3.5 text-green-400" />
                    <span className="text-green-400 font-semibold">2FA Active</span>
                    <span style={{ color: 'var(--text-muted)' }}>— Admin logins require OTP</span>
                </div>
            </div>

            {/* Tab bar */}
            <div className="flex gap-1 p-1 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-main)' }}>
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200"
                            style={{
                                background: isActive ? 'var(--bg-card)' : 'transparent',
                                color: isActive ? 'var(--text-main)' : 'var(--text-muted)',
                                boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                                borderBottom: isActive ? '2px solid #b8830e' : '2px solid transparent',
                            }}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <div className="flex-1 min-h-0 overflow-auto">
                {activeTab === 'audit' && <AuditTrailView />}
                {activeTab === 'sessions' && <SessionManagerView />}
            </div>
        </div>
    );
};
