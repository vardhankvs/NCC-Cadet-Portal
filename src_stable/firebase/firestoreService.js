// src/firebase/firestoreService.js
import { db, appId, storage } from './config.js';
import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    serverTimestamp,
    arrayUnion,
    arrayRemove,
    Timestamp,
    query,
    getDocs,
    runTransaction,
    writeBatch,
    deleteField,
    setDoc,
    getDoc,
    increment,
    where,
    orderBy,
} from 'firebase/firestore';

import {
    ref as storageRef,
    uploadBytesResumable,
    getDownloadURL,
} from 'firebase/storage';

import { sendPushToUser, sendPushToAll } from './pushNotifications.js';
import { toast } from 'react-toastify';

import { isMaskedValue } from '../utils/maskUtils.js';
import { normalizeDate } from '../utils/dateUtils.js';

// --- MULTI-TENANCY HELPER ---
export const getCurrentUserInstitution = async () => {
    // Note: needs `auth` from config.js, exporting it below if not imported
    const { auth } = await import('./config.js');
    if (!auth || !auth.currentUser) return '14a-bn-srikakulam';
    try {
        const token = await auth.currentUser.getIdTokenResult();
        if (token.claims?.institutionId) {
            return token.claims.institutionId;
        }
        // Fall back to looking up the user profile document in Firestore
        const userDocRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', auth.currentUser.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
            return userDocSnap.data().institutionId || '14a-bn-srikakulam';
        }
        return '14a-bn-srikakulam';
    } catch (e) {
        console.error('Error fetching institution ID:', e);
        return '14a-bn-srikakulam';
    }
};

// Helper to get collection reference
export const getCollectionRef = (collectionName) => {
    if (!db || !appId) return null;
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
};

// --- ONE-TIME MIGRATION: Re-tag cadets to correct institution ID ---
export const migrateInstitutionId = async (fromId, toId, type = 'cadets') => {
    const ref = getCollectionRef(type);
    if (!ref) throw new Error('Database not ready.');
    
    const snapOld = await getDocs(query(ref, where('institutionId', '==', fromId)));
    const allSnap = await getDocs(query(ref));
    const homelessDocs = allSnap.docs.filter(d => !d.data().institutionId);

    const batch = writeBatch(db);
    let count = 0;

    snapOld.docs.forEach(d => {
        batch.update(doc(ref, d.id), { institutionId: toId, updatedAt: serverTimestamp() });
        count++;
    });

    homelessDocs.forEach(d => {
        batch.update(doc(ref, d.id), { institutionId: toId, updatedAt: serverTimestamp() });
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }
    return count;
};

export const cleanupAttendanceRecords = async () => {
    try {
        const cadetsRef = getCollectionRef('cadets');
        const attRef = getCollectionRef('attendance');
        if (!cadetsRef || !attRef) return;

        const datesToRemove = ['18-06-2026', '2026-06-18', '18/06/2026'];
        const targetNorms = new Set(datesToRemove.map(d => normalizeDate(d)).filter(Boolean));

        const cadetsSnap = await getDocs(query(cadetsRef, limit(500)));
        let batch = writeBatch(db);
        let opCount = 0;

        cadetsSnap.docs.forEach((docSnap) => {
            const data = docSnap.data();
            const att = data.attendance || {};
            const keysToDelete = Object.keys(att).filter(k => {
                const norm = normalizeDate(k);
                return targetNorms.has(norm) || datesToRemove.includes(k);
            });

            if (keysToDelete.length > 0) {
                const updates = {};
                keysToDelete.forEach(k => {
                    updates[`attendance.${k}`] = deleteField();
                });
                updates.updatedAt = serverTimestamp();
                batch.update(docSnap.ref, updates);
                opCount++;
            }
        });

        const logsSnap = await getDocs(attRef);
        logsSnap.docs.forEach((logSnap) => {
            const data = logSnap.data();
            const norm = normalizeDate(data.date);
            if (targetNorms.has(norm) || datesToRemove.includes(data.date)) {
                batch.delete(logSnap.ref);
                opCount++;
            }
        });

        if (opCount > 0) {
            await batch.commit();
            console.log(`✅ Attendance cleanup: Removed 18-06-2026 attendance records (${opCount} operations)`);
        }
    } catch (e) {
        console.warn('Attendance cleanup warning:', e);
    }
};

export const rescueAllData = async (targetId = '14a-bn-srikakulam') => {
    const collections = [
        'cadets', 'camps', 'social_activities', 'blood_requests', 'notifications', 
        'announcements', 'staff', 'events', 'unit_gallery', 'inventory', 'inventoryLogs', 
        'materials', 'quizzes', 'jobs', 'grievances', 'references', 'transactions'
    ];
    let total = 0;
    for (const col of collections) {
        const count = await migrateInstitutionId('gmrit', targetId, col);
        total += count;
    }
    await cleanupAttendanceRecords();
    return total;
};

// ------------------------------
// --- CRUD Operations ---
// ------------------------------

// --- Generic Delete ---
export const deleteItem = async (type, id) => {
    const ref = getCollectionRef(type);
    if (!ref) throw new Error('Database not ready.');

    if (type === 'staff') {
        try {
            const staffDoc = await getDoc(doc(ref, id));
            if (staffDoc.exists()) {
                const staffData = staffDoc.data();
                const email = staffData?.email?.trim().toLowerCase();
                if (email) {
                    // 1. Delete matching user documents from Firestore users collection
                    const usersRef = getCollectionRef('users');
                    if (usersRef) {
                        const q = query(usersRef, where('email', '==', email));
                        const snap = await getDocs(q);
                        for (const d of snap.docs) {
                            await deleteDoc(d.ref).catch(() => {});
                        }
                    }

                    // 2. Call backend API to delete from Firebase Authentication
                    const apiUrl = typeof window !== 'undefined' && window.location?.hostname?.includes('vercel.app') 
                        ? '/api/updateUserCredentials' 
                        : 'https://ncc-portal-redesign.vercel.app/api/updateUserCredentials';
                    
                    fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'delete',
                            currentEmail: email
                        })
                    }).catch(e => console.warn('Auth deletion on staff delete notice:', e));
                }
            }
        } catch (staffFetchErr) {
            console.warn('Staff cleanup check notice:', staffFetchErr);
        }
    }

    await deleteDoc(doc(ref, id));
};

// --- Bulk Delete Cadets ---
export const deleteMultipleCadets = async (ids) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.delete(doc(ref, id));
    });
    await batch.commit();
};

// --- Cadet (Individual Save) ---
export const saveCadet = async (data, id = null) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const payload = {
        name: data.name || '',
        enrollmentId: data.enrollmentId || '', // maps to Regimental Number
        jntuNo: data.jntuNo || '',
        rank: data.rank || 'CDT',
        certificate: data.certificate || 'NA',
        fatherName: data.fatherName || '',
        motherName: data.motherName || '',
        year: data.year || '',
        branch: data.branch || '',
        aadhaarNumber: data.aadhaarNumber || '',
        phonePersonal: data.phonePersonal || data.phone || '',
        phoneParents: data.phoneParents || '',
        addressPresent: data.addressPresent || data.address || '',
        addressPermanent: data.addressPermanent || '',
        hostelerType: data.hostelerType || 'Days scholar',
        ecaCca: data.ecaCca || '',
        dob: data.dob || '',
        personalEmail: data.personalEmail || '',
        collegeEmail: data.collegeEmail || '',
        bloodGroup: data.bloodGroup || '',
        photoUrl: data.photoUrl || '',
    };

    if (id) {
        // EDIT MODE
        const docSnap = await getDoc(doc(ref, id));
        const existingData = docSnap.exists() ? docSnap.data() : {};
        
        if (isMaskedValue(payload.aadhaarNumber) || !payload.aadhaarNumber) {
            payload.aadhaarNumber = existingData.aadhaarNumber || '';
        }
        if (isMaskedValue(payload.phonePersonal) || !payload.phonePersonal) {
            payload.phonePersonal = existingData.phonePersonal || existingData.phone || '';
        }
        if (isMaskedValue(payload.phoneParents) || !payload.phoneParents) {
            payload.phoneParents = existingData.phoneParents || '';
        }
        if (isMaskedValue(payload.addressPresent) || !payload.addressPresent) {
            payload.addressPresent = existingData.addressPresent || existingData.address || '';
        }
        if (isMaskedValue(payload.addressPermanent) || !payload.addressPermanent) {
            payload.addressPermanent = existingData.addressPermanent || '';
        }
        if (isMaskedValue(payload.dob) || !payload.dob) {
            payload.dob = existingData.dob || '';
        }
        if (isMaskedValue(payload.bloodGroup) || !payload.bloodGroup) {
            payload.bloodGroup = existingData.bloodGroup || '';
        }

        await updateDoc(doc(ref, id), {
            ...payload,
            updatedAt: serverTimestamp(),
        });
    } else {
        // ADD NEW MODE: set default fee fields + attendance
        const feeDefaults = {
            enrollmentFee: 0,
            uniformFee: 0,
            campFee: 0,
            feePaid: 0,
            feeDueDate: '',
        };

        const institutionId = (payload.institutionId ? String(payload.institutionId).trim().toLowerCase() : '') || await getCurrentUserInstitution() || 'gmrit';

        // Check vacancy limit
        if (institutionId) {
            const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
            const unitSnap = await getDoc(doc(unitsRef, institutionId));
            if (unitSnap.exists()) {
                const unitData = unitSnap.data();
                const maxVacancies = (unitData.allottedCadetCount || 0) + (unitData.newVacancies || 0);
                if (maxVacancies > 0) {
                    const activeQuery = query(ref, where('institutionId', '==', institutionId));
                    const activeSnap = await getDocs(activeQuery);
                    const activeCount = activeSnap.docs.filter(d => d.data().status !== 'alumni').length;
                    if (activeCount >= maxVacancies) {
                        throw new Error(`Vacancy Limit Reached: This college unit is allocated a maximum of ${maxVacancies} cadets, and currently has ${activeCount} active cadets.`);
                    }
                }
            }
        }

        await addDoc(ref, {
            ...payload,
            ...feeDefaults,
            institutionId, // Multi-Tenancy tag
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attendance: {},
        });
    }
};

// --- Toggle Mentor Status ---
export const toggleMentorStatus = async (cadetId, currentStatus) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');
    await updateDoc(doc(ref, cadetId), {
        isMentor: !currentStatus,
        updatedAt: serverTimestamp(),
    });
};

/**
 * promoteSpecificCadets
 */
export const promoteSpecificCadets = async (fromCert, toCert) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const q = query(ref);
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.forEach((docSnap) => {
        const data = docSnap.data();

        if ((data.certificate || data.B) === fromCert) {
            let updates = {
                certificate: toCert,
                updatedAt: serverTimestamp(),
            };

            // --- FORWARD PROMOTIONS ---
            if (fromCert === 'B1' && toCert === 'B2') {
                if (data.year === '1st') updates.year = '2nd';
                else if (data.year === '2nd') updates.year = '3rd';
            } else if (fromCert === 'B2' && toCert === 'C') {
                if (data.year === '2nd') updates.year = '3rd';
                else if (data.year === '3rd') updates.year = '4th';
            } else if (fromCert === 'B1' && toCert === 'C') {
                if (data.year === '1st') updates.year = '2nd';
                else if (data.year === '2nd') updates.year = '3rd';
                else if (data.year === '3rd') updates.year = '4th';
            }
            // --- REVERSE CORRECTIONS ---
            else if (fromCert === 'C' && toCert === 'B2') {
                if (data.year === '4th') updates.year = '3rd';
                else if (data.year === '3rd') updates.year = '2nd';
            } else if (fromCert === 'B2' && toCert === 'B1') {
                if (data.year === '3rd') updates.year = '2nd';
                else if (data.year === '2nd') updates.year = '1st';
            }

            batch.update(docSnap.ref, updates);
            count++;
        }
    });

    if (count > 0) {
        await batch.commit();
    }
    return count;
};

// --- CADET BULK IMPORT ---
export const bulkAddCadets = async (cadets, institutionId) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    if (!institutionId) {
        institutionId = await getCurrentUserInstitution();
    }

    // 1. Fetch only existing cadets for THIS institution
    const q = query(ref, where('institutionId', '==', institutionId));
    const snapshot = await getDocs(q);
    
    // Map enrollmentId to document reference for quick lookup
    const existingMap = new Map(
        snapshot.docs.map((d) => [(d.data().enrollmentId || '').toString().trim(), d.ref])
    );

    // Check vacancy limit for bulk import
    if (institutionId) {
        const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
        const unitSnap = await getDoc(doc(unitsRef, institutionId));
        if (unitSnap.exists()) {
            const unitData = unitSnap.data();
            const maxVacancies = (unitData.allottedCadetCount || 0) + (unitData.newVacancies || 0);
            if (maxVacancies > 0) {
                const activeCount = snapshot.docs.filter(d => d.data().status !== 'alumni').length;
                let newAdditionsCount = 0;
                for (const cadet of cadets) {
                    const getField = (keys) => {
                        for (const key of keys) {
                            if (cadet[key] !== undefined && cadet[key] !== null) return cadet[key].toString().trim();
                            if (cadet[key.toLowerCase()] !== undefined) return cadet[key.toLowerCase()].toString().trim();
                        }
                        return '';
                    };
                    const enrollmentId = getField(['Regimental Number', 'Regimental No', 'enrollmentId', 'regimental number']);
                    const name = getField(['Name', 'name', 'Full Name']);
                    if (enrollmentId && name && !existingMap.has(enrollmentId.toString().trim())) {
                        newAdditionsCount++;
                    }
                }
                if (activeCount + newAdditionsCount > maxVacancies) {
                    throw new Error(`Vacancy Limit Reached: Importing these cadets would result in ${activeCount + newAdditionsCount} active cadets, which exceeds the college vacancy limit of ${maxVacancies}. (Current active cadets: ${activeCount})`);
                }
            }
        }
    }

    const batch = writeBatch(db);
    let addedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const cadet of cadets) {
        try {
            const getField = (keys) => {
                for (const key of keys) {
                    if (cadet[key] !== undefined && cadet[key] !== null) return cadet[key].toString().trim();
                    if (cadet[key.toLowerCase()] !== undefined) return cadet[key.toLowerCase()].toString().trim();
                }
                return '';
            };

            const enrollmentId = getField(['Regimental Number', 'Regimental No', 'enrollmentId', 'regimental number']);
            const name = getField(['Name', 'name', 'Full Name']);

            if (!enrollmentId || !name) {
                skippedCount++;
                continue;
            }

            const payload = {
                name,
                enrollmentId,
                jntuNo: getField(['JNTU NO', 'JNTU No', 'jntu no', 'jntuNo']),
                rank: getField(['Rank', 'rank']) || 'CDT',
                certificate: getField(['CERT', 'cert', 'certificate']) || 'NA',
                fatherName: getField(['Father Name', 'father name', 'FatherName']),
                motherName: getField(['Mother Name', 'mother name', 'MotherName']),
                year: getField(['Year', 'year']),
                branch: getField(['Branch', 'branch']),
                aadhaarNumber: getField(['Aadhaar Number', 'aadhaar number', 'Aadhaar']),
                phonePersonal: getField(['Phone number (Personal)', 'phone number (personal)', 'phonePersonal', 'Phone']),
                phoneParents: getField(['Phone Number (Parents)', 'phone number (parents)', 'phoneParents']),
                addressPresent: getField(['Address (Present)', 'address (present)', 'addressPresent']),
                addressPermanent: getField(['Address (Permanent) If both present & Permanent are Same Just Ignore', 'address (permanent) if both present & permanent are same just ignore', 'addressPermanent']),
                hostelerType: getField(['Hosteler / Days scholar', 'hosteler / days scholar']) || 'Days scholar',
                ecaCca: getField(['ECA/CCA', 'eca/cca']),
                dob: getField(['Date of Birth', 'date of birth', 'dob']),
                personalEmail: getField(['Email ID (Personal)', 'email id (personal)', 'personalEmail']),
                collegeEmail: getField(['Email ID (College Mail)', 'email id (college mail)', 'collegeEmail']),
                bloodGroup: getField(['Blood Group', 'blood group']),
                updatedAt: serverTimestamp(),
            };

            const rowInstitutionId = getField(['Institution ID', 'institution id', 'institutionId', 'College Code', 'college code', 'College ID', 'college id', 'Unit ID', 'unit id']) || institutionId || 'gmrit';

            const existingRef = existingMap.get(enrollmentId);
            
            if (existingRef) {
                // UPDATE EXISTING CADET
                batch.update(existingRef, {
                    ...payload,
                    institutionId: rowInstitutionId,
                });
                updatedCount++;
            } else {
                // ADD NEW CADET
                const newDocRef = doc(ref);
                batch.set(newDocRef, {
                    ...payload,
                    enrollmentFee: 0,
                    uniformFee: 0,
                    campFee: 0,
                    feePaid: 0,
                    feeDueDate: '',
                    attendance: {},
                    institutionId: rowInstitutionId,
                    status: 'active',
                    createdAt: serverTimestamp(),
                });
                addedCount++;
                existingMap.set(enrollmentId, newDocRef); // Track newly added in this batch
            }

            // Commit in chunks to avoid Firestore limits
            if ((addedCount + updatedCount) % 450 === 0) {
                await batch.commit();
            }
        } catch (err) {
            console.error('Skipping row due to error:', err);
            skippedCount++;
        }
    }

    if ((addedCount + updatedCount) > 0 && (addedCount + updatedCount) % 450 !== 0) {
        await batch.commit();
    }

    return { addedCount, updatedCount, skippedCount };
};

/**
 * Deduplicate Cadets: Finds all cadets with the same enrollmentId 
 * and merges them into one record, deleting the others.
 */
export const deduplicateCadets = async (institutionId) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const targetId = institutionId || await getCurrentUserInstitution();

    // 1. Fetch ALL cadets in the system for a truly global cleanup
    // We don't filter by institutionId here to find duplicates that might have the wrong ID
    const snapshot = await getDocs(ref);
    
    const groups = {};
    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        // Check both common ID fields
        const rawId = data.enrollmentId || data.regimentalNumber || data.regNo || '';
        const id = rawId.toString().trim().toUpperCase();
        
        if (!id) return;
        if (!groups[id]) groups[id] = [];
        groups[id].push({ id: docSnap.id, ...data, ref: docSnap.ref });
    });

    const batch = writeBatch(db);
    let removedCount = 0;
    let alignedCount = 0;

    for (const enrollId of Object.keys(groups)) {
        const instances = groups[enrollId];
        
        // Keep one, delete others
        // Sort so that we process complete/correct documents first:
        // 1. Prefer specific college (not 14a-bn-srikakulam)
        // 2. Prefer documents with more fields filled out (higher details score)
        // 3. Prefer more recently updated documents
        instances.sort((a, b) => {
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

            const timeA = a.updatedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
            const timeB = b.updatedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
            return timeB - timeA; // Latest first
        });

        const primary = instances[0];
        let mergedAttendance = { ...(primary.attendance || {}) };

        // Merge attendance from all redundant copies into primary
        for (let i = 1; i < instances.length; i++) {
            if (instances[i].attendance) {
                mergedAttendance = { ...instances[i].attendance, ...mergedAttendance };
            }
            batch.delete(instances[i].ref);
            removedCount++;
        }

        // Ensure the primary record has a valid institutionId.
        // If targetId is the battalion headquarters, do NOT overwrite a specific college ID.
        let newInstitutionId = primary.institutionId;
        if (!newInstitutionId || newInstitutionId === '14a-bn-srikakulam') {
            const specificInst = instances.find(inst => inst.institutionId && inst.institutionId !== '14a-bn-srikakulam');
            if (specificInst) {
                newInstitutionId = specificInst.institutionId;
            } else if (targetId && targetId !== '14a-bn-srikakulam') {
                newInstitutionId = targetId;
            }
        } else if (targetId && targetId !== '14a-bn-srikakulam' && primary.institutionId !== targetId) {
            newInstitutionId = targetId;
        }

        const updates = { attendance: mergedAttendance, updatedAt: serverTimestamp() };
        if (primary.institutionId !== newInstitutionId) {
            updates.institutionId = newInstitutionId;
            alignedCount++;
        }

        batch.set(primary.ref, updates, { merge: true });
    }

    if (removedCount > 0 || alignedCount > 0) {
        await batch.commit();
    }
    return { removedCount, alignedCount, totalScanned: snapshot.docs.length };
};

/**
 * Deduplicate Staff: Finds all staff members with the same email or generic auto-seeded profile
 * and removes duplicate/dummy records.
 */
export const deduplicateStaff = async () => {
    const ref = getCollectionRef('staff');
    if (!ref) throw new Error('Database not ready.');

    const snapshot = await getDocs(ref);
    const batch = writeBatch(db);
    let removedCount = 0;

    const groups = {};
    const corruptRefs = [];

    snapshot.docs.forEach(docSnap => {
        const data = docSnap.data();
        if (!data.name && !data.email) {
            corruptRefs.push(docSnap.ref);
            return;
        }

        const emailKey = (data.email || '').trim().toLowerCase();
        if (!emailKey) return;

        if (!groups[emailKey]) groups[emailKey] = [];
        groups[emailKey].push({ id: docSnap.id, ...data, ref: docSnap.ref });
    });

    corruptRefs.forEach(ref => {
        batch.delete(ref);
        removedCount++;
    });

    for (const emailKey of Object.keys(groups)) {
        const instances = groups[emailKey];
        if (instances.length <= 1) continue;

        instances.sort((a, b) => {
            const isGenericA = a.name === 'Associate NCC Officer';
            const isGenericB = b.name === 'Associate NCC Officer';
            if (isGenericA && !isGenericB) return 1;
            if (!isGenericA && isGenericB) return -1;

            const scoreA = (a.phone ? 5 : 0) + (a.photoUrl || a.photoURL ? 5 : 0) + (a.address ? 2 : 0) + (a.rank && a.rank !== 'ANO' ? 2 : 0);
            const scoreB = (b.phone ? 5 : 0) + (b.photoUrl || b.photoURL ? 5 : 0) + (b.address ? 2 : 0) + (b.rank && b.rank !== 'ANO' ? 2 : 0);
            return scoreB - scoreA;
        });

        for (let i = 1; i < instances.length; i++) {
            batch.delete(instances[i].ref);
            removedCount++;
        }
    }

    if (removedCount > 0) {
        await batch.commit();
    }
    return { removedCount, totalScanned: snapshot.docs.length };
};

// --- Unit Gallery (Save / Upload Item) ---
export const saveGalleryItem = async (data, id = null) => {
    const ref = getCollectionRef('unit_gallery');
    if (!ref) throw new Error('Database not ready.');

    const payload = {
        title: data.title || 'NCC Unit Activity',
        location: data.location || 'Unit HQ',
        date: data.date || new Date().toISOString().split('T')[0],
        photoUrl: data.photoUrl || '',
        institutionId: data.institutionId || '14a-bn-srikakulam',
        uploaderName: data.uploaderName || 'ANO',
        createdAt: serverTimestamp(),
    };

    if (id) {
        await updateDoc(doc(ref, id), payload);
    } else {
        await addDoc(ref, payload);
    }
};

export const rescueCadets = async () => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const targetId = await getCurrentUserInstitution();

    const snapshot = await getDocs(ref);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach(docSnap => {
        batch.set(docSnap.ref, { institutionId: targetId }, { merge: true });
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }
    return count;
};


// --- Attendance ---
export const recordAttendance = async (cadetId, date, status, markedBy = 'ANO (Manual)', userInstId = null) => {
    const cadetsRef = getCollectionRef('cadets');
    const attRef = getCollectionRef('attendance');
    if (!cadetsRef || !attRef) throw new Error('Database not ready.');

    const cleanDate = normalizeDate(date) || date;
    const cadetDocRef = doc(cadetsRef, cadetId);
    const cadetSnap = await getDoc(cadetDocRef);
    if (!cadetSnap.exists()) throw new Error('Cadet record not found.');

    const cadet = cadetSnap.data();
    const isPresent = status && ['PRESENT', 'P', 'VERIFIED', 'LATE', 'ATTENDED', 'EXEMPT', '1'].includes(String(status).trim().toUpperCase());

    const instId = userInstId || cadet.institutionId || await getCurrentUserInstitution();
    const regId = cadet.enrollmentId || cadet.regimentalNumber || '';
    const division = regId.toUpperCase().includes('SW') ? 'SW' : 'SD';

    // 1. Update Cadet profile document
    await updateDoc(cadetDocRef, {
        [`attendance.${cleanDate}`]: isPresent ? (status || 'Present') : 'Absent',
        updatedAt: serverTimestamp(),
    });

    // 2. Sync Attendance History Logs collection using deterministic ID: `${cadetId}_${cleanDate}`
    const detDocId = `${cadetId}_${cleanDate}`;
    const detDocRef = doc(attRef, detDocId);

    if (isPresent) {
        await setDoc(detDocRef, {
            cadetId,
            cadetName: cadet.name || '',
            enrollmentId: regId,
            certificate: cadet.certificate || cadet.B || 'NA',
            division,
            timestamp: serverTimestamp(),
            markedBy,
            institutionId: instId,
            date: cleanDate,
            status: status || 'Present'
        }, { merge: true });

        // Clean any older duplicate documents with random IDs for this cadet on this date
        try {
            const existingLogsSnap = await getDocs(query(attRef, where('date', '==', cleanDate)));
            for (const logDoc of existingLogsSnap.docs) {
                if (logDoc.id !== detDocId) {
                    const lData = logDoc.data();
                    if (lData.cadetId === cadetId || (regId && lData.enrollmentId && lData.enrollmentId.toUpperCase() === regId.toUpperCase())) {
                        await deleteDoc(doc(attRef, logDoc.id)).catch(() => {});
                    }
                }
            }
        } catch (e) {
            console.warn("Log deduplication note:", e);
        }
    } else {
        await deleteDoc(detDocRef).catch(() => {});
        try {
            const existingLogsSnap = await getDocs(query(attRef, where('date', '==', cleanDate)));
            for (const logDoc of existingLogsSnap.docs) {
                const lData = logDoc.data();
                if (lData.cadetId === cadetId || (regId && lData.enrollmentId && lData.enrollmentId.toUpperCase() === regId.toUpperCase())) {
                    await deleteDoc(doc(attRef, logDoc.id)).catch(() => {});
                }
            }
        } catch (e) {
            console.warn("Log removal note:", e);
        }
    }
};

// --- Events ---
export const saveEvent = async (data, id = null) => {
    const ref = getCollectionRef('events');
    if (!ref) throw new Error('Database not ready.');

    let date;
    try {
        date = new Date(data.date);
        if (isNaN(date.getTime())) throw new Error('Invalid date');
    } catch (e) {
        throw new Error('Invalid date format. Please use YYYY-MM-DD.');
    }

    const payload = {
        ...data,
        date: Timestamp.fromDate(date),
        updatedAt: serverTimestamp(),
    };

    if (id) {
        await updateDoc(doc(ref, id), payload);
    } else {
        payload.createdAt = serverTimestamp();
        payload.institutionId = await getCurrentUserInstitution(); // Multi-Tenancy tag
        payload.imageUrls = [];
        payload.attendeeStatus = {};
        await addDoc(ref, payload);
    }
};

// --- EVENT ATTENDEE MANAGEMENT ---
export const setEventAttendeeStatus = async (eventId, cadetId, status) => {
    if (!eventId || !cadetId)
        throw new Error('Event ID and Cadet ID are required.');

    const eventRef = doc(getCollectionRef('events'), eventId);
    const fieldName = `attendeeStatus.${cadetId}`;

    if (status === null) {
        await updateDoc(eventRef, {
            [fieldName]: deleteField(),
            updatedAt: serverTimestamp(),
        });
    } else {
        await updateDoc(eventRef, {
            [fieldName]: status,
            updatedAt: serverTimestamp(),
        });
    }
};

export const setEventAttendeeBulk = async (eventId, cadetIds, status) => {
    if (!eventId || !cadetIds || !Array.isArray(cadetIds)) return;
    const eventRef = doc(getCollectionRef('events'), eventId);
    
    const updates = { updatedAt: serverTimestamp() };
    cadetIds.forEach(cadetId => {
        updates[`attendeeStatus.${cadetId}`] = status === null ? deleteField() : status;
    });

    await updateDoc(eventRef, updates);
};

// --- Staff ---
export const saveStaff = async (data, id = null) => {
    const ref = getCollectionRef('staff');
    if (!ref) throw new Error('Database not ready.');

    const payload = {
        ...data,
        photoUrl: data.photoUrl || '',
        priority:
            typeof data.priority !== 'undefined' ? Number(data.priority) : 999,
        updatedAt: serverTimestamp(),
    };

    if (id) {
        await updateDoc(doc(ref, id), payload);
    } else {
        payload.createdAt = serverTimestamp();
        payload.institutionId = data.institutionId || await getCurrentUserInstitution(); // Multi-Tenancy tag
        await addDoc(ref, payload);
    }
};

export const checkUserLoginExists = async (email) => {
    if (!email) return false;
    const ref = getCollectionRef('users');
    if (!ref) return false;
    const q = query(ref, where('email', '==', email.trim().toLowerCase()));
    const snap = await getDocs(q);
    return !snap.empty;
};

// --- Event Images ---
export const addImageToEvent = async (eventId, imageUrl) => {
    if (!imageUrl || !imageUrl.startsWith('http')) {
        throw new Error(
            'Please enter a valid link (starting with http:// or https://).'
        );
    }
    const eventRef = doc(getCollectionRef('events'), eventId);
    await updateDoc(eventRef, {
        imageUrls: arrayUnion(imageUrl),
        updatedAt: serverTimestamp(),
    });
};

export const deleteImageFromEvent = async (eventId, imageUrl) => {
    const eventRef = doc(getCollectionRef('events'), eventId);
    await updateDoc(eventRef, {
        imageUrls: arrayRemove(imageUrl),
        updatedAt: serverTimestamp(),
    });
};

// --- REFERENCES (Link Only) ---
export const saveReferenceLink = async (title, downloadURL) => {
    const refCollection = getCollectionRef('references');
    if (!refCollection) throw new Error('Database not ready.');

    const payload = { title, downloadURL, createdAt: serverTimestamp() };
    await addDoc(refCollection, payload);
};

export const updateReferenceLink = async (id, title, downloadURL) => {
    const refDoc = doc(getCollectionRef('references'), id);
    const payload = { title, downloadURL, updatedAt: serverTimestamp() };
    await updateDoc(refDoc, payload);
};

// ------------------------------
// --- FEE MANAGEMENT ---
// ------------------------------
export const updateCadetFee = async (cadetId, feeData) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const payload = {
        enrollmentFee: Number(feeData.enrollmentFee),
        uniformFee: Number(feeData.uniformFee),
        campFee: Number(feeData.campFee),
        feePaid: Number(feeData.feePaid),
        feeDueDate: feeData.feeDueDate,
        updatedAt: serverTimestamp(),
    };

    await updateDoc(doc(ref, cadetId), payload);
};

export const updateAllCadetFeesBulk = async (feeData) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const q = query(ref);
    const snapshot = await getDocs(q);

    if (snapshot.empty) throw new Error('No cadets found to update.');

    return runTransaction(db, async (transaction) => {
        const payload = {
            enrollmentFee: Number(feeData.enrollmentFee),
            uniformFee: Number(feeData.uniformFee),
            campFee: Number(feeData.campFee),
            updatedAt: serverTimestamp(),
        };

        snapshot.docs.forEach((docSnap) => {
            transaction.update(docSnap.ref, payload);
        });
    });
};

// ------------------------------
// --- ANNOUNCEMENTS ---
// ------------------------------
export const saveAnnouncement = async (title, content, targetCertificate = 'All', targetDivision = 'All', noticeDate = null, id = null, senderRole = 'ano', targetAudience = 'cadets', targetCollege = 'All') => {
    const ref = getCollectionRef('announcements');
    if (!ref) throw new Error('Database not ready.');
    const institutionId = await getCurrentUserInstitution();
    const payload = { 
        title, 
        content, 
        targetCertificate,
        targetDivision,
        noticeDate: noticeDate || new Date().toISOString().split('T')[0],
        institutionId,
        senderRole,
        targetAudience,
        targetCollege,
        updatedAt: serverTimestamp() 
    };

    if (id) {
        await updateDoc(doc(ref, id), payload);
    } else {
        payload.createdAt = serverTimestamp();
        await addDoc(ref, payload);
    }
};

export const deleteAnnouncement = async (id) => {
    const ref = getCollectionRef('announcements');
    if (!ref) throw new Error('Database not ready.');
    await deleteDoc(doc(ref, id));
};

export const updateUserLastViewedAnnouncements = async (uid) => {
    if (!uid) return;
    const userDocRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'users',
        uid
    );
    await updateDoc(userDocRef, { lastViewedAnnouncements: serverTimestamp() });
};

export const updateUserLastViewedNotifications = async (uid) => {
    if (!uid) return;
    const userDocRef = doc(
        db,
        'artifacts',
        appId,
        'public',
        'data',
        'users',
        uid
    );
    await updateDoc(userDocRef, { lastViewedNotifications: serverTimestamp() });
};

// ------------------------------
// --- PROFILE MANAGEMENT ---
// ------------------------------

export const uploadProfilePhoto = (cadetId, file, onProgress = () => {}) => {
    return new Promise((resolve, reject) => {
        if (!storage) return reject(new Error('Storage not configured.'));

        try {
            const timestamp = Date.now();
            const safeName = file.name.replace(/\s+/g, '_');
            const path = `profilePhotos/${cadetId}/${timestamp}_${safeName}`;
            const sRef = storageRef(storage, path);
            const uploadTask = uploadBytesResumable(sRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) =>
                    onProgress(
                        Math.round(
                            (snapshot.bytesTransferred / snapshot.totalBytes) *
                                100
                        )
                    ),
                (err) => reject(err),
                async () =>
                    resolve(await getDownloadURL(uploadTask.snapshot.ref))
            );
        } catch (e) {
            reject(e);
        }
    });
};

export const uploadTrainingFile = (file, folder = 'misc', onProgress = () => {}) => {
    return new Promise((resolve, reject) => {
        if (!storage) return reject(new Error('Storage not configured.'));

        try {
            const timestamp = Date.now();
            const safeName = file.name.replace(/\s+/g, '_');
            const path = `training/${folder}/${timestamp}_${safeName}`;
            const sRef = storageRef(storage, path);
            const uploadTask = uploadBytesResumable(sRef, file);

            uploadTask.on(
                'state_changed',
                (snapshot) =>
                    onProgress(
                        Math.round(
                            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                        )
                    ),
                (err) => reject(err),
                async () => resolve(await getDownloadURL(uploadTask.snapshot.ref))
            );
        } catch (e) {
            reject(e);
        }
    });
};

export const updateCadetContactInfo = async (cadetId, contactData) => {
    const cadetDocRef = doc(getCollectionRef('cadets'), cadetId);
    const payload = { ...contactData, updatedAt: serverTimestamp() };
    await updateDoc(cadetDocRef, payload);
};

// ------------------------------------
// --- NEW: PAYMENT SYSTEM FUNCTIONS ---
// ------------------------------------

/**
 * Updates payment settings (QR URL and Razorpay Key ID)
 */
export const updatePaymentScanner = async (newUrl) => {
    const ref = getCollectionRef('settings');
    if (!ref) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();
    const paymentDocRef = doc(ref, 'payment');

    await setDoc(
        paymentDocRef,
        {
            paymentQRUrl: newUrl,
            institutionId, // Multi-Tenancy tag
            updatedAt: serverTimestamp(),
        },
        { merge: true }
    );
};

export const updatePaymentSettings = async ({ paymentQRUrl, razorpayKeyId }) => {
    const ref = getCollectionRef('settings');
    if (!ref) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();
    const paymentDocRef = doc(ref, 'payment');

    const data = {
        institutionId,
        updatedAt: serverTimestamp(),
    };
    if (paymentQRUrl !== undefined) data.paymentQRUrl = paymentQRUrl;
    if (razorpayKeyId !== undefined) data.razorpayKeyId = razorpayKeyId;

    await setDoc(paymentDocRef, data, { merge: true });
};

/**
 * Record an instant successful payment from Razorpay Checkout (Client-Side, zero backend cost).
 * Automatically marks transaction as approved and credits cadet's feePaid balance.
 */
export const recordInstantRazorpayPayment = async ({
    cadetId,
    amount,
    cadetName,
    enrollmentId,
    paymentId,
    institutionId = null
}) => {
    const ref = getCollectionRef('transactions');
    if (!ref) throw new Error('Database not ready.');

    const finalInstId = institutionId || await getCurrentUserInstitution();
    const numericAmount = Number(typeof amount === 'string' ? amount.replace(/[^0-9.]/g, '') : amount);

    if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Invalid payment amount for Razorpay transaction.');
    }

    const batch = writeBatch(db);

    // 1. Save approved transaction record
    const transRef = doc(ref);
    batch.set(transRef, {
        cadetId,
        cadetName,
        enrollmentId,
        amount: numericAmount,
        status: 'approved',
        type: 'Razorpay',
        paymentId: paymentId || `RZP-${Date.now()}`,
        institutionId: finalInstId,
        createdAt: serverTimestamp(),
        approvedAt: serverTimestamp(),
        autoApproved: true
    });

    // 2. Increment cadet feePaid balance
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);
    batch.set(cadetRef, {
        feePaid: increment(numericAmount),
        updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();
    return transRef.id;
};

/**
 * Cadets use this to submit a payment for verification.
 * Creates a record in the 'transactions' collection for Admin approval.
 */
export const requestPaymentVerification = async (
    cadetId,
    amount,
    cadetName,
    enrollmentId,
    receiptBase64 = null,
    institutionId = null
) => {
    const ref = getCollectionRef('transactions');
    if (!ref) throw new Error('Database not ready.');

    // Use provided ID or fallback to current session
    const finalInstitutionId = institutionId || await getCurrentUserInstitution();
    if (!finalInstitutionId) throw new Error('Institutional identity missing. Please re-login.');

    await addDoc(ref, {
        cadetId,
        cadetName,
        enrollmentId,
        amount: Number(amount),
        status: 'pending',
        type: 'PhonePe',
        receiptImage: receiptBase64,
        institutionId: finalInstitutionId, 
        createdAt: serverTimestamp(),
    });

    // Notify Admins (Optional, can be added later)
};

export const addNotification = async (userId, title, message, type = 'info', institutionId, enrollmentId = null) => {
    const ref = getCollectionRef('notifications');
    if (!ref) return;
    await addDoc(ref, {
        userId,           // Firestore document ID of the cadet
        enrollmentId,     // enrollmentId for client-side filtering in UnitAlerts
        title,
        message,
        type,
        status: 'unread',
        institutionId,
        createdAt: serverTimestamp()
    });
};

/**
 * Checks if a cadet's attendance percentage is below the Battalion Admin threshold for B or C cert,
 * and sends both a real-time push notification and an in-app alert warning to the cadet's phone/browser.
 */
export const checkAndSendLowAttendanceAlert = async (cadetId, percentage, certLevel = 'B', customLimit = null, institutionId = 'gmrit', enrollmentId = null) => {
    if (!cadetId || typeof percentage !== 'number' || isNaN(percentage)) return;
    const rounded = Math.round(percentage);
    const certUpper = String(certLevel || 'B').toUpperCase().trim();
    const isCCert = certUpper === 'C';

    let minLimit = customLimit;
    if (minLimit === null || typeof minLimit !== 'number') {
        minLimit = 75;
        try {
            const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'certificate_config');
            const snap = await getDoc(configRef);
            if (snap.exists()) {
                const data = snap.data();
                if (isCCert) {
                    minLimit = typeof data.minAttendanceC === 'number' ? data.minAttendanceC : 75;
                } else {
                    minLimit = typeof data.minAttendanceB === 'number' ? data.minAttendanceB : (data.minAttendanceLimit || 75);
                }
            }
        } catch (e) { console.warn("Config fetch failed", e); }
    }

    const notifRef = getCollectionRef('notifications');

    if (rounded < minLimit) {
        const certTag = isCCert ? 'C Certificate' : 'B Certificate';
        const title = `⚠️ Low Attendance Warning (${rounded}%)`;
        const body = `Your attendance level has dropped to ${rounded}%, which is below the minimum required limit set by Battalion HQ (${minLimit}% for ${certTag}). Please attend upcoming classes to maintain exam eligibility.`;
        
        try {
            // 1. ALWAYS dispatch real-time push notification to cadet device(s)
            const { sendPushToCadets } = await import('./pushNotifications.js');
            await sendPushToCadets([cadetId, enrollmentId], title, body, 'attendance');

            // 2. Manage in-app alert notification in Firestore (search by userId OR enrollmentId)
            let existingDocs = [];
            try {
                if (cadetId) {
                    const q1 = query(notifRef, where('userId', '==', cadetId));
                    const snap1 = await getDocs(q1);
                    existingDocs.push(...snap1.docs);
                }
                if (enrollmentId) {
                    const q2 = query(notifRef, where('enrollmentId', '==', enrollmentId));
                    const snap2 = await getDocs(q2);
                    existingDocs.push(...snap2.docs);
                }
            } catch (e) { console.warn("Notice lookup failed:", e); }

            const lowAttDocs = existingDocs.filter((d, idx, arr) => 
                arr.findIndex(x => x.id === d.id) === idx && 
                (d.data().isLowAttendance === true || (d.data().title && d.data().title.includes('Low Attendance Warning')))
            );

            if (lowAttDocs.length > 0) {
                // Update existing document with new details instead of spamming duplicates
                for (const targetDoc of lowAttDocs) {
                    await updateDoc(targetDoc.ref, {
                        title,
                        message: body,
                        percentage: rounded,
                        minLimit,
                        updatedAt: serverTimestamp()
                    });
                }
            } else {
                // Create single clean low attendance warning document
                await addDoc(notifRef, {
                    userId: cadetId,
                    enrollmentId: enrollmentId || cadetId,
                    title,
                    message: body,
                    type: 'warning',
                    isLowAttendance: true,
                    percentage: rounded,
                    minLimit,
                    status: 'unread',
                    institutionId,
                    createdAt: serverTimestamp()
                });
            }
        } catch (e) {
            console.error("Low attendance alert update failed:", e.message);
        }
    } else {
        // Attendance is AT OR ABOVE requirement (e.g. 100% or >= minLimit).
        // Automatically delete any old low attendance warning documents for this cadet from Firestore!
        try {
            let existingDocs = [];
            if (cadetId) {
                const q1 = query(notifRef, where('userId', '==', cadetId));
                const snap1 = await getDocs(q1);
                existingDocs.push(...snap1.docs);
            }
            if (enrollmentId) {
                const q2 = query(notifRef, where('enrollmentId', '==', enrollmentId));
                const snap2 = await getDocs(q2);
                existingDocs.push(...snap2.docs);
            }

            for (const docSnap of existingDocs) {
                const data = docSnap.data();
                if (data.isLowAttendance === true || (data.title && data.title.includes('Low Attendance Warning'))) {
                    await deleteDoc(docSnap.ref);
                }
            }
        } catch (e) {
            console.warn("Cleanup of old low attendance warnings failed:", e);
        }
    }
};

/**
 * Admin Approves a payment.
 * 1. Updates transaction status
 * 2. Increments the cadet's feePaid field
 */
export const approveTransaction = async (transactionId, amount, cadetId, adminUid = null) => {
    if (!transactionId || !cadetId) {
        throw new Error('Required IDs (transaction or cadet) are missing.');
    }

    // Clean amount: strip commas or currency symbols if they somehow got in
    const cleanAmount = typeof amount === 'string' 
        ? amount.replace(/[^0-9.]/g, '') 
        : amount;
    
    const numericAmount = Number(cleanAmount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
        throw new Error('Invalid payment amount detected.');
    }

    const batch = writeBatch(db);
    
    // 1. Update Transaction
    const transRef = doc(getCollectionRef('transactions'), transactionId);
    batch.update(transRef, { 
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: adminUid,
        ledgerVerified: true
    });

    // 2. Update Cadet Fee - Use set with merge to be more resilient than update
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);
    batch.set(cadetRef, {
        feePaid: increment(numericAmount),
        updatedAt: serverTimestamp()
    }, { merge: true });

    await batch.commit();
};

export const rejectTransaction = async (transactionId, reason = '') => {
    const ref = doc(getCollectionRef('transactions'), transactionId);
    await updateDoc(ref, { 
        status: 'rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp()
    });
};

export const deleteTransaction = async (transactionId) => {
    const ref = doc(getCollectionRef('transactions'), transactionId);
    await deleteDoc(ref);
};

// ------------------------------------
// --- NEW: QUARTERMASTER (Q-STORE) ---
// ------------------------------------

export const saveInventoryItem = async (data, id = null) => {
    const ref = getCollectionRef('inventory');
    if (!ref) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();

    const payload = {
        name: data.name,
        category: data.category || 'Clothing', 
        totalStock: Number(data.totalStock),
        institutionId,
        updatedAt: serverTimestamp(),
    };
    
    if (id) {
        // Adjust availableStock by the difference in totalStock
        return runTransaction(db, async (transaction) => {
            const itemDoc = await transaction.get(doc(ref, id));
            if (!itemDoc.exists()) throw new Error("Item not found");
            const oldTotal = itemDoc.data().totalStock || 0;
            const diff = payload.totalStock - oldTotal;
            const newAvailable = Math.max(0, (itemDoc.data().availableStock || 0) + diff);
            
            transaction.update(doc(ref, id), {
                ...payload,
                availableStock: newAvailable
            });
        });
    } else {
        payload.availableStock = Number(data.totalStock);
        payload.createdAt = serverTimestamp();
        await addDoc(ref, payload);
    }
};

export const issueItemToCadet = async (itemId, cadetId, quantity = 1) => {
    const invRef = getCollectionRef('inventory');
    const logsRef = getCollectionRef('inventoryLogs');
    if (!invRef || !logsRef) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();

    return runTransaction(db, async (transaction) => {
        // Read Item
        const itemDocRef = doc(invRef, itemId);
        const itemDoc = await transaction.get(itemDocRef);
        if (!itemDoc.exists()) throw new Error("Item not found");
        
        const itemData = itemDoc.data();
        if (itemData.availableStock < quantity) {
            throw new Error(`Insufficient stock! Only ${itemData.availableStock} available.`);
        }

        // Read Cadet
        const cadetRef = doc(getCollectionRef('cadets'), cadetId);
        const cadetDoc = await transaction.get(cadetRef);
        if (!cadetDoc.exists()) throw new Error("Cadet not found");
        const cadetData = cadetDoc.data();

        // 1. Deduct Stock
        transaction.update(itemDocRef, {
            availableStock: itemData.availableStock - quantity,
            updatedAt: serverTimestamp()
        });

        // 2. Log Transaction
        const logDocRef = doc(logsRef);
        transaction.set(logDocRef, {
            type: 'ISSUE',
            itemId,
            itemName: itemData.name,
            cadetId,
            cadetName: cadetData.name,
            quantity,
            institutionId,
            date: serverTimestamp()
        });
        
        // 3. Update Cadet internal array
        transaction.update(cadetRef, {
            issuedItems: arrayUnion({
                itemId,
                itemName: itemData.name,
                quantity,
                issuedAt: Timestamp.now()
            })
        });
    });
};

export const returnItemFromCadet = async (itemId, cadetId, itemName, returnQuantity = 1) => {
    const invRef = getCollectionRef('inventory');
    const logsRef = getCollectionRef('inventoryLogs');
    if (!invRef || !logsRef) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();

    return runTransaction(db, async (transaction) => {
        // Restock Item
        const itemDocRef = doc(invRef, itemId);
        const itemDoc = await transaction.get(itemDocRef);
        if (itemDoc.exists()) {
            const itemData = itemDoc.data();
            transaction.update(itemDocRef, {
                availableStock: itemData.availableStock + returnQuantity,
                updatedAt: serverTimestamp()
            });
        }

        // Log Transaction
        const logDocRef = doc(logsRef);
        transaction.set(logDocRef, {
            type: 'RETURN',
            itemId,
            itemName: itemName || 'Unknown Item',
            cadetId,
            quantity: returnQuantity,
            institutionId,
            date: serverTimestamp()
        });

        // Remove from Cadet array
        const cadetRef = doc(getCollectionRef('cadets'), cadetId);
        const cadetDoc = await transaction.get(cadetRef);
        if (cadetDoc.exists()) {
            const cadetData = cadetDoc.data();
            const issuedItems = cadetData.issuedItems || [];
            
            // Mark the matched item as returned
            const updatedItems = issuedItems.map(item => {
                if (item.itemId === itemId && !item.returned) {
                    return { ...item, returned: true, returnedAt: Timestamp.now() };
                }
                return item;
            });

            transaction.update(cadetRef, { issuedItems: updatedItems });
        }
    });
};

// ------------------------------------
// --- NEW: CAMPS & SELECTIONS ---
// ------------------------------------

export const saveCamp = async (data, id = null) => {
    const ref = getCollectionRef('camps');
    if (!ref) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();
    
    const payload = {
        name: data.name,
        type: data.type || 'ATC',
        location: data.location || '',
        startDate: data.startDate,
        endDate: data.endDate,
        institutionId,
        vacancies: data.vacancies || {}, // { [subdomain]: number }
        disallowedColleges: data.disallowedColleges || [], // [subdomain1, subdomain2]
        updatedAt: serverTimestamp(),
    };

    if (id) {
        const docSnap = await getDoc(doc(ref, id));
        let roster = [];
        if (docSnap.exists()) {
            roster = docSnap.data().roster || [];
        }
        await updateDoc(doc(ref, id), payload);
        
        // Notify only the cadets who are assigned to this camp
        roster.forEach(r => {
            if (r.enrollmentId && r.enrollmentId !== 'Unknown') {
                sendPushToUser(r.enrollmentId, '⛺ Camp Updated', `Details for camp "${payload.name}" have been updated by admin.`);
            }
        });
    } else {
        payload.createdAt = serverTimestamp();
        payload.roster = []; // Initialize empty roster
        await addDoc(ref, payload);
        
        // Notify ALL users
        try {
            sendPushToAll('⛺ New Camp Announced', `A new camp "${payload.name}" has been scheduled.`, 'announcement', false);
        } catch (e) {
            console.error(e);
        }
    }
};

export const deleteCamp = async (campId) => {
    const ref = doc(getCollectionRef('camps'), campId);
    if (!ref) throw new Error('Database not ready.');
    await deleteDoc(ref);
};

export const updateCampRoster = async (campId, cadetId, status = 'Selected') => {
    const campRef = doc(getCollectionRef('camps'), campId);
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);
    if (!campRef || !cadetRef) throw new Error('Database not ready.');

    return runTransaction(db, async (transaction) => {
        const campDoc = await transaction.get(campRef);
        const cadetDoc = await transaction.get(cadetRef);
        
        if (!campDoc.exists()) throw new Error("Camp not found");
        if (!cadetDoc.exists()) throw new Error("Cadet not found");

        const campData = campDoc.data();
        const cadetData = cadetDoc.data();

        // 1. Update Camp Roster
        const roster = campData.roster || [];
        const existingIndex = roster.findIndex(c => c.cadetId === cadetId);
        
        if (existingIndex >= 0) {
            roster[existingIndex].status = status || 'Selected';
        } else {
            roster.push({
                cadetId: cadetId || '',
                cadetName: cadetData.name || 'Unknown',
                enrollmentId: cadetData.enrollmentId || cadetData.regimentalNumber || 'Unknown',
                status: status || 'Selected',
                achievements: []
            });
        }
        transaction.update(campRef, { roster, updatedAt: serverTimestamp() });

        // 2. Update Cadet Document & Award Merits
        const campHistory = cadetData.campHistory || [];
        const cadetCampIndex = campHistory.findIndex(c => c.campId === campId);

        if (cadetCampIndex >= 0) {
            campHistory[cadetCampIndex] = { ...campHistory[cadetCampIndex], status: status || 'Selected' };
        } else {
            campHistory.push({
                campId: campId || '',
                campName: campData.name || 'Unnamed Camp',
                campType: campData.type || 'Other',
                startDate: campData.startDate || '',
                status: status || 'Selected',
                achievements: []
            });
        }

        // 3. Update campsAttended list for UI and analytics
        const campsAttended = cadetData.campsAttended || [];
        const campYear = campData.startDate ? String(new Date(campData.startDate).getFullYear()) : 'N/A';
        const cadetCampsAttendedIndex = campsAttended.findIndex(c => c.campId === campId || c.name === campData.name);
        
        if (cadetCampsAttendedIndex >= 0) {
            campsAttended[cadetCampsAttendedIndex] = {
                campId: campId,
                name: campData.name || 'Unnamed Camp',
                year: campYear,
                location: campData.location || 'N/A'
            };
        } else {
            campsAttended.push({
                campId: campId,
                name: campData.name || 'Unnamed Camp',
                year: campYear,
                location: campData.location || 'N/A'
            });
        }

        transaction.update(cadetRef, { 
            campHistory, 
            campsAttended,
            meritPoints: increment(5),
            updatedAt: serverTimestamp() 
        });
    });
};

export const addCadetsToCampBulk = async (campId, cadetsToAdd, status = 'Selected') => {
    const campRef = doc(getCollectionRef('camps'), campId);
    
    return runTransaction(db, async (transaction) => {
        const campDoc = await transaction.get(campRef);
        if (!campDoc.exists()) throw new Error("Camp not found");
        
        const campData = campDoc.data();
        const roster = campData.roster || [];
        
        for (const cadet of cadetsToAdd) {
             const existingIndex = roster.findIndex(c => c.cadetId === cadet.id);
             if (existingIndex >= 0) {
                 roster[existingIndex].status = status || 'Selected';
             } else {
                 roster.push({
                     cadetId: cadet.id || '',
                     cadetName: cadet.name || 'Unknown',
                     enrollmentId: cadet.enrollmentId || cadet.regimentalNumber || 'Unknown',
                     status: status || 'Selected',
                     achievements: []
                 });
             }
             
             // Update the cadet document using data passed from the client context
             const cadetRef = doc(getCollectionRef('cadets'), cadet.id);
             
             const campHistory = [...(cadet.campHistory || [])];
             const cadetCampIndex = campHistory.findIndex(c => c.campId === campId);
             
             if (cadetCampIndex >= 0) {
                 campHistory[cadetCampIndex] = { ...campHistory[cadetCampIndex], status: status || 'Selected' };
             } else {
                 campHistory.push({
                     campId: campId || '',
                     campName: campData.name || 'Unnamed Camp',
                     campType: campData.type || 'Other',
                     startDate: campData.startDate || '',
                     status: status || 'Selected',
                     achievements: []
                 });
             }

             // Update campsAttended list for UI and analytics
             const campsAttended = [...(cadet.campsAttended || [])];
             const campYear = campData.startDate ? String(new Date(campData.startDate).getFullYear()) : 'N/A';
             const cadetCampsAttendedIndex = campsAttended.findIndex(c => c.campId === campId || c.name === campData.name);
             if (cadetCampsAttendedIndex >= 0) {
                 campsAttended[cadetCampsAttendedIndex] = {
                     campId: campId,
                     name: campData.name || 'Unnamed Camp',
                     year: campYear,
                     location: campData.location || 'N/A'
                 };
             } else {
                 campsAttended.push({
                     campId: campId,
                     name: campData.name || 'Unnamed Camp',
                     year: campYear,
                     location: campData.location || 'N/A'
                 });
             }
             
             transaction.update(cadetRef, { 
                 campHistory, 
                 campsAttended,
                 updatedAt: serverTimestamp()
             });
        }
        
        transaction.update(campRef, { roster, updatedAt: serverTimestamp() });
    });
};

export const removeCadetFromCamp = async (campId, cadetId) => {
    const campRef = doc(getCollectionRef('camps'), campId);
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);
    if (!campRef || !cadetRef) throw new Error('Database not ready.');

    return runTransaction(db, async (transaction) => {
        const campDoc = await transaction.get(campRef);
        const cadetDoc = await transaction.get(cadetRef);
        
        if (!campDoc.exists()) throw new Error("Camp not found");
        if (!cadetDoc.exists()) throw new Error("Cadet not found");

        const campData = campDoc.data();
        const cadetData = cadetDoc.data();

        // 1. Remove from Camp Roster
        const roster = (campData.roster || []).filter(c => c.cadetId !== cadetId);
        transaction.update(campRef, { roster, updatedAt: serverTimestamp() });

        // 2. Remove from Cadet Document camp history, campsAttended list, & decrement merit points
        const campHistory = (cadetData.campHistory || []).filter(c => c.campId !== campId);
        const campsAttended = (cadetData.campsAttended || []).filter(c => c.campId !== campId && c.name !== campData.name);
        transaction.update(cadetRef, { 
            campHistory, 
            campsAttended,
            meritPoints: increment(-5),
            updatedAt: serverTimestamp() 
        });
    });
};


export const logCampAchievement = async (campId, cadetId, achievementText) => {
    const campRef = doc(getCollectionRef('camps'), campId);
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);

    return runTransaction(db, async (transaction) => {
        const campDoc = await transaction.get(campRef);
        const cadetDoc = await transaction.get(cadetRef);
        
        if (!campDoc.exists() || !cadetDoc.exists()) throw new Error("Data not found");
        
        // Add to camp roster
        const campData = campDoc.data();
        const roster = campData.roster || [];
        const rosterIndex = roster.findIndex(c => c.cadetId === cadetId);
        if (rosterIndex >= 0) {
            if (!roster[rosterIndex].achievements) roster[rosterIndex].achievements = [];
            if (!roster[rosterIndex].achievements.includes(achievementText)) {
                roster[rosterIndex].achievements.push(achievementText);
            }
            transaction.update(campRef, { roster });
        }

        // Add to cadet history
        const cadetData = cadetDoc.data();
        const campHistory = cadetData.campHistory || [];
        const histIndex = campHistory.findIndex(c => c.campId === campId);
        if (histIndex >= 0) {
            if (!campHistory[histIndex].achievements) campHistory[histIndex].achievements = [];
            if (!campHistory[histIndex].achievements.includes(achievementText)) {
                campHistory[histIndex].achievements.push(achievementText);
            }
            transaction.update(cadetRef, { campHistory });
        }
        // Return data for notifications
        return { campName: campData.name, enrollmentId: cadetData.enrollmentId };
    }).then(({ campName, enrollmentId }) => {
        if (enrollmentId) {
            sendPushToUser(enrollmentId, '🏆 Camp Achievement', `Congratulations! You received an award: "${achievementText}" at ${campName}.`);
        }
    });
};

export const removeCampAchievement = async (campId, cadetId, achievementText) => {
    const campRef = doc(getCollectionRef('camps'), campId);
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);

    return runTransaction(db, async (transaction) => {
        const campDoc = await transaction.get(campRef);
        const cadetDoc = await transaction.get(cadetRef);
        
        if (!campDoc.exists() || !cadetDoc.exists()) throw new Error("Data not found");
        
        // Remove from camp roster
        const campData = campDoc.data();
        const roster = campData.roster || [];
        const rosterIndex = roster.findIndex(c => c.cadetId === cadetId);
        if (rosterIndex >= 0 && roster[rosterIndex].achievements) {
            roster[rosterIndex].achievements = roster[rosterIndex].achievements.filter(a => a !== achievementText);
            transaction.update(campRef, { roster });
        }

        // Remove from cadet history
        const cadetData = cadetDoc.data();
        const campHistory = cadetData.campHistory || [];
        const histIndex = campHistory.findIndex(c => c.campId === campId);
        if (histIndex >= 0 && campHistory[histIndex].achievements) {
            campHistory[histIndex].achievements = campHistory[histIndex].achievements.filter(a => a !== achievementText);
            transaction.update(cadetRef, { campHistory });
        }
    });
};

export const updateCampAchievement = async (campId, cadetId, oldText, newText) => {
    const campRef = doc(getCollectionRef('camps'), campId);
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);

    return runTransaction(db, async (transaction) => {
        const campDoc = await transaction.get(campRef);
        const cadetDoc = await transaction.get(cadetRef);
        
        if (!campDoc.exists() || !cadetDoc.exists()) throw new Error("Data not found");
        
        // Update in camp roster
        const campData = campDoc.data();
        const roster = campData.roster || [];
        const rosterIndex = roster.findIndex(c => c.cadetId === cadetId);
        if (rosterIndex >= 0 && roster[rosterIndex].achievements) {
            const achIndex = roster[rosterIndex].achievements.indexOf(oldText);
            if (achIndex >= 0) {
                roster[rosterIndex].achievements[achIndex] = newText;
            }
            transaction.update(campRef, { roster });
        }

        // Update in cadet history
        const cadetData = cadetDoc.data();
        const campHistory = cadetData.campHistory || [];
        const histIndex = campHistory.findIndex(c => c.campId === campId);
        if (histIndex >= 0 && campHistory[histIndex].achievements) {
            const achIndex = campHistory[histIndex].achievements.indexOf(oldText);
            if (achIndex >= 0) {
                campHistory[histIndex].achievements[achIndex] = newText;
            }
            transaction.update(cadetRef, { campHistory });
        }
    });
};

export const addCampAchievementsBulk = async (campId, cadetIds, achievementText) => {
    const campRef = doc(getCollectionRef('camps'), campId);

    return runTransaction(db, async (transaction) => {
        // Read Phase
        const campDoc = await transaction.get(campRef);
        if (!campDoc.exists()) throw new Error("Camp not found");
        
        const cadetRefs = cadetIds.map(id => doc(getCollectionRef('cadets'), id));
        const cadetDocs = await Promise.all(cadetRefs.map(ref => transaction.get(ref)));

        // Write Phase
        const campData = campDoc.data();
        const roster = campData.roster || [];
        
        cadetIds.forEach(cadetId => {
            const rosterIndex = roster.findIndex(c => c.cadetId === cadetId);
            if (rosterIndex >= 0) {
                if (!roster[rosterIndex].achievements) roster[rosterIndex].achievements = [];
                if (!roster[rosterIndex].achievements.includes(achievementText)) {
                    roster[rosterIndex].achievements.push(achievementText);
                }
            }
        });
        transaction.update(campRef, { roster });

        cadetDocs.forEach(cadetDocSnap => {
            if(cadetDocSnap.exists()) {
                const cadetData = cadetDocSnap.data();
                const campHistory = cadetData.campHistory || [];
                const histIndex = campHistory.findIndex(c => c.campId === campId);
                
                if (histIndex >= 0) {
                    if (!campHistory[histIndex].achievements) campHistory[histIndex].achievements = [];
                    if (!campHistory[histIndex].achievements.includes(achievementText)) {
                        campHistory[histIndex].achievements.push(achievementText);
                    }
                    transaction.update(cadetDocSnap.ref, { campHistory });
                }
            }
        });

        // Return data for notifications
        return { 
            campName: campData.name, 
            enrollmentIds: cadetDocs.filter(d => d.exists()).map(d => d.data().enrollmentId).filter(Boolean) 
        };
    }).then(({ campName, enrollmentIds }) => {
        enrollmentIds.forEach(enrollmentId => {
            sendPushToUser(enrollmentId, '🏆 Camp Achievement', `Congratulations! You received an award: "${achievementText}" at ${campName}.`);
        });
    });
};

// ------------------------------
// --- Training Module (Phase 3) ---
// ------------------------------

export const saveMaterial = async (data, id = null) => {
    const ref = getCollectionRef('materials');
    if (!ref) throw new Error('Database not ready.');

    const payload = { ...data };

    if (id) {
        payload.updatedAt = serverTimestamp();
        await updateDoc(doc(ref, id), payload);
    } else {
        payload.createdAt = serverTimestamp();
        await addDoc(ref, payload);
    }
};

export const saveQuiz = async (data, id = null) => {
    const ref = getCollectionRef('quizzes');
    if (!ref) throw new Error('Database not ready.');

    const payload = { ...data };

    if (id) {
        payload.updatedAt = serverTimestamp();
        await updateDoc(doc(ref, id), payload);
    } else {
        payload.createdAt = serverTimestamp();
        payload.institutionId = await getCurrentUserInstitution();
        await addDoc(ref, payload);
    }
};
// ------------------------------
// --- Social Activity Gallery ---
// ------------------------------

export const addImageToSocialActivity = async (activityId, imageUrl) => {
    if (!imageUrl || !imageUrl.startsWith('http')) {
        throw new Error('Please enter a valid link (starting with http:// or https://).');
    }
    const activityRef = doc(getCollectionRef('social_activities'), activityId);
    await updateDoc(activityRef, {
        imageUrls: arrayUnion(imageUrl),
        updatedAt: serverTimestamp(),
    });
};

export const deleteImageFromSocialActivity = async (activityId, imageUrl) => {
    const activityRef = doc(getCollectionRef('social_activities'), activityId);
    await updateDoc(activityRef, {
        imageUrls: arrayRemove(imageUrl),
        updatedAt: serverTimestamp(),
    });
};



// ------------------------------
// --- RANK PROMOTION ENGINE ---
// ------------------------------

export const updateCadetRank = async (cadetId, newRank, reason = 'Promotion') => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const cadetDocRef = doc(ref, cadetId);

    try {
        const cadetDoc = await getDoc(cadetDocRef);
        if (!cadetDoc.exists()) throw new Error("Cadet not found");

        const data = cadetDoc.data();
        const rankHistory = Array.isArray(data.rankHistory) ? [...data.rankHistory] : [];

        // Add current rank to history before changing if first time
        if (rankHistory.length === 0 && data.rank) {
            rankHistory.push({
                rank: data.rank,
                date: data.createdAt || Timestamp.now(),
                reason: 'Initial Entry'
            });
        }

        rankHistory.push({
            rank: newRank,
            date: Timestamp.now(),
            reason: reason || 'Merit-based promotion'
        });

        await updateDoc(cadetDocRef, {
            rank: newRank,
            rankHistory,
            updatedAt: serverTimestamp()
        });
        return true;
    } catch (err) {
        console.warn('Primary updateCadetRank failed, attempting direct update fallback:', err);
        try {
            await updateDoc(cadetDocRef, {
                rank: newRank,
                updatedAt: serverTimestamp()
            });
            return true;
        } catch (fallbackErr) {
            console.error('Fallback updateCadetRank failed:', fallbackErr);
            throw new Error(err.message || 'Promotion update failed.');
        }
    }
};

// ------------------------------------
// --- PHASE 8: ALUMNI & CAREER HUB ---
// ------------------------------------

export const transitionCadetsToAlumni = async (cadetIds) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const batch = writeBatch(db);
    const timestamp = serverTimestamp();

    cadetIds.forEach(id => {
        const docRef = doc(ref, id);
        batch.update(docRef, {
            status: 'alumni',
            updatedAt: timestamp
        });
    });

    await batch.commit();
};

export const toggleHallOfFame = async (cadetId, isHallOfFame, details = null) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');
    const updateData = { isHallOfFame, updatedAt: serverTimestamp() };
    if (details) {
        updateData.hallOfFameDetails = details;
    }
    await updateDoc(doc(ref, cadetId), updateData);
};

export const saveCareerNotice = async (data, id = null) => {
    const ref = getCollectionRef('career_notices');
    if (!ref) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();
    const payload = {
        title: data.title,
        description: data.description,
        link: data.link || '',
        category: data.category || 'SSB Prep',
        institutionId,
        updatedAt: serverTimestamp(),
    };

    if (id) {
        await updateDoc(doc(ref, id), payload);
    } else {
        payload.createdAt = serverTimestamp();
        await addDoc(ref, payload);
    }
};

export const deleteCareerNotice = async (id) => {
    const ref = getCollectionRef('career_notices');
    if (!ref) throw new Error('Database not ready.');
    await deleteDoc(doc(ref, id));
};
// --- MERIT & DISCIPLINE ---
export const updateCadetPoints = async (cadetId, type, amount, reason) => {
    const cadetRef = doc(getCollectionRef('cadets'), cadetId);
    const field = type === 'merit' ? 'meritPoints' : 'demeritPoints';
    
    await updateDoc(cadetRef, {
        [field]: (amount || 0),
        [`${field}Reason`]: reason || '',
        pointHistory: arrayUnion({
            type,
            amount,
            reason: reason || 'Routine update',
            date: new Date().toISOString()
        }),
        updatedAt: serverTimestamp()
    });
};

// --- RESOURCE LIBRARY ---
export const addResource = async (resourceData) => {
    const ref = getCollectionRef('resources');
    if (!ref) throw new Error('Database not ready.');
    await addDoc(ref, {
        ...resourceData,
        createdAt: serverTimestamp()
    });
    
    // Notify all cadets about the new study material
    try {
        sendPushToAll('📚 New Study Material', `A new manual "${resourceData.title}" has been uploaded to the library.`);
    } catch (e) { console.error("Failed to send push notification", e); }
};

export const deleteResource = async (id) => {
    const ref = getCollectionRef('resources');
    if (!ref) throw new Error('Database not ready.');
    await deleteDoc(doc(ref, id));
};

// --- AUTOMATED MERITS ---
export const awardMonthlyMerits = async (attendees) => {
    // attendees is an array of {cadetId, percentage}
    const ref = getCollectionRef('cadets');
    if (!ref) return;

    const batch = writeBatch(db);
    let count = 0;

    for (const entry of attendees) {
        if (entry.percentage === 100) {
            const cadetRef = doc(ref, entry.cadetId);
            batch.update(cadetRef, {
                meritPoints: increment(10),
                updatedAt: serverTimestamp()
            });
            count++;
        }
    }

    if (count > 0) await batch.commit();
    return count;
};

// --- EXAM ENGINE & MANAGEMENT (REFINED) ---
export const saveExamSettings = async (settings) => {
    const ref = getCollectionRef('settings');
    if (!ref) return;
    const docRef = doc(ref, 'exam_config');
    await setDoc(docRef, { 
        ...settings, 
        updatedAt: serverTimestamp() 
    }, { merge: true });
};

export const getExamSettings = async () => {
    const ref = getCollectionRef('settings');
    if (!ref) return { timer: 15, questionLimit: 10, negativeMarking: false, examTitle: 'General Knowledge' };
    const docRef = doc(ref, 'exam_config');
    const snap = await getDoc(docRef);
    return snap.exists() ? snap.data() : { timer: 15, questionLimit: 10, negativeMarking: false, examTitle: 'General Knowledge' };
};

// --- MULTI-TOPIC EXAM ENGINE ---

export const getExams = async () => {
    const ref = getCollectionRef('exams');
    if (!ref) return [];
    const snap = await getDocs(query(ref, orderBy('createdAt', 'desc')));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const createExam = async (examData) => {
    const ref = getCollectionRef('exams');
    if (!ref) return null;
    const docRef = await addDoc(ref, {
        ...examData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    });
    return docRef.id;
};

export const updateExam = async (id, examData) => {
    const ref = getCollectionRef('exams');
    if (!ref) return;
    await updateDoc(doc(ref, id), {
        ...examData,
        updatedAt: serverTimestamp()
    });
};

export const deleteExam = async (id) => {
    const ref = getCollectionRef('exams');
    if (!ref) return;
    await deleteDoc(doc(ref, id));
};

export const addExamQuestion = async (question, examId = null) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    await addDoc(ref, { 
        ...question, 
        examId: examId || 'legacy',
        createdAt: serverTimestamp() 
    });
};

export const addMultipleQuestions = async (questions, examId = null) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    const batch = writeBatch(db);
    questions.forEach(q => {
        const docRef = doc(ref);
        batch.set(docRef, {
            ...q,
            examId: examId || 'legacy',
            createdAt: serverTimestamp()
        });
    });
    await batch.commit();
};

export const bulkDeleteQuestions = async () => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    const q = query(ref);
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};

export const deleteExamQuestion = async (id) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    await deleteDoc(doc(ref, id));
};

export const deleteMultipleQuestions = async (ids) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    const batch = writeBatch(db);
    ids.forEach(id => {
        batch.delete(doc(ref, id));
    });
    await batch.commit();
};

export const updateExamQuestion = async (id, data) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    await updateDoc(doc(ref, id), data);
};

export const submitExamAttempt = async (attemptData) => {
    const ref = getCollectionRef('quiz_attempts');
    if (!ref) return;

    // Clean data to prevent Firebase "Unsupported field value: undefined" errors
    const cleanData = JSON.parse(JSON.stringify(attemptData));

    try {
        await addDoc(ref, { 
            ...cleanData, 
            timestamp: serverTimestamp() 
        });
    } catch (err) {
        console.error("Failed to save to quiz_attempts:", err);
        toast.error(`Database Error: ${err.message}`);
    }

    // Fallback: Also save to cadet's examHistory
    try {
        const cadetsRef = getCollectionRef('cadets');
        const qry = query(cadetsRef, where("enrollmentId", "==", cleanData.cadetId));
        const snap = await getDocs(qry);
        if (!snap.empty) {
            const cadetDoc = snap.docs[0];
            await updateDoc(cadetDoc.ref, {
                examHistory: arrayUnion({
                    quizId: 'examEngine',
                    title: cleanData.examTitle || 'General Knowledge',
                    score: cleanData.score || 0,
                    maxScore: cleanData.totalPossible || 0,
                    date: new Date().toISOString()
                })
            });
        } else {
             // Fallback to uid match
             const docRef = doc(cadetsRef, cleanData.cadetId);
             const docSnap = await getDoc(docRef);
             if (docSnap.exists()) {
                  await updateDoc(docRef, {
                      examHistory: arrayUnion({
                          quizId: 'examEngine',
                          title: cleanData.examTitle || 'General Knowledge',
                          score: cleanData.score || 0,
                          maxScore: cleanData.totalPossible || 0,
                          date: new Date().toISOString()
                      })
                  });
             }
        }
    } catch (err) {
        console.error("Failed to update cadet examHistory:", err);
        toast.error(`Fallback Error: ${err.message}`);
    }
};

export const getUserExamAttempt = async (cadetId, examTitle) => {
    const ref = getCollectionRef('quiz_attempts');
    if (!ref) return null;
    const qry = query(ref, where("cadetId", "==", cadetId), where("examTitle", "==", examTitle || 'General Knowledge'));
    const snap = await getDocs(qry);
    if (!snap.empty) {
        const doc = snap.docs[0];
        return { id: doc.id, ...doc.data() };
    }
    return null;
};

export const getExamAttempts = async (cert = 'All', div = 'All', examTitle = null) => {
    const ref = getCollectionRef('quiz_attempts');
    if (!ref) return [];
    let qry = query(ref);
    if (examTitle) {
        qry = query(ref, where("examTitle", "==", examTitle));
    }
    const snap = await getDocs(qry);
    let attempts = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    
    if (cert !== 'All') attempts = attempts.filter(a => a.certificate === cert);
    if (div !== 'All') attempts = attempts.filter(a => a.division === div);
    
    return attempts;
};

export const deleteExamAttempt = async (id) => {
    const ref = getCollectionRef('quiz_attempts');
    if (!ref) return;
    await deleteDoc(doc(ref, id));
};

export const getQuizQuestions = async (examId = null) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return [];
    
    let qry = query(ref);
    if (examId) {
        qry = query(ref, where("examId", "==", examId));
    }
    
    const snap = await getDocs(qry);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

export const bulkAddQuizQuestions = async (questions) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) throw new Error('Database not ready');
    const batch = writeBatch(db);
    let count = 0;
    
    questions.forEach(q => {
        const docRef = doc(ref);
        batch.set(docRef, {
            ...q,
            createdAt: serverTimestamp()
        });
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }
    return count;
};

// ------------------------------------
// --- GRIEVANCE REDRESSAL SYSTEM ---
// ------------------------------------

/**
 * Submits a new grievance/issue from a cadet.
 */
export const submitGrievance = async (cadetId, cadetName, enrollmentId, subject, message, anonymous = false, institutionId = null) => {
    const ref = getCollectionRef('grievances');
    if (!ref) throw new Error('Database not ready.');

    const finalInstitutionId = institutionId || await getCurrentUserInstitution();

    await addDoc(ref, {
        cadetId,
        cadetName: anonymous ? 'Anonymous Cadet' : cadetName,
        enrollmentId: anonymous ? 'CONFIDENTIAL' : enrollmentId,
        subject,
        message,
        anonymous,
        status: 'Pending', // Pending, Reviewed, Resolved, Escalated
        priority: 'Normal', // Normal, High, Critical
        responses: [],
        institutionId: finalInstitutionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    });

    // Notify Admins & Senior Ranks
    await addDoc(getCollectionRef('notifications'), {
        subject: 'New Grievance Logged',
        message: `${anonymous ? 'A cadet' : cadetName} has reported a new issue: "${subject}"`,
        target: 'All', // Admin/Senior ranks see all broadcasts
        sender: 'Welfare System',
        timestamp: new Date().toISOString(),
        type: 'grievance'
    });
};

/**
 * Updates grievance status or adds a response (Admin/Senior only).
 */
export const updateGrievanceStatus = async (grievanceId, updates) => {
    const ref = doc(getCollectionRef('grievances'), grievanceId);
    await updateDoc(ref, {
        ...updates,
        updatedAt: serverTimestamp()
    });
};

export const addGrievanceResponse = async (grievanceId, responderName, responderRank, responseText, responderId) => {
    const ref = doc(getCollectionRef('grievances'), grievanceId);
    await updateDoc(ref, {
        responses: arrayUnion({
            responderName,
            responderRank,
            responseText,
            responderId,
            timestamp: new Date().toISOString()
        }),
        status: 'Reviewed',
        updatedAt: serverTimestamp()
    });

    // Notify the reporting cadet
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const grievance = snap.data();
        await addDoc(getCollectionRef('notifications'), {
            subject: 'Grievance Update',
            message: `A response has been added to your ticket: "${grievance.subject}"`,
            target: 'All', // Using broad target, but dashboard logic filters for relevant info
            sender: responderName,
            timestamp: new Date().toISOString(),
            grievanceId: grievanceId,
            targetCadetId: grievance.cadetId // Custom field for client-side filtering if needed
        });
    }
};
export const deleteGrievance = async (grievanceId) => {
    const ref = doc(getCollectionRef('grievances'), grievanceId);
    await deleteDoc(ref);
};

export const unsendGrievanceResponse = async (grievanceId, responseIndex) => {
    const ref = doc(getCollectionRef('grievances'), grievanceId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const responses = snap.data().responses || [];
        responses.splice(responseIndex, 1);
        await updateDoc(ref, {
            responses: responses,
            updatedAt: serverTimestamp()
        });
    }
};

export const editGrievanceResponse = async (grievanceId, responseIndex, newText) => {
    const ref = doc(getCollectionRef('grievances'), grievanceId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const responses = snap.data().responses || [];
        if (responses[responseIndex]) {
            responses[responseIndex].responseText = newText;
            responses[responseIndex].edited = true;
            responses[responseIndex].editedAt = new Date().toISOString();
            await updateDoc(ref, {
                responses: responses,
                updatedAt: serverTimestamp()
            });
        }
    }
};

export const editGrievanceInitialMessage = async (grievanceId, newText) => {
    const ref = doc(getCollectionRef('grievances'), grievanceId);
    await updateDoc(ref, {
        message: newText,
        edited: true,
        updatedAt: serverTimestamp()
    });
};

// --- TUTORIALS & FEEDBACK ---
export const addTutorial = async (data) => {
    const ref = getCollectionRef('tutorials');
    const institutionId = await getCurrentUserInstitution();
    await addDoc(ref, {
        ...data,
        institutionId,
        createdAt: serverTimestamp()
    });
    
    // Notify all cadets about the new video tutorial
    try {
        sendPushToAll('▶️ New Video Tutorial', `A new tutorial "${data.title}" is now available in the library.`);
    } catch (e) {
        console.error(e);
    }
};

export const submitFeedback = async (data) => {
    const ref = getCollectionRef('feedback');
    const institutionId = await getCurrentUserInstitution();
    await addDoc(ref, {
        ...data,
        institutionId,
        createdAt: serverTimestamp()
    });
};

export const toggleBookmark = async (userId, tutorialId, isBookmarked) => {
    const ref = doc(getCollectionRef('users'), userId);
    await updateDoc(ref, {
        bookmarks: isBookmarked ? arrayRemove(tutorialId) : arrayUnion(tutorialId)
    });
};

export const addToWatchHistory = async (userId, tutorialId) => {
    const ref = doc(getCollectionRef('users'), userId);
    await updateDoc(ref, {
        watchHistory: arrayUnion({
            tutorialId,
            timestamp: new Date().toISOString()
        })
    });
};

export const updateKitSizes = async (cadetId, sizes) => {
    const ref = doc(getCollectionRef('cadets'), cadetId);
    await updateDoc(ref, {
        kitSizes: sizes,
        updatedAt: serverTimestamp()
    });
};


export const submitPFTScores = async (cadetId, scores) => {
    const ref = doc(getCollectionRef('cadets'), cadetId);
    await updateDoc(ref, {
        pftHistory: arrayUnion({
            ...scores,
            timestamp: new Date().toISOString()
        })
    });
};

export const addJobOpportunity = async (jobData) => {
    const jobsRef = getCollectionRef('jobs');
    return await addDoc(jobsRef, {
        ...jobData,
        createdAt: new Date().toISOString()
    });
};

export const updateJobOpportunity = async (jobId, jobData) => {
    const ref = doc(getCollectionRef('jobs'), jobId);
    await updateDoc(ref, {
        ...jobData,
        updatedAt: new Date().toISOString()
    });
};

export const deleteJobOpportunity = async (jobId) => {
    const ref = doc(getCollectionRef('jobs'), jobId);
    await deleteDoc(ref);
};

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY & COMPLIANCE
// ─────────────────────────────────────────────────────────────────────────────

// ── Audit Trail ──────────────────────────────────────────────────────────────

/**
 * Log an admin action to the audit_logs collection.
 * Call this whenever an admin creates, updates, or deletes data.
 */
export const logAuditEvent = async ({ action, collection: col, docId = null, summary = '', adminUid, adminEmail }) => {
    try {
        const ref = getCollectionRef('audit_logs');
        if (!ref) return;
        await addDoc(ref, {
            action,           // 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'OTP_SENT' | 'OTP_VERIFIED'
            collection: col,  // e.g. 'cadets', 'events', etc.
            docId,
            summary,          // Human-readable description of what changed
            adminUid: adminUid || null,
            adminEmail: adminEmail || null,
            timestamp: serverTimestamp(),
            timestampISO: new Date().toISOString(),
        });
    } catch (e) {
        console.warn('Audit log failed (non-critical):', e.message);
    }
};

/**
 * Fetch audit logs with optional filters.
 */
export const getAuditLogs = async ({ limitCount = 100, filterAction = null, filterCollection = null } = {}) => {
    const ref = getCollectionRef('audit_logs');
    if (!ref) return [];
    const { orderBy: fsOrderBy, limit: fsLimit, query: fsQuery, getDocs: fsGetDocs } = await import('firebase/firestore');
    let q = fsQuery(ref, fsOrderBy('timestamp', 'desc'), fsLimit(limitCount));
    const snap = await getDocs(q);
    let logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (filterAction) logs = logs.filter(l => l.action === filterAction);
    if (filterCollection) logs = logs.filter(l => l.collection === filterCollection);
    return logs;
};

// ── Session Manager ───────────────────────────────────────────────────────────

/**
 * Register a new session when a user logs in.
 * Returns the new session document ID.
 */
export const registerSession = async ({ uid, role, email }) => {
    try {
        const ref = getCollectionRef('sessions');
        if (!ref) return null;
        const sessionDoc = await addDoc(ref, {
            uid,
            role,
            email,
            loginAt: serverTimestamp(),
            loginAtISO: new Date().toISOString(),
            lastSeen: serverTimestamp(),
            lastSeenISO: new Date().toISOString(),
            userAgent: navigator.userAgent,
            isActive: true,
        });
        return sessionDoc.id;
    } catch (e) {
        console.warn('Session registration failed (non-critical):', e.message);
        return null;
    }
};

/**
 * Heartbeat — update lastSeen for the current session.
 */
export const updateSessionActivity = async (sessionId) => {
    try {
        if (!sessionId) return;
        const ref = getCollectionRef('sessions');
        if (!ref) return;
        await updateDoc(doc(ref, sessionId), {
            lastSeen: serverTimestamp(),
            lastSeenISO: new Date().toISOString(),
        });
    } catch (e) {
        // Silent — heartbeat failures are non-critical
    }
};

/**
 * Mark a session as inactive (logout or force-terminate).
 */
export const terminateSession = async (sessionId) => {
    try {
        if (!sessionId) return;
        const ref = getCollectionRef('sessions');
        if (!ref) return;
        await updateDoc(doc(ref, sessionId), {
            isActive: false,
            logoutAt: serverTimestamp(),
            logoutAtISO: new Date().toISOString(),
        });
    } catch (e) {
        console.warn('Session termination failed:', e.message);
    }
};

/**
 * Get all active sessions (admin view).
 */
export const getActiveSessions = async () => {
    const ref = getCollectionRef('sessions');
    if (!ref) return [];
    const q = query(ref, where('isActive', '==', true));
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};

/**
 * Get all sessions (including inactive) for admin audit.
 */
export const getAllSessions = async (limitCount = 50) => {
    const ref = getCollectionRef('sessions');
    if (!ref) return [];
    const snap = await getDocs(ref);
    return snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.loginAtISO || '').localeCompare(a.loginAtISO || ''))
        .slice(0, limitCount);
};

// ── OTP 2FA & Biometric Authentication ────────────────────────────────────
// Using the users collection for OTP / Biometric session storage because security rules
// allow user writes to their own user profile document.

export const generateUserOTP = async (userUid, email, targetDb = null) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    try {
        const firestoreInstance = targetDb || db;
        const userRef = doc(firestoreInstance, 'artifacts', appId, 'public', 'data', 'users', userUid);
        await setDoc(userRef, {
            email: email,
            otpCode: otp,
            otpExpiresAt: expiresAt.toISOString(),
            updatedAt: serverTimestamp()
        }, { merge: true });
        return otp;
    } catch (error) {
        console.error("OTP Generation Error:", error);
        throw new Error("Failed to generate OTP: " + error.message);
    }
};

export const verifyUserOTP = async (userUid, inputOtp, targetDb = null) => {
    try {
        const firestoreInstance = targetDb || db;
        const userRef = doc(firestoreInstance, 'artifacts', appId, 'public', 'data', 'users', userUid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) throw new Error("Invalid login session.");

        const data = snap.data();
        if (!data.otpCode || !data.otpExpiresAt) {
            throw new Error("No OTP pending or it has expired.");
        }

        if (new Date(data.otpExpiresAt) < new Date()) {
            throw new Error("OTP code has expired. Please request a new code.");
        }

        if (String(data.otpCode).trim() !== String(inputOtp).trim()) {
            throw new Error("Incorrect 6-digit OTP code. Please check and try again.");
        }

        return true;
    } catch (error) {
        console.error("OTP Verification Error:", error);
        throw error;
    }
};

export const clearUserOTP = async (userUid) => {
    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', userUid);
        await updateDoc(userRef, {
            otpCode: deleteField(),
            otpExpiresAt: deleteField()
        });
    } catch (error) {
        console.error("OTP Clear Error:", error);
    }
};

// Aliases for backward compatibility
export const generateAdminOTP = generateUserOTP;
export const verifyAdminOTP = verifyUserOTP;
export const clearAdminOTP = clearUserOTP;

// ── ANO Biometric Fingerprint Session Helpers ──
export const generateAnoBiometricSession = async (anoUid) => {
    const challenge = `bio_challenge_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', anoUid);
        await updateDoc(userRef, {
            biometricChallenge: challenge,
            biometricExpiresAt: expiresAt.toISOString()
        });
        return challenge;
    } catch (error) {
        console.error("Biometric Session Generation Error:", error);
        throw new Error("Failed to initialize biometric verification session.");
    }
};

export const verifyAnoBiometricSession = async (anoUid) => {
    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', anoUid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) throw new Error("Invalid ANO session.");

        const data = snap.data();
        if (!data.biometricChallenge || !data.biometricExpiresAt) {
            throw new Error("Biometric session expired or invalid.");
        }

        if (new Date(data.biometricExpiresAt) < new Date()) {
            throw new Error("Biometric authentication timed out.");
        }

        return true;
    } catch (error) {
        console.error("Biometric Verification Error:", error);
        throw error;
    }
};

export const clearAnoBiometricSession = async (anoUid) => {
    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', anoUid);
        await updateDoc(userRef, {
            biometricChallenge: deleteField(),
            biometricExpiresAt: deleteField()
        });
    } catch (error) {
        console.error("Biometric Clear Error:", error);
    }
};

// --- Geofenced Attendance ---
export const createPendingAttendance = async (cadetId, cadetName, enrollmentId, adminLocation, sessionStatus = 'Present') => {
    const ref = getCollectionRef('pending_attendance');
    if (!ref) throw new Error('Database not ready.');
    return await addDoc(ref, {
        cadetId,
        cadetName,
        enrollmentId,
        adminLocation, // { latitude, longitude }
        status: 'pending',
        // sessionStatus: 'Present' (within window) | 'Late' (after window closed) | 'Present' (no window set)
        sessionStatus,
        createdAt: serverTimestamp(),
        institutionId: await getCurrentUserInstitution()
    });
};

export const verifyCadetAttendance = async (pendingDocId, cadetLocation) => {
    const ref = getCollectionRef('pending_attendance');
    const pendingDocRef = doc(ref, pendingDocId);
    await updateDoc(pendingDocRef, {
        cadetLocation,
        status: 'verified',
        verifiedAt: serverTimestamp()
    });
};

// --- Mentorship ---
export const submitMentorshipRequest = async (
    cadetId,
    cadetName,
    enrollmentId,
    contactInfo,
    message = '',
    targetMentorId = null,
    targetMentorName = null,
    targetMentorEmail = null
) => {
    const ref = getCollectionRef('mentorship_requests');
    if (!ref) throw new Error('Database not ready.');

    const payload = {
        cadetId: cadetId || null,
        cadetName: cadetName || 'Unknown User',
        enrollmentId: enrollmentId || 'N/A',
        contactInfo: contactInfo || 'No contact provided',
        message: message || '',
        targetMentorId: targetMentorId || null,
        targetMentorName: targetMentorName || 'Any Available Mentor',
        targetMentorEmail: targetMentorEmail || null,
        status: 'pending', // pending, assigned, completed
        createdAt: serverTimestamp(),
        institutionId: await getCurrentUserInstitution()
    };

    const docSnap = await addDoc(ref, payload);

    // Notify targeted mentor and unit command
    try {
        const notifRef = getCollectionRef('notifications');
        if (notifRef) {
            await addDoc(notifRef, {
                subject: `🤝 Mentorship Request: ${cadetName || 'Cadet'}`,
                message: `${cadetName || 'Cadet'} (${enrollmentId || 'N/A'}) requested mentorship${targetMentorName ? ` from ${targetMentorName}` : ''}. Contact: ${contactInfo}. Note: "${message || 'Guidance requested'}"`,
                target: targetMentorId || 'All',
                targetUserId: targetMentorId || null,
                sender: cadetName || 'Cadet',
                timestamp: new Date().toISOString(),
                type: 'mentorship'
            });
        }

        if (targetMentorId) {
            sendPushToUser(targetMentorId, '🤝 New Mentorship Request', `${cadetName} requested mentorship with you!`, 'alumni');
        }
    } catch (err) {
        console.warn('Mentorship notification failure (non-critical):', err);
    }

    return docSnap.id;
};

export const updateMentorshipStatus = async (requestId, status, assignedMentorId = null) => {
    const ref = getCollectionRef('mentorship_requests');
    if (!ref) throw new Error('Database not ready.');
    const data = { status, updatedAt: serverTimestamp() };
    if (assignedMentorId) data.assignedMentorId = assignedMentorId;
    await updateDoc(doc(ref, requestId), data);
};

// --- BULK ADD RESULTS ---
export const bulkAddResults = async (resultsData, institutionId) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    if (!institutionId) {
        throw new Error('College/Institution ID is required.');
    }

    // Fetch cadets for this institution
    const q = query(ref, where('institutionId', '==', institutionId));
    const snapshot = await getDocs(q);
    
    // Map enrollmentId (case-insensitive & trimmed) to cadet doc and existing certifications
    const cadetMap = new Map(
        snapshot.docs.map((d) => {
            const data = d.data();
            return [(data.enrollmentId || '').toString().trim().toUpperCase(), { ref: d.ref, data }];
        })
    );

    const batch = writeBatch(db);
    let updatedCount = 0;
    let skippedCount = 0;

    for (const row of resultsData) {
        try {
            const getField = (keys) => {
                for (const key of keys) {
                    if (row[key] !== undefined && row[key] !== null) return row[key].toString().trim();
                    if (row[key.toLowerCase()] !== undefined) return row[key.toLowerCase()].toString().trim();
                    if (row[key.toUpperCase()] !== undefined) return row[key.toUpperCase()].toString().trim();
                }
                return '';
            };

            const enrollmentId = getField(['Regimental Number', 'Regimental No', 'enrollmentId', 'regimental number', 'reg no']);
            const certRaw = getField(['Certificate', 'cert', 'certLevel', 'level']);
            const yearRaw = getField(['Year', 'exam year', 'year']);
            const theoryMarksRaw = getField(['Theory Marks', 'theory', 'theoryMarks']);
            const theoryMaxRaw = getField(['Theory Max', 'theoryMax']);
            const practicalMarksRaw = getField(['Practical Marks', 'practical', 'practicalMarks']);
            const practicalMaxRaw = getField(['Practical Max', 'practicalMax']);
            const bonusMarksRaw = getField(['Bonus Marks', 'bonus', 'bonusMarks']);

            if (!enrollmentId || !certRaw || !theoryMarksRaw || !practicalMarksRaw) {
                skippedCount++;
                continue;
            }

            const cadetObj = cadetMap.get(enrollmentId.toUpperCase());
            if (!cadetObj) {
                skippedCount++; // Cadet not found in this college
                continue;
            }

            // Parse values
            const certLevel = certRaw.toUpperCase().includes('C') ? 'C' : 'B';
            const year = yearRaw || new Date().getFullYear().toString();
            const theoryMarks = parseInt(theoryMarksRaw) || 0;
            const theoryMax = parseInt(theoryMaxRaw) || 350;
            const practicalMarks = parseInt(practicalMarksRaw) || 0;
            const practicalMax = parseInt(practicalMaxRaw) || 150;
            const bonusMarks = parseInt(bonusMarksRaw) || 0;

            // Compute Grade
            const tPercent = (theoryMarks / theoryMax) * 100;
            const pPercent = (practicalMarks / practicalMax) * 100;
            const totalScored = theoryMarks + practicalMarks + bonusMarks;
            const totalMax = theoryMax + practicalMax;
            const aggPercent = (totalScored / totalMax) * 100;

            let finalGrade = 'Fail';
            if (tPercent < 45 || pPercent < 45 || aggPercent < 50) {
                finalGrade = 'Fail';
            } else if (aggPercent >= 80) {
                finalGrade = 'A';
            } else if (aggPercent >= 65) {
                finalGrade = 'B';
            } else if (aggPercent >= 50) {
                finalGrade = 'C';
            }

            const newCert = {
                id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9),
                type: 'certificate',
                certLevel: certLevel + ' Certificate',
                year,
                theoryMarks,
                theoryMax,
                practicalMarks,
                practicalMax,
                bonusMarks,
                totalScore: totalScored,
                totalMax,
                finalGrade,
                dateAdded: new Date().toISOString(),
                dateModified: new Date().toISOString()
            };

            let currentCerts = cadetObj.data.certifications || [];
            // Remove existing certificate of same level if present
            currentCerts = currentCerts.filter(c => c.certLevel !== newCert.certLevel);
            currentCerts.push(newCert);

            batch.update(cadetObj.ref, { certifications: currentCerts });
            updatedCount++;
        } catch (e) {
            console.error('Error parsing row:', e);
            skippedCount++;
        }
    }

    if (updatedCount > 0) {
        await batch.commit();
    }

    return { updatedCount, skippedCount };
};

// --- NEW: NCC SELECTION PROCESS / RECRUITMENT ---
export const saveApplicant = async (data, id = null, institutionIdParam = null) => {
    const ref = getCollectionRef('applicants');
    if (!ref) throw new Error('Database not ready.');

    const payload = {
        fullName: data.fullName || '',
        studentId: data.studentId || '',
        email: data.email || '',
        phone: data.phone || '',
        department: data.department || '',
        year: data.year || '1st',
        gender: data.gender || 'SD',
        status: data.status || 'Applied',
        dropoutReason: data.dropoutReason || null,
        physicalStats: {
            height: Number(data.physicalStats?.height) || 0,
            weight: Number(data.physicalStats?.weight) || 0,
            bmi: Number(data.physicalStats?.bmi) || 0,
        },
        trialScores: {
            runTime: data.trialScores?.runTime || '',
            pushups: Number(data.trialScores?.pushups) || 0,
            situps: Number(data.trialScores?.situps) || 0,
            pullups: Number(data.trialScores?.pullups) || 0,
            runWithinLimit: data.trialScores?.runWithinLimit || 'Pending',
        },
        writtenScore: Number(data.writtenScore) || 0,
        interviewScore: Number(data.interviewScore) || 0,
        medicalStatus: data.medicalStatus || 'Pending',
        meritScore: Number(data.meritScore) || 0,
        updatedAt: serverTimestamp(),
    };

    if (id) {
        await updateDoc(doc(ref, id), payload);
    } else {
        const institutionId = institutionIdParam || await getCurrentUserInstitution();
        payload.institutionId = institutionId;
        payload.createdAt = serverTimestamp();
        await addDoc(ref, payload);
    }
};

export const promoteApplicantToCadet = async (applicantId, cadetDetails) => {
    const applicantRef = doc(getCollectionRef('applicants'), applicantId);
    const applicantSnap = await getDoc(applicantRef);
    if (!applicantSnap.exists()) throw new Error('Applicant not found');

    const appData = applicantSnap.data();
    const cadetsRef = getCollectionRef('cadets');

    const payload = {
        name: appData.fullName,
        enrollmentId: cadetDetails.enrollmentId.trim().toUpperCase(),
        jntuNo: appData.studentId || '',
        rank: cadetDetails.rank || 'CDT',
        certificate: cadetDetails.certificate || 'NA',
        fatherName: '',
        motherName: '',
        year: appData.year || '1st',
        branch: appData.department || '',
        aadhaarNumber: '',
        phonePersonal: appData.phone || '',
        phoneParents: '',
        addressPresent: '',
        addressPermanent: '',
        hostelerType: 'Days scholar',
        ecaCca: '',
        dob: '',
        personalEmail: appData.email || '',
        collegeEmail: '',
        bloodGroup: '',
        photoUrl: '',
        enrollmentFee: 0,
        uniformFee: 0,
        campFee: 0,
        feePaid: 0,
        feeDueDate: '',
        institutionId: appData.institutionId,
        status: 'active',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        attendance: {},
    };

    // Add to cadets collection
    await addDoc(cadetsRef, payload);

    // Update applicant status to Approved and store enrollment id
    await updateDoc(applicantRef, {
        status: 'Approved',
        enrolledAs: cadetDetails.enrollmentId.trim().toUpperCase(),
        updatedAt: serverTimestamp()
    });
};

export const submitApplicantList = async (institutionId) => {
    const ref = getCollectionRef('applicants');
    if (!ref) throw new Error('Database not ready.');

    const q = query(ref, where('institutionId', '==', institutionId), where('status', '==', 'Selected'));
    const snap = await getDocs(q);

    if (snap.empty) throw new Error('No selected candidates to submit.');

    const batch = writeBatch(db);
    snap.docs.forEach(docSnap => {
        batch.update(docSnap.ref, {
            status: 'Submitted',
            updatedAt: serverTimestamp()
        });
    });

    await batch.commit();
};

export const dropoutApplicant = async (applicantId, reason) => {
    const ref = doc(getCollectionRef('applicants'), applicantId);
    await updateDoc(ref, {
        status: 'Dropped',
        dropoutReason: reason,
        updatedAt: serverTimestamp()
    });
};

export const approveSubmittedApplicants = async (institutionId, enrollmentList) => {
    const ref = getCollectionRef('applicants');
    const cadetsRef = getCollectionRef('cadets');
    if (!ref || !cadetsRef) throw new Error('Database not ready.');

    const batch = writeBatch(db);

    for (const item of enrollmentList) {
        const applicantRef = doc(ref, item.applicantId);
        const applicantSnap = await getDoc(applicantRef);
        if (!applicantSnap.exists()) continue;

        const appData = applicantSnap.data();

        // Create Cadet Profile
        const newCadetRef = doc(cadetsRef);
        batch.set(newCadetRef, {
            name: appData.fullName,
            enrollmentId: item.enrollmentId.trim().toUpperCase(),
            jntuNo: appData.studentId || '',
            rank: item.rank || 'CDT',
            certificate: item.certificate || 'NA',
            fatherName: '',
            motherName: '',
            year: appData.year || '1st',
            branch: appData.department || '',
            aadhaarNumber: '',
            phonePersonal: appData.phone || '',
            phoneParents: '',
            addressPresent: '',
            addressPermanent: '',
            hostelerType: 'Days scholar',
            ecaCca: '',
            dob: '',
            personalEmail: appData.email || '',
            collegeEmail: '',
            bloodGroup: '',
            photoUrl: '',
            enrollmentFee: 0,
            uniformFee: 0,
            campFee: 0,
            feePaid: 0,
            feeDueDate: '',
            institutionId: appData.institutionId,
            status: 'active',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            attendance: {},
        });

        // Update applicant state
        batch.update(applicantRef, {
            status: 'Approved',
            enrolledAs: item.enrollmentId.trim().toUpperCase(),
            updatedAt: serverTimestamp()
        });
    }

    await batch.commit();
};

export const updateUnitVacancies = async (unitId, count) => {
    const ref = doc(db, 'artifacts', appId, 'public', 'data', 'units', unitId);
    await updateDoc(ref, {
        newVacancies: Number(count),
        updatedAt: serverTimestamp()
    });
};


