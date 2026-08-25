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
    deleteItem
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
 * Human-readable module names map
 */
export const MODULE_NAMES = {
    announcements: 'Notice Board',
    events: 'Events & Drills',
    camps: 'Camps & Deployments',
    rank_mgmt: 'Ranks & Promotions',
    discipline: 'Discipline & Merits',
    kit_mgmt: 'Kit & Equipment',
    inventory: 'Quartermaster Stock',
    social: 'Social Activities',
    training_calendar: 'Training Calendar',
    leave_requests: 'Leave Requests',
    hall_of_fame: 'Unit Excellence',
    library: 'Resource Library',
    list: 'Cadet Roster',
    blood_registry: 'Blood Bank',
    career: 'Careers & Guidance',
    career_bridge: 'Job Board',
    grievances: 'Grievances'
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
                await addCadetsToCampBulk(payload.campId, payload.cadetIds, payload.status || 'Selected');
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
                const cadetsRef = getCollectionRef('cadets');
                await updateDoc(doc(cadetsRef, payload.cadetId), {
                    awards: arrayUnion({
                        ...payload.award,
                        awardedAt: new Date().toISOString()
                    })
                });
            }
            break;
        }

        case 'library': {
            if (actionType === 'delete' && targetDocId) {
                await deleteItem('materials', targetDocId);
            } else {
                await saveMaterial(payload, targetDocId || payload.id || null);
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

        let q;
        if (cadetEnrollmentId) {
            // Cadet-specific queries (shows their own submissions)
            q = query(
                colRef,
                where('cadetEnrollmentId', '==', cadetEnrollmentId),
                orderBy('updatedAt', 'desc')
            );
        } else if (institutionId && institutionId !== '14a-bn-srikakulam') {
            // Institution ANO queries
            q = query(
                colRef,
                where('institutionId', '==', institutionId),
                orderBy('updatedAt', 'desc')
            );
        } else {
            // General query
            q = query(colRef, orderBy('updatedAt', 'desc'));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs.map((docSnap) => ({
                    id: docSnap.id,
                    ...docSnap.data()
                }));
                setSubmissions(list);
                setLoading(false);
            },
            (err) => {
                console.warn('Subscription error for delegated submissions (falling back without sort):', err);
                // Fallback in case composite index is still propagating
                const fallbackQ = cadetEnrollmentId 
                    ? query(colRef, where('cadetEnrollmentId', '==', cadetEnrollmentId))
                    : (institutionId ? query(colRef, where('institutionId', '==', institutionId)) : colRef);

                onSnapshot(fallbackQ, (snap) => {
                    const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
                    // Client-side sort
                    list.sort((a, b) => {
                        const tA = a.updatedAt?.toMillis?.() || (a.updatedAt ? new Date(a.updatedAt).getTime() : 0);
                        const tB = b.updatedAt?.toMillis?.() || (b.updatedAt ? new Date(b.updatedAt).getTime() : 0);
                        return tB - tA;
                    });
                    setSubmissions(list);
                    setLoading(false);
                });
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
