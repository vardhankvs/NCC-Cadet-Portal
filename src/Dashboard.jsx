// src/Dashboard.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from './context/AuthContext.jsx';
import { useDataContext } from './context/DataContext.jsx';
import { LoadingIndicator } from './components/ui/LoadingIndicator.jsx';
import { toast } from 'react-toastify';

import {
    LogOut,
    List,
    Calendar,
    BarChart,
    Megaphone,
    Briefcase,
    FileText,
    User,
    Users,
    Package,
    Tent, // Added for Phase 2
    BookOpen, // Added for Phase 3
    UserCheck, // Added for Phase 4
    Heart, // Added for Phase 5
    Award, // Added for Phase 7
    Menu,
    X,
} from './components/Icons.jsx';

import { CadetRoster } from './features/Cadets/CadetRoster.jsx';
import { AttendanceTracker } from './features/Attendance/AttendanceTracker.jsx';
import { AttendanceSummary } from './features/Attendance/AttendanceSummary.jsx';
import { EventsView } from './features/Events/EventsView.jsx';
import { StaffDetailsView } from './features/Staff/StaffDetailsView.jsx';
import { ReferencesView } from './features/References/ReferencesView.jsx';
import { FeeManagementView } from './features/Fee/FeeManagementView.jsx';
import { AnnouncementsView } from './features/Announcements/AnnouncementsView.jsx';
import { CadetProfileView } from './features/Profile/CadetProfileView.jsx';
import { InventoryView } from './features/Inventory/InventoryView.jsx';
import { CampsView } from './features/Camps/CampsView.jsx';
import { TrainingView } from './features/Training/TrainingView.jsx';
import { AttendanceScanner } from './features/Attendance/AttendanceScanner.jsx';
import { AttendanceLogsView } from './features/Attendance/AttendanceLogsView.jsx';
import { SocialServiceView } from './features/SocialService/SocialServiceView.jsx';
import { UnitOrganogram } from './features/Ranks/UnitOrganogram.jsx';
import { RankManagementView } from './features/Ranks/RankManagementView.jsx';

// ─── NCC Logo mark ─────────────────────────────────────────────────────────
const NCCMark = ({ size = 'md' }) => {
    const cls =
        size === 'sm'
            ? 'w-8 h-8 text-[10px]'
            : size === 'lg'
              ? 'w-12 h-12 text-sm'
              : 'w-10 h-10 text-xs';
    return (
        <div
            className={`${cls} rounded-lg flex items-center justify-center font-bold font-display text-white flex-shrink-0`}
            style={{ background: 'linear-gradient(135deg, #0A1628, #1B3A6B)' }}
        >
            <span className="gold-shimmer tracking-wide">NCC</span>
        </div>
    );
};

// ─── Tri-color accent bar ───────────────────────────────────────────────────
const TriColorBar = ({ height = 'h-0.5' }) => (
    <div className={`${height} w-full flex flex-shrink-0`}>
        <div className="flex-1 bg-ncc-red" />
        <div className="flex-1 bg-ncc-gold" />
        <div className="flex-1 bg-ncc-navy" />
    </div>
);

// ─── Cert badge ────────────────────────────────────────────────────────────
const CertBadge = ({ cert }) => {
    if (!cert) return null;
    const cls =
        cert === 'C' ? 'cert-c' : cert === 'B2' ? 'cert-b2' : 'cert-b1';
    return <span className={cls}>{cert}</span>;
};

export function Dashboard() {
    const {
        userRole,
        userEnrollmentId,
        handleLogout,
        markAnnouncementsAsRead,
    } = useAuthContext();
    const { cadets, events, staff, loading, attendanceData, newAnnouncementCount } =
        useDataContext();

    const defaultTab = userRole === 'admin' ? 'list' : 'profile';
    const [activeTab, setActiveTab] = useState(defaultTab);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [birthdayChecked, setBirthdayChecked] = useState(false);

    // Birthday greeting
    useEffect(() => {
        if (!loading && userRole === 'cadet' && !birthdayChecked && cadets.length > 0) {
            setBirthdayChecked(true);
            const c = cadets.find((c) => c.enrollmentId === userEnrollmentId);
            if (c?.dob) {
                try {
                    const today = new Date();
                    const [, m, d] = c.dob.split('-');
                    if (today.getMonth() + 1 === parseInt(m) && today.getDate() === parseInt(d)) {
                        toast.success(`Happy Birthday, ${c.name}! 🎉`, { autoClose: 10000 });
                    }
                } catch (e) {
                    console.error('DOB error:', e);
                }
            }
        }
    }, [loading, userRole, userEnrollmentId, cadets, birthdayChecked]);

    const adminTabs = useMemo(
        () => [
            { id: 'parade',        name: 'Parade Ground', icon: UserCheck },
            { id: 'att_logs',      name: 'Scan History',  icon: List },
            { id: 'list',          name: 'Cadet Roster',  icon: List },
            { id: 'rank_mgmt',     name: 'Rank Management', icon: Award },
            { id: 'hierarchy',     name: 'Unit Hierarchy', icon: Users },
            { id: 'summary',       name: 'Att. Summary',  icon: BarChart },
            { id: 'social',        name: 'Social Service', icon: Heart },
            { id: 'camps',         name: 'Camps',         icon: Tent },
            { id: 'training',      name: 'Training',      icon: BookOpen },
            { id: 'inventory',     name: 'Q-Store',       icon: Package },
            { id: 'fee',           name: 'Fee',           icon: Briefcase },
            { id: 'events',        name: 'Events',        icon: Megaphone },
            { id: 'staff',         name: 'Staff',         icon: User },
            { id: 'references',    name: 'References',    icon: FileText },
            { id: 'announcements', name: 'Announcements', icon: Megaphone },
        ],
        []
    );

    const cadetTabs = useMemo(
        () => [
            { id: 'profile',       name: 'My Profile',    icon: User },
            { id: 'hierarchy',     name: 'Unit Hierarchy', icon: Users },
            { id: 'attendance',    name: 'Attendance',    icon: Calendar },
            { id: 'social',        name: 'Social Service', icon: Heart },
            { id: 'camps',         name: 'My Camps',      icon: Tent },
            { id: 'training',      name: 'Training',      icon: BookOpen },
            { id: 'fee',           name: 'My Fee',        icon: Briefcase },
            { id: 'events',        name: 'Events',        icon: Megaphone },
            { id: 'staff',         name: 'Staff',         icon: User },
            { id: 'references',    name: 'References',    icon: FileText },
            {
                id: 'announcements',
                name: 'Notices',
                icon: Megaphone,
                badge: newAnnouncementCount > 0 ? newAnnouncementCount : null,
            },
        ],
        [newAnnouncementCount]
    );

    const availableTabs = userRole === 'admin' ? adminTabs : cadetTabs;

    useEffect(() => {
        if (userRole && !availableTabs.some((t) => t.id === activeTab)) {
            setActiveTab(userRole === 'admin' ? 'list' : 'profile');
        }
    }, [userRole, activeTab, availableTabs]);

    const handleTabClick = (tabId) => {
        setActiveTab(tabId);
        setSidebarOpen(false);
        if (tabId === 'announcements' && userRole === 'cadet') markAnnouncementsAsRead();
    };

    const currentCadet = useMemo(() => {
        if (userRole !== 'cadet') return null;
        return cadets.find((c) => c.enrollmentId === userEnrollmentId);
    }, [cadets, userRole, userEnrollmentId]);

    const initials = currentCadet?.name
        ? currentCadet.name.split(' ').map((s) => s[0] || '').join('').slice(0, 2).toUpperCase()
        : 'CC';

    const activeTabName = availableTabs.find((t) => t.id === activeTab)?.name || '';

    // ── Tab content ───────────────────────────────────────────────────────
    const TabContent = () => (
        <>
            {activeTab === 'parade'          && <AttendanceScanner />}
            {activeTab === 'att_logs'        && <AttendanceLogsView />}
            {activeTab === 'list'            && <CadetRoster cadets={cadets} />}
            {activeTab === 'attendance'    && <AttendanceTracker cadets={cadets} />}
            {activeTab === 'summary'       && <AttendanceSummary summaryData={attendanceData} />}
            {activeTab === 'camps'         && <CampsView />}
            {activeTab === 'training'      && <TrainingView />}
            {activeTab === 'inventory'     && <InventoryView />}
            {activeTab === 'fee'           && <FeeManagementView />}
            {activeTab === 'events'        && <EventsView events={events} />}
            {activeTab === 'staff'         && <StaffDetailsView staff={staff} />}
            {activeTab === 'references'    && <ReferencesView />}
            {activeTab === 'announcements' && <AnnouncementsView />}
            { activeTab === 'social'        && <SocialServiceView />}
            { activeTab === 'profile'       && <CadetProfileView />}
            { activeTab === 'hierarchy'     && <UnitOrganogram />}
            { activeTab === 'rank_mgmt'     && <RankManagementView />}
        </>
    );

    // ── Shared Sidebar ─────────────────────────────────────────────────────
    const SidebarContent = ({ tabs, role }) => (
        <aside
            className="flex flex-col h-full"
            style={{ background: '#0A1628', width: 'var(--sidebar-w)' }}
        >
            {/* Logo */}
            <div className="flex-shrink-0">
                <TriColorBar height="h-1" />
                <div className="px-5 py-5 flex items-center gap-3">
                    <NCCMark size="lg" />
                    <div>
                        <p className="text-white font-bold text-sm font-display leading-tight">GMRIT NCC</p>
                        <p className="text-[10px] tracking-widest uppercase text-ncc-gold/70 mt-0.5">
                            {role === 'admin' ? 'Admin Portal' : 'Cadet Portal'}
                        </p>
                    </div>
                </div>
                <div className="mx-4 h-px bg-white/10" />
            </div>

            {/* Cadet identity (cadet only) */}
            {role === 'cadet' && (
                <div className="mx-4 my-4 p-3 rounded-xl flex items-center gap-3 border border-white/10"
                    style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="w-10 h-10 rounded-full border-2 border-ncc-gold/50 overflow-hidden flex items-center justify-center bg-ncc-navy-mid flex-shrink-0">
                        {currentCadet?.photoUrl ? (
                            <img src={currentCadet.photoUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-ncc-gold font-bold font-display text-sm">{initials}</span>
                        )}
                    </div>
                    <div className="min-w-0">
                        <p className="text-white font-semibold text-sm truncate">{currentCadet?.name || 'Cadet'}</p>
                        <p className="text-white/40 text-xs truncate font-mono">{currentCadet?.enrollmentId || ''}</p>
                    </div>
                </div>
            )}

            {/* Nav */}
            <nav className="flex-1 overflow-y-auto ncc-scrollbar px-3 py-2 space-y-0.5">
                <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] px-3 mb-3 mt-1">
                    Navigation
                </p>
                {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => handleTabClick(tab.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 text-left relative ${
                                isActive
                                    ? 'text-white shadow-lg'
                                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                            }`}
                            style={isActive ? { background: 'rgba(255,255,255,0.1)' } : {}}
                        >
                            {isActive && (
                                <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r"
                                    style={{ background: '#b8830e' }} />
                            )}
                            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                                isActive ? 'bg-ncc-gold/20' : ''
                            }`}>
                                <tab.icon className={`w-4 h-4 ${isActive ? 'text-ncc-gold' : 'text-white/40'}`} />
                            </div>
                            <span className="font-medium text-sm flex-1">{tab.name}</span>
                            {tab.badge && (
                                <span className="w-5 h-5 bg-ncc-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                    {tab.badge}
                                </span>
                            )}
                        </button>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="flex-shrink-0 px-3 pb-5 pt-3 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 text-white/50 hover:text-ncc-red hover:bg-red-900/20"
                >
                    <div className="w-7 h-7 rounded-md flex items-center justify-center">
                        <LogOut className="w-4 h-4" />
                    </div>
                    <span className="font-medium text-sm">Logout</span>
                </button>
            </div>
        </aside>
    );

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN LAYOUT — permanent left sidebar
    // ═══════════════════════════════════════════════════════════════════════
    if (userRole === 'admin') {
        return (
            <div className="flex h-screen overflow-hidden" style={{ background: 'var(--ncc-cream)' }}>
                {/* ── Sidebar (desktop always visible, mobile toggle) ── */}
                {/* Desktop sidebar */}
                <div className="hidden lg:flex flex-shrink-0 shadow-xl" style={{ width: 'var(--sidebar-w)' }}>
                    <SidebarContent tabs={adminTabs} role="admin" />
                </div>

                {/* Mobile sidebar overlay */}
                {sidebarOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-40 fade-in"
                            style={{ background: 'rgba(10,22,40,0.7)', backdropFilter: 'blur(4px)' }}
                            onClick={() => setSidebarOpen(false)}
                        />
                        <div className="slide-in fixed top-0 left-0 h-full z-50 shadow-2xl"
                            style={{ width: 'var(--sidebar-w)' }}>
                            <SidebarContent tabs={adminTabs} role="admin" />
                        </div>
                    </>
                )}

                {/* ── Main ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Top bar */}
                    <header className="flex-shrink-0 bg-white border-b border-[#ddd8cc] shadow-sm">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                            <div className="flex items-center gap-3">
                                {/* Mobile hamburger */}
                                <button
                                    className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border border-[#ddd8cc] text-gray-500 hover:bg-[#f5f0e8] transition"
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                >
                                    {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                                </button>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ncc-gold/80">
                                        Admin Portal
                                    </p>
                                    <h1 className="text-base font-bold font-display text-ncc-navy leading-tight">
                                        {activeTabName}
                                    </h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="hidden sm:inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-ncc-navy text-ncc-gold">
                                    OFFICER
                                </span>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition"
                                >
                                    <LogOut className="w-3.5 h-3.5" /> Logout
                                </button>
                            </div>
                        </div>
                        <TriColorBar height="h-0.5" />
                    </header>

                    {/* Content */}
                    <main className="flex-1 overflow-y-auto ncc-scrollbar">
                        {loading ? (
                            <div className="flex justify-center items-center h-full">
                                <LoadingIndicator />
                            </div>
                        ) : (
                            <div className="ncc-page max-w-[1400px] mx-auto">
                                <TabContent />
                            </div>
                        )}
                    </main>
                </div>
            </div>
        );
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CADET LAYOUT — permanent sidebar (desktop) + bottom tab bar (mobile)
    // ═══════════════════════════════════════════════════════════════════════
    // Bottom 5 tabs for mobile
    const bottomTabs = cadetTabs.slice(0, 5);

    return (
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--ncc-cream)' }}>
            {/* ── Desktop Sidebar ── */}
            <div className="hidden lg:flex flex-shrink-0 shadow-xl" style={{ width: 'var(--sidebar-w)' }}>
                <SidebarContent tabs={cadetTabs} role="cadet" />
            </div>

            {/* ── Mobile Drawer overlay ── */}
            {sidebarOpen && (
                <>
                    <div
                        className="fixed inset-0 z-40 fade-in"
                        style={{ background: 'rgba(10,22,40,0.7)', backdropFilter: 'blur(4px)' }}
                        onClick={() => setSidebarOpen(false)}
                    />
                    <div className="slide-in fixed top-0 left-0 h-full z-50 shadow-2xl"
                        style={{ width: 'var(--sidebar-w)' }}>
                        <SidebarContent tabs={cadetTabs} role="cadet" />
                    </div>
                </>
            )}

            {/* ── Main ── */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="flex-shrink-0 bg-ncc-navy shadow-lg">
                    <TriColorBar height="h-0.5" />
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/15 transition"
                            >
                                <span className="w-5 h-0.5 bg-white rounded" />
                                <span className="w-5 h-0.5 bg-white rounded" />
                                <span className="w-3 h-0.5 rounded" style={{ background: '#b8830e' }} />
                            </button>
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold leading-none"
                                    style={{ color: 'rgba(184,131,14,0.8)' }}>
                                    GMRIT NCC
                                </p>
                                <p className="text-sm font-bold text-white leading-tight">{activeTabName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {newAnnouncementCount > 0 && (
                                <button
                                    onClick={() => handleTabClick('announcements')}
                                    className="relative w-9 h-9 flex items-center justify-center rounded-lg bg-white/10"
                                >
                                    <Megaphone className="w-4 h-4 text-white" />
                                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-ncc-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                                        {newAnnouncementCount}
                                    </span>
                                </button>
                            )}
                            <button
                                onClick={() => handleTabClick('profile')}
                                className="w-9 h-9 rounded-full border-2 overflow-hidden flex items-center justify-center bg-ncc-navy-mid"
                                style={{ borderColor: 'rgba(184,131,14,0.5)' }}
                            >
                                {currentCadet?.photoUrl ? (
                                    <img src={currentCadet.photoUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-ncc-gold text-xs font-bold font-display">{initials}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </header>

                {/* Content */}
                <main className="flex-1 overflow-y-auto ncc-scrollbar pb-20 lg:pb-0">
                    {loading ? (
                        <div className="flex justify-center items-center h-full">
                            <LoadingIndicator />
                        </div>
                    ) : (
                        <div className="ncc-page max-w-2xl mx-auto">
                            <TabContent />
                        </div>
                    )}
                </main>

                {/* ── Mobile Bottom Tab Bar ── */}
                <nav className="lg:hidden flex-shrink-0 bg-white border-t border-[#ddd8cc] shadow-[0_-4px_20px_rgba(10,22,40,0.08)]">
                    <div className="flex">
                        {bottomTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => handleTabClick(tab.id)}
                                    className="flex-1 flex flex-col items-center gap-1 py-2.5 px-1 relative transition-all"
                                >
                                    {isActive && (
                                        <span className="absolute top-0 left-2 right-2 h-0.5 rounded-b"
                                            style={{ background: '#b8830e' }} />
                                    )}
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                                        isActive ? 'bg-ncc-navy' : ''
                                    }`}>
                                        <tab.icon className={`w-4 h-4 ${isActive ? 'text-ncc-gold' : 'text-gray-400'}`} />
                                    </div>
                                    <span className={`text-[10px] font-semibold truncate max-w-full px-1 ${
                                        isActive ? 'text-ncc-navy' : 'text-gray-400'
                                    }`}>
                                        {tab.name}
                                    </span>
                                    {tab.badge && (
                                        <span className="absolute top-1.5 right-1 w-4 h-4 bg-ncc-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                                            {tab.badge}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </nav>
            </div>
        </div>
    );
}

export default Dashboard;
