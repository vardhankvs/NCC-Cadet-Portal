// src/firebase/delegationWorkflowService.js
import { useState, useEffect } from 'react';
import { db, appId } from './config.js';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    query,
    where,
    orderBy,
    onSnapshot,
    getDoc,
    arrayUnion
} from 'firebase/firestore';
import {
    getCollectionRef,
    saveAnnouncement,
    saveEvent,
    saveCamp,
    addCadetsToCampBulk,
    updateCampRoster,
    logCampAchievement,
    updateCadetRank,
    updateCadetPoints,
    saveInventoryItem,
    updateKitSizes,
    saveMaterial,
    deleteItem,
    recordAttendance,
    submitPFTScores,
    saveApplicant
} from './firestoreService.js';
import { sendPushToUser, sendPushToAll } from './pushNotifications.js';
import { toast } from 'react-toastify';

/**
 * Collection reference for delegated cadet task submissions
 */
export const getDelegatedSubmissionsRef = () => {
    return getCollectionRef('cadet_delegated_submissions');
};

/**
 * Human-readable module names map for all delegable admin tabs
 */
export const MODULE_NAMES = {
    hall_of_fame: 'Unit Excellence & Awards',
    list: 'Cadet Roster',
    rank_mgmt: 'Ranks & Promotions',
    discipline: 'Discipline & Merits',
    selection_process: 'Cadet Selection Process',
    inventory: 'Inventory & Stock',
    kit_mgmt: 'Kit & Uniform Sizing',
    attendance: 'Parade & Attendance',
    summary: 'Attendance Summary',
    parade: 'Parade Scanner',
    att_logs: 'Attendance Scan Logs',
    leave_requests: 'Leave Requests',
    training_calendar: 'Training Calendar',
    camps: 'Camps & Deployments',
    library: 'Resource Library',
    pft: 'Physical Fitness Test (PFT)',
    announcements: 'Notice Board',
    events: 'Events & Drills',
    social: 'Social Service Activities',
    blood_registry: 'Blood Bank Registry',
    career: 'Careers',
    career_bridge: 'Job Board',
    grievances: 'Grievance Cell',
    references: 'Reference Materials'
};

/**
 * Submit a delegated task from a Cadet for ANO verification
 */
export const submitDelegatedTask = async ({
    institutionId,
    cadetEnrollmentId,
    cadetName,
    cadetUid = null,
    moduleId,
    moduleName = null,
    actionType = 'create', // 'create' | 'update' | 'delete'
    targetDocId = null,
    title,
    payload,
    submissionId = null // If resubmitting an existing submission
}) => {
    const colRef = getDelegatedSubmissionsRef();
    if (!colRef) throw new Error('Database not ready.');

    const cleanModuleName = moduleName || MODULE_NAMES[moduleId] || moduleId;
    const finalInstitutionId = institutionId || '14a-bn-srikakulam';

    const submissionData = {
        institutionId: finalInstitutionId,
        cadetEnrollmentId: cadetEnrollmentId || 'UNKNOWN',
        cadetName: cadetName || 'Cadet',
        cadetUid: cadetUid || '',
        moduleId,
        moduleName: cleanModuleName,
        actionType,
        targetDocId: targetDocId || null,
        title: title || `${cleanModuleName} ${actionType.toUpperCase()}`,
        payload: payload || {},
        status: 'pending', // 'pending' | 'approved' | 'changes_requested' | 'rejected'
        remarks: '',
        updatedAt: serverTimestamp()
    };

    if (submissionId) {
        // Resubmitting / updating existing task
        const docRef = doc(colRef, submissionId);
        await updateDoc(docRef, submissionData);
        return submissionId;
    } else {
        // New submission
        submissionData.createdAt = serverTimestamp();
        submissionData.submittedAt = serverTimestamp();
        submissionData.reviewedAt = null;
        submissionData.reviewedBy = null;
        submissionData.modifiedByAno = false;

        const newDocRef = await addDoc(colRef, submissionData);
        return newDocRef.id;
    }
};

/**
 * Execute the actual live action in Firestore when an ANO approves a task
 */
export const executeLiveTaskAction = async (moduleId, actionType, payload, targetDocId, institutionId) => {
    switch (moduleId) {
        case 'announcements': {
            if (actionType === 'delete' && targetDocId) {
                await deleteItem('announcements', targetDocId);
            } else {
                await saveAnnouncement(
                    payload.title,
                    payload.content,
                    payload.targetCertificate || 'All',
                    payload.targetDivision || 'All',
                    payload.noticeDate || new Date().toISOString().split('T')[0],
                    targetDocId || payload.id || null,
                    payload.senderRole || 'ano',
                    payload.targetAudience || 'cadets',
                    payload.targetCollege || 'All'
                );
                if (!targetDocId) {
                    sendPushToAll('📢 New Announcement', payload.title, 'announcements');
                }
            }
            break;
        }

        case 'events':
        case 'training_calendar': {
            if (actionType === 'delete' && targetDocId) {
                await deleteItem('events', targetDocId);
            } else {
                await saveEvent(payload, targetDocId || payload.id || null);
                if (!targetDocId) {
                    sendPushToAll('New Event', `${payload.name} has been added to the unit calendar`, 'events');
                }
            }
            break;
        }

        case 'camps': {
            if (actionType === 'delete' && targetDocId) {
                await deleteItem('camps', targetDocId);
            } else if (payload.action === 'add_candidates' && payload.campId) {
                let toAdd = payload.cadetsToAdd;
                if (!toAdd || !Array.isArray(toAdd) || toAdd.length === 0) {
                    const cadetsRef = getCollectionRef('cadets');
                    const snaps = await Promise.all((payload.cadetIds || []).map(id => getDoc(doc(cadetsRef, id))));
                    toAdd = snaps.filter(s => s.exists()).map(s => ({ id: s.id, ...s.data() }));
                }
                await addCadetsToCampBulk(payload.campId, toAdd, payload.status || 'Selected');
            } else if (payload.action === 'update_roster_status' && payload.campId) {
                await updateCampRoster(payload.campId, payload.cadetId, payload.status);
            } else if (payload.action === 'log_achievement' && payload.campId) {
                await logCampAchievement(payload.campId, payload.cadetId, payload.achievement);
            } else {
                await saveCamp(payload, targetDocId || payload.id || null);
            }
            break;
        }

        case 'rank_mgmt': {
            if (payload.cadetId && payload.newRank) {
                await updateCadetRank(payload.cadetId, payload.newRank, payload.reason || 'Promotion by ANO');
                if (payload.enrollmentId) {
                    sendPushToUser(
                        payload.enrollmentId,
                        '⭐ Rank Promotion',
                        `Congratulations! You have been officially promoted to the rank of ${payload.newRank}.`,
                        'profile'
                    );
                }
            }
            break;
        }

        case 'discipline': {
            if (payload.cadetId && payload.type) {
                await updateCadetPoints(payload.cadetId, payload.type, payload.points || 0, payload.reason || '');
                if (payload.enrollmentId) {
                    sendPushToUser(
                        payload.enrollmentId,
                        payload.type === 'merit' ? '⭐ Merit Points Updated' : '⚠️ Discipline Record Updated',
                        `Your ${payload.type} record has been updated to ${payload.points} points.`,
                        'profile'
                    );
                }
            }
            break;
        }

        case 'kit_mgmt': {
            if (payload.cadetId && payload.sizes) {
                await updateKitSizes(payload.cadetId, payload.sizes);
            }
            break;
        }

        case 'inventory': {
            if (actionType === 'delete' && targetDocId) {
                await deleteItem('inventory', targetDocId);
            } else {
                await saveInventoryItem(payload, targetDocId || payload.id || null);
            }
            break;
        }

        case 'social': {
            const colRef = getCollectionRef('social_activities');
            if (actionType === 'delete' && targetDocId) {
                await deleteDoc(doc(colRef, targetDocId));
            } else if (targetDocId || payload.id) {
                const docId = targetDocId || payload.id;
                await updateDoc(doc(colRef, docId), {
                    ...payload,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(colRef, {
                    ...payload,
                    institutionId: institutionId || '14a-bn-srikakulam',
                    volunteers: payload.volunteers || [],
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp()
                });
            }
            break;
        }

        case 'leave_requests': {
            const colRef = getCollectionRef('leave_requests');
            if (targetDocId) {
                await updateDoc(doc(colRef, targetDocId), {
                    status: payload.status || 'Approved',
                    remarks: payload.remarks || '',
                    reviewedBy: payload.reviewedBy || 'ANO',
                    reviewedAt: serverTimestamp()
                });
            }
            break;
        }

        case 'hall_of_fame': {
            if (payload.cadetId && payload.award) {
                // Update in both users and cadets collections for consistency
                const userRef = doc(getCollectionRef('users'), payload.cadetId);
                await updateDoc(userRef, {
                    awards: arrayUnion({
                        ...payload.award,
                        awardedAt: new Date().toISOString()
                    })
                }).catch(() => {});

                const cadetsRef = getCollectionRef('cadets');
                await updateDoc(doc(cadetsRef, payload.cadetId), {
                    awards: arrayUnion({
                        ...payload.award,
                        awardedAt: new Date().toISOString()
                    })
                }).catch(() => {});
            }
            break;
        }

        case 'library': {
            const colRef = getCollectionRef('resources');
            if (actionType === 'delete' && targetDocId) {
                await deleteDoc(doc(colRef, targetDocId)).catch(() => deleteItem('materials', targetDocId));
            } else if (targetDocId || payload.id) {
                const docId = targetDocId || payload.id;
                await updateDoc(doc(colRef, docId), {
                    ...payload,
                    updatedAt: new Date().toISOString()
                }).catch(() => saveMaterial(payload, docId));
            } else {
                await addDoc(colRef, {
                    ...payload,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                }).catch(() => saveMaterial(payload, null));
            }
            break;
        }

        case 'attendance':
        case 'summary':
        case 'parade':
        case 'att_logs': {
            if (payload.action === 'bulk_mark_present' && Array.isArray(payload.cadetIds) && payload.date) {
                for (const cadetId of payload.cadetIds) {
                    await recordAttendance(cadetId, payload.date, payload.status || 'Present', 'ANO Verified Bulk Delegation', institutionId);
                }
            } else if (payload.action === 'delete_attendance_log' && payload.cadetId && payload.date) {
                await recordAttendance(payload.cadetId, payload.date, 'Absent', 'ANO Verified Removal', institutionId);
                if (targetDocId && !targetDocId.startsWith('vlog-')) {
                    await deleteItem('attendance', targetDocId).catch(() => {});
                }
            } else if (payload.action === 'bulk_delete_attendance' && Array.isArray(payload.items)) {
                for (const item of payload.items) {
                    if (item.cadetId && item.date) {
                        await recordAttendance(item.cadetId, item.date, 'Absent', 'ANO Verified Removal', institutionId);
                        if (item.logId && !item.logId.startsWith('vlog-')) {
                            await deleteItem('attendance', item.logId).catch(() => {});
                        }
                    }
                }
            } else if (payload.cadetId && payload.date && payload.status) {
                await recordAttendance(payload.cadetId, payload.date, payload.status, 'ANO Verified Delegation', institutionId);
            }
            break;
        }

        case 'pft': {
            if (payload.cadetId && payload.scores) {
                await submitPFTScores(payload.cadetId, payload.scores);
            }
            break;
        }

        case 'selection_process': {
            await saveApplicant(payload, targetDocId || payload.id || null, institutionId);
            break;
        }

        case 'blood_registry': {
            const colRef = getCollectionRef('blood_requests');
            if (actionType === 'delete' && targetDocId) {
                await deleteDoc(doc(colRef, targetDocId));
            } else if (targetDocId || payload.id) {
                await updateDoc(doc(colRef, targetDocId || payload.id), {
                    ...payload,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(colRef, {
                    ...payload,
                    institutionId: institutionId || '14a-bn-srikakulam',
                    timestamp: serverTimestamp()
                });
            }
            break;
        }

        case 'grievances': {
            const colRef = getCollectionRef('grievances');
            if (targetDocId) {
                await updateDoc(doc(colRef, targetDocId), {
                    ...payload,
                    updatedAt: serverTimestamp()
                });
            }
            break;
        }

        case 'references': {
            const colRef = getCollectionRef('references');
            if (actionType === 'delete' && targetDocId) {
                await deleteDoc(doc(colRef, targetDocId));
            } else if (targetDocId || payload.id) {
                await updateDoc(doc(colRef, targetDocId || payload.id), {
                    ...payload,
                    updatedAt: serverTimestamp()
                });
            } else {
                await addDoc(colRef, {
                    ...payload,
                    createdAt: serverTimestamp()
                });
            }
            break;
        }

        default:
            console.warn(`No specific live handler for module ${moduleId}, falling back to generic update.`);
            break;
    }
};

/**
 * Approve a delegated submission (ANO Action)
 * Commits the task to live database and marks submission as approved
 */
export const approveDelegatedTask = async (submission, modifiedPayload = null, anoName = 'Institution ANO') => {
    const colRef = getDelegatedSubmissionsRef();
    if (!colRef) throw new Error('Database not ready.');

    const finalPayload = modifiedPayload || submission.payload || {};
    const docRef = doc(colRef, submission.id);

    // 1. Execute the live action on the main database
    await executeLiveTaskAction(
        submission.moduleId,
        submission.actionType,
        finalPayload,
        submission.targetDocId,
        submission.institutionId
    );

    // 2. Mark submission as approved
    await updateDoc(docRef, {
        status: 'approved',
        payload: finalPayload,
        modifiedByAno: !!modifiedPayload,
        reviewedBy: anoName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    // 2b. Automatically DELETE any previous changes_requested submissions for the same target/cadet
    try {
        const { getDocs } = await import('firebase/firestore');
        const otherDocsSnap = await getDocs(colRef);
        const toDelete = otherDocsSnap.docs.filter(d => {
            if (d.id === submission.id) return false;
            const data = d.data();
            if (data.status !== 'changes_requested') return false;
            if (data.moduleId !== submission.moduleId) return false;
            if (submission.cadetEnrollmentId && data.cadetEnrollmentId === submission.cadetEnrollmentId) {
                // If it was for the same cadet, same targetDocId, or same module action
                if (submission.targetDocId && data.targetDocId === submission.targetDocId) return true;
                if (data.payload?.cadetId && submission.payload?.cadetId && data.payload.cadetId === submission.payload.cadetId) return true;
                if (data.payload?.enrollmentId && submission.payload?.enrollmentId && data.payload.enrollmentId === submission.payload.enrollmentId) return true;
                return true;
            }
            return false;
        });

        for (const oldDoc of toDelete) {
            await deleteDoc(doc(colRef, oldDoc.id));
        }
    } catch (e) {
        console.warn('Auto-deleting older submissions notice:', e);
    }

    // 3. Send notification to the submitting cadet
    if (submission.cadetEnrollmentId) {
        sendPushToUser(
            submission.cadetEnrollmentId,
            '✅ Task Verified & Approved',
            `Your submission for ${submission.moduleName} has been verified and published to the live portal by ${anoName}.`,
            'notifications'
        );
    }
};

/**
 * Delete or dismiss a delegated task submission
 */
export const deleteDelegatedTask = async (submissionId) => {
    const colRef = getDelegatedSubmissionsRef();
    if (!colRef) throw new Error('Database not ready.');
    await deleteDoc(doc(colRef, submissionId));
};

/**
 * Request modifications on a delegated submission (ANO Action)
 */
export const requestChangesOnDelegatedTask = async (submissionId, remarks, cadetEnrollmentId, moduleName, anoName = 'Institution ANO') => {
    const colRef = getDelegatedSubmissionsRef();
    if (!colRef) throw new Error('Database not ready.');

    const docRef = doc(colRef, submissionId);
    await updateDoc(docRef, {
        status: 'changes_requested',
        remarks: remarks || 'Modifications requested by ANO',
        reviewedBy: anoName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    if (cadetEnrollmentId) {
        sendPushToUser(
            cadetEnrollmentId,
            '⚠️ Action Required: Task Modification',
            `ANO has requested changes on your ${moduleName} submission: "${remarks}". Please review and resubmit.`,
            'notifications'
        );
    }
};

/**
 * Reject a delegated submission (ANO Action)
 */
export const rejectDelegatedTask = async (submissionId, reason, cadetEnrollmentId, moduleName, anoName = 'Institution ANO') => {
    const colRef = getDelegatedSubmissionsRef();
    if (!colRef) throw new Error('Database not ready.');

    const docRef = doc(colRef, submissionId);
    await updateDoc(docRef, {
        status: 'rejected',
        remarks: reason || 'Rejected by ANO',
        reviewedBy: anoName,
        reviewedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });

    if (cadetEnrollmentId) {
        sendPushToUser(
            cadetEnrollmentId,
            '❌ Task Submission Rejected',
            `Your submission for ${moduleName} was rejected by ANO: "${reason}".`,
            'notifications'
        );
    }
};

/**
 * React Hook for Real-time Delegated Submissions
 */
export const useDelegatedSubmissions = (institutionId, cadetEnrollmentId = null) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const colRef = getDelegatedSubmissionsRef();
        if (!colRef) {
            setLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(
            colRef,
            (snapshot) => {
                let list = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));

                // 1. If cadet enrollment ID is specified, show only their submissions
                if (cadetEnrollmentId) {
                    const cadetNorm = cadetEnrollmentId.trim().toUpperCase();
                    list = list.filter((s) => {
                        const sCadet = (s.cadetEnrollmentId || '').trim().toUpperCase();
                        return sCadet === cadetNorm;
                    });
                } else if (institutionId && institutionId !== '14a-bn-srikakulam' && institutionId !== 'battalion' && institutionId !== 'All') {
                    // 2. Institution ANO queries: Match institution or allow general/default submissions
                    const targetInst = institutionId.trim().toLowerCase();
                    list = list.filter((s) => {
                        const sInst = (s.institutionId || '').trim().toLowerCase();
                        return !sInst || sInst === targetInst || sInst === '14a-bn-srikakulam' || sInst === 'all';
                    });
                }

                // Client-side sort by updatedAt descending
                list.sort((a, b) => {
                    const tA = a.updatedAt?.toMillis?.() || (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
                    const tB = b.updatedAt?.toMillis?.() || (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
                    return tB - tA;
                });

                setSubmissions(list);
                setLoading(false);
            },
            (err) => {
                console.error('Subscription error for delegated submissions:', err);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [institutionId, cadetEnrollmentId]);

    const pendingCount = submissions.filter((s) => s.status === 'pending').length;
    const changesRequestedCount = submissions.filter((s) => s.status === 'changes_requested').length;

    return {
        submissions,
        loading,
        pendingCount,
        changesRequestedCount
    };
};
