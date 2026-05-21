// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            registerType: 'autoUpdate',
            includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
            workbox: {
                maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
            },
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
        sourcemap: true
    }
});

