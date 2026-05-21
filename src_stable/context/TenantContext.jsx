// src/context/TenantContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { db, appId } from '../firebase/config';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';

const TenantContext = createContext();

export const useTenant = () => useContext(TenantContext);

export const TenantProvider = ({ children }) => {
    const [tenant, setTenant] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const detectTenant = async () => {
            try {
                // 1. Detect subdomain from URL
                // Example: anits.ncc-portal.in -> 'anits'
                const hostname = window.location.hostname;
                let subdomain = 'gmrit'; // Default for local dev

                if (hostname !== 'localhost' && !hostname.includes('firebaseapp.com') && !hostname.includes('web.app')) {
                    const parts = hostname.split('.');
                    if (parts.length >= 3) {
                        subdomain = parts[0];
                    }
                } else {
                    // For local testing, you can use a query param: ?unit=anits
                    const params = new URLSearchParams(window.location.search);
                    subdomain = params.get('unit') || 'gmrit';
                }

                // 2. Fetch Unit Configuration from Firestore
                const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
                const q = query(unitsRef, where('subdomain', '==', subdomain), limit(1));
                const snapshot = await getDocs(q);

                if (!snapshot.empty) {
                    const data = snapshot.docs[0].data();
                    setTenant({
                        id: snapshot.docs[0].id,
                        ...data
                    });
                } else {
                    // Fallback to default GMRIT if not found
                    console.warn(`Unit configuration for "${subdomain}" not found. Falling back to default.`);
                    setTenant({
                        id: 'gmrit-default',
                        subdomain: 'gmrit',
                        unitName: '14(A) BN NCC',
                        location: 'GMRIT Srikakulam',
                        primaryColor: '#1B3A6B',
                        secondaryColor: '#B8830E',
                        heroBg: '/assets/hero_bg.png', // Default
                        logo: '/assets/ncc_logo.png'
                    });
                }
            } catch (err) {
                console.error("Tenant detection error:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        detectTenant();
    }, []);

    return (
        <TenantContext.Provider value={{ tenant, loading, error }}>
            {!loading && children}
        </TenantContext.Provider>
    );
};
