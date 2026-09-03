// src/components/ui/ModalOverlay.jsx
import React from 'react';

export const ModalOverlay = ({ children, onClose }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
        style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(4px)' }}
    >
        <div
            className="relative modal-in w-full max-w-5xl mx-auto flex flex-col max-h-[96vh]"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Top accent bar */}
            <div className="h-1 w-full flex rounded-t-2xl overflow-hidden shrink-0">
                <div className="flex-1 bg-ncc-red" />
                <div className="flex-1 bg-ncc-gold" />
                <div className="flex-1 bg-ncc-navy" />
            </div>
            <div className="flex-1 min-h-0 flex flex-col">
                {children}
            </div>
        </div>
        {onClose && (
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        )}
    </div>
);

export default ModalOverlay;
