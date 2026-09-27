// src/features/Announcements/AnnouncementsView.jsx
import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { AnnouncementForm } from './AnnouncementForm.jsx';
import { deleteItem } from '../../firebase/firestoreService.js';
import { Megaphone, Plus, Trash2, Edit2 } from '../../components/Icons.jsx';
import { subHours } from 'date-fns';
import { formatDate } from '../../utils/dateUtils.js';


export const AnnouncementsView = () => {
    const { userRole, actualRole } = useAuthContext();
    const { announcements } = useDataContext();
    const [isAdding, setIsAdding] = useState(false);
    const [itemToEdit, setItemToEdit] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [error, setError] = useState(null);
    const oneDayAgo = useMemo(() => subHours(new Date(), 24), []);

    const isAdmin = (userRole === 'admin' || userRole === 'officer') && userRole !== 'cadet' && actualRole !== 'cadet';

    const sortedAnnouncements = useMemo(
        () => [...announcements].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)),
        [announcements]
    );

    const handleModalClose = () => {
        setIsAdding(false);
        setItemToEdit(null);
        setItemToDelete(null);
        setError(null);
    };

    const handleDeleteConfirm = async () => {
        setError(null);
        if (!itemToDelete || !isAdmin) return;
        try {
            await deleteItem('announcements', itemToDelete.id);
            handleModalClose();
        } catch (e) {
            setError(`Delete failed: ${e.message}`);
        }
    };

    return (
        <>
            {/* Create modal */}
            {isAdding && isAdmin && <AnnouncementForm onClose={handleModalClose} />}

            {/* Edit modal — passes full ann object as initialData */}
            {itemToEdit && isAdmin && <AnnouncementForm onClose={handleModalClose} initialData={itemToEdit} />}

            {/* Delete confirmation */}
            {itemToDelete && isAdmin && (
                <ConfirmationModal
                    itemType="Announcement"
                    itemName={itemToDelete.name}
                    onConfirm={handleDeleteConfirm}
                    onCancel={handleModalClose}
                />
            )}

            <div className="ncc-card overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-[#ddd8cc]">
                    <h2 className="ncc-section-title">
                        <Megaphone className="w-5 h-5 text-ncc-gold" /> Announcements
                    </h2>
                    {isAdmin && (
                        <button onClick={() => setIsAdding(true)} className="ncc-btn ncc-btn-primary ncc-btn-sm">
                            <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                    )}
                </div>

                <div className="p-5">
                    {error && <div className="mb-3"><ErrorDisplay message={error} /></div>}
                    <div className="space-y-3">
                        {sortedAnnouncements.length === 0 ? (
                            <p className="text-gray-400 dark:text-white/80 text-center py-6 text-sm italic">No announcements yet.</p>
                        ) : sortedAnnouncements.map((ann) => {
                            const postDate = ann.createdAt?.toDate ? ann.createdAt.toDate() : new Date(0);
                            const isNew = postDate > oneDayAgo;
                            return (
                                <div
                                    key={ann.id}
                                    className={`p-4 rounded-xl border ${isNew ? 'bg-[#fdfaf3] border-ncc-gold/30' : 'bg-[#f5f0e8] dark:bg-[#0a1628] border-[#ddd8cc]'} relative`}
                                >
                                    {isNew && (
                                        <span className="absolute top-3 right-20 sm:right-24 pill-online text-[10px]">NEW</span>
                                    )}
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <h4 className="font-bold text-sm text-ncc-navy dark:text-white font-display truncate flex-1">
                                            {ann.title}
                                        </h4>
                                        {isAdmin && (
                                            <div className="flex items-center gap-1 flex-shrink-0">
                                                {/* Edit button */}
                                                <button
                                                    title="Edit notice"
                                                    onClick={() => setItemToEdit(ann)}
                                                    className="p-1 text-ncc-navy/40 dark:text-white/40 hover:text-ncc-gold hover:bg-ncc-gold/10 rounded-lg transition"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                                {/* Delete button */}
                                                <button
                                                    title="Delete notice"
                                                    onClick={() => setItemToDelete({ type: 'announcements', id: ann.id, name: ann.title })}
                                                    className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-gray-400 dark:text-white/80 mb-2 font-mono">
                                        Posted: {formatDate(ann.createdAt)}
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-white/90 whitespace-pre-wrap leading-relaxed">
                                        {ann.content}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </>
    );
};
