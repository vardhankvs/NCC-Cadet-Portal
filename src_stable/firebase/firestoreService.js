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
} from 'firebase/firestore';

import {
    ref as storageRef,
    uploadBytesResumable,
    getDownloadURL,
} from 'firebase/storage';

// --- MULTI-TENANCY HELPER ---
export const getCurrentUserInstitution = async () => {
    // Note: needs `auth` from config.js, exporting it below if not imported
    const { auth } = await import('./config.js');
    if (!auth || !auth.currentUser) return '14a-bn-srikakulam';
    try {
        const token = await auth.currentUser.getIdTokenResult();
        return token.claims?.institutionId || '14a-bn-srikakulam';
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
    return total;
};

// ------------------------------
// --- CRUD Operations ---
// ------------------------------

// --- Generic Delete ---
export const deleteItem = async (type, id) => {
    const ref = getCollectionRef(type);
    if (!ref) throw new Error('Database not ready.');
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

        const institutionId = await getCurrentUserInstitution();

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

            const existingRef = existingMap.get(enrollmentId);
            
            if (existingRef) {
                // UPDATE EXISTING CADET
                batch.update(existingRef, payload);
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
                    institutionId,
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
        instances.sort((a, b) => {
            const timeA = a.updatedAt?.toDate?.()?.getTime() || a.createdAt?.toDate?.()?.getTime() || 0;
            const timeB = b.updatedAt?.toDate?.()?.getTime() || b.createdAt?.toDate?.()?.getTime() || 0;
            return timeB - timeA; // Latest first
        });

        const primary = instances[0];

        // Ensure the primary record has the correct institutionId
        if (primary.institutionId !== targetId) {
            batch.update(primary.ref, { institutionId: targetId });
            alignedCount++;
        }

        // Delete all redundant copies
        for (let i = 1; i < instances.length; i++) {
            batch.delete(instances[i].ref);
            removedCount++;
        }
    }

    if (removedCount > 0 || alignedCount > 0) {
        await batch.commit();
    }
    return { removedCount, alignedCount, totalScanned: snapshot.docs.length };
};

export const rescueCadets = async () => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const targetId = await getCurrentUserInstitution();

    const snapshot = await getDocs(ref);
    const batch = writeBatch(db);
    let count = 0;

    snapshot.docs.forEach(docSnap => {
        batch.update(docSnap.ref, { institutionId: targetId });
        count++;
    });

    if (count > 0) {
        await batch.commit();
    }
    return count;
};


// --- Attendance ---
export const recordAttendance = async (cadetId, date, status) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');
    await updateDoc(doc(ref, cadetId), {
        [`attendance.${date}`]: status,
        updatedAt: serverTimestamp(),
    });
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
        payload.institutionId = await getCurrentUserInstitution(); // Multi-Tenancy tag
        await addDoc(ref, payload);
    }
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
export const saveAnnouncement = async (title, content, targetCertificate = 'All', targetDivision = 'All', noticeDate = null, id = null) => {
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
 * Updates the global PhonePe QR Code URL (Admin Only)
 * Saves into: artifacts/[appId]/public/data/settings/payment
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
        updatedAt: serverTimestamp(),
    };

    if (id) {
        await updateDoc(doc(ref, id), payload);
    } else {
        payload.createdAt = serverTimestamp();
        payload.roster = []; // Initialize empty roster
        await addDoc(ref, payload);
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
        
        // Award 5 merit points for camp selection
        const newMeritPoints = (cadetData.meritPoints || 0) + 5;

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
        transaction.update(cadetRef, { 
            campHistory, 
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
        
        cadetsToAdd.forEach(cadet => {
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
             
             // Update the cadet document
             const cadetRef = doc(getCollectionRef('cadets'), cadet.id);
             const campHistory = cadet.campHistory || [];
             const cadetCampIndex = campHistory.findIndex(c => c.campId === campId);
             
             if (cadetCampIndex >= 0) {
                 campHistory[cadetCampIndex].status = status || 'Selected';
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
             transaction.update(cadetRef, { campHistory });
        });
        
        transaction.update(campRef, { roster, updatedAt: serverTimestamp() });
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
            roster[rosterIndex].achievements.push(achievementText);
            transaction.update(campRef, { roster });
        }

        // Add to cadet history
        const cadetData = cadetDoc.data();
        const campHistory = cadetData.campHistory || [];
        const histIndex = campHistory.findIndex(c => c.campId === campId);
        if (histIndex >= 0) {
            if (!campHistory[histIndex].achievements) campHistory[histIndex].achievements = [];
            campHistory[histIndex].achievements.push(achievementText);
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
    
    return runTransaction(db, async (transaction) => {
        const cadetDoc = await transaction.get(cadetDocRef);
        if (!cadetDoc.exists()) throw new Error("Cadet not found");

        const data = cadetDoc.data();
        const rankHistory = data.rankHistory || [];
        
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
            reason: reason
        });

        transaction.update(cadetDocRef, {
            rank: newRank,
            rankHistory,
            updatedAt: serverTimestamp()
        });
    });
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

export const addExamQuestion = async (question) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    await addDoc(ref, { 
        ...question, 
        createdAt: serverTimestamp() 
    });
};

export const addMultipleQuestions = async (questions) => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return;
    const batch = writeBatch(db);
    questions.forEach(q => {
        const docRef = doc(ref);
        batch.set(docRef, {
            ...q,
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
    await addDoc(ref, { 
        ...attemptData, 
        timestamp: serverTimestamp() 
    });
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

export const getQuizQuestions = async () => {
    const ref = getCollectionRef('quiz_questions');
    if (!ref) return [];
    const snap = await getDocs(ref);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
};
// ------------------------------------
// --- GRIEVANCE REDRESSAL SYSTEM ---
// ------------------------------------

/**
 * Submits a new grievance/issue from a cadet.
 */
export const submitGrievance = async (cadetId, cadetName, enrollmentId, subject, message, anonymous = false) => {
    const ref = getCollectionRef('grievances');
    if (!ref) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();

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
        institutionId,
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

export const nominateForCamp = async (campId, cadetData) => {
    const ref = doc(getCollectionRef('camps'), campId);
    await updateDoc(ref, {
        nominations: arrayUnion({
            ...cadetData,
            status: 'Pending',
            appliedAt: new Date().toISOString()
        })
    });
};

export const updateNominationStatus = async (campId, cadetId, status) => {
    const ref = doc(getCollectionRef('camps'), campId);
    const snap = await getDoc(ref);
    if (snap.exists()) {
        const nominations = snap.data().nominations || [];
        const index = nominations.findIndex(n => n.cadetId === cadetId);
        if (index !== -1) {
            nominations[index].status = status;
            nominations[index].updatedAt = new Date().toISOString();
            await updateDoc(ref, { nominations });
        }
    }
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

// ── Admin OTP (2FA) ────────────────────────────────────────────────────────
// Using the users collection for OTP storage because the cloud rules
// strictly block writes to unknown collections like admin_otps.

export const generateAdminOTP = async (adminUid, email) => {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', adminUid);
        await updateDoc(userRef, {
            otpCode: otp,
            otpExpiresAt: expiresAt.toISOString()
        });
        return otp;
    } catch (error) {
        console.error("OTP Generation Error:", error);
        throw new Error("Failed to generate OTP. Check Firestore rules for the users collection.");
    }
};

export const verifyAdminOTP = async (adminUid, inputOtp) => {
    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', adminUid);
        const snap = await getDoc(userRef);

        if (!snap.exists()) throw new Error("Invalid admin session.");

        const data = snap.data();
        if (!data.otpCode || !data.otpExpiresAt) {
            throw new Error("No OTP pending or it has expired.");
        }

        if (new Date(data.otpExpiresAt) < new Date()) {
            throw new Error("OTP has expired.");
        }

        if (data.otpCode !== inputOtp.trim()) {
            throw new Error("Incorrect OTP.");
        }

        return true;
    } catch (error) {
        console.error("OTP Verification Error:", error);
        throw error;
    }
};

export const clearAdminOTP = async (adminUid) => {
    try {
        const userRef = doc(db, 'artifacts', appId, 'public', 'data', 'users', adminUid);
        await updateDoc(userRef, {
            otpCode: deleteField(),
            otpExpiresAt: deleteField()
        });
    } catch (error) {
        console.error("OTP Clear Error:", error);
    }
};

