// src/index.js
import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';

// This assumes you have a public/index.html with <div id="root"></div>
const container = document.getElementById('root');
const root = createRoot(container);

root.render(
    <React.StrictMode>
        <AuthProvider>
            <DataProvider>
                <App />
            </DataProvider>
        </AuthProvider>
    </React.StrictMode>
);
