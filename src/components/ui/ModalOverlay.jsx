// src/components/ui/ModalOverlay.jsx
import React from 'react';

export const ModalOverlay = ({ children, onClose }) => (
    <div
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-8 px-4 fade-in"
        style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(4px)' }}
    >
        <div
            className="relative w-full max-w-2xl modal-in"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Top accent bar */}
            <div className="h-1 w-full flex rounded-t-2xl overflow-hidden">
                <div className="flex-1 bg-ncc-red" />
                <div className="flex-1 bg-ncc-gold" />
                <div className="flex-1 bg-ncc-navy" />
            </div>
            <div className="bg-white rounded-b-2xl shadow-2xl overflow-hidden">
                {children}
            </div>
        </div>
        {onClose && (
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        )}
    </div>
);

export default ModalOverlay;
