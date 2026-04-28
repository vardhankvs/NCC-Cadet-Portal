// src/hooks/useFirestoreSubscription.js
import { useState, useEffect } from 'react';
import { useAuthContext } from '../context/AuthContext';
import { getCollectionRef } from '../firebase/firestoreService';
import { query, onSnapshot, where } from 'firebase/firestore';

export const useFirestoreSubscription = (collectionName) => {
    const { user, userRole, userInstitutionId } = useAuthContext();
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Wait for user to be logged in
        if (!user || !collectionName) {
            setLoading(false);
            setData([]); // Clear data if user logs out
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

        // Feature: Multi-Tenancy segregation here
        // Superadmins see all records, everyone else sees only their institution
        let q = query(ref);
        if (userRole !== 'superadmin' && userInstitutionId) {
            q = query(ref, where('institutionId', '==', userInstitutionId));
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
    }, [collectionName, user]); // Rerun if collection or user changes

    return { data, loading, error };
};
