// src/context/AuthContext.js
import React, { createContext, useContext } from 'react';
import { useAuth } from '../hooks/useAuth';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const auth = useAuth(); // Our hook does all the work
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

// Create a simple hook to consume the context
export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
