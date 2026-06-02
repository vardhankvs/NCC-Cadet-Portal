// src/context/DataContext.jsx
import React, { createContext, useContext, useMemo } from 'react';
import { useFirestoreSubscription } from '../hooks/useFirestoreSubscription.jsx';
import { Timestamp } from 'firebase/firestore';
import { useAuthContext } from './AuthContext.jsx';

const DataContext = createContext();

// Helper to process event dates
const processEvent = (event) => {
    let date = new Date(0); // Default invalid date
    if (event.date instanceof Timestamp) {
        date = event.date.toDate();
    } else if (typeof event.date === 'string') {
        date = new Date(event.date);
    } else if (event.date instanceof Date && !isNaN(event.date.getTime())) {
        date = event.date;
    }
    if (isNaN(date.getTime())) {
        console.warn('Invalid date detected for event:', event);
        date = new Date(0);
    }
    return { ...event, date };
};

export const DataProvider = ({ children }) => {
    const { userRole, userEnrollmentId, lastViewedAnnouncements, lastViewedNotifications } =
        useAuthContext();

    // Subscriptions for all data streams
    const { data: rawCadets, loading: loadingCadets } =
        useFirestoreSubscription('cadets');
    const { data: events, loading: loadingEvents } =
        useFirestoreSubscription('events', false);
    const { data: staff, loading: loadingStaff } =
        useFirestoreSubscription('staff', false);
    const { data: references, loading: loadingReferences } =
        useFirestoreSubscription('references');
    const { data: announcements, loading: loadingAnnouncements } =
        useFirestoreSubscription('announcements', false);
    const { data: gallery, loading: loadingGallery } =
        useFirestoreSubscription('unit_gallery', false);

    // --- NEW: Q-Store Subscriptions ---
    const { data: inventory, loading: loadingInventory } = useFirestoreSubscription('inventory');
    const { data: inventoryLogs, loading: loadingInventoryLogs } = useFirestoreSubscription('inventoryLogs');
    const { data: camps, loading: loadingCamps } = useFirestoreSubscription('camps');
    const { data: jobs = [], loading: loadingJobs } = useFirestoreSubscription('jobs');
    const { data: materials, loading: loadingMaterials } = useFirestoreSubscription('materials');
    const { data: quizzes, loading: loadingQuizzes } = useFirestoreSubscription('quizzes');
    const { data: socialActivities, loading: loadingSocial } = useFirestoreSubscription('social_activities');
    const { data: grievances, loading: loadingGrievances } = useFirestoreSubscription('grievances');

    // --- NEW: Global Settings Subscription (For Payment QR) ---
    const { data: settingsData, loading: loadingSettings } =
        useFirestoreSubscription('settings');

    const { data: transactions, loading: loadingTransactions } = useFirestoreSubscription('transactions');
    const { data: notifications, loading: loadingNotifications } = useFirestoreSubscription('notifications');
    const { data: quizAttempts, loading: loadingQuizAttempts } = useFirestoreSubscription('quiz_attempts');

    // --- NEW: Extract Payment Document ---
    const paymentSettings = useMemo(() => {
        const paymentDoc = settingsData.find((d) => d.id === 'payment');
        return paymentDoc || { paymentQRUrl: '' };
    }, [settingsData]);

    // --- ALL CADETS LIST (Internal) ---
    const allCadets = useMemo(() => {
        // Filter out ghost/corrupted records that don't have a valid name or ID
        const validCadets = rawCadets.filter(c => c.name && c.enrollmentId);
        
        return validCadets.sort((a, b) => {
            const idA = a.enrollmentId || '';
            const idB = b.enrollmentId || '';
            const numA = parseInt(idA.match(/\d+$/)?.[0] || '0', 10);
            const numB = parseInt(idB.match(/\d+$/)?.[0] || '0', 10);
            if (numA !== numB) {
                return numA - numB;
            }
            return idA.localeCompare(idB);
        });
    }, [rawCadets]);

    const cadets = useMemo(() => allCadets.filter(c => c.status !== 'alumni'), [allCadets]);
    const alumni = useMemo(() => allCadets.filter(c => c.status === 'alumni'), [allCadets]);

    const processedEvents = useMemo(() => {
        return events.map(processEvent);
    }, [events]);

    // Updated loading logic to include settings
    const loading =
        loadingCadets ||
        loadingEvents ||
        loadingStaff ||
        loadingReferences ||
        loadingAnnouncements ||
        loadingInventory ||
        loadingInventoryLogs ||
        loadingCamps ||
        loadingMaterials ||
        loadingQuizzes ||
        loadingSocial ||
        loadingGrievances ||
        loadingSettings ||
        loadingTransactions ||
        loadingNotifications ||
        loadingQuizAttempts;

    // --- NEW: Check for New Announcements (Smart) ---
    const newAnnouncementCount = useMemo(() => {
        if (userRole !== 'cadet') {
            return 0;
        }
        if (!announcements || announcements.length === 0) {
            return 0;
        }
        const lastViewed = lastViewedAnnouncements || new Date(0);
        return announcements.filter((ann) => {
            if (!ann.createdAt) return false;
            const postDate = ann.createdAt.toDate
                ? ann.createdAt.toDate()
                : new Date(ann.createdAt);
            return postDate > lastViewed;
        }).length;
    }, [announcements, userRole, lastViewedAnnouncements]);

    // --- NEW: Check for New Notifications (Smart) ---
    const newNotificationCount = useMemo(() => {
        if (userRole !== 'cadet') {
            return 0;
        }
        if (!notifications || notifications.length === 0) {
            return 0;
        }
        const lastViewed = lastViewedNotifications || new Date(0);
        return notifications.filter((notif) => {
            if (!notif.timestamp) return false;
            const postDate = new Date(notif.timestamp);
            return postDate > lastViewed;
        }).length;
    }, [notifications, userRole, lastViewedNotifications]);

    // --- ATTENDANCE CALCULATION ---
    const attendanceData = useMemo(() => {
        const activeCadets = cadets; // already filtered out alumni
        const datesByCert = { B1: new Set(), B2: new Set(), C: new Set(), All: new Set() };
        
        activeCadets.forEach((cadet) => {
            const cert = cadet.currentCertificate || cadet.certificate;
            Object.keys(cadet.attendance || {}).forEach((date) => {
                datesByCert.All.add(date);
                if (cert === 'B1') datesByCert.B1.add(date);
                else if (cert === 'B2') datesByCert.B2.add(date);
                else if (cert === 'C') datesByCert.C.add(date);
            });
        });

        const periodsHeld = {
            All: datesByCert.All.size,
            B1: datesByCert.B1.size,
            B2: datesByCert.B2.size,
            C: datesByCert.C.size
        };

        if (periodsHeld.All === 0 || activeCadets.length === 0) {
            return {
                totalPeriodsHeld: 0,
                periodsHeld: { All: 0, B1: 0, B2: 0, C: 0 },
                averages: { All: 0, B1: 0, B2: 0, C: 0 },
                individualSummaries: [],
                overallAverage: 0,
                cadetNotFound: false,
            };
        }

        // --- ATTENDANCE SUMMARIES (All Cadets for Leaderboard) ---
        const individualSummaries = activeCadets.map((cadet) => {
            const cert = cadet.currentCertificate || cadet.certificate;
            const certPeriods = periodsHeld[cert] || periodsHeld.All;
            
            const presentCount = Object.values(cadet.attendance || {}).filter(
                (status) => status === 'Present'
            ).length;
            
            const percentage = certPeriods > 0 ? (presentCount / certPeriods) * 100 : 0;
            
            return {
                ...cadet,
                presentCount,
                totalPeriods: certPeriods,
                percentage: parseFloat(percentage.toFixed(2)),
            };
        });

        // --- PERSONAL SUMMARY (For Cadet Dashboard) ---
        const personalSummary = userRole === 'cadet' 
            ? individualSummaries.find(s => (s.enrollmentId || '').toLowerCase() === (userEnrollmentId || '').toLowerCase())
            : null;

        const calculateAverage = (cadetList, periods) => {
            if (cadetList.length === 0 || periods === 0) return 0;
            let totalPresent = 0;
            cadetList.forEach(c => {
                totalPresent += Object.values(c.attendance || {}).filter(s => s === 'Present').length;
            });
            const maxPossible = cadetList.length * periods;
            return parseFloat(((totalPresent / maxPossible) * 100).toFixed(2));
        };

        const cadetsB1 = activeCadets.filter(c => (c.currentCertificate || c.certificate) === 'B1');
        const cadetsB2 = activeCadets.filter(c => (c.currentCertificate || c.certificate) === 'B2');
        const cadetsC = activeCadets.filter(c => (c.currentCertificate || c.certificate) === 'C');

        const averages = {
            All: calculateAverage(activeCadets, periodsHeld.All),
            B1: calculateAverage(cadetsB1, periodsHeld.B1),
            B2: calculateAverage(cadetsB2, periodsHeld.B2),
            C: calculateAverage(cadetsC, periodsHeld.C)
        };

        return {
            totalPeriodsHeld: periodsHeld.All, // Keep for backward compatibility
            periodsHeld,
            averages,
            individualSummaries,
            personalSummary,
            overallAverage: averages.All, // Keep for backward compatibility
            cadetNotFound: userRole === 'cadet' && !personalSummary,
        };
    }, [cadets, userRole, userEnrollmentId]);

    const value = {
        cadets,
        alumni,
        allCadets,
        events: processedEvents,
        staff,
        references,
        announcements,
        inventory,
        inventoryLogs,
        camps,
        materials,
        quizzes,
        jobs,
        loading,
        attendanceData,
        newAnnouncementCount,
        newNotificationCount,
        socialActivities,
        grievances,
        paymentSettings,
        gallery,
        transactions,
        notifications,
        quizAttempts,
    };

    return (
        <DataContext.Provider value={value}>{children}</DataContext.Provider>
    );
};

export const useDataContext = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useDataContext must be used within a DataProvider');
    }
    return context;
};
