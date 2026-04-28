// src/features/Staff/StaffDetailsView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { StaffForm } from './StaffForm';
import { ModalOverlay } from '../../components/ui/ModalOverlay';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { deleteItem, saveStaff } from '../../firebase/firestoreService';
import { Briefcase, Plus, User, Phone, Mail, Edit, Trash2, ChevronUp, ChevronDown } from '../../components/Icons';

const StaffMemberCard = ({ member, onEdit, onDelete, onMove, userRole, isFirst, isLast }) => {
    const [imageError, setImageError] = useState(false);
    useEffect(() => { setImageError(false); }, [member.photoUrl]);
    return (
        <div className="ncc-card p-4 flex items-center gap-3 relative group hover:shadow-md transition">
            {userRole === 'admin' && (
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-center opacity-0 group-hover:opacity-100 transition bg-ncc-cream rounded-l-xl border-r border-[#ddd8cc] px-0.5">
                    <button disabled={isFirst} onClick={() => onMove(member, 'up')} className={`p-0.5 ${isFirst ? 'text-gray-300' : 'text-ncc-navy hover:text-ncc-gold'}`}><ChevronUp className="w-4 h-4" /></button>
                    <button disabled={isLast} onClick={() => onMove(member, 'down')} className={`p-0.5 ${isLast ? 'text-gray-300' : 'text-ncc-navy hover:text-ncc-gold'}`}><ChevronDown className="w-4 h-4" /></button>
                </div>
            )}
            <div className={`flex-shrink-0 ${userRole === 'admin' ? 'ml-5' : ''}`}>
                {member.photoUrl && !imageError ? (
                    <img src={member.photoUrl} alt={member.name} className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 shadow-sm" style={{ borderColor: 'rgba(184,131,14,0.4)' }} onError={() => setImageError(true)} />
                ) : (
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-ncc-navy/10 flex items-center justify-center border-2 border-ncc-navy/20">
                        <User className="w-6 h-6 text-ncc-navy/40" />
                    </div>
                )}
            </div>
            <div className="flex-grow min-w-0">
                <h4 className="font-bold text-sm sm:text-base text-ncc-navy truncate font-display">{member.name}</h4>
                <p className="text-xs text-ncc-gold/80 font-semibold uppercase tracking-wide">{member.rank}</p>
                <div className="mt-1 space-y-0.5">
                    {member.phone && <p className="flex items-center text-xs text-gray-500"><Phone className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">{member.phone}</span></p>}
                    {member.email && <p className="flex items-center text-xs text-gray-500"><Mail className="w-3 h-3 mr-1 flex-shrink-0" /><span className="truncate">{member.email}</span></p>}
                </div>
            </div>
            {userRole === 'admin' && (
                <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => onEdit(member)} className="p-1.5 text-ncc-navy hover:bg-ncc-navy/10 rounded-lg transition"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => onDelete({ type: 'staff', id: member.id, name: member.name })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
};

export const StaffDetailsView = ({ staff }) => {
    const { userRole } = useAuthContext();
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [error, setError] = useState(null);

    const sortedStaff = useMemo(() => [...staff].sort((a, b) => { const pa = a.priority ?? 999, pb = b.priority ?? 999; return pa !== pb ? pa - pb : (a.name || '').localeCompare(b.name || ''); }), [staff]);

    const handleMoveStaff = async (currentMember, direction) => {
        const currentIndex = sortedStaff.findIndex((s) => s.id === currentMember.id);
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
        if (targetIndex < 0 || targetIndex >= sortedStaff.length) return;
        const targetMember = sortedStaff[targetIndex];
        try {
            const cp = currentMember.priority ?? currentIndex, tp = targetMember.priority ?? targetIndex;
            await Promise.all([saveStaff({ ...currentMember, priority: tp }, currentMember.id), saveStaff({ ...targetMember, priority: cp === tp ? (direction === 'up' ? tp + 1 : tp - 1) : cp }, targetMember.id)]);
        } catch (e) { setError('Failed to reorder: ' + e.message); }
    };

    const handleModalClose = () => { setIsAddingStaff(false); setEditingStaff(null); setItemToDelete(null); setError(null); };
    const handleDeleteConfirm = async () => { setError(null); if (!itemToDelete) return; try { await deleteItem(itemToDelete.type, itemToDelete.id); handleModalClose(); } catch (e) { setError(e.message); } };

    return (
        <>
            {(isAddingStaff || editingStaff) && (<ModalOverlay><StaffForm currentStaff={editingStaff || { priority: staff.length }} onSaveSuccess={handleModalClose} onCancel={handleModalClose} /></ModalOverlay>)}
            {itemToDelete && <ConfirmationModal itemType={itemToDelete.type} itemName={itemToDelete.name} onConfirm={handleDeleteConfirm} onCancel={handleModalClose} />}

            <div className="ncc-card overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-[#ddd8cc]">
                    <h2 className="ncc-section-title"><Briefcase className="w-5 h-5 text-ncc-gold" /> Staff Details</h2>
                    {userRole === 'admin' && <button onClick={() => setIsAddingStaff(true)} className="ncc-btn ncc-btn-primary ncc-btn-sm"><Plus className="w-3.5 h-3.5" /> Add Staff</button>}
                </div>
                <div className="p-5">
                    {error && <div className="mb-3"><ErrorDisplay message={error} /></div>}
                    {staff.length === 0 ? (
                        <p className="text-gray-400 text-center py-6 text-sm italic">No staff listed.</p>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {sortedStaff.map((member, index) => (
                                <StaffMemberCard key={member.id} member={member} isFirst={index === 0} isLast={index === sortedStaff.length - 1}
                                    onMove={handleMoveStaff} onEdit={(m) => { setEditingStaff(m); setError(null); }}
                                    onDelete={(item) => { setItemToDelete(item); setError(null); }} userRole={userRole} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
