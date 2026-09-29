// src/Dashboard.jsx - v2.1.0-stable-no-notification-crash
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { auth, db } from './firebase/config.js';
import { AuthContext, useAuthContext } from './context/AuthContext.jsx';
import { useDataContext } from './context/DataContext.jsx';
import { useTheme } from './context/ThemeContext.jsx';
import { getCollectionRef, migrateInstitutionId, rescueAllData, cleanupAttendanceRecords } from './firebase/firestoreService.js';
import { useTenant } from './context/TenantContext.jsx';
import { onSnapshot, query, orderBy, limit, doc, getDoc, addDoc, getDocs, where, writeBatch, serverTimestamp } from 'firebase/firestore';
import { LoadingIndicator } from './components/ui/LoadingIndicator.jsx';
import { toast } from 'react-toastify';
import { Leaderboard } from './features/Engagement/Leaderboard.jsx';
import { AnnouncementsView } from './features/Engagement/AnnouncementsView.jsx';
import { FeedbackView } from './features/Engagement/FeedbackView.jsx';
import { TrainingHub } from './features/Training/TrainingHub.jsx';
import { UnitGallery } from './features/Gallery/UnitGallery.jsx';
import { UnitAlerts } from './features/Engagement/UnitAlerts.jsx';
import { BroadcastManager } from './features/Engagement/BroadcastManager.jsx';
import { requestNotificationPermission, onForegroundMessage } from './firebase/messagingService';
import { playNccNotificationSound } from './utils/notificationSound.js';
import { isCadetTargetedByBroadcast } from './utils/broadcastAudience.js';
import nccLogo from './assets/ncc_logo.png';

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
    LinkIcon,
    Clock,
    Star,
    MessageCircle,
    Camera,
    ShieldCheck,
    ShieldCheckIcon,
    Sparkles,
    Compass,
    Download
} from './components/Icons.jsx';


import { CadetRoster } from './features/Cadets/CadetRoster.jsx';
import { AttendanceTracker } from './features/Attendance/AttendanceTracker.jsx';
import { AttendanceSummary } from './features/Attendance/AttendanceSummary.jsx';
import { EventsView } from './features/Events/EventsView.jsx';
import { StaffDetailsView } from './features/Staff/StaffDetailsView.jsx';
import { ReferencesView } from './features/References/ReferencesView.jsx';
import { UnitAnalytics } from './features/Analytics/UnitAnalytics.jsx';
import { CertificateGenerator } from './features/Analytics/CertificateGenerator.jsx';
import { CadetProfileView } from './features/Profile/CadetProfileView.jsx';
import { InventoryView } from './features/Inventory/InventoryView.jsx';
import { CampsView } from './features/Camps/CampsView.jsx';
import { SelectionProcessView } from './features/Administration/SelectionProcessView.jsx';


import { AttendanceScanner } from './features/Attendance/AttendanceScanner.jsx';
import { AttendanceVerification } from './features/Attendance/AttendanceVerification.jsx';
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
import { PFTTrackerView } from './features/Training/PFTTrackerView.jsx';
import { CareerBridgeView } from './features/Alumni/CareerBridgeView.jsx';
import { TrainingCalendarView } from './features/Training/TrainingCalendarView.jsx';
import { ResultsView } from './features/Training/ResultsView.jsx';
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
import { AIAssistantPage } from './features/Engagement/AIAssistantPage.jsx';
import { IDCardGenerator } from './features/Profile/IDCardGenerator.jsx';
import { AppRatingPrompt } from './features/Engagement/AppRatingPrompt.jsx';
import { CollegesView } from './features/Administration/CollegesView.jsx';
// CampAttendanceView is now embedded inside CampsView
import { TimetableView } from './features/Timetable/TimetableView.jsx';
import { DelegatedCommandBanner } from './components/delegation/DelegatedCommandBanner.jsx';
import { CadetSubmissionsDrawer } from './components/delegation/CadetSubmissionsDrawer.jsx';
import { useDelegatedSubmissions, MODULE_NAMES } from './firebase/delegationWorkflowService.js';



// ─── NCC Logo mark ─────────────────────────────────────────────────────────
const NCCMark = ({ size = 'md' }) => {
    const heightCls = size === 'sm' ? 'h-8' : size === 'lg' ? 'h-12' : 'h-10';
    return (
        <div className="flex items-center justify-center flex-shrink-0">
            <img
                src={nccLogo}
                alt="NCC Logo"
                className={`${heightCls} w-auto max-w-[48px] object-contain drop-shadow-md`}
            />
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
function SidebarContent({ tabs, role, activeTab, handleTabClick, handleLogout, handleLogoutAllDevices, currentCadet, initials, tenant }) {
    const { isDarkMode } = useTheme();
    const { user, userRole } = useAuthContext();
    const { staff } = useDataContext();
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

    const currentStaff = React.useMemo(() => {
        if (!user || !Array.isArray(staff)) return null;
        return staff.find(s => (s.email || '').toLowerCase() === (user.email || '').toLowerCase());
    }, [staff, user]);

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

            {/* Profile Logo & Info Header (for ANOs and Cadets) */}
            {((userRole === 'admin' || userRole === 'officer' || userRole === 'cadet') && (userRole !== 'superadmin' && userRole !== 'battalion_admin')) && (() => {
                const isCadet = userRole === 'cadet';
                const profileName = isCadet ? currentCadet?.name : currentStaff?.name;
                const profileSub = isCadet ? currentCadet?.enrollmentId : (currentStaff?.rank || 'Associate NCC Officer');
                const profileImg = isCadet ? (currentCadet?.photoUrl || currentCadet?.photoURL) : (currentStaff?.photoUrl || currentStaff?.photoURL);
                const profileInitials = profileName ? profileName.split(' ').map((s) => s[0] || '').join('').slice(0, 2).toUpperCase() : (isCadet ? 'C' : 'ANO');
                
                return (
                    <div 
                        onClick={() => handleTabClick('profile')}
                        className="mx-3 mt-3 p-2.5 rounded-xl flex items-center gap-3 border border-white/10 cursor-pointer hover:bg-white/5 active:scale-98 transition-all"
                        style={{ background: 'rgba(255,255,255,0.03)' }}
                    >
                        <div className="w-10 h-10 rounded-full border-2 border-ncc-gold/50 overflow-hidden flex items-center justify-center bg-gray-100 dark:bg-ncc-navy-mid flex-shrink-0">
                            {profileImg ? (
                                <img src={profileImg} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-ncc-gold font-bold font-display text-sm">{profileInitials}</span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs truncate" style={{ color: 'var(--text-sidebar)' }}>{profileName || 'Loading Profile...'}</p>
                            <p className="text-[10px] truncate font-mono mt-0.5" style={{ color: 'var(--text-sidebar-dim)' }}>{profileSub || ''}</p>
                        </div>
                    </div>
                );
            })()}

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
            {role === 'admin' && (
                <button
                    onClick={handleLogoutAllDevices}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group mt-1 bg-red-500/10"
                    style={{ color: 'var(--ncc-red)' }}
                >
                    <div className="w-7 h-7 rounded-md flex items-center justify-center">
                        <LogOut className="w-4 h-4 text-ncc-red" />
                    </div>
                    <span className="font-medium text-sm text-ncc-red">Logout All Devices</span>
                </button>
            )}
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


const wideTabs = ['ncc_knowledge', 'analytics', 'hierarchy', 'library', 'tutorials', 'exams', 'list', 'att_logs', 'honour', 'inventory', 'summary', 'events', 'discipline', 'rank_mgmt', 'staff', 'alumni', 'career', 'career_bridge', 'feedback', 'grievances', 'direct_chat', 'results', 'colleges', 'overall_details', 'camps', 'camp_attendance', 'kit_mgmt', 'pft', 'security', 'training_calendar', 'leave_requests', 'hall_of_fame', 'blood_registry', 'timetable', 'cert_gen', 'selection_process', 'announcements', 'notifications', 'delegations', 'social', 'gallery', 'unit_gallery'];
const fullWidthTabs = ['list', 'delegations', 'hierarchy', 'colleges', 'overall_details', 'analytics', 'social', 'blood_registry', 'gallery', 'unit_gallery', 'rank_mgmt', 'camps', 'camp_attendance'];

export function Dashboard() {
    const { tenant } = useTenant();
    const { isDarkMode, setIsDarkMode } = useTheme();
    const authContext = useAuthContext();
    const {
        user,
        userName,
        userRole,
        userEnrollmentId,
        userInstitutionId,
        lastViewedAnnouncements,
        markNotificationsAsRead,
        lastViewedNotifications,
        userDelegatedModules,
        handleLogout,
        handleLogoutAllDevices,
        markAnnouncementsAsRead,
    } = authContext;

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

    const { cadets, events, staff, loading, attendanceData, newAnnouncementCount, newNotificationCount, units, selectedCollege, setSelectedCollege } =
        useDataContext();

    const battalionStaff = useMemo(() => {
        if (!Array.isArray(staff)) return [];
        return staff.filter(s => {
            if (!s || !s.name || !s.rank) return false;
            // Exclude College ANO records from Battalion Staff
            if (s.category === 'ano' || s.role === 'ano' || s.staffType === 'ano') return false;
            const inst = (s.institutionId || '').trim().toLowerCase();
            if (inst && inst !== '14a-bn-srikakulam' && inst !== 'battalion' && inst !== '14a' && inst !== 'unit') {
                return false;
            }
            return true;
        });
    }, [staff]);

    const isAdminRole = userRole === 'admin' || userRole === 'officer' || userRole === 'superadmin' || userRole === 'battalion_admin';
    const defaultTab = isAdminRole ? 'analytics' : 'profile';

    // ── Read initial tab from URL (supports deep-linking & page refresh) ──
    // NOTE: adminTabs/cadetTabs are not available here (defined via useMemo below),
    // so we just read the raw param. The useEffect below validates & corrects invalid tabs.
    const getTabFromUrl = () => {
        const params = new URLSearchParams(window.location.search);
        return params.get('tab') || defaultTab;
    };

    const [activeTab, setActiveTab] = useState(getTabFromUrl);

    // Current Cadet details
    const currentCadet = useMemo(() => {
        if (isAdminRole) return null;
        const cleanUserEnroll = (userEnrollmentId || '').trim().toUpperCase();
        const userUid = user?.uid;
        const userEmail = (user?.email || '').trim().toLowerCase();

        return (cadets || []).find((c) => {
            const cEnroll = (c.enrollmentId || '').trim().toUpperCase();
            const cReg = (c.regimentalNumber || '').trim().toUpperCase();
            const cUid = (c.uid || '').trim();
            const cEmail = (c.email || '').trim().toLowerCase();

            return (cleanUserEnroll && (cEnroll === cleanUserEnroll || cReg === cleanUserEnroll)) ||
                   (userUid && cUid === userUid) ||
                   (userEmail && cEmail && cEmail === userEmail);
        });
    }, [cadets, isAdminRole, userEnrollmentId, user?.uid, user?.email]);

    // Effective Delegations (from user doc or cadet doc)
    const effectiveDelegatedModules = useMemo(() => {
        const fromUser = userDelegatedModules || [];
        const fromCadet = currentCadet?.delegatedModules || [];
        return Array.from(new Set([...fromUser, ...fromCadet]));
    }, [userDelegatedModules, currentCadet]);

    const isDelegatedAdmin = !isAdminRole && activeTab.startsWith('admin_');
    const delegatedModuleId = activeTab.startsWith('admin_') ? activeTab.replace('admin_', '') : null;

    const overriddenAuth = useMemo(() => {
        if (isDelegatedAdmin) {
            return {
                ...authContext,
                userRole: 'admin',
                actualRole: userRole,
                isDelegatedCadet: true,
                delegatedModuleId
            };
        }
        return authContext;
    }, [authContext, isDelegatedAdmin, userRole, delegatedModuleId]);

    // Delegated task submission subscriptions
    const { 
        submissions: cadetSubmissions, 
        loading: cadetSubmissionsLoading, 
        pendingCount: cadetDelegatedPendingCount, 
        changesRequestedCount: cadetDelegatedChangesCount 
    } = useDelegatedSubmissions(
        userInstitutionId, 
        userRole === 'cadet' ? userEnrollmentId : null
    );

    // ANO-level submissions query
    const { 
        pendingCount: anoPendingSubmissionsCount 
    } = useDelegatedSubmissions(
        userRole !== 'cadet' ? userInstitutionId : null
    );

    const [showCadetSubmissionsDrawer, setShowCadetSubmissionsDrawer] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [chatInitialCadetId, setChatInitialCadetId] = useState(null);
    const [birthdayChecked, setBirthdayChecked] = useState(false);
    const [hierarchyFilter, setHierarchyFilter] = useState('All');
    const [hierarchyDivFilter, setHierarchyDivFilter] = useState('All');
    const [certGenFilter, setCertGenFilter] = useState('All');
    const [showShowcase, setShowShowcase] = useState(() => {
        const hasSeen = localStorage.getItem(`ncc_showcase_${userRole}`);
        return !hasSeen;
    });

    const handleCloseShowcase = () => {
        localStorage.setItem(`ncc_showcase_${userRole}`, 'true');
        setShowShowcase(false);
    };


    const handleTabClick = useCallback((tabId) => {
        window.history.pushState({ tab: tabId }, '', `?tab=${tabId}`);
        setActiveTab(tabId);
        setSidebarOpen(false);
        if (tabId === 'announcements' && userRole === 'cadet') markAnnouncementsAsRead?.();
        if (tabId === 'notifications' && userRole === 'cadet') markNotificationsAsRead?.();
    }, [userRole, markAnnouncementsAsRead, markNotificationsAsRead]);


    // --- ONE-TIME RESTORE TO GMRIT ---
    useEffect(() => {
        const runRestore = async () => {
            const key = 'ncc_restore_gmrit_v6';
            if (localStorage.getItem(key)) return;
            
            // Only superadmin/battalion_admin (Battalion Admin) or admin (ANO) can trigger this restore
            if (userRole !== 'superadmin' && userRole !== 'battalion_admin' && userRole !== 'admin') return;
            
            try {
                await cleanupAttendanceRecords();
                const collectionsToRestore = [
                    'cadets', 'events', 'announcements', 'unit_gallery',
                    'inventory', 'camps', 'materials', 'quizzes', 'social_activities', 'grievances'
                ];
                
                let totalRestored = 0;
                for (const colName of collectionsToRestore) {
                    const colRef = getCollectionRef(colName);
                    if (!colRef) continue;
                    
                    const q = query(colRef, where('institutionId', '==', '14a-bn-srikakulam'));
                    const snap = await getDocs(q);
                    
                    if (!snap.empty) {
                        const batch = writeBatch(db);
                        snap.docs.forEach(docSnap => {
                            batch.update(docSnap.ref, { institutionId: 'gmrit', updatedAt: serverTimestamp() });
                            totalRestored++;
                        });
                        await batch.commit();
                    }
                }
                
                if (totalRestored > 0) {
                    toast.success(`Data Sync Complete: ${totalRestored} records restored to GMRIT portal.`);
                }
                localStorage.setItem(key, 'done');
            } catch (err) {
                console.error('GMRIT restoration failed:', err);
            }
        };
        runRestore();
    }, [userRole]);

    // ─── Real-time Live In-App Notifications & Toasts (Firestore onSnapshot) ─────
    // ── Native System OS Notification Helper ─────────────────────────────────
    const triggerOsNotification = (title, body, targetTab = 'notifications', tagId = null) => {
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
            try {
                const iconUrl = `${window.location.origin}/pwa-192x192.png`;
                const soundUrl = `${window.location.origin}/sounds/ncc_notification.mp3`;
                const destUrl = `${window.location.origin}/?tab=${targetTab}`;
                const tag = `ncc-os-${tagId || Date.now()}`;

                if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.ready.then((reg) => {
                        reg.showNotification(title, {
                            body: body,
                            icon: iconUrl,
                            badge: iconUrl,
                            sound: soundUrl,
                            vibrate: [250, 100, 250, 100, 400],
                            tag: tag,
                            renotify: true,
                            data: { url: destUrl }
                        });
                    }).catch(() => {
                        new Notification(title, { body, icon: iconUrl, tag });
                    });
                } else {
                    new Notification(title, { body, icon: iconUrl, tag });
                }
            } catch (e) {
                console.warn('OS Notification trigger warning:', e);
            }
        }
    };

    // ─── Real-time Live In-App Notifications & Toasts (Firestore onSnapshot) ─────
    const seenNotifIdsRef = useRef(new Set());
    const initialNotifLoadedRef = useRef(false);

    useEffect(() => {
        const notifRef = getCollectionRef('notifications');
        if (!notifRef) return;
        
        const q = query(notifRef, orderBy('timestamp', 'desc'), limit(5));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!initialNotifLoadedRef.current) {
                snapshot.docs.forEach(docSnap => seenNotifIdsRef.current.add(docSnap.id));
                initialNotifLoadedRef.current = true;
                return;
            }

            snapshot.docs.forEach((docSnap) => {
                if (!seenNotifIdsRef.current.has(docSnap.id)) {
                    seenNotifIdsRef.current.add(docSnap.id);
                    const data = docSnap.data();

                    // 1. Exclude the sender themselves from being alerted about their own broadcast
                    if (data.senderUid && user?.uid && data.senderUid === user.uid) {
                        return;
                    }

                    // 2. Audience Targeting Check:
                    // Only members who match the selected target group/certificate/division/cadetId
                    // should receive the OS notification, sound, and toast!
                    if (userRole === 'cadet') {
                        const targetCandidate = currentCadet ? {
                            ...currentCadet,
                            institutionId: currentCadet.institutionId || userInstitutionId || 'gmrit'
                        } : { 
                            enrollmentId: userEnrollmentId, 
                            uid: user?.uid, 
                            email: user?.email,
                            status: 'active',
                            institutionId: userInstitutionId || 'gmrit'
                        };
                        const isTargeted = isCadetTargetedByBroadcast(targetCandidate, data);
                        if (!isTargeted) {
                            return;
                        }
                    } else if (isAdminRole) {
                        // For admins: if personal alert directed to someone else, skip
                        if (data.userId || data.enrollmentId) {
                            if (data.userId !== user?.uid && data.enrollmentId !== userEnrollmentId) {
                                return;
                            }
                        }
                    }

                    const title = data.title || data.subject || '📢 New NCC Update';
                    const body = data.message || data.body || 'Tap to view details';
                    const targetTab = data.targetTab || 'notifications';

                    // 🔊 Play official energetic defence sound on targeted recipient devices
                    playNccNotificationSound();

                    // 🔔 Native OS Notification popup for Desktop & Mobile OS
                    triggerOsNotification(title, body, targetTab, docSnap.id);

                    toast.info(
                        <div>
                            <strong>{title}</strong>
                            <p className="text-xs mt-1">{body}</p>
                        </div>,
                        {
                            autoClose: 6000,
                            position: "top-right",
                            icon: false,
                            onClick: () => {
                                if (targetTab && targetTab !== 'attendance') {
                                    handleTabClick(targetTab);
                                }
                            }
                        }
                    );
                }
            });
        }, (err) => console.warn('Real-time notifications listener notice:', err.message));

        return () => unsubscribe();
    }, [handleTabClick, userRole, isAdminRole, currentCadet, userEnrollmentId, user?.uid]);

    // ─── Real-time Announcements Listener ──────────────────────────────────────
    const seenAnnIdsRef = useRef(new Set());
    const initialAnnLoadedRef = useRef(false);

    useEffect(() => {
        const annRef = getCollectionRef('announcements');
        if (!annRef) return;
        
        const q = query(annRef, orderBy('createdAt', 'desc'), limit(5));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!initialAnnLoadedRef.current) {
                snapshot.docs.forEach(docSnap => seenAnnIdsRef.current.add(docSnap.id));
                initialAnnLoadedRef.current = true;
                return;
            }

            snapshot.docs.forEach((docSnap) => {
                if (!seenAnnIdsRef.current.has(docSnap.id)) {
                    seenAnnIdsRef.current.add(docSnap.id);
                    const data = docSnap.data();
                    const title = data.title || '📢 New Notice Board Update';
                    const body = data.content || data.message || 'Tap to read full announcement.';

                    // 🔊 Play official energetic defence sound on ALL recipient devices
                    playNccNotificationSound();

                    // 🔔 Native OS Notification popup for Desktop & Mobile OS
                    triggerOsNotification(title, body, 'announcements', docSnap.id);

                    toast.info(
                        <div>
                            <strong className="text-amber-300">📢 {title}</strong>
                            <p className="text-xs mt-1 line-clamp-2">{body}</p>
                        </div>,
                        {
                            autoClose: 7000,
                            position: "top-right",
                            icon: false,
                            onClick: () => handleTabClick('announcements')
                        }
                    );
                }
            });
        }, (err) => console.warn('Real-time announcements listener notice:', err.message));

        return () => unsubscribe();
    }, [handleTabClick]);



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
    const [pushPermissionStatus, setPushPermissionStatus] = useState(() => 
        typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default'
    );

    useEffect(() => {
        if (loading || !authContext.user?.uid) return;

        const currentPerm = typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'denied';
        setPushPermissionStatus(currentPerm);

        // Find cadet or staff profile document
        let userProfile = null;
        if (userRole === 'cadet' && Array.isArray(cadets) && cadets.length > 0 && userEnrollmentId) {
            userProfile = cadets.find(c => 
                (c.enrollmentId && c.enrollmentId.toUpperCase() === userEnrollmentId.toUpperCase()) ||
                (c.regimentalNumber && c.regimentalNumber.toUpperCase() === userEnrollmentId.toUpperCase()) ||
                c.uid === authContext.user.uid
            );
        } else if ((userRole === 'admin' || userRole === 'officer') && Array.isArray(staff) && staff.length > 0 && userEnrollmentId) {
            userProfile = staff.find(s => s.staffId === userEnrollmentId || s.uid === authContext.user.uid);
        }

        const collectionName = userRole === 'cadet' ? 'cadets' : (userRole === 'admin' || userRole === 'officer' ? 'staff' : 'users');

        // If permission is already granted in the browser, silently register/sync token
        if (currentPerm === 'granted') {
            const timer = setTimeout(() => {
                requestNotificationPermission({
                    authUid: authContext.user.uid,
                    profileId: userProfile?.id || null,
                    collectionName,
                    enrollmentId: userEnrollmentId,
                    userRole,
                    interactive: false
                });
            }, 1200);
            return () => clearTimeout(timer);
        }
    }, [loading, authContext.user?.uid, userRole, userEnrollmentId, cadets, staff]);

    // ── Foreground Push: show toast & OS notification when app is open ───────
    useEffect(() => {
        const unsubscribe = onForegroundMessage((payload) => {
            console.log("Foreground push received:", payload);
            if (payload?.notification) {
                // 🔊 Play branded NCC notification sound
                playNccNotificationSound();
                
                // 🔔 Native OS Notification popup for Desktop & Mobile OS
                triggerOsNotification(
                    payload.notification.title,
                    payload.notification.body,
                    payload.data?.targetTab || payload.targetTab || 'notifications',
                    Date.now()
                );

                toast.info(
                    <div>
                        <strong>{payload.notification.title}</strong>
                        <p className="text-xs mt-1">{payload.notification.body}</p>
                    </div>, 
                    { 
                        autoClose: 5000, 
                        position: "top-right", 
                        icon: false,
                        onClick: () => {
                            const target = payload.data?.targetTab || payload.targetTab;
                            if (target === 'attendance') {
                                // Banner is present on all tabs; no need to navigate.
                                return;
                            }
                            if (target) {
                                handleTabClick(target);
                            } else if (!payload.notification.title.toLowerCase().includes('action required')) {
                                handleTabClick('notifications');
                            }
                        }
                    }
                );
            }
        });
        return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);



        const adminTabs = useMemo(
        () => {
            const list = [
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
                { id: 'selection_process',  name: 'Selection Process', category: 'Administration', icon: UserCheck },
                { id: 'alumni',             name: 'Alumni',         category: 'Administration', icon: GraduationCap },

                { id: 'staff',              name: 'Battalion Staff', category: 'Administration', icon: User },
                { id: 'profile',            name: 'My Profile',     category: 'Administration', icon: User },

                // Logistics & Operations
                { id: 'inventory',          name: 'Inventory',      category: 'Logistics', icon: Package },
                { id: 'kit_mgmt',           name: 'Kit',            category: 'Logistics', icon: Shield },
                { id: 'cert_gen',           name: 'Certificates',   category: 'Logistics', icon: Award },

                // Attendance & Parades
                { id: 'parade',             name: 'Parade',         category: 'Attendance', icon: UserCheck },
                { id: 'summary',            name: 'Attendance',     category: 'Attendance', icon: BarChart },
                { id: 'att_logs',           name: 'Scan Logs',      category: 'Attendance', icon: Camera },
                { id: 'leave_requests',     name: 'Leave Requests', category: 'Attendance', icon: Clock },

                // Training & Development
                { id: 'training_calendar',  name: 'Calendar',       category: 'Training', icon: Calendar },
                { id: 'timetable',          name: 'Timetable',      category: 'Training', icon: Clock },
                { id: 'results',            name: 'Results',        category: 'Training', icon: Award },
                { id: 'pft',                name: 'PFT',            category: 'Training', icon: Activity },
                { id: 'camps',              name: 'Camps',          category: 'Training', icon: Tent },
                { id: 'library',            name: 'Library',        category: 'Training', icon: BookOpen },

                // Engagement & Community
                { id: 'announcements',      name: 'Notice Board',   category: 'Engagement', icon: Bell },
                { id: 'notifications',      name: 'Broadcasts',     category: 'Engagement', icon: Megaphone },
                { id: 'events',             name: 'Events',         category: 'Engagement', icon: Star },
                { id: 'gallery',            name: 'Unit Gallery',   category: 'Engagement', icon: ImageIcon },
                { id: 'social',             name: 'Social',         category: 'Engagement', icon: Heart },
                { id: 'blood_registry',     name: 'Blood Bank',     category: 'Engagement', icon: Droplet },
                { id: 'career',             name: 'Careers',        category: 'Engagement', icon: Briefcase },
                { id: 'career_bridge',      name: 'Job Board',      category: 'Engagement', icon: LinkIcon },
                { id: 'grievances',         name: 'Grievance Cell',     category: 'Engagement', icon: LifeBuoy },
                { id: 'feedback',           name: 'Feedback',       category: 'Engagement', icon: MessageCircle },
                // Security & Compliance
                { id: 'security',           name: 'Security',       category: 'Administration', icon: ShieldCheck },
            ];

            if (userRole === 'superadmin' || userRole === 'battalion_admin') {
                // Add Overall Details right after NCC Knowledge in Headquarters
                list.splice(1, 0, { id: 'overall_details', name: 'Overall Details', category: 'Headquarters', icon: Activity });
                // Add Colleges right after Overall Details
                list.splice(2, 0, { id: 'colleges', name: 'Colleges', category: 'Headquarters', icon: GraduationCap });
                // Add Camp Attendance after Colleges
                list.splice(3, 0, { id: 'camp_attendance', name: 'Camp Attendance', category: 'Headquarters', icon: Tent });
            }

            return list;
        },
        [userRole]
    );

    const cadetTabs = useMemo(
        () => [
            // Personal Hub
            { id: 'ncc_knowledge',     name: 'NCC Knowledge', category: 'My Hub', icon: Flag },
            { id: 'profile',           name: 'My Profile',    category: 'My Hub', icon: User },
            { id: 'attendance',        name: 'Attendance',    category: 'My Hub', icon: BarChart },
            { id: 'kit_mgmt',          name: 'Kit Sizes',     category: 'My Hub', icon: Shield },
            { id: 'leave_requests',    name: 'Apply Leave',   category: 'My Hub', icon: Clock },

            // Unit Knowledge & Intelligence
            { id: 'hierarchy',         name: 'Unit Hierarchy', category: 'Intelligence', icon: Users },
            { id: 'honour',            name: 'Honour Roll',    category: 'Intelligence', icon: Medal },
            { id: 'hall_of_fame',      name: 'Unit Excellence',category: 'Intelligence', icon: Trophy },
            { id: 'staff',             name: 'Battalion Staff',category: 'Intelligence', icon: UserCheck },
            { id: 'alumni',            name: 'Alumni',         category: 'Intelligence', icon: GraduationCap },

            // Academics & Training
            { id: 'training_calendar', name: 'Calendar',      category: 'Training', icon: Calendar },
            { id: 'timetable',         name: 'Timetable',     category: 'Training', icon: Clock },
            { id: 'exams',             name: 'Mock Exams',    category: 'Training', icon: FileText },
            { id: 'results',           name: 'Results',       category: 'Training', icon: Award },
            { id: 'pft',               name: 'My Fitness',    category: 'Training', icon: Activity },
            { id: 'camps',             name: 'My Camps',      category: 'Training', icon: Tent },
            { id: 'library',           name: 'Digital Library', category: 'Training', icon: BookOpen },

            // Unit Updates & Engagement
            { id: 'announcements',     name: 'Notice Board',  category: 'Engagement', icon: Bell, badge: newAnnouncementCount > 0 ? newAnnouncementCount : null },
            { id: 'notifications',     name: 'Broadcasts',    category: 'Engagement', icon: Megaphone },
            { id: 'direct_chat',       name: 'Messages',      category: 'Engagement', icon: MessageSquare },
            { id: 'grievances',        name: 'Grievance Cell', category: 'Engagement', icon: LifeBuoy },
            { id: 'events',            name: 'Events',        category: 'Engagement', icon: Star },
            { id: 'gallery',           name: 'Unit Gallery',  category: 'Engagement', icon: ImageIcon },
            { id: 'social',            name: 'Social Service', category: 'Engagement', icon: Heart },
            { id: 'blood_registry',    name: 'Blood Bank',    category: 'Engagement', icon: Droplet },

            // Services & Community
            { id: 'ai_assistant',      name: 'AI Assistant',  category: 'Services', icon: Sparkles },
            { id: 'career',            name: 'Career Hub',    category: 'Services', icon: Briefcase },
            { id: 'career_bridge',     name: 'Career Bridge', category: 'Services', icon: LinkIcon },
            { id: 'feedback',          name: 'Feedback',      category: 'Services', icon: MessageCircle },
        ],
        [newAnnouncementCount]
    );

    const baseTabs = useMemo(() => {
        let tabs = isAdminRole ? [...adminTabs] : [...cadetTabs];

        if (isAdminRole && (userRole === 'superadmin' || userRole === 'battalion_admin')) {
            // Hide local/unnecessary tabs from Battalion Admin
            const hiddenTabIds = [
                'parade', 'att_logs', 'leave_requests', 'kit_mgmt', 'inventory', 'pft',
                'hall_of_fame', 'hierarchy', 'list', 'delegations', 'discipline', 'alumni', 
                'training_calendar', 'camps', 'events', 'gallery', 'social', 'blood_registry', 'grievances',
                'profile', 'ai_assistant'
            ];
            tabs = tabs.filter(t => !hiddenTabIds.includes(t.id));
        }

        // Inject Delegated Roles
        if (!isAdminRole && effectiveDelegatedModules && effectiveDelegatedModules.length > 0) {
            const delegatedTabs = adminTabs.filter(t => effectiveDelegatedModules.includes(t.id));
            if (delegatedTabs.length > 0) {
                delegatedTabs.forEach(t => { 
                    if (!tabs.some(existing => existing.id === 'admin_' + t.id)) {
                        tabs.push({ ...t, id: 'admin_' + t.id, category: 'Admin Access' }); 
                    }
                });
            }
        }

        return tabs;
    }, [newAnnouncementCount, adminTabs, cadetTabs, isAdminRole, effectiveDelegatedModules, userRole]);

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

    const initials = useMemo(() => {
        const name = isAdminRole ? (userRole === 'officer' ? 'Officer' : 'Admin') : (currentCadet?.name || 'Cadet');
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }, [isAdminRole, userRole, currentCadet]);

    // ─── Unified Tab Content Renderer ───
    const renderTabContent = () => {
        const renderTab = activeTab.startsWith('admin_') ? activeTab.replace('admin_', '') : activeTab;
        return (
            <>
                {renderTab === 'overall_details'  && <CollegesView mode="overall" />}
                {renderTab === 'colleges'         && <CollegesView mode="directory" />}
                {renderTab === 'camp_attendance'   && <CampsView />}
                {renderTab === 'analytics'       && (
                    <div className="h-full">
                        <UnitAnalytics 
                            onDrillDown={(cert, div) => { 
                                if (cert === 'B1' || cert === 'B2' || cert === 'C' || cert === 'A') {
                                    setCertGenFilter(cert);
                                    handleTabClick('cert_gen');
                                } else {
                                    if (isBattalionAdmin) {
                                        handleTabClick('colleges');
                                    } else {
                                        setHierarchyFilter(cert || 'All'); 
                                        setHierarchyDivFilter(div || 'All');
                                        handleTabClick('hierarchy');
                                    }
                                }
                            }} 
                            onTabChange={setActiveTab} 
                        />
                    </div>
                )}
                {renderTab === 'cert_gen'        && <CertificateGenerator initialCertFilter={certGenFilter} />}
                {renderTab === 'parade'          && <AttendanceScanner />}
                {renderTab === 'att_logs'        && <AttendanceLogsView />}
                {renderTab === 'list'            && <CadetRoster cadets={cadets} tenant={tenant} userInstitutionId={userInstitutionId} />}
                {renderTab === 'attendance'    && <AttendanceTracker cadets={cadets} />}
                {renderTab === 'summary'       && <AttendanceSummary summaryData={attendanceData} />}
                {renderTab === 'discipline'        && <DisciplineView />}
                {renderTab === 'delegations'       && <DutyRoster initialSubTab={new URLSearchParams(window.location.search).get('subtab')} />}
                {renderTab === 'inventory'         && <InventoryView />}
                {renderTab === 'events'        && <EventsView events={events} />}
                {renderTab === 'staff'         && <StaffDetailsView staff={battalionStaff} />}
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
                {renderTab === 'notifications' && (isAdminRole ? <BroadcastManager /> : <UnitAlerts />)}
                {renderTab === 'gallery'       && <UnitGallery />}
                {renderTab === 'tutorials'     && <TutorialsHub />}
                {renderTab === 'feedback'      && <FeedbackView />}
                {renderTab === 'kit_mgmt'      && <KitManagementView />}
                {renderTab === 'pft'           && <PFTTrackerView />}
                {renderTab === 'camps'         && <CampsView />}
                {renderTab === 'selection_process' && <SelectionProcessView />}
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
                {renderTab === 'timetable'          && <TimetableView />}
                {renderTab === 'kit_predictor'     && <KitFitPredictor />}
                {renderTab === 'results'           && <ResultsView />}
                {renderTab === 'ai_assistant'      && <AIAssistantPage />}
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
                        handleLogoutAllDevices={handleLogoutAllDevices}
                        currentCadet={cadets.find((c) => c.enrollmentId === userEnrollmentId)}
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
                                handleLogoutAllDevices={handleLogoutAllDevices}
                                currentCadet={cadets.find((c) => c.enrollmentId === userEnrollmentId)}
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
                                {(userRole === 'superadmin' || userRole === 'battalion_admin') && (
                                    <div className="relative flex items-center gap-1.5 bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-lg border border-transparent dark:border-white/15">
                                        <GraduationCap className="w-4 h-4 text-ncc-gold" />
                                        <select
                                            value={selectedCollege}
                                            onChange={(e) => setSelectedCollege(e.target.value)}
                                            className="bg-transparent text-xs font-bold outline-none text-ncc-navy dark:text-white cursor-pointer pr-1"
                                            style={{ colorScheme: isDarkMode ? 'dark' : 'light' }}
                                        >
                                            <option value="All" className="bg-white dark:bg-[#0f172a] text-black dark:text-white">All Colleges</option>
                                            {units.filter(u => !u.isBattalion).map(u => (
                                                <option key={u.subdomain} value={u.subdomain} className="bg-white dark:bg-[#0f172a] text-black dark:text-white">
                                                    {u.collegeName || u.unitName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                                {isAdminRole && anoPendingSubmissionsCount > 0 && (
                                    <button
                                        onClick={() => {
                                            window.history.pushState({ tab: 'delegations' }, '', `?tab=delegations&subtab=verifications`);
                                            setActiveTab('delegations');
                                        }}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 transition animate-pulse"
                                        title="Cadet Tasks Pending Verification"
                                    >
                                        <Shield className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                                        <span className="hidden md:inline">Verifications:</span>
                                        <span className="bg-ncc-red text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                            {anoPendingSubmissionsCount}
                                        </span>
                                    </button>
                                )}
                                <ThemeToggle />
                                {userRole === 'cadet' && (
                                    <button 
                                        onClick={() => handleTabClick('notifications')}
                                        className="relative w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-ncc-gold hover:bg-gray-200 dark:hover:bg-white/20 transition-all"
                                    >
                                        <Bell className="w-5 h-5" />
                                        {newNotificationCount > 0 && (
                                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-ncc-red text-white text-[10px] font-black rounded-full border-2 border-white dark:border-[#0a1628] flex items-center justify-center">
                                                {newNotificationCount}
                                            </span>
                                        )}
                                    </button>
                                )}
                                <span className="hidden sm:inline-block px-2.5 py-1 rounded-md text-xs font-bold bg-ncc-navy text-ncc-gold">
                                    {(userRole === 'superadmin' || userRole === 'battalion_admin') ? 'BATTALION ADMIN' : (userRole === 'officer' ? 'OFFICER' : 'ADMIN')}
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
                            <div className={`ncc-page mx-auto ${fullWidthTabs.includes(activeTab) || fullWidthTabs.includes(activeTab.replace('admin_', '')) ? 'w-full max-w-none px-4 sm:px-6' : wideTabs.includes(activeTab) ? 'max-w-7xl' : 'max-w-2xl'}`}>
                                <div className="w-full space-y-6">
                                    {renderTabContent()}
                                </div>
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
                    handleLogoutAllDevices={handleLogoutAllDevices}
                    currentCadet={cadets.find((c) => c.enrollmentId === userEnrollmentId)}
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
                            handleLogoutAllDevices={handleLogoutAllDevices}
                            currentCadet={cadets.find((c) => c.enrollmentId === userEnrollmentId)}
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
                                {currentCadet?.photoUrl || currentCadet?.photoURL ? (
                                    <img src={currentCadet.photoUrl || currentCadet.photoURL} alt="" className="w-full h-full object-cover" />
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
                        <div className={`ncc-page mx-auto ${fullWidthTabs.includes(activeTab) || fullWidthTabs.includes(activeTab.replace('admin_', '')) ? 'w-full max-w-none px-4 sm:px-6' : (wideTabs.includes(activeTab) || (activeTab.startsWith('admin_') && wideTabs.includes(activeTab.replace('admin_', '')))) ? 'max-w-7xl' : 'max-w-2xl'}`}>
                            <AuthContext.Provider value={overriddenAuth}>
                                {pushPermissionStatus === 'default' && (
                                    <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-[#112240] via-[#1e3a8a] to-[#1e1b4b] border border-amber-400/40 text-white shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5">
                                            <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center shrink-0">
                                                <Bell className="w-5 h-5 text-ncc-gold animate-bounce" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-sm font-bold text-white tracking-wide">Enable Device Push Notifications</h4>
                                                    <span className="text-[10px] bg-amber-400 text-ncc-navy font-black px-2 py-0.5 rounded-full uppercase tracking-wider">Required</span>
                                                </div>
                                                <p className="text-xs text-white/80 mt-0.5">Receive instant OS lock-screen alerts for parade schedules, urgent ANO broadcasts, and unit orders.</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                const token = await requestNotificationPermission({
                                                    authUid: authContext.user?.uid,
                                                    profileId: currentCadet?.id || null,
                                                    collectionName: 'cadets',
                                                    enrollmentId: userEnrollmentId,
                                                    userRole: 'cadet',
                                                    interactive: true
                                                });
                                                if (token) {
                                                    toast.success("✅ Device Notifications Activated! You will now receive unit broadcasts.");
                                                    setPushPermissionStatus('granted');
                                                } else if (typeof window !== 'undefined' && window.Notification?.permission === 'denied') {
                                                    setPushPermissionStatus('denied');
                                                    toast.error("Notifications are blocked in your browser settings. Please allow notifications for this site.");
                                                }
                                            }}
                                            className="w-full sm:w-auto px-4 py-2.5 bg-ncc-gold hover:bg-yellow-400 text-ncc-navy font-bold text-xs rounded-xl shadow-md transition-all shrink-0 cursor-pointer flex items-center justify-center gap-2"
                                        >
                                            <Bell className="w-4 h-4" /> Turn On Notifications
                                        </button>
                                    </div>
                                )}
                                <AttendanceVerification />
                                {activeTab.startsWith('admin_') && (
                                    <DelegatedCommandBanner
                                        moduleId={activeTab.replace('admin_', '')}
                                        moduleName={availableTabs.find(t => t.id === activeTab)?.name || 'Admin Module'}
                                        cadetName={userName || user?.displayName || 'Cadet'}
                                        pendingCount={cadetDelegatedPendingCount}
                                        changesRequestedCount={cadetDelegatedChangesCount}
                                        onOpenSubmissions={() => setShowCadetSubmissionsDrawer(true)}
                                    />
                                )}
                                {renderTabContent()}
                                <CadetSubmissionsDrawer
                                    isOpen={showCadetSubmissionsDrawer}
                                    onClose={() => setShowCadetSubmissionsDrawer(false)}
                                    submissions={cadetSubmissions}
                                    loading={cadetSubmissionsLoading}
                                    onResubmitTask={(sub) => {
                                        setShowCadetSubmissionsDrawer(false);
                                        handleTabClick('admin_' + sub.moduleId);
                                    }}
                                />
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
            {/* Global App Rating Prompt */}
            <AppRatingPrompt />
        </div>
    );
}

export default Dashboard;
