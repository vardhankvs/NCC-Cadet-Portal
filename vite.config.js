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
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            manifest: {
                name: 'NCC Portal',
                short_name: 'NCC',
                description: 'Digital Ecosystem for NCC GMRIT',
                theme_color: '#0f2e4a',
                icons: [
                    {
                        src: 'pwa-192x192.png',
                        sizes: '192x192',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png'
                    },
                    {
                        src: 'pwa-512x512.png',
                        sizes: '512x512',
                        type: 'image/png',
                        purpose: 'any maskable'
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
