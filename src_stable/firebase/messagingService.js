import { getToken, onMessage } from 'firebase/messaging';
import { messaging, db } from './config';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

const VAPID_KEY = "BDC9rR9_H3fV5S7p3uN9r1_z2L4x6M7N8O9P0Q1R2S3T4U5V6W7X8Y9Z"; // Replace with real VAPID key if needed, or use default

export const requestNotificationPermission = async (userId, collectionName = 'cadets') => {
    try {
        if (!messaging) return null;

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            const token = await getToken(messaging, {
                vapidKey: 'BNpINcBKAiIus3dNAcNhCjGHnRIub-fIkDIk0A3bzOGvPcfGdD2ZU-VyTHq9hUBvvrlJVkXx4NLq4oX7_Gu1e2U'
            });
            
            if (token && userId) {
                // Save token to appropriate profile
                const userRef = doc(db, collectionName, userId);
                await updateDoc(userRef, {
                    fcmTokens: arrayUnion(token)
                });
                return token;
            }
        }
    } catch (error) {
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
