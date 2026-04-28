// src/components/ui/LoadingIndicator.jsx
import React from 'react';

export const LoadingIndicator = ({ message = 'Loading...' }) => (
    <div className="flex flex-col items-center gap-4">
        {/* Tri-color ring spinner */}
        <div className="relative w-12 h-12">
            <svg className="w-full h-full animate-spin" viewBox="0 0 44 44" fill="none">
                <circle cx="22" cy="22" r="18" stroke="#f5f0e8" strokeWidth="4" />
                <path
                    d="M22 4 A18 18 0 0 1 40 22"
                    stroke="#b01020"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <path
                    d="M40 22 A18 18 0 0 1 22 40"
                    stroke="#b8830e"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
                <path
                    d="M22 40 A18 18 0 0 1 4 22"
                    stroke="#0a1628"
                    strokeWidth="4"
                    strokeLinecap="round"
                />
            </svg>
        </div>
        {message && (
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                {message}
            </p>
        )}
    </div>
);

export default LoadingIndicator;
