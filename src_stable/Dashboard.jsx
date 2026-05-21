// src/Dashboard.jsx - v2.1.0-stable-no-notification-crash
import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase/config.js';
import { AuthContext, useAuthContext } from './context/AuthContext.jsx';
import { useDataContext } from './context/DataContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { getCollectionRef, migrateInstitutionId, rescueAllData } from './firebase/firestoreService.js';
import { useTenant } from './context/TenantContext.jsx';
import { onSnapshot, query, orderBy, limit, doc, getDoc, addDoc, getDocs } from 'firebase/firestore';
import { LoadingIndicator } from './components/ui/LoadingIndicator.jsx';
import { toast } from 'react-toastify';
import { Leaderboard } from './features/Engagement/Leaderboard.jsx';
import { BroadcastManager } from './features/Engagement/BroadcastManager.jsx';
import { AnnouncementsView } from './features/Engagement/AnnouncementsView.jsx';
import { FeedbackView } from './features/Engagement/FeedbackView.jsx';
import { TrainingHub } from './features/Training/TrainingHub.jsx';
import { UnitGallery } from './features/Gallery/UnitGallery.jsx';
import { UnitAlerts } from './features/Engagement/UnitAlerts.jsx';
import { requestNotificationPermission, onForegroundMessage } from './firebase/messagingService';

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
    GraduationCap, // Added for Phase 8
    Trophy,
    Bell,
    Menu,
    X,
    PieChart,
    History,
    Shield,
    MessageSquare,
    LifeBuoy,
    VideoIcon,
    Activity,
    Search,
    ImageIcon,
    Ruler,
    ChevronDown,
    ChevronRight,
    Medal,
    Target,
    Flag,
    Droplet,
    CreditCard,
    LinkIcon,
    Clock,
    Star,
    MessageCircle,
    Camera,
    ShieldCheck,
    ShieldCheckIcon,
    Sparkles,
    Download
} from './components/Icons.jsx';


import { CadetRoster } from './features/Cadets/CadetRoster.jsx';
import { AttendanceTracker } from './features/Attendance/AttendanceTracker.jsx';
import { AttendanceSummary } from './features/Attendance/AttendanceSummary.jsx';
import { EventsView } from './features/Events/EventsView.jsx';
import { StaffDetailsView } from './features/Staff/StaffDetailsView.jsx';
import { ReferencesView } from './features/References/ReferencesView.jsx';
import { FeeManagementView } from './features/Fee/FeeManagementView.jsx';
import { UnitAnalytics } from './features/Analytics/UnitAnalytics.jsx';
import { CertificateGenerator } from './features/Analytics/CertificateGenerator.jsx';
import { CadetProfileView } from './features/Profile/CadetProfileView.jsx';
import { InventoryView } from './features/Inventory/InventoryView.jsx';
import { CampsView } from './features/Camps/CampsView.jsx';

import { AttendanceScanner } from './features/Attendance/AttendanceScanner.jsx';
import { AttendanceLogsView } from './features/Attendance/AttendanceLogsView.jsx';
import { SocialServiceView } from './features/SocialService/SocialServiceView.jsx';
import { UnitOrganogram } from './features/Ranks/UnitOrganogram.jsx';
import { RankManagementView } from './features/Ranks/RankManagementView.jsx';
import { AlumniView } from './features/Alumni/AlumniView.jsx';
import { CareerGuidanceView } from './features/Career/CareerGuidanceView.jsx';
import { DisciplineView } from './features/Ranks/DisciplineView.jsx';
import { GrievanceView } from './features/Grievance/GrievanceView.jsx';
import { ResourceLibraryView } from './features/Training/ResourceLibraryView.jsx';
import { KitManagementView } from './features/Inventory/KitManagementView.jsx';
import { CampNominationView } from './features/Camps/CampNominationView.jsx';
import { PFTTrackerView } from './features/Training/PFTTrackerView.jsx';
import { CareerBridgeView } from './features/Alumni/CareerBridgeView.jsx';
import { TrainingCalendarView } from './features/Training/TrainingCalendarView.jsx';
import { NCCKnowledgeView } from './features/References/NCCKnowledgeView.jsx';
import { FeatureShowcase } from './components/FeatureShowcase.jsx';
import { LeaveRequestView } from './features/Cadets/LeaveRequestView.jsx';
import { HallOfFame } from './features/Analytics/HallOfFame.jsx';
import { DutyRoster } from './features/Administration/DutyRoster.jsx';
import { BloodRegistry } from './features/SocialService/BloodRegistry.jsx';
import { KitFitPredictor } from './features/Inventory/KitFitPredictor.jsx';
import { DirectChat } from './features/Engagement/DirectChat.jsx';
import { SecurityDashboard } from './features/Security/SecurityDashboard.jsx';
import { AIAssistant } from './features/Engagement/AIAssistant.jsx';
import { IDCardGenerator } from './features/Profile/IDCardGenerator.jsx';


// ─── NCC Logo mark ─────────────────────────────────────────────────────────
const NCCMark = ({ size = 'md' }) => {
    const { isDarkMode } = useTheme();
    const cls =
        size === 'sm'
            ? 'w-8 h-8 text-[10px]'
            : size === 'lg'
              ? 'w-12 h-12 text-sm'
              : 'w-10 h-10 text-xs';
    return (
        <div
            className={`${cls} rounded-lg flex items-center justify-center font-bold font-display flex-shrink-0`}
            style={{ background: isDarkMode ? 'linear-gradient(135deg, #0A1628, #1B3A6B)' : 'linear-gradient(135deg, #1B3A6B, #0A1628)', color: '#ffffff' }}
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

const CertBadge = ({ cert }) => {
    if (!cert) return null;
    const cls =
        cert === 'C' ? 'cert-c' : cert === 'B2' ? 'cert-b2' : 'cert-b1';
    return <span className={cls}>{cert}</span>;
};

// ─── Theme Toggle ───────────────────────────────────────────────────────────
import { ThemeToggle } from './components/ui/ThemeToggle.jsx';

// ─── Shared Sidebar ─────────────────────────────────────────────────────
function SidebarContent({ tabs, role, activeTab, handleTabClick, handleLogout, currentCadet, initials, tenant }) {
    const { isDarkMode } = useTheme();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [installPrompt, setInstallPrompt] = React.useState(null);

    React.useEffect(() => {
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = () => {
        if (installPrompt) {
            installPrompt.prompt();
            installPrompt.userChoice.then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the PWA install prompt');
                }
                setInstallPrompt(null);
            });
        }
    };
    return (
    <aside
        className="flex flex-col h-full border-r"
        style={{ background: 'var(--bg-sidebar)', width: 'var(--sidebar-w)', borderColor: 'var(--border-main)' }}
    >
        {/* Logo */}
        <div className="flex-shrink-0">
            <TriColorBar height="h-1" />
            <div className="px-5 py-5 flex items-center gap-3">
                <NCCMark size="lg" />
                <div>
                    <p className="font-bold text-sm font-display leading-tight" style={{ color: 'var(--text-sidebar)' }}>{tenant?.unitName || '14(A) BN NCC'}</p>
                    <p className="text-[10px] tracking-widest uppercase mt-0.5" style={{ color: 'var(--ncc-gold)' }}>
                        {tenant?.location || 'Srikakulam'}
                    </p>
                </div>
            </div>
            <div className="mx-4 h-px" style={{ background: 'var(--border-main)', opacity: 0.2 }} />
            {/* Search bar */}
            <div className="mx-3 mt-3 mb-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
                <input
                    type="text"
                    placeholder="Search modules..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-lg text-xs font-medium outline-none transition-all"
                    style={{ 
                        background: isDarkMode ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.03)', 
                        border: '1px solid var(--border-main)',
                        color: 'var(--text-sidebar)'
                    }}
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60">
                        ×
                    </button>
                )}
            </div>
        </div>

        {/* Cadet identity (cadet only) */}
        {role === 'cadet' && (
            <div className="mx-4 my-4 p-3 rounded-xl flex items-center gap-3 border border-white/10"
                style={{ background: 'rgba(255,255,255,0.05)' }}>
                <div className="w-10 h-10 rounded-full border-2 border-ncc-gold/50 overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-ncc-navy-mid flex-shrink-0">
                    {currentCadet?.photoUrl ? (
                        <img src={currentCadet.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                        <span className="text-ncc-gold font-bold font-display text-sm">{initials}</span>
                    )}
                </div>
                <div className="min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: 'var(--text-sidebar)' }}>{currentCadet?.name || 'Cadet'}</p>
                    <p className="text-xs truncate font-mono" style={{ color: 'var(--text-sidebar-dim)' }}>{currentCadet?.enrollmentId || ''}</p>
                </div>
            </div>
        )}

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto ncc-scrollbar px-3 py-2 space-y-0.5 pb-20">
            {!searchQuery && (
                <p className="text-[9px] font-bold uppercase tracking-[0.2em] px-3 mb-3 mt-1" style={{ color: 'var(--text-sidebar-dim)' }}>
                    Navigation
                </p>
            )}
            {(() => {
                const filteredTabs = searchQuery
                    ? tabs.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    : tabs;

                if (filteredTabs.length === 0) return (
                    <p className="text-[10px] text-white/30 text-center py-6 italic">No modules found</p>
                );

                // If searching, show a flat list
                if (searchQuery) {
                    return filteredTabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 transition-all duration-150 text-left relative ${
                                    isActive ? 'shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                                style={{ 
                                    background: isActive ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(184,131,14,0.1)') : 'transparent',
                                    color: isActive ? (isDarkMode ? '#ffffff' : '#b8830e') : 'var(--text-sidebar-dim)'
                                }}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r" style={{ background: '#b8830e' }} />
                                )}
                                <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-ncc-gold/20' : ''}`}>
                                    <tab.icon className={`w-4 h-4 ${isActive ? 'text-ncc-gold' : 'text-white/60'}`} />
                                </div>
                                <span className="font-medium text-sm flex-1">{tab.name}</span>
                                {tab.badge && (
                                    <span className="w-5 h-5 bg-ncc-red text-white text-[10px] font-bold rounded-full flex items-center justify-center">{tab.badge}</span>
                                )}
                            </button>
                        );
                    });
                }

                // Group by category
                const groups = {};
                filteredTabs.forEach(tab => {
                    const cat = tab.category || 'Other';
                    if (!groups[cat]) groups[cat] = [];
                    groups[cat].push(tab);
                });

                // Find category of active tab to auto-expand it
                const activeCategory = filteredTabs.find(t => t.id === activeTab)?.category || 'Other';
                
                // Using an internal state for expanding/collapsing might lose state on re-render, 
                // but since SidebarContent is stable, we can use a local state. Wait, we can't use hooks conditionally here.
                // We will create a local sub-component for the accordion group.
                return Object.entries(groups).map(([catName, catTabs]) => (
                    <SidebarGroup 
                        key={catName} 
                        category={catName} 
                        tabs={catTabs} 
                        activeTab={activeTab} 
                        handleTabClick={handleTabClick}
                        isDarkMode={isDarkMode}
                        defaultOpen={catName === activeCategory}
                    />
                ));
            })()}
        </nav>

        {/* Actions */}
        <div className="flex-shrink-0 px-3 pb-5 pt-3 border-t border-white/10 space-y-1">
            {installPrompt && (
                <button
                    onClick={handleInstall}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group bg-ncc-gold text-ncc-navy font-bold shadow-md hover:brightness-110 active:scale-95"
                >
                    <div className="w-7 h-7 rounded-md flex items-center justify-center bg-white/20">
                        <Download className="w-4 h-4" />
                    </div>
                    <span className="text-sm">Install App</span>
                </button>
            )}
            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group"
                style={{ color: 'var(--text-sidebar-dim)' }}
            >
                <div className="w-7 h-7 rounded-md flex items-center justify-center group-hover:bg-red-500/10">
                    <LogOut className="w-4 h-4 group-hover:text-ncc-red" />
                </div>
                <span className="font-medium text-sm group-hover:text-ncc-red">Logout</span>
            </button>
        </div>
    </aside>
    );
}

// ─── Sidebar Group Accordion ──────────────────────────────────────────────
function SidebarGroup({ category, tabs, activeTab, handleTabClick, isDarkMode, defaultOpen }) {
    const [isOpen, setIsOpen] = React.useState(defaultOpen);

    // Auto-open if a tab inside this group becomes active externally
    React.useEffect(() => {
        if (tabs.some(t => t.id === activeTab)) {
            setIsOpen(true);
        }
    }, [activeTab, tabs]);

    const hasActive = tabs.some(t => t.id === activeTab);

    return (
        <div className="mb-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-white/5 group"
            >
                <span className={`text-[10px] font-bold uppercase tracking-widest ${hasActive ? 'text-ncc-gold' : 'text-gray-500 dark:text-white/40'} group-hover:text-ncc-navy dark:group-hover:text-white/80 transition-colors`}>
                    {category}
                </span>
                {isOpen ? <ChevronDown className="w-3 h-3 text-gray-400" /> : <ChevronRight className="w-3 h-3 text-gray-400" />}
            </button>
            
            {isOpen && (
                <div className="mt-1 space-y-0.5">
                    {tabs.map((tab) => {
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => handleTabClick(tab.id)}
                                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150 text-left relative ${
                                    isActive ? 'shadow-sm' : 'hover:bg-gray-100 dark:hover:bg-white/5'
                                }`}
                                style={{ 
                                    background: isActive ? (isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(184,131,14,0.1)') : 'transparent',
                                    color: isActive ? (isDarkMode ? '#ffffff' : '#b8830e') : 'var(--text-sidebar-dim)'
                                }}
                            >
                                {isActive && (
                                    <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-r" style={{ background: '#b8830e' }} />
                                )}
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${isActive ? 'bg-ncc-gold/20' : ''}`}>
                                    <tab.icon className={`w-3.5 h-3.5 ${isActive ? 'text-ncc-gold' : 'text-white/60'}`} />
                                </div>
                                <span className="font-medium text-[13px] flex-1">{tab.name}</span>
                                {tab.badge && (
                                    <span className="w-4 h-4 bg-ncc-red text-white text-[9px] font-bold rounded-full flex items-center justify-center">{tab.badge}</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ─── Tab Content Logic Moved Inside Dashboard for better scope access ───


const wideTabs = ['analytics', 'hierarchy', 'library', 'tutorials', 'exams', 'list', 'att_logs', 'honour', 'inventory', 'summary', 'events', 'discipline', 'rank_mgmt', 'staff', 'alumni', 'career', 'grievances', 'direct_chat'];

export function Dashboard() {
    const { tenant } = useTenant();
    const { isDarkMode, setIsDarkMode } = useTheme();
    const {
        userRole,
        userEnrollmentId,
        userInstitutionId,
        lastViewedAnnouncements,
        markNotificationsAsRead,
        lastViewedNotifications,
        userDelegatedModules,
        handleLogout,
        markAnnouncementsAsRead,
    } = useAuthContext();

    const [isOnline, setIsOnline] = useState(navigator.onLine);
    


    useEffect(() => {
        const handleOnline = () => { setIsOnline(true); toast.success("Secure Link Restored. Syncing data..."); };
        const handleOffline = () => { setIsOnline(false); toast.error("Secure Link Interrupted. Working in offline mode."); };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const { cadets, events, staff, loading, attendanceData, newAnnouncementCount, newNotificationCount } =
        useDataContext();

    const defaultTab = userRole === 'admin' ? 'analytics' : 'profile';

    // ── Read initial tab from URL (supports deep-linking & page refresh) ──
    // NOTE: adminTabs/cadetTabs are not available here (defined via useMemo below),
    // so we just read the raw param. The useEffect below validates & corrects invalid tabs.
    const getTabFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('tab') || defaultTab;
    };

    const [activeTab, setActiveTab] = useState(getTabFromUrl);

    // AuthContext to pass down dynamically
    const authContext = useAuthContext();
    const overriddenAuth = useMemo(() => {
        const isDelegatedAdmin = userRole !== 'admin' && activeTab.startsWith('admin_') && (userDelegatedModules || []).includes(activeTab.replace('admin_', ''));
        if (isDelegatedAdmin) {
            return { ...authContext, userRole: 'admin', actualRole: userRole };
        }
        return authContext;
    }, [authContext, activeTab, userRole, userDelegatedModules]);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatInitialCadetId, setChatInitialCadetId] = useState(null);
    const [birthdayChecked, setBirthdayChecked] = useState(false);
    const [hierarchyFilter, setHierarchyFilter] = useState('All');
    const [hierarchyDivFilter, setHierarchyDivFilter] = useState('All');
    const [showShowcase, setShowShowcase] = useState(() => {
        const hasSeen = localStorage.getItem(`ncc_showcase_${userRole}`);
        return !hasSeen;
    });

    const handleCloseShowcase = () => {
        localStorage.setItem(`ncc_showcase_${userRole}`, 'true');
        setShowShowcase(false);
    };


    // --- ONE-TIME INSTITUTION ID MIGRATION ---
    useEffect(() => {
        const runMigration = async () => {
            if (userRole !== 'admin') return;
            const key = 'ncc_migration_rescue_v4';
            if (localStorage.getItem(key)) return;
            try {
                const total = await rescueAllData('14a-bn-srikakulam');
                if (total > 0) {
                    toast.success(`Data Sync Complete: ${total} records restored to unit hierarchy.`);
                }
                localStorage.setItem(key, 'done');
            } catch (e) {
                console.error('Migration failed:', e);
            }
        };
        runMigration();
    }, [userRole]);

    // ─── Real-time Mobile Push Notifications ──────────────────────────────
    // ─── Real-time Mobile App Toasts & Native Notifications ──────────────────────────────
    useEffect(() => {
        // Listen for new notifications to trigger unit-wide toasts
        const q = query(getCollectionRef('notifications'), orderBy('timestamp', 'desc'), limit(1));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const latest = snapshot.docs[0].data();
                const now = new Date().getTime();
                const msgTime = new Date(latest.timestamp).getTime();
                
                // 1. Check if the message is fresh (last 10 seconds)
                if (now - msgTime < 10000) {
                    // 2. Filter for Cadets: Only show if relevant
                    if (userRole !== 'admin') {
                        // Check if it's for their group/cert/div
                        // (Optional detailed filtering can be added here)
                    }

                    // Show Toast
                    toast.info(`📢 ${latest.subject}: ${latest.message.substring(0, 50)}...`, {
                        position: "top-center",
                        autoClose: 5000,
                        onClick: () => handleTabClick('notifications')
                    });

                    // Trigger Native System Notification if permission granted
                    if (Notification.permission === 'granted') {
                        try {
                            new Notification(latest.subject || 'Unit Broadcast', {
                                body: latest.message,
                                icon: '/pwa-192x192.png',
                                badge: '/pwa-192x192.png'
                            });
                        } catch (e) {
                            console.warn('Native notification failed:', e);
                        }
                    }
                }
            }

        });

        return () => unsubscribe();
    }, [userRole]);

    // Broadcast Overdue check for Admins
    const [isBroadcastOverdue, setIsBroadcastOverdue] = useState(false);
    useEffect(() => {
        if (userRole === 'admin') {
            const q = query(getCollectionRef('notifications'), orderBy('timestamp', 'desc'), limit(1));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                if (!snapshot.empty) {
                    const last = snapshot.docs[0].data();
                    const overdue = (new Date() - new Date(last.timestamp)) > (24 * 60 * 60 * 1000);
                    setIsBroadcastOverdue(overdue);
                } else {
                    setIsBroadcastOverdue(true);
                }
            });
            return () => unsubscribe();
        }
    }, [userRole]);

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

    // ── Push Notifications: Permission Request & Token Registration ──────────
    // Always attempt to register on login so stale/rotated tokens are refreshed.
    useEffect(() => {
        if (loading || !userEnrollmentId) return;

        // Wait for the user's profile to load before registering
        let userProfile = null;
        if (userRole === 'cadet' && cadets.length > 0) {
            userProfile = cadets.find(c => c.enrollmentId === userEnrollmentId);
        } else if ((userRole === 'admin' || userRole === 'officer') && staff.length > 0) {
            userProfile = staff.find(s => s.staffId === userEnrollmentId);
        }

        if (!userProfile) return;

        // Delay slightly to avoid race with service worker registration
        const collectionName = userRole === 'cadet' ? 'cadets' : 'staff';
        const docId = userProfile.id || userProfile.enrollmentId || userProfile.staffId;
        const timer = setTimeout(() => {
            requestNotificationPermission(docId, collectionName);
        }, 3000);
        return () => clearTimeout(timer);
    }, [loading, userRole, userEnrollmentId, cadets, staff]);

    // ── Foreground Push: show toast when app is open and a push arrives ───────
    useEffect(() => {
        const unsubscribe = onForegroundMessage((payload) => {
            const title = payload.notification?.title || payload.data?.title || 'NCC Update';
            const body  = payload.notification?.body  || payload.data?.body  || '';
            toast.info(`${title}${body ? ': ' + body.substring(0, 80) : ''}`, {
                position: 'top-center',
                autoClose: 6000,
                onClick: () => handleTabClick('notifications'),
            });
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Broadcast Sentinel (Automatic Safety Net) ──
    useEffect(() => {
        if (userRole !== 'admin' || loading) return;

        const checkSentinel = async () => {
            try {
                // 1. Fetch Safety Settings
                const safetyRef = doc(getCollectionRef('settings'), 'broadcast_safety');
                const snap = await getDoc(safetyRef);
                
                if (!snap.exists() || !snap.data().enabled) return;
                const safety = snap.data();

                // 2. Check if past deadline
                const now = new Date();
                const [hr, min] = safety.deadline.split(':').map(Number);
                const deadline = new Date();
                deadline.setHours(hr, min, 0, 0);

                if (now < deadline) return;

                // 3. Check if anything sent TODAY
                const todayStr = now.toISOString().split('T')[0];
                const notifsRef = getCollectionRef('notifications');
                const q = query(notifsRef, orderBy('timestamp', 'desc'), limit(5));
                const notifsSnap = await getDocs(q);
                
                const sentToday = notifsSnap.docs.some(d => d.data().timestamp.startsWith(todayStr));
                if (sentToday) return;

                // 4. Auto-Send Fallback
                await addDoc(getCollectionRef('notifications'), {
                    subject: 'Unit Standing Order (Automated)',
                    message: safety.message,
                    target: 'All',
                    targetCertificate: safety.targetCert || 'All',
                    targetDivision: safety.targetDiv || 'All',
                    sender: 'Unit Sentinel',
                    timestamp: new Date().toISOString(),
                    isAutomated: true
                });

                toast.info("Safety Net Triggered: Automated broadcast sent to unit.");
            } catch (err) {
                console.error("Sentinel Error:", err);
            }
        };

        // Run once on mount and then every 10 mins
        checkSentinel();
        const interval = setInterval(checkSentinel, 10 * 60 * 1000);
        return () => clearInterval(interval);
    }, [userRole, loading]);

    const adminTabs = useMemo(
        () => [
            // Headquarters
            { id: 'ncc_knowledge',      name: 'NCC Knowledge',  category: 'Headquarters', icon: Flag },
            { id: 'analytics',         name: 'Analytics',      category: 'Headquarters', icon: PieChart },
            { id: 'hierarchy',         name: 'Hierarchy',      category: 'Headquarters', icon: Users },
            { id: 'hall_of_fame',      name: 'Unit Excellence',category: 'Headquarters', icon: Trophy },

            // Unit Administration
            { id: 'list',               name: 'Roster',         category: 'Administration', icon: List },
            { id: 'rank_mgmt',          name: 'Ranks',          category: 'Administration', icon: Medal },
            { id: 'delegations',        name: 'Chain of Command',category: 'Administration', icon: Shield },
            { id: 'discipline',         name: 'Discipline',     category: 'Administration', icon: Target },
            { id: 'alumni',             name: 'Alumni',         category: 'Administration', icon: GraduationCap },
            { id: 'staff',              name: 'Staff',          category: 'Administration', icon: User },

            // Logistics & Operations
            { id: 'inventory',          name: 'Inventory',      category: 'Logistics', icon: Package },
            { id: 'kit_mgmt',           name: 'Kit',            category: 'Logistics', icon: Shield },
            { id: 'fee',                name: 'Fees',           category: 'Logistics', icon: CreditCard },
            { id: 'cert_gen',           name: 'Certificates',   category: 'Logistics', icon: Award },

            // Attendance & Parades
            { id: 'parade',             name: 'Parade',         category: 'Attendance', icon: UserCheck },
            { id: 'summary',            name: 'Attendance',     category: 'Attendance', icon: BarChart },
            { id: 'att_logs',           name: 'Scan Logs',      category: 'Attendance', icon: Camera },
            { id: 'leave_requests',     name: 'Leave Requests', category: 'Attendance', icon: Clock },

            // Training & Development
            { id: 'training_calendar',  name: 'Calendar',       category: 'Training', icon: Calendar },
            { id: 'exams',              name: 'Exams',          category: 'Training', icon: FileText },
            { id: 'pft',                name: 'PFT',            category: 'Training', icon: Activity },
            { id: 'camps',              name: 'Camps',          category: 'Training', icon: Tent },
            { id: 'library',            name: 'Library',        category: 'Training', icon: BookOpen },

            // Engagement & Community
            { id: 'notifications',      name: 'Broadcast',      category: 'Engagement', icon: Megaphone, badge: isBroadcastOverdue ? '!' : null },
            { id: 'announcements',      name: 'Notice Board',   category: 'Engagement', icon: Bell },
            { id: 'direct_chat',        name: 'Messages',       category: 'Engagement', icon: MessageSquare },
            { id: 'events',             name: 'Events',         category: 'Engagement', icon: Star },
            { id: 'gallery',            name: 'Unit Gallery',   category: 'Engagement', icon: ImageIcon },
            { id: 'social',             name: 'Social',         category: 'Engagement', icon: Heart },
            { id: 'blood_registry',     name: 'Blood Bank',     category: 'Engagement', icon: Droplet },
            { id: 'career',             name: 'Careers',        category: 'Engagement', icon: Briefcase },
            { id: 'career_bridge',      name: 'Job Board',      category: 'Engagement', icon: LinkIcon },
            { id: 'grievances',         name: 'Grievances',     category: 'Engagement', icon: LifeBuoy },
            { id: 'feedback',           name: 'Feedback',       category: 'Engagement', icon: MessageCircle },
            // Security & Compliance
            { id: 'security',           name: 'Security',       category: 'Administration', icon: ShieldCheck },
        ],

        [isBroadcastOverdue]
    );

    const cadetTabs = useMemo(
        () => [
            // Personal Hub
            { id: 'ncc_knowledge',     name: 'NCC Knowledge', category: 'My Hub', icon: Flag },
            { id: 'profile',           name: 'My Profile',    category: 'My Hub', icon: User },
            { id: 'attendance',        name: 'Attendance',    category: 'My Hub', icon: BarChart },
            { id: 'fee',               name: 'My Fee',        category: 'My Hub', icon: CreditCard },
            { id: 'kit_mgmt',          name: 'Kit Sizes',     category: 'My Hub', icon: Shield },
            { id: 'leave_requests',    name: 'Apply Leave',   category: 'My Hub', icon: Clock },

            // Unit Knowledge & Intelligence
            { id: 'hierarchy',         name: 'Unit Hierarchy', category: 'Intelligence', icon: Users },
            { id: 'honour',            name: 'Honour Roll',    category: 'Intelligence', icon: Medal },
            { id: 'hall_of_fame',      name: 'Unit Excellence',category: 'Intelligence', icon: Trophy },
            { id: 'staff',             name: 'Staff',          category: 'Intelligence', icon: UserCheck },
            { id: 'alumni',            name: 'Alumni',         category: 'Intelligence', icon: GraduationCap },

            // Academics & Training
            { id: 'training_calendar', name: 'Calendar',      category: 'Training', icon: Calendar },
            { id: 'exams',             name: 'Mock Exams',    category: 'Training', icon: FileText },
            { id: 'pft',               name: 'My Fitness',    category: 'Training', icon: Activity },
            { id: 'camps',             name: 'My Camps',      category: 'Training', icon: Tent },
            { id: 'library',           name: 'Digital Library', category: 'Training', icon: BookOpen },

            // Unit Updates & Engagement
            { id: 'announcements',     name: 'Notice Board',  category: 'Engagement', icon: Bell, badge: newAnnouncementCount > 0 ? newAnnouncementCount : null },
            { id: 'notifications',     name: 'Broadcasts',    category: 'Engagement', icon: Megaphone },
            { id: 'direct_chat',       name: 'Messages',      category: 'Engagement', icon: MessageSquare },
            { id: 'events',            name: 'Events',        category: 'Engagement', icon: Star },
            { id: 'gallery',           name: 'Unit Gallery',  category: 'Engagement', icon: ImageIcon },
            { id: 'social',            name: 'Social Service', category: 'Engagement', icon: Heart },
            { id: 'blood_registry',    name: 'Blood Bank',    category: 'Engagement', icon: Droplet },

            // Services & Community
            { id: 'ai_assistant',      name: 'AI Assistant',  category: 'Services', icon: Sparkles },
            { id: 'career',            name: 'Career Hub',    category: 'Services', icon: Briefcase },
            { id: 'career_bridge',     name: 'Career Bridge', category: 'Services', icon: LinkIcon },
            { id: 'grievances',        name: 'Report Issue',  category: 'Services', icon: LifeBuoy },
            { id: 'feedback',          name: 'Feedback',      category: 'Services', icon: MessageCircle },
        ],
        [newAnnouncementCount]
    );

    const isAdminRole = userRole === 'admin' || userRole === 'officer';

    const baseTabs = useMemo(() => {
        let tabs = isAdminRole ? [...adminTabs] : [...cadetTabs];

        // Inject Delegated Roles
        if (!isAdminRole && userDelegatedModules && userDelegatedModules.length > 0) {
            const delegatedTabs = adminTabs.filter(t => userDelegatedModules.includes(t.id));
            if (delegatedTabs.length > 0) {
                delegatedTabs.forEach(t => { tabs.push({ ...t, id: 'admin_' + t.id, category: 'Admin Access' }); });
            }
        }

        return tabs;
    }, [newAnnouncementCount, adminTabs, cadetTabs, isAdminRole, userDelegatedModules]);

    const availableTabs = baseTabs;

    useEffect(() => {
        if (userRole && !availableTabs.some((t) => t.id === activeTab)) {
            handleTabClick('ncc_knowledge');
        }
    }, [userRole, activeTab, availableTabs]);

    // ── History API: sync URL → tab on mount & back/forward navigation ──
    useEffect(() => {
        // On first load, replace the current history entry so the URL always
        // reflects the active tab (avoids a blank/no-param state in the stack).
        const params = new URLSearchParams(window.location.search);
        if (!params.get('tab') || params.get('tab') !== activeTab) {
            window.history.replaceState({ tab: activeTab }, '', `?tab=${activeTab}`);
        }

        // Listen for Back / Forward button presses
        const handlePopState = (event) => {
            const tab = event.state?.tab;
            const tabs = userRole === 'admin' ? adminTabs : cadetTabs;
            if (tab && tabs.some(t => t.id === tab)) {
                setActiveTab(tab);
                // Also close mobile sidebar if open
                setSidebarOpen(false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userRole]);

    const handleTabClick = (tabId) => {
        // Push a new history entry so Back button works
        window.history.pushState({ tab: tabId }, '', `?tab=${tabId}`);
        setActiveTab(tabId);
        setSidebarOpen(false);
        if (tabId === 'announcements' && userRole === 'cadet') markAnnouncementsAsRead();
        if (tabId === 'notifications' && userRole === 'cadet') markNotificationsAsRead();
    };

    const currentCadet = useMemo(() => {
        if (isAdminRole) return null;
        return cadets.find((c) => c.enrollmentId === userEnrollmentId);
    }, [cadets, isAdminRole, userEnrollmentId]);

    const initials = useMemo(() => {
        const name = isAdminRole ? (userRole === 'officer' ? 'Officer' : 'Admin') : (currentCadet?.name || 'Cadet');
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }, [isAdminRole, userRole, currentCadet]);

    // ─── Unified Tab Content Renderer ───
    const renderTabContent = () => {
        const renderTab = activeTab.startsWith('admin_') ? activeTab.replace('admin_', '') : activeTab;
        return (
            <>
                {renderTab === 'analytics'       && (
                    <div className="h-full">
                        <UnitAnalytics 
                            onDrillDown={(cert, div) => { 
                                setHierarchyFilter(cert || 'All'); 
                                setHierarchyDivFilter(div || 'All');
                                handleTabClick('hierarchy');
                            }} 
                            onTabChange={setActiveTab} 
                        />
                    </div>
                )}
                {renderTab === 'cert_gen'        && <CertificateGenerator />}
                {renderTab === 'parade'          && <AttendanceScanner />}
                {renderTab === 'att_logs'        && <AttendanceLogsView />}
                {renderTab === 'list'            && <CadetRoster cadets={cadets} tenant={tenant} userInstitutionId={userInstitutionId} />}
                {renderTab === 'attendance'    && <AttendanceTracker cadets={cadets} />}
                {renderTab === 'summary'       && <AttendanceSummary summaryData={attendanceData} />}
                {renderTab === 'discipline'        && <DisciplineView />}
                {renderTab === 'delegations'       && <DutyRoster />}
                {renderTab === 'inventory'         && <InventoryView />}
                {renderTab === 'fee'           && <FeeManagementView />}
                {renderTab === 'events'        && <EventsView events={events} />}
                {renderTab === 'staff'         && <StaffDetailsView staff={staff} />}
                {renderTab === 'references'    && <ReferencesView />}
                {renderTab === 'announcements'  && <AnnouncementsView onTabChange={handleTabClick} />}
                {renderTab === 'social'        && <SocialServiceView />}
                {renderTab === 'profile'       && <CadetProfileView />}
                {renderTab === 'hierarchy'     && (
                    <UnitOrganogram 
                        initialFilter={hierarchyFilter} 
                        initialDivFilter={hierarchyDivFilter}
                        onFilterChange={setHierarchyFilter}
                        onDivFilterChange={setHierarchyDivFilter}
                    />
                )}
                {renderTab === 'rank_mgmt'     && <RankManagementView />}
                {renderTab === 'alumni'        && <AlumniView />}
                {renderTab === 'grievances'    && <GrievanceView />}
                {renderTab === 'career'        && <CareerGuidanceView />}
                {renderTab === 'discipline'    && <DisciplineView />}
                {renderTab === 'library'       && <ResourceLibraryView mode="library" />}
                {renderTab === 'exams'         && <TrainingHub />}
                {renderTab === 'honour'        && <Leaderboard />}
                {renderTab === 'notifications' && (userRole === 'admin' ? <BroadcastManager /> : <UnitAlerts />)}
                {renderTab === 'gallery'       && <UnitGallery />}
                {renderTab === 'tutorials'     && <TutorialsHub />}
                {renderTab === 'feedback'      && <FeedbackView />}
                {renderTab === 'kit_mgmt'      && <KitManagementView />}
                {renderTab === 'pft'           && <PFTTrackerView />}
                {renderTab === 'camps'         && <CampsView />}
                {renderTab === 'security'      && <SecurityDashboard />}
                {renderTab === 'career_bridge' && <CareerBridgeView />}
                {renderTab === 'training_calendar' && <TrainingCalendarView />}
                {renderTab === 'ncc_knowledge'     && <NCCKnowledgeView />}
                {renderTab === 'leave_requests'    && <LeaveRequestView />}
                {renderTab === 'hall_of_fame'      && <HallOfFame />}
                { renderTab === 'blood_registry'    && (
                    <BloodRegistry 
                        onChat={(cadetId) => {
                            setChatInitialCadetId(cadetId);
                            handleTabClick('direct_chat');
                        }} 
                    />
                )}
                {renderTab === 'direct_chat'       && (
                    <DirectChat 
                        initialCadetId={chatInitialCadetId} 
                        onClose={() => {
                            if (chatInitialCadetId) {
                                handleTabClick('blood_registry');
                                setChatInitialCadetId(null);
                            } else {
                                handleTabClick('ncc_knowledge');
                            }
                        }}
                    />
                )}
                {renderTab === 'kit_predictor'     && <KitFitPredictor />}
            </>
        );
    };


    const activeTabName = availableTabs.find((t) => t.id === activeTab)?.name || '';

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN LAYOUT — permanent left sidebar
    // ═══════════════════════════════════════════════════════════════════════
    if (isAdminRole) {
        return (
            <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
                {showShowcase && <FeatureShowcase onClose={handleCloseShowcase} />}
                {/* ── Sidebar (desktop always visible, mobile toggle) ── */}
                {/* Desktop sidebar */}
                <div className="hidden lg:flex flex-shrink-0 shadow-xl" style={{ width: 'var(--sidebar-w)' }}>
                    <SidebarContent 
                        tabs={availableTabs} 
                        role="admin" 
                        activeTab={activeTab}
                        handleTabClick={handleTabClick}
                        handleLogout={handleLogout}
                        tenant={tenant}
                    />
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
                            <SidebarContent 
                                tabs={availableTabs} 
                                role="admin" 
                                activeTab={activeTab}
                                handleTabClick={handleTabClick}
                                handleLogout={handleLogout}
                                tenant={tenant}
                            />
                        </div>
                    </>
                )}

                {/* ── Main ── */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Offline Warning Banner */}
                    {!isOnline && (
                        <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] py-2 text-center animate-pulse z-[60]">
                            Strategic Link Offline: Data Synchronization Suspended
                        </div>
                    )}
                    {/* Top bar */}
                    <header className="flex-shrink-0 border-b shadow-sm" style={{ background: 'var(--nav-header)', borderColor: 'var(--border-main)' }}>
                        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
                            <div className="flex items-center gap-3">
                                {/* Mobile hamburger */}
                                <button
                                    className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg border text-gray-500 hover:bg-gray-100 dark:hover:bg-white/10 transition"
                                    style={{ borderColor: 'var(--border-main)' }}
                                    onClick={() => setSidebarOpen(!sidebarOpen)}
                                >
                                    {sidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
                                </button>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-ncc-gold/80">
                                        {tenant?.unitName || 'NCC Portal'}
                                    </p>
                                    <h1 className="text-base font-bold font-display text-ncc-navy dark:text-white leading-tight">
                                        {activeTabName}
                                    </h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <ThemeToggle />
                                <button 
                                    onClick={() => handleTabClick('notifications')}
                                    className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-ncc-gold hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                                >
                                    <Bell className="w-5 h-5" />
                                    {userRole === 'admin' && isBroadcastOverdue && (
                                        <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-ncc-red rounded-full border-2 border-white dark:border-[#0a1628]" />
                                    )}
                                    {userRole === 'cadet' && newNotificationCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-ncc-red text-white text-[10px] font-black rounded-full border-2 border-white dark:border-[#0a1628] flex items-center justify-center">
                                            {newNotificationCount}
                                        </span>
                                    )}
                                </button>
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
                            <div className={`ncc-page mx-auto ${wideTabs.includes(activeTab) ? 'max-w-7xl' : 'max-w-2xl'}`}>
                                {renderTabContent()}
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
        <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-page)' }}>
            {showShowcase && <FeatureShowcase onClose={handleCloseShowcase} />}
            {/* ── Desktop Sidebar ── */}
            <div className="hidden lg:flex flex-shrink-0 shadow-xl" style={{ width: 'var(--sidebar-w)' }}>
                <SidebarContent 
                    tabs={availableTabs} 
                    role="cadet" 
                    activeTab={activeTab}
                    handleTabClick={handleTabClick}
                    handleLogout={handleLogout}
                    currentCadet={currentCadet}
                    initials={initials}
                    tenant={tenant}
                />
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
                        <SidebarContent 
                            tabs={availableTabs} 
                            role="cadet" 
                            activeTab={activeTab}
                            handleTabClick={handleTabClick}
                            handleLogout={handleLogout}
                            currentCadet={currentCadet}
                            initials={initials}
                            tenant={tenant}
                        />
                    </div>
                </>
            )}

            {/* ── Main ── */}
            <div className="flex-1 flex flex-col min-w-0" style={{ background: 'var(--bg-page)' }}>
                {/* Offline Warning Banner */}
                {!isOnline && (
                    <div className="bg-red-600 text-white text-[10px] font-black uppercase tracking-[0.3em] py-2 text-center animate-pulse z-[60]">
                        Strategic Link Offline: Data Synchronization Suspended
                    </div>
                )}
                {/* Top bar */}
                <header className="flex-shrink-0 shadow-lg border-b" style={{ background: 'var(--nav-header)', borderColor: 'var(--border-main)' }}>
                    <TriColorBar height="h-0.5" />
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden w-9 h-9 flex flex-col items-center justify-center gap-1.5 rounded-lg transition"
                                style={{ background: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
                            >
                                <span className="w-5 h-0.5 rounded" style={{ background: isDarkMode ? '#ffffff' : '#0a1628' }} />
                                <span className="w-5 h-0.5 rounded" style={{ background: isDarkMode ? '#ffffff' : '#0a1628' }} />
                                <span className="w-3 h-0.5 rounded" style={{ background: '#b8830e' }} />
                            </button>
                            <div>
                                <p className="text-[10px] uppercase tracking-[0.2em] font-semibold leading-none"
                                    style={{ color: 'rgba(184,131,14,0.8)' }}>
                                    14(A) BN NCC
                                </p>
                                <p className="text-sm font-bold leading-tight" style={{ color: 'var(--text-main)' }}>{activeTabName}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <ThemeToggle />
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
                        <div className={`ncc-page mx-auto ${wideTabs.includes(activeTab) ? 'max-w-7xl' : 'max-w-2xl'}`}>
                            <AuthContext.Provider value={overriddenAuth}>
                                {renderTabContent()}
                            </AuthContext.Provider>
                        </div>
                    )}
                </main>

                {/* ── Mobile Bottom Tab Bar ── */}
                <nav className="lg:hidden flex-shrink-0 bg-white dark:bg-[#0a1628] border-t border-[#ddd8cc] dark:border-white/10 shadow-[0_-4px_20px_rgba(10,22,40,0.08)]">
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
                                        isActive ? 'text-ncc-navy dark:text-ncc-gold' : 'text-gray-400 dark:text-white/40'
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
            {/* Global AI Assistant Floating Widget */}
            <AIAssistant />
        </div>
    );
}

export default Dashboard;
