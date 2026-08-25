import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging } from 'firebase/messaging';
import { getFunctions } from 'firebase/functions';

// ── AppId ────────────────────────────────────────────────────────────────────
// Declared with const at module scope so Vite can statically export it.
export const appId =
    typeof __app_id !== 'undefined' && __app_id ? __app_id : 'default-app-id';

// ── Firebase config ──────────────────────────────────────────────────────────
const fallbackConfig = {
    apiKey: 'AIzaSyBSiQ3PlCHIhljwQR5uWgma465yFohMRfI',
    authDomain: 'gmrit-ncc-fb1df.firebaseapp.com',
    projectId: 'gmrit-ncc-fb1df',
    storageBucket: 'gmrit-ncc-fb1df.firebasestorage.app',
    messagingSenderId: '218480065073',
    appId: '1:218480065073:web:52a908b9996d0773ba7310',
    measurementId: 'G-8LBCG7FRM0',
};

// Resolve config — prefer runtime-injected string, fall back to hardcoded.
const resolveConfig = () => {
    try {
        if (typeof __firebase_config === 'string' && __firebase_config) {
            return JSON.parse(__firebase_config);
        }
    } catch (e) {
        console.error('Failed to parse __firebase_config, using fallback.', e);
    }
    return fallbackConfig;
};

const firebaseConfig = resolveConfig();

// ── Firebase initialisation ──────────────────────────────────────────────────
let auth;
let db;
let storage;
let messaging;
let functions;

if (firebaseConfig?.projectId) {
    try {
        const app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        storage = getStorage(app);
        functions = getFunctions(app);
        // Messaging might not be supported in some environments (SSR/Old Browsers)
        try {
            messaging = getMessaging(app);
        } catch (e) {
            console.warn(
                'Firebase Messaging not supported in this environment'
            );
        }
    } catch (e) {
        console.error('Firebase init error:', e);
    }
} else {
    console.error('Firebase init skipped: invalid config.');
}

export { auth, db, storage, messaging, functions, firebaseConfig };
