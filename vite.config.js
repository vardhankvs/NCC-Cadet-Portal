// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    css: {
        postcss: './postcss.config.js',
    },
    define: {
        __app_id: JSON.stringify('default-app-id'),
        __firebase_config: JSON.stringify(''),
    },
});
