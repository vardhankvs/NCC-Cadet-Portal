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
    if (!auth || !auth.currentUser) return 'gmrit';
    try {
        const token = await auth.currentUser.getIdTokenResult();
        return token.claims?.institutionId || 'gmrit';
    } catch (e) {
        console.error('Error fetching institution ID:', e);
        return 'gmrit';
    }
};

// Helper to get collection reference
export const getCollectionRef = (collectionName) => {
    if (!db || !appId) return null;
    return collection(db, 'artifacts', appId, 'public', 'data', collectionName);
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
export const bulkAddCadets = async (cadets) => {
    const ref = getCollectionRef('cadets');
    if (!ref) throw new Error('Database not ready.');

    const snapshot = await getDocs(query(ref));
    const existingIds = new Set(
        snapshot.docs.map((d) => d.data().enrollmentId)
    );

    const batch = writeBatch(db);
    let addedCount = 0;

    const institutionId = await getCurrentUserInstitution();

    for (const cadet of cadets) {
        try {
            const enrollmentId = (
                cadet['Regimental Number'] ||
                cadet['regimental number'] ||
                cadet.enrollmentId ||
                ''
            )
                .toString()
                .trim();

            const name = (cadet.Name || cadet.name || '').toString().trim();

            if (!enrollmentId || !name || existingIds.has(enrollmentId))
                continue;

            const newDocRef = doc(ref);

            const payload = {
                name: name,
                enrollmentId: enrollmentId,
                jntuNo:
                    cadet['JNTU NO'] || cadet['jntu no'] || cadet.jntuNo || '',
                rank: cadet.Rank || cadet.rank || 'CDT',
                certificate:
                    cadet.CERT || cadet.cert || cadet.certificate || 'NA',
                fatherName: cadet['Father Name'] || cadet['father name'] || '',
                motherName: cadet['Mother Name'] || cadet['mother name'] || '',
                year: cadet.Year || cadet.year || '',
                branch: cadet.Branch || cadet.branch || '',
                aadhaarNumber:
                    cadet['Aadhaar Number'] || cadet['aadhaar number'] || '',
                phonePersonal:
                    cadet['Phone number (Personal)'] ||
                    cadet['phone number (personal)'] ||
                    cadet.phonePersonal ||
                    '',
                phoneParents:
                    cadet['Phone Number (Parents)'] ||
                    cadet['phone number (parents)'] ||
                    '',
                addressPresent:
                    cadet['Address (Present)'] ||
                    cadet['address (present)'] ||
                    '',
                addressPermanent:
                    cadet[
                        'Address (Permanent) If both present & Permanent are Same Just Ignore'
                    ] ||
                    cadet[
                        'address (permanent) if both present & permanent are same just ignore'
                    ] ||
                    cadet.addressPermanent ||
                    '',
                hostelerType:
                    cadet['Hosteler / Days scholar'] ||
                    cadet['hosteler / days scholar'] ||
                    'Days scholar',
                ecaCca: cadet['ECA/CCA'] || cadet['eca/cca'] || '',
                dob: cadet['Date of Birth'] || cadet['date of birth'] || '',
                personalEmail:
                    cadet['Email ID (Personal)'] ||
                    cadet['email id (personal)'] ||
                    '',
                collegeEmail:
                    cadet['Email ID (College Mail)'] ||
                    cadet['email id (college mail)'] ||
                    '',
                bloodGroup: cadet['Blood Group'] || cadet['blood group'] || '',
                enrollmentFee: 0,
                uniformFee: 0,
                campFee: 0,
                feePaid: 0,
                feeDueDate: '',
                attendance: {},
                institutionId, // Multi-Tenancy tag
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            batch.set(newDocRef, payload);
            addedCount++;

            if (addedCount % 450 === 0) {
                await batch.commit();
            }
        } catch (err) {
            console.error('Skipping row due to error:', err);
        }
    }

    if (addedCount > 0) {
        await batch.commit();
    }
    return addedCount;
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
export const saveAnnouncement = async (title, content) => {
    const ref = getCollectionRef('announcements');
    if (!ref) throw new Error('Database not ready.');
    const institutionId = await getCurrentUserInstitution();
    const payload = { 
        title, 
        content, 
        institutionId, 
        createdAt: serverTimestamp() 
    };
    await addDoc(ref, payload);
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

    const paymentDocRef = doc(ref, 'payment');

    // We use setDoc with merge: true to create the doc if it doesn't exist
    await setDoc(
        paymentDocRef,
        {
            paymentQRUrl: newUrl,
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
    cadetName
) => {
    const ref = getCollectionRef('transactions');
    if (!ref) throw new Error('Database not ready.');

    const institutionId = await getCurrentUserInstitution();

    await addDoc(ref, {
        cadetId,
        cadetName,
        amount: Number(amount),
        status: 'pending',
        type: 'PhonePe',
        institutionId, // Multi-Tenancy tag
        createdAt: serverTimestamp(),
    });
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

        // 2. Update Cadet Document
        const campHistory = cadetData.campHistory || [];
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
