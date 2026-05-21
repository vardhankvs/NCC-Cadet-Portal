import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { App } from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { DataProvider } from './context/DataContext.jsx';
import { TenantProvider } from './context/TenantContext.jsx';
import { registerSW } from 'virtual:pwa-register';

// Register service worker
registerSW({ immediate: true });

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

