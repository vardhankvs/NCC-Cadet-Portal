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
    const { userRole, userEnrollmentId, lastViewedAnnouncements } =
        useAuthContext();

    // Subscriptions for all data streams
    const { data: rawCadets, loading: loadingCadets } =
        useFirestoreSubscription('cadets');
    const { data: events, loading: loadingEvents } =
        useFirestoreSubscription('events');
    const { data: staff, loading: loadingStaff } =
        useFirestoreSubscription('staff');
    const { data: references, loading: loadingReferences } =
        useFirestoreSubscription('references');
    const { data: announcements, loading: loadingAnnouncements } =
        useFirestoreSubscription('announcements');

    // --- NEW: Q-Store Subscriptions ---
    const { data: inventory, loading: loadingInventory } = useFirestoreSubscription('inventory');
    const { data: inventoryLogs, loading: loadingInventoryLogs } = useFirestoreSubscription('inventoryLogs');
    const { data: camps, loading: loadingCamps } = useFirestoreSubscription('camps');
    const { data: materials, loading: loadingMaterials } = useFirestoreSubscription('materials');
    const { data: quizzes, loading: loadingQuizzes } = useFirestoreSubscription('quizzes');
    const { data: socialActivities, loading: loadingSocial } = useFirestoreSubscription('social_activities');

    // --- NEW: Global Settings Subscription (For Payment QR) ---
    const { data: settingsData, loading: loadingSettings } =
        useFirestoreSubscription('settings');

    // --- NEW: Extract Payment Document ---
    const paymentSettings = useMemo(() => {
        const paymentDoc = settingsData.find((d) => d.id === 'payment');
        return paymentDoc || { paymentQRUrl: '' };
    }, [settingsData]);

    // --- SORTED CADETS LIST ---
    const cadets = useMemo(() => {
        return [...rawCadets].sort((a, b) => {
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
        loadingSettings;

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

    // --- ATTENDANCE CALCULATION ---
    const attendanceData = useMemo(() => {
        const allDates = new Set();
        cadets.forEach((cadet) =>
            Object.keys(cadet.attendance || {}).forEach((date) =>
                allDates.add(date)
            )
        );
        const totalPeriodsHeld = allDates.size;
        if (totalPeriodsHeld === 0 || cadets.length === 0) {
            return {
                totalPeriodsHeld: 0,
                individualSummaries: [],
                overallAverage: 0,
                cadetNotFound: false,
            };
        }
        let relevantCadets = cadets;
        if (userRole === 'cadet' && userEnrollmentId) {
            relevantCadets = cadets.filter(
                (c) => c.enrollmentId === userEnrollmentId
            );
        }
        const individualSummaries = relevantCadets.map((cadet) => {
            const presentCount = Object.values(cadet.attendance || {}).filter(
                (status) => status === 'Present'
            ).length;
            const percentage =
                totalPeriodsHeld > 0
                    ? (presentCount / totalPeriodsHeld) * 100
                    : 0;
            return {
                ...cadet,
                presentCount,
                percentage: parseFloat(percentage.toFixed(2)),
            };
        });
        let overallTotalPresent = 0;
        cadets.forEach((cadet) => {
            overallTotalPresent += Object.values(cadet.attendance || {}).filter(
                (status) => status === 'Present'
            ).length;
        });
        const maxPossible = cadets.length * totalPeriodsHeld;
        const overallAverage =
            maxPossible > 0
                ? parseFloat(
                      ((overallTotalPresent / maxPossible) * 100).toFixed(2)
                  )
                : 0;
        return {
            totalPeriodsHeld,
            individualSummaries,
            overallAverage,
            cadetNotFound: userRole === 'cadet' && relevantCadets.length === 0,
        };
    }, [cadets, userRole, userEnrollmentId]);

    const value = {
        cadets,
        events: processedEvents,
        staff,
        references,
        announcements,
        inventory,
        inventoryLogs,
        camps,
        materials,
        quizzes,
        loading,
        attendanceData,
        newAnnouncementCount,
        socialActivities,
        paymentSettings,
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
