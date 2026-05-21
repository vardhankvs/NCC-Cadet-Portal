// src/hooks/useFirestoreSubscription.js
import { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { getCollectionRef } from '../firebase/firestoreService';
import { useTenant } from '../context/TenantContext';
import { query, onSnapshot, where } from 'firebase/firestore';

export const useFirestoreSubscription = (collectionName, requiresAuth = true) => {
    const { user, userRole, userInstitutionId, authLoading } = useAuthContext();
    const { tenant } = useTenant();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Always wait for Firebase auth to finish resolving before subscribing.
        // Without this, requiresAuth=false collections fire before auth state is
        // known and hit auth-gated Firestore rules for unauthenticated sessions.
        if (authLoading) return;

        // Handle authentication requirements
        if (requiresAuth && !user) {
            setLoading(false);
            setData([]);
            return;
        }

        // For non-auth collections (events, staff, announcements, gallery),
        // only subscribe if there is a logged-in user OR a resolved tenant.
        // This prevents permission errors on the public landing page.
        if (!requiresAuth && !user && !tenant) {
            setLoading(false);
            setData([]);
            return;
        }

        // Must have a tenant or be a superadmin (for auth'd users)
        if (user && !tenant && userRole !== 'superadmin') {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);

        const ref = getCollectionRef(collectionName);
        if (!ref) {
            setError('Database connection failed.');
            setLoading(false);
            return;
        }

        // Multi-Tenancy segregation
        let q = query(ref);

        // Use User Institution ID as primary filter for logged-in users, fallback to Tenant ID for guests
        const activeUnitId = userInstitutionId || tenant?.id;

        if (userRole !== 'superadmin' && activeUnitId) {
            q = query(ref, where('institutionId', '==', activeUnitId));
        }

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs.map((d) => ({
                    id: d.id,
                    ...d.data(),
                }));
                setData(list);
                setLoading(false);
            },
            (err) => {
                console.error(`Error fetching ${collectionName}:`, err);
                setError(`Failed to fetch ${collectionName}`);
                setLoading(false);
            }
        );

        // Cleanup listener on unmount
        return () => unsubscribe();
    }, [collectionName, user, userInstitutionId, tenant?.id, authLoading]); // Rerun if auth state, unit context or tenant changes

    return { data, loading, error };
};
