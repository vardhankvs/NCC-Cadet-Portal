// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            // 'injectManifest' mode lets us provide our OWN service worker file.
            // We need this so firebase-messaging-sw.js is used instead of the
            // default Workbox-generated sw.js — FCM requires a file specifically
            // named 'firebase-messaging-sw.js' served from the root.
            strategies: 'injectManifest',
            srcDir: 'public',
            filename: 'firebase-messaging-sw.js',
            registerType: 'autoUpdate',
            injectManifest: {
                // Don't inject a Workbox precache manifest into the Firebase SW —
                // it would break the importScripts() calls at the top of the file.
                injectionPoint: undefined,
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
            },
            includeAssets: ['favicon.png', 'pwa-192x192.png', 'pwa-512x512.png', 'pwa-maskable-512x512.png'],
            manifest: {
                name: '14(A) BN NCC Srikakulam',
                short_name: 'NCC',
                description: 'Digital Ecosystem for 14(A) BN NCC GMRIT Unit Management',
                theme_color: '#0a1628',
                background_color: '#0a1628',
                display: 'standalone',
                orientation: 'portrait',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any'
                    },
                    {
                        src: 'pwa-maskable-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'maskable'
                    }
                ]
            }
        })
    ],
    css: {
        postcss: './postcss.config.js',
    },
    define: {
        __app_id: JSON.stringify('default-app-id'),
        __firebase_config: JSON.stringify(''),
    },
    build: {
        sourcemap: true,
        emptyOutDir: false
    }
});
