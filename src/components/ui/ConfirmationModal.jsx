// src/components/ui/ConfirmationModal.jsx
import React from 'react';
import { AlertTriangle } from '../Icons.jsx';

export const ConfirmationModal = ({ itemType, itemName, onConfirm, onCancel }) => (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4 fade-in"
        style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(4px)' }}
    >
        <div className="modal-in w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Top accent */}
            <div className="h-1 w-full flex">
                <div className="flex-1 bg-ncc-red" />
                <div className="flex-1 bg-ncc-gold" />
                <div className="flex-1 bg-ncc-navy" />
            </div>
            <div className="p-6 sm:p-8">
                {/* Icon */}
                <div className="flex items-center gap-4 mb-5">
                    <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                    </div>
                    <div>
                        <h3 className="font-bold font-display text-ncc-navy text-lg leading-tight">
                            Confirm Deletion
                        </h3>
                        <p className="text-xs uppercase tracking-widest text-gray-400 mt-0.5">
                            This action cannot be undone
                        </p>
                    </div>
                </div>

                <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                    You are about to permanently delete{' '}
                    <span className="font-bold text-gray-900">&ldquo;{itemName}&rdquo;</span>
                    {itemType ? ` from ${itemType}` : ''}.
                </p>

                <div className="flex gap-3 justify-end">
                    <button onClick={onCancel} className="ncc-btn ncc-btn-ghost">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="ncc-btn ncc-btn-danger">
                        Confirm Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
);

export default ConfirmationModal;
