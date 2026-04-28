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
