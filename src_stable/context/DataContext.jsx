// src/context/DataContext.jsx
import React, { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { useFirestoreSubscription } from '../hooks/useFirestoreSubscription.jsx';
import { Timestamp, getDocs, writeBatch, doc, deleteField } from 'firebase/firestore';
import { db } from '../firebase/config.js';
import { getCollectionRef } from '../firebase/firestoreService.js';
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


    // Multi-college active selection filter (Defaults to 'All' for battalion admin/superadmin, otherwise unit subdomain)
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

    const { data: notifications, loading: loadingNotifications } = useFirestoreSubscription('notifications');
    const { data: quizAttempts, loading: loadingQuizAttempts } = useFirestoreSubscription('quiz_attempts');
    const { data: attendanceLogs = [] } = useFirestoreSubscription('attendance');

    const paymentSettings = { paymentQRUrl: '' };

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

            const sanitizedAtt = {};
            if (cadet.attendance) {
                Object.entries(cadet.attendance).forEach(([d, s]) => {
                    const normD = normalizeDate(d);
                    if (normD && normD !== '2026-08-26' && !String(d).includes('26-08-2026') && !String(d).includes('26/08/2026') && !String(d).includes('2026-08-26')) {
                        sanitizedAtt[normD] = s;
                    }
                });
            }

            if (!mapByRegNo.has(regNo)) {
                mapByRegNo.set(regNo, {
                    ...cadet,
                    attendance: sanitizedAtt
                });
            } else {
                const primary = mapByRegNo.get(regNo);
                primary.attendance = { ...sanitizedAtt, ...primary.attendance };
                if (cadet.fcmTokens) {
                    const existing = Array.isArray(primary.fcmTokens) ? primary.fcmTokens : (primary.fcmTokens ? [primary.fcmTokens] : []);
                    const incoming = Array.isArray(cadet.fcmTokens) ? cadet.fcmTokens : [cadet.fcmTokens];
                    primary.fcmTokens = [...new Set([...existing, ...incoming])];
                }
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

    // Apply Active College filtering for admin and college unit views
    const allCadets = useMemo(() => {
        const isBattalionLevel = userRole === 'superadmin' || userRole === 'battalion_admin';
        
        // If battalion admin / superadmin and "All" or nothing is selected, show all cadets
        if (isBattalionLevel && (!selectedCollege || selectedCollege === 'All')) {
            return allCadetsUnfiltered;
        }

        // Otherwise filter by selected college (for battalion admin drill-down) or unit institutionId
        const targetInst = ((isBattalionLevel && selectedCollege && selectedCollege !== 'All') 
            ? selectedCollege 
            : (userInstitutionId || tenant?.subdomain || 'gmrit')
        ).toLowerCase();
        
        return allCadetsUnfiltered.filter(c => {
            const inst = (c.institutionId || '').toLowerCase();
            if (inst === targetInst) return true;
            // Match if regimental number contains GMRIT unit sequence (0520) or college specifies GMR
            const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            if (targetInst === 'gmrit' && (reg.includes('0520') || reg.includes('GMR') || (c.college || '').toLowerCase().includes('gmr') || (c.collegeName || '').toLowerCase().includes('gmr'))) {
                return true;
            }
            return false;
        });
    }, [allCadetsUnfiltered, selectedCollege, userInstitutionId, userRole, tenant]);

    const cadets = useMemo(() => allCadets.filter(c => c.status !== 'alumni'), [allCadets]);
    const alumni = useMemo(() => allCadets.filter(c => c.status === 'alumni'), [allCadets]);

    const processedEvents = useMemo(() => {
        const proc = events.map(processEvent);
        const isBattalionLevel = userRole === 'superadmin' || userRole === 'battalion_admin';
        if (isBattalionLevel && (!selectedCollege || selectedCollege === 'All')) return proc;
        const target = ((isBattalionLevel && selectedCollege && selectedCollege !== 'All') ? selectedCollege : (userInstitutionId || tenant?.subdomain || 'gmrit')).toLowerCase();
        return proc.filter(e => (e.institutionId || '').toLowerCase() === target);
    }, [events, selectedCollege, userRole, userInstitutionId, tenant]);

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
        const isBattalionLevel = userRole === 'superadmin' || userRole === 'battalion_admin';
        if (isBattalionLevel && (!selectedCollege || selectedCollege === 'All')) return inventory;
        const target = ((isBattalionLevel && selectedCollege && selectedCollege !== 'All') ? selectedCollege : (userInstitutionId || tenant?.subdomain || 'gmrit')).toLowerCase();
        return inventory.filter(i => (i.institutionId || '').toLowerCase() === target);
    }, [inventory, selectedCollege, userRole, userInstitutionId, tenant]);

    const filteredAnnouncements = useMemo(() => {
        // Announcements are now globally fetched; role-based filtering done in AnnouncementsView
        return announcements;
    }, [announcements]);

    // Camps are battalion-wide — do NOT filter by college/institutionId.
    // All roles (admin, ANO, cadet) should see every published camp.
    const filteredCamps = useMemo(() => camps, [camps]);

    const filteredSocialActivities = useMemo(() => {
        const isBattalionLevel = userRole === 'superadmin' || userRole === 'battalion_admin';
        if (isBattalionLevel && (!selectedCollege || selectedCollege === 'All')) return socialActivities;
        const target = ((isBattalionLevel && selectedCollege && selectedCollege !== 'All') ? selectedCollege : (userInstitutionId || tenant?.subdomain || 'gmrit')).toLowerCase();
        return socialActivities.filter(s => (s.institutionId || '').toLowerCase() === target);
    }, [socialActivities, selectedCollege, userRole, userInstitutionId, tenant]);

    const filteredGrievances = useMemo(() => {
        const isBattalionLevel = userRole === 'superadmin' || userRole === 'battalion_admin';
        if (isBattalionLevel && (!selectedCollege || selectedCollege === 'All')) return grievances;
        const target = ((isBattalionLevel && selectedCollege && selectedCollege !== 'All') ? selectedCollege : (userInstitutionId || tenant?.subdomain || 'gmrit')).toLowerCase();
        return grievances.filter(g => (g.institutionId || '').toLowerCase() === target);
    }, [grievances, selectedCollege, userRole, userInstitutionId, tenant]);



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

    // --- AUTOMATIC DATABASE CLEANUP EFFECT FOR 26-08-2026 ---
    useEffect(() => {
        const performDbCleanup = async () => {
            if (userRole !== 'admin' && userRole !== 'superadmin' && userRole !== 'battalion_admin') return;
            try {
                const cadetsRef = getCollectionRef('cadets');
                if (!cadetsRef) return;
                const snap = await getDocs(cadetsRef);
                let batch = writeBatch(db);
                let count = 0;
                
                snap.forEach(d => {
                    const data = d.data();
                    const att = data.attendance || {};
                    const matchingKeys = Object.keys(att).filter(k => 
                        k.includes('26-08-2026') || 
                        k.includes('26/08/2026') || 
                        k.includes('2026-08-26') || 
                        normalizeDate(k) === '2026-08-26'
                    );
                    if (matchingKeys.length > 0) {
                        const updates = {};
                        matchingKeys.forEach(k => {
                            updates[`attendance.${k}`] = deleteField();
                        });
                        batch.update(d.ref, updates);
                        count++;
                    }
                });

                if (count > 0) {
                    await batch.commit();
                    console.log(`[NCC Database Auto-Cleanup] Successfully deleted 26-08-2026 attendance keys from ${count} cadet documents in Firestore.`);
                }

                // Also delete any logs in attendance collection for 26-08-2026
                const attRef = getCollectionRef('attendance');
                if (attRef) {
                    const attSnap = await getDocs(attRef);
                    let attBatch = writeBatch(db);
                    let attCount = 0;
                    attSnap.forEach(d => {
                        const l = d.data();
                        if (normalizeDate(l.date) === '2026-08-26' || String(l.date).includes('26-08-2026') || String(l.date).includes('26/08/2026')) {
                            attBatch.delete(d.ref);
                            attCount++;
                        }
                    });
                    if (attCount > 0) {
                        await attBatch.commit();
                        console.log(`[NCC Database Auto-Cleanup] Deleted ${attCount} logs from attendance collection for 26-08-2026.`);
                    }
                }
            } catch (err) {
                console.warn("[NCC Database Auto-Cleanup notice]:", err);
            }
        };

        performDbCleanup();
    }, []);

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
        const activeCadetIdSet = new Set(
            activeCadets.map(c => c.id).filter(Boolean)
        );
        const cadetMapByReg = {};
        activeCadets.forEach(c => {
            const reg = normalizeReg(c.enrollmentId || c.regimentalNumber);
            if (reg) cadetMapByReg[reg] = c;
            if (c.id) cadetMapByReg[c.id] = c;
        });

        // 2. Derive valid class dates strictly from attendance collection and cadet profiles with quorum validation
        const datesByCert = { B1: new Set(), B2: new Set(), C: new Set(), All: new Set() };
        const dateCadetCounts = {};
        
        (attendanceLogs || []).forEach(log => {
            const normReg = normalizeReg(log.enrollmentId);
            const cadetId = log.cadetId;
            const normDate = normalizeDate(log.date);
            const isForActiveCadet = (normReg && activeCadetRegSet.has(normReg)) || (cadetId && activeCadetIdSet.has(cadetId));

            if (normDate && normDate !== '2026-08-26' && isForActiveCadet) {
                if (normReg) {
                    if (!logsByEnrollment[normReg]) logsByEnrollment[normReg] = {};
                    logsByEnrollment[normReg][normDate] = log.status || 'Present';
                }

                const status = log.status || 'Present';
                if (isPresentStatus(status)) {
                    if (!dateCadetCounts[normDate]) dateCadetCounts[normDate] = { total: 0, B1: 0, B2: 0, C: 0 };
                    dateCadetCounts[normDate].total++;
                    const cadet = (normReg && cadetMapByReg[normReg]) || (cadetId && cadetMapByReg[cadetId]);
                    const cert = cadet?.currentCertificate || cadet?.certificate || log.certificate || 'NA';
                    if (cert === 'B1') dateCadetCounts[normDate].B1++;
                    else if (cert === 'B2') dateCadetCounts[normDate].B2++;
                    else if (cert === 'C') dateCadetCounts[normDate].C++;
                }
            }
        });

        // Also incorporate records from cadet profile attendance maps
        activeCadets.forEach((cadet) => {
            const cert = cadet.currentCertificate || cadet.certificate || 'NA';
            const normReg = normalizeReg(cadet.enrollmentId || cadet.regimentalNumber);
            if (cadet.attendance) {
                Object.entries(cadet.attendance).forEach(([d, s]) => {
                    const normD = normalizeDate(d);
                    if (normD && normD !== '2026-08-26' && isPresentStatus(s)) {
                        if (!logsByEnrollment[normReg]?.[normD]) {
                            if (!dateCadetCounts[normD]) dateCadetCounts[normD] = { total: 0, B1: 0, B2: 0, C: 0 };
                            dateCadetCounts[normD].total++;
                            if (cert === 'B1') dateCadetCounts[normD].B1++;
                            else if (cert === 'B2') dateCadetCounts[normD].B2++;
                            else if (cert === 'C') dateCadetCounts[normD].C++;
                        }
                    }
                });
            }
        });

        const todayStr = normalizeDate(new Date());

        // A date is an official class date if at least 3 cadets attended OR if it is today with active attendance
        Object.entries(dateCadetCounts).forEach(([normD, counts]) => {
            if (normD !== '2026-08-26' && (counts.total >= 3 || normD === todayStr || (activeCadets.length < 3 && counts.total > 0))) {
                datesByCert.All.add(normD);
                if (counts.B1 > 0 || normD === todayStr) datesByCert.B1.add(normD);
                if (counts.B2 > 0 || normD === todayStr) datesByCert.B2.add(normD);
                if (counts.C > 0 || normD === todayStr) datesByCert.C.add(normD);
            }
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
                    if (normD && normD !== '2026-08-26') normalizedCadetAtt[normD] = s;
                });
            }

            const certDatesSet = datesByCert[cert];
            const applicableDates = (certDatesSet && certDatesSet.size > 0)
                ? Array.from(certDatesSet).filter(d => d !== '2026-08-26').sort((a, b) => b.localeCompare(a))
                : (datesByCert.All.size > 0 ? Array.from(datesByCert.All).filter(d => d !== '2026-08-26').sort((a, b) => b.localeCompare(a)) : []);

            // Build full attendance mapping strictly based on official applicable dates
            const fullAttendance = {};
            applicableDates.forEach(date => {
                if (isPresentStatus(normalizedCadetAtt[date]) || isPresentStatus(cadetLogs[date])) {
                    fullAttendance[date] = 'Present';
                } else {
                    fullAttendance[date] = 'Absent';
                }
            });

            // Preserve extra dates if cadet attended a special / extra parade
            Object.entries(normalizedCadetAtt).forEach(([d, s]) => {
                if (isPresentStatus(s) && !fullAttendance[d]) {
                    fullAttendance[d] = 'Present';
                }
            });
            Object.entries(cadetLogs).forEach(([d, s]) => {
                if (isPresentStatus(s) && !fullAttendance[d]) {
                    fullAttendance[d] = 'Present';
                }
            });
            
            let presentCount = 0;
            Object.values(fullAttendance).forEach(status => {
                if (isPresentStatus(status)) {
                    presentCount++;
                }
            });
            
            const totalPeriods = Object.keys(fullAttendance).length;
            const percentage = totalPeriods > 0 ? (presentCount / totalPeriods) * 100 : 0;
            const finalPct = parseFloat(percentage.toFixed(2));

            // Aggregate all awards & active camp achievements
            const awardsMap = new Map();
            
            // 1. Live Camps Subscription: strictly scan current active camps
            (camps || []).forEach(camp => {
                (camp.roster || []).forEach(r => {
                    const rReg = normalizeReg(r.enrollmentId || r.regimentalNumber);
                    const match = (normReg && rReg && normReg === rReg) || (cadet.id && r.cadetId && cadet.id === r.cadetId);
                    if (match && Array.isArray(r.achievements) && r.achievements.length > 0) {
                        r.achievements.forEach(ach => {
                            if (!ach) return;
                            const titleStr = typeof ach === 'string' ? ach : (ach.title || ach.name || '');
                            const key = titleStr.trim().toLowerCase();
                            if (key && !awardsMap.has(key)) {
                                awardsMap.set(key, {
                                    title: titleStr,
                                    description: `Awarded at ${camp.name || 'Camp'}`,
                                    date: camp.startDate || camp.date || ''
                                });
                            }
                        });
                    }
                });
            });

            // 2. Direct manual awards assigned in Hall of Fame (non-camp awards)
            (cadet.awards || []).forEach(aw => {
                if (!aw) return;
                const titleStr = typeof aw === 'string' ? aw : (aw.title || aw.name || '');
                const desc = typeof aw === 'object' && aw.description ? aw.description : '';
                if (desc.includes('Awarded at ') && !camps.some(c => desc.includes(c.name))) {
                    return;
                }
                const key = titleStr.trim().toLowerCase();
                if (key && !awardsMap.has(key)) {
                    awardsMap.set(key, {
                        title: titleStr,
                        description: desc || 'Command Commendation',
                        date: typeof aw === 'object' && (aw.date || aw.awardedAt) ? (aw.date || aw.awardedAt) : ''
                    });
                }
            });

            // 3. Direct cadet achievements
            (cadet.achievements || []).forEach(ach => {
                if (!ach) return;
                const titleStr = typeof ach === 'string' ? ach : (ach.title || ach.name || '');
                const key = titleStr.trim().toLowerCase();
                if (key && !awardsMap.has(key)) {
                    awardsMap.set(key, {
                        title: titleStr,
                        description: typeof ach === 'object' && ach.description ? ach.description : 'Unit Achievement',
                        date: typeof ach === 'object' && ach.date ? ach.date : ''
                    });
                }
            });
            const aggregatedAwards = Array.from(awardsMap.values());
            
            return {
                ...cadet,
                certificate: cert,
                attendance: fullAttendance,
                presentCount,
                totalPeriods,
                percentage: finalPct,
                attendancePresentCount: presentCount,
                attendanceTotalPeriods: totalPeriods,
                attendancePercentage: finalPct,
                awards: aggregatedAwards,
                awardPoints: aggregatedAwards.length * 50,
                achievements: aggregatedAwards
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
    }, [cadets, attendanceLogs, userRole, userEnrollmentId, camps]);

    // Attach sanitized attendance and statistics to all cadet instances
    const enrichedCadets = useMemo(() => {
        if (!attendanceData?.individualSummaries || attendanceData.individualSummaries.length === 0) {
            return cadets;
        }
        const summaryMap = new Map();
        attendanceData.individualSummaries.forEach(s => {
            const reg = (s.enrollmentId || s.regimentalNumber || '').trim().toUpperCase();
            if (reg) summaryMap.set(reg, s);
            if (s.id) summaryMap.set(s.id, s);
        });

        return cadets.map(c => {
            const reg = (c.enrollmentId || c.regimentalNumber || '').trim().toUpperCase();
            const summary = (reg && summaryMap.get(reg)) || (c.id && summaryMap.get(c.id));
            if (!summary) return c;
            return {
                ...c,
                attendance: summary.attendance,
                presentCount: summary.presentCount,
                totalPeriods: summary.totalPeriods,
                percentage: summary.percentage,
                attendancePresentCount: summary.presentCount,
                attendanceTotalPeriods: summary.totalPeriods,
                attendancePercentage: summary.percentage,
            };
        });
    }, [cadets, attendanceData]);

    const value = {
        cadets: enrichedCadets,
        alumni,
        allCadets: enrichedCadets,
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
        transactions: [],
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
