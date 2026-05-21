import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { TenantProvider } from './context/TenantContext.jsx';

// ── Service Worker Registration ───────────────────────────────────────────────
// We register the firebase-messaging-sw.js directly.
// This is required for Firebase Cloud Messaging (FCM) to work — Chrome only
// recognises a service worker named exactly 'firebase-messaging-sw.js' for push.
// VitePWA is configured in 'injectManifest' mode pointing at this same file,
// so offline/PWA caching and FCM background push are handled by ONE service worker.
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker
            .register('/firebase-messaging-sw.js', { scope: '/' })
            .then((registration) => {
                console.log('[SW] Firebase messaging SW registered:', registration.scope);
            })
            .catch((err) => {
                console.error('[SW] Registration failed:', err);
            });
    });
}

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
    <React.StrictMode>
        <TenantProvider>
            <AuthProvider>
                <DataProvider>
                    <App />
                </DataProvider>
            </AuthProvider>
        </TenantProvider>
    </React.StrictMode>
);
