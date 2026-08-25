// src/context/DataContext.jsx
import React, { createContext, useContext, useMemo, useState } from 'react';
import { useFirestoreSubscription } from '../hooks/useFirestoreSubscription.jsx';
import { Timestamp } from 'firebase/firestore';
import { useAuthContext } from './AuthContext.jsx';
import { useTenant } from './TenantContext.jsx';
import { normalizeDate } from '../utils/dateUtils.js';


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
    const { userRole, userEnrollmentId, lastViewedAnnouncements, lastViewedNotifications, userInstitutionId } =
        useAuthContext();
    const { tenant } = useTenant();


    // Multi-college active selection filter
    const [selectedCollege, setSelectedCollege] = useState('All');

    // Subscriptions for all data streams
    const { data: units = [], loading: loadingUnits } =
        useFirestoreSubscription('units', false);

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
    const { data: attendanceLogs = [] } = useFirestoreSubscription('attendance');

    // --- NEW: Extract Payment Document ---
    const paymentSettings = useMemo(() => {
        const paymentDoc = settingsData.find((d) => d.id === 'payment');
        return paymentDoc || { paymentQRUrl: '' };
    }, [settingsData]);

    // --- ALL CADETS LIST (Internal) ---
    const allCadetsUnfiltered = useMemo(() => {
        // Filter out ghost/corrupted records that don't have a valid name or ID
        const validCadets = rawCadets.filter(c => c.name && c.enrollmentId);
        
        // Sort validCadets so that we process complete/correct documents first:
        // 1. Prefer specific college (e.g. gmrit) over general battalion (14a-bn-srikakulam)
        // 2. Prefer documents with more fields filled out (higher details score)
        // 3. Prefer more recently updated documents
        const sortedValid = [...validCadets].sort((a, b) => {
            const isBattalionA = a.institutionId === '14a-bn-srikakulam';
            const isBattalionB = b.institutionId === '14a-bn-srikakulam';
            if (isBattalionA && !isBattalionB) return 1;
            if (!isBattalionA && isBattalionB) return -1;

            const scoreA = (a.fcmTokens?.length || 0) * 10 + 
                           (a.certifications?.length || 0) * 10 + 
                           (a.examHistory?.length || 0) * 10 + 
                           (Object.keys(a.attendance || {}).length) * 5 + 
                           (a.campHistory?.length || 0) * 5 + 
                           (a.photoUrl ? 5 : 0) + 
                           (a.rankHistory?.length || 0) * 3;
            const scoreB = (b.fcmTokens?.length || 0) * 10 + 
                           (b.certifications?.length || 0) * 10 + 
                           (b.examHistory?.length || 0) * 10 + 
                           (Object.keys(b.attendance || {}).length) * 5 + 
                           (b.campHistory?.length || 0) * 5 + 
                           (b.photoUrl ? 5 : 0) + 
                           (b.rankHistory?.length || 0) * 3;
            if (scoreA !== scoreB) {
                return scoreB - scoreA;
            }

            const timeA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
            const timeB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
            return timeB - timeA;
        });

        // Deduplicate by enrollmentId / regimentalNumber (case-insensitive) and merge attendance maps
        const mapByRegNo = new Map();
        for (const cadet of sortedValid) {
            const regNo = String(cadet.enrollmentId || cadet.regimentalNumber || '').trim().toUpperCase();
            if (!regNo) continue;

            if (!mapByRegNo.has(regNo)) {
                mapByRegNo.set(regNo, {
                    ...cadet,
                    attendance: { ...(cadet.attendance || {}) }
                });
            } else {
                const primary = mapByRegNo.get(regNo);
                primary.attendance = { ...(cadet.attendance || {}), ...primary.attendance };
            }
        }
        const uniqueCadets = Array.from(mapByRegNo.values());
        
        return uniqueCadets.sort((a, b) => {
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

    // Apply Active College filtering for admin views
    const allCadets = useMemo(() => {
        if (selectedCollege === 'All') return allCadetsUnfiltered;
        return allCadetsUnfiltered.filter(c => c.institutionId === selectedCollege);
    }, [allCadetsUnfiltered, selectedCollege]);

    const cadets = useMemo(() => allCadets.filter(c => c.status !== 'alumni'), [allCadets]);
    const alumni = useMemo(() => allCadets.filter(c => c.status === 'alumni'), [allCadets]);

    const processedEvents = useMemo(() => {
        const proc = events.map(processEvent);
        if (selectedCollege === 'All') return proc;
        return proc.filter(e => e.institutionId === selectedCollege);
    }, [events, selectedCollege]);

    const filteredStaff = useMemo(() => {
        if (userRole === 'superadmin' || userRole === 'battalion_admin') {
            return staff;
        }
        const ownUnitId = userInstitutionId || tenant?.subdomain || tenant?.id;
        return staff.filter(s => 
            !s.institutionId || 
            s.institutionId === '14a-bn-srikakulam' || 
            (ownUnitId && s.institutionId === ownUnitId)
        );
    }, [staff, userRole, userInstitutionId, tenant]);

    const filteredInventory = useMemo(() => {
        if (selectedCollege === 'All') return inventory;
        return inventory.filter(i => i.institutionId === selectedCollege);
    }, [inventory, selectedCollege]);

    const filteredAnnouncements = useMemo(() => {
        // Announcements are now globally fetched; role-based filtering done in AnnouncementsView
        return announcements;
    }, [announcements]);

    // Camps are battalion-wide — do NOT filter by college/institutionId.
    // All roles (admin, ANO, cadet) should see every published camp.
    const filteredCamps = useMemo(() => camps, [camps]);

    const filteredSocialActivities = useMemo(() => {
        if (selectedCollege === 'All') return socialActivities;
        return socialActivities.filter(s => s.institutionId === selectedCollege);
    }, [socialActivities, selectedCollege]);

    const filteredGrievances = useMemo(() => {
        if (selectedCollege === 'All') return grievances;
        return grievances.filter(g => g.institutionId === selectedCollege);
    }, [grievances, selectedCollege]);

    const filteredTransactions = useMemo(() => {
        if (selectedCollege === 'All') return transactions;
        return transactions.filter(t => t.institutionId === selectedCollege);
    }, [transactions, selectedCollege]);

    const filteredGallery = useMemo(() => {
        if (!Array.isArray(gallery)) return [];
        if (userRole === 'superadmin' || userRole === 'battalion_admin') {
            if (selectedCollege && selectedCollege !== 'All') {
                return gallery.filter(g => !g.institutionId || g.institutionId === '14a-bn-srikakulam' || g.institutionId === selectedCollege);
            }
            return gallery;
        }
        const ownUnitId = userInstitutionId || tenant?.subdomain || tenant?.id;
        return gallery.filter(g => 
            !g.institutionId || 
            g.institutionId === '14a-bn-srikakulam' || 
            (ownUnitId && g.institutionId === ownUnitId)
        );
    }, [gallery, userRole, userInstitutionId, tenant, selectedCollege]);

    // Updated loading logic to include settings and units
    const loading =
        loadingUnits ||
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
        
        const isPresentStatus = (status) => {
            if (!status) return false;
            const s = String(status).trim().toUpperCase();
            return s === 'PRESENT' || s === 'P' || s === 'VERIFIED' || s === 'LATE' || s === 'ATTENDED' || s === 'EXEMPT' || s === '1';
        };

        const normalizeReg = (str) => String(str || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // 1. Build map of normalized enrollmentId to log dates from 'attendance' collection
        const logsByEnrollment = {};
        const activeCadetRegSet = new Set(
            activeCadets.map(c => normalizeReg(c.enrollmentId || c.regimentalNumber)).filter(Boolean)
        );

        (attendanceLogs || []).forEach(log => {
            const normReg = normalizeReg(log.enrollmentId);
            const normDate = normalizeDate(log.date);
            if (normDate && normReg && activeCadetRegSet.has(normReg)) {
                if (!logsByEnrollment[normReg]) logsByEnrollment[normReg] = {};
                logsByEnrollment[normReg][normDate] = log.status || 'Present';
            }
        });

        // 2. Map class dates per certificate level (B1, B2, C) where at least one cadet in that cert was present
        const datesByCert = { B1: new Set(), B2: new Set(), C: new Set(), All: new Set() };

        activeCadets.forEach((cadet) => {
            const cert = cadet.currentCertificate || cadet.certificate || 'NA';
            const normReg = normalizeReg(cadet.enrollmentId || cadet.regimentalNumber);
            
            // Normalize dates from cadet profile attendance map as well
            const normalizedCadetAtt = {};
            if (cadet.attendance) {
                Object.entries(cadet.attendance).forEach(([d, s]) => {
                    const normD = normalizeDate(d);
                    if (normD) normalizedCadetAtt[normD] = s;
                });
            }

            const mergedAtt = {
                ...normalizedCadetAtt,
                ...(logsByEnrollment[normReg] || {})
            };

            Object.entries(mergedAtt).forEach(([date, status]) => {
                if (isPresentStatus(status)) {
                    datesByCert.All.add(date);
                    if (cert === 'B1') datesByCert.B1.add(date);
                    else if (cert === 'B2') datesByCert.B2.add(date);
                    else if (cert === 'C') datesByCert.C.add(date);
                }
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

        // 3. Compute attendance summaries for all cadets based on their certificate level class dates
        const individualSummaries = activeCadets.map((cadet) => {
            const cert = cadet.currentCertificate || cadet.certificate || 'NA';
            const normReg = normalizeReg(cadet.enrollmentId || cadet.regimentalNumber);
            
            const cadetLogs = logsByEnrollment[normReg] || {};
            const normalizedCadetAtt = {};
            if (cadet.attendance) {
                Object.entries(cadet.attendance).forEach(([d, s]) => {
                    const normD = normalizeDate(d);
                    if (normD) normalizedCadetAtt[normD] = s;
                });
            }

            const certDatesSet = datesByCert[cert];
            const applicableDates = (certDatesSet && certDatesSet.size > 0)
                ? Array.from(certDatesSet).sort((a, b) => b.localeCompare(a))
                : [];

            const fullAttendance = {};
            applicableDates.forEach(date => {
                const status = cadetLogs[date] || normalizedCadetAtt[date] || 'Absent';
                fullAttendance[date] = status;
            });
            
            let presentCount = 0;
            Object.values(fullAttendance).forEach(status => {
                if (isPresentStatus(status)) {
                    presentCount++;
                }
            });
            
            const totalPeriods = applicableDates.length;
            const percentage = totalPeriods > 0 ? (presentCount / totalPeriods) * 100 : 0;
            const finalPct = parseFloat(percentage.toFixed(2));
            
            return {
                ...cadet,
                certificate: cert,
                attendance: fullAttendance,
                presentCount,
                totalPeriods,
                percentage: finalPct,
                attendancePresentCount: presentCount,
                attendanceTotalPeriods: totalPeriods,
                attendancePercentage: finalPct
            };
        });

        // 4. Calculate Group & Overall Averages
        const calculateAverageForGroup = (cadetList) => {
            if (cadetList.length === 0) return 0;
            const totalPresent = cadetList.reduce((sum, c) => sum + c.presentCount, 0);
            const totalMaxPossible = cadetList.reduce((sum, c) => sum + c.totalPeriods, 0);
            if (totalMaxPossible === 0) return 0;
            return parseFloat(((totalPresent / totalMaxPossible) * 100).toFixed(2));
        };

        const cadetsB1 = individualSummaries.filter(c => c.certificate === 'B1');
        const cadetsB2 = individualSummaries.filter(c => c.certificate === 'B2');
        const cadetsC = individualSummaries.filter(c => c.certificate === 'C');

        const averages = {
            All: calculateAverageForGroup(individualSummaries),
            B1: calculateAverageForGroup(cadetsB1),
            B2: calculateAverageForGroup(cadetsB2),
            C: calculateAverageForGroup(cadetsC)
        };

        // --- PERSONAL SUMMARY (For Cadet Dashboard) ---
        const personalSummary = userRole === 'cadet' 
            ? individualSummaries.find(s => normalizeReg(s.enrollmentId) === normalizeReg(userEnrollmentId))
            : null;

        return {
            totalPeriodsHeld: periodsHeld.All,
            periodsHeld,
            averages,
            individualSummaries,
            personalSummary,
            overallAverage: averages.All,
            cadetNotFound: userRole === 'cadet' && !personalSummary,
        };
    }, [cadets, attendanceLogs, userRole, userEnrollmentId]);

    const value = {
        cadets,
        alumni,
        allCadets,
        events: processedEvents,
        staff: filteredStaff,
        references,
        announcements: filteredAnnouncements,
        inventory: filteredInventory,
        inventoryLogs,
        camps: filteredCamps,
        materials,
        quizzes,
        jobs,
        loading,
        attendanceData,
        newAnnouncementCount,
        newNotificationCount,
        socialActivities: filteredSocialActivities,
        grievances: filteredGrievances,
        paymentSettings,
        gallery: filteredGallery,
        transactions: filteredTransactions,
        notifications,
        quizAttempts,
        // Multi-college hierarchy extensions
        units,
        selectedCollege,
        setSelectedCollege
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
