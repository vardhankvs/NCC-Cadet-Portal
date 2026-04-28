// src/features/References/ReferencesView.jsx
import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { ReferenceForm } from './ReferenceForm.jsx';
import { deleteItem } from '../../firebase/firestoreService.js';
import { FileText, Plus, Trash2, LinkIcon, Edit } from '../../components/Icons.jsx';

import { formatDate } from '../../utils/dateUtils.js';


export const ReferencesView = () => {
    const { userRole } = useAuthContext();
    const { references } = useDataContext();
    const [isAdding, setIsAdding] = useState(false);
    const [editingReference, setEditingReference] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [error, setError] = useState(null);

    const sortedReferences = useMemo(() => [...references].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)), [references]);
    const handleModalClose = () => { setIsAdding(false); setEditingReference(null); setItemToDelete(null); setError(null); };
    const handleDeleteConfirm = async () => { setError(null); if (!itemToDelete) return; try { await deleteItem('references', itemToDelete.id); handleModalClose(); } catch (e) { setError(e.message); } };

    return (
        <>
            {(isAdding || editingReference) && (<ModalOverlay><ReferenceForm currentReference={editingReference} onSaveSuccess={handleModalClose} onCancel={handleModalClose} /></ModalOverlay>)}
            {itemToDelete && <ConfirmationModal itemType="Reference Link" itemName={itemToDelete.name} onConfirm={handleDeleteConfirm} onCancel={handleModalClose} />}

            <div className="ncc-card overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-[#ddd8cc]">
                    <h2 className="ncc-section-title"><FileText className="w-5 h-5 text-ncc-gold" /> References</h2>
                    {userRole === 'admin' && (
                        <button onClick={() => { setIsAdding(true); setEditingReference(null); }} className="ncc-btn ncc-btn-primary ncc-btn-sm">
                            <Plus className="w-3.5 h-3.5" /> Add Reference
                        </button>
                    )}
                </div>
                <div className="p-5">
                    {error && <div className="mb-3"><ErrorDisplay message={error} /></div>}
                    <div className="space-y-3">
                        {sortedReferences.length === 0 ? (
                            <p className="text-gray-400 text-center py-6 text-sm italic">No references added yet.</p>
                        ) : sortedReferences.map((ref) => (
                            <div key={ref.id} className="flex items-center justify-between gap-2 p-4 bg-[#f5f0e8] rounded-xl border border-[#ddd8cc] hover:shadow-sm transition">
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-ncc-navy text-sm truncate font-display">{ref.title}</h4>
                                    <p className="text-[11px] text-gray-400 mt-0.5 font-mono">Uploaded: {formatDate(ref.createdAt)}</p>
                                </div>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                    <a href={ref.downloadURL} target="_blank" rel="noopener noreferrer" className="ncc-btn ncc-btn-ghost ncc-btn-sm">
                                        <LinkIcon className="w-3 h-3" /> View
                                    </a>
                                    {userRole === 'admin' && (
                                        <>
                                            <button onClick={() => { setEditingReference(ref); setIsAdding(false); setError(null); }} className="p-1.5 text-ncc-navy hover:bg-ncc-navy/10 rounded-lg transition"><Edit className="w-3.5 h-3.5" /></button>
                                            <button onClick={() => setItemToDelete({ id: ref.id, name: ref.title })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-3.5 h-3.5" /></button>
                                        </>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};
