import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from './config';
import { doc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore';
import { getCollectionRef } from './firestoreService.js';
const VAPID_KEY = "BDC9rR9_H3fV5S7p3uN9r1_z2L4x6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z"; // Replace with real VAPID key if needed, or use default

export const requestNotificationPermission = async (userId, collectionName = 'cadets') => {
    try {
        if (!messaging) {
            alert("Firebase Messaging is not supported or initialized on this device.");
            return null;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            try {
                const token = await getToken(messaging, {
                    vapidKey: 'BNpINcBKAiIus3dNAcNhCjGHnRIub-fIkDIk0A3bzOGvPcfGdD2ZU-VyTHq9hUBvvrlJVkXx4NLq4oX7_Gu1e2U'
                });
                
                if (token && userId) {
                    const userRef = doc(getCollectionRef(collectionName), userId);
                    await setDoc(userRef, { fcmTokens: arrayUnion(token) }, { merge: true });
                    // Also save to users collection as fallback for admins
                    const globalUserRef = doc(getCollectionRef('users'), userId);
                    await setDoc(globalUserRef, { fcmTokens: arrayUnion(token) }, { merge: true });
                    return token;
                } else {
                    alert("Token generated but User ID is missing.");
                }
            } catch (tokenError) {
                alert("Failed to generate push token: " + tokenError.message);
                console.error("Token Error:", tokenError);
            }
        } else {
            alert("Notification permission was not granted. Status: " + permission + ". Please go to your browser settings (Site Settings) and allow notifications for this site.");
        }
    } catch (error) {
        alert("Unexpected error: " + error.message);
        console.error('Error getting notification permission:', error);
    }
    return null;
};

export const onMessageListener = () =>
    new Promise((resolve) => {
        if (!messaging) return;
        onMessage(messaging, (payload) => {
            resolve(payload);
        });
    });
