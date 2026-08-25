import { storage, appId } from './config.js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Uploads a file to Firebase Storage under the current institution's scope.
 * @param {File} file - The file object from input
 * @param {string} path - The subpath under public/training/ (e.g., 'pdfs', 'ppts')
 * @returns {Promise<string>} - The download URL
 */
export const uploadTrainingFile = async (file, path = 'others') => {
    if (!storage || !appId) throw new Error('Storage not initialized');

    // Clean filename to avoid issues
    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const timestamp = Date.now();
    const storagePath = `artifacts/${appId}/public/training/${path}/${timestamp}_${cleanName}`;
    
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

export const uploadLeaveProof = async (file, cadetId) => {
    if (!storage || !appId) throw new Error('Storage not initialized');

    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const timestamp = Date.now();
    const storagePath = `artifacts/${appId}/private/leave_proofs/${cadetId}/${timestamp}_${cleanName}`;
    
    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

/**
 * Uploads a cadet profile photo to Firebase Storage.
 * Used exclusively by admin when adding or editing a cadet.
 * @param {File} file - The image file
 * @param {string} cadetId - Firestore cadet doc ID (or enrollmentId for new cadets)
 * @returns {Promise<string>} - The public download URL
 */
export const uploadCadetPhoto = async (file, cadetId) => {
    if (!storage || !appId) throw new Error('Storage not initialized');

    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const timestamp = Date.now();
    const storagePath = `artifacts/${appId}/public/profile_photos/${cadetId}/${timestamp}_${cleanName}`;

    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};

/**
 * Uploads a staff profile photo to Firebase Storage.
 * @param {File} file - The image file
 * @param {string} identifier - A unique identifier (e.g. staff email or name)
 * @returns {Promise<string>} - The public download URL
 */
export const uploadStaffPhoto = async (file, identifier) => {
    if (!storage || !appId) throw new Error('Storage not initialized');

    const cleanName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
    const timestamp = Date.now();
    const cleanIdentifier = (identifier || 'unnamed').replace(/[^a-zA-Z0-9]/g, '_');
    const storagePath = `artifacts/${appId}/public/staff_photos/${cleanIdentifier}/${timestamp}_${cleanName}`;

    const storageRef = ref(storage, storagePath);
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
};
