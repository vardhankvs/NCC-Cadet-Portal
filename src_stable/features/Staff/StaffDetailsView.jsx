// src/features/Staff/StaffDetailsView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { StaffForm } from './StaffForm';
import { StaffProfileModal } from './StaffProfileModal';
import { ModalOverlay } from '../../components/ui/ModalOverlay';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { deleteItem, saveStaff } from '../../firebase/firestoreService';
import { db, appId } from '../../firebase/config';
import { collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Briefcase, Plus, User, Edit, Trash2, ChevronUp, ChevronDown } from '../../components/Icons.jsx';

const StaffMemberCard = ({ member, onSelect, onEdit, onDelete, onMove, userRole, isFirst, isLast }) => {
    const [imageError, setImageError] = useState(false);
    useEffect(() => { setImageError(false); }, [member.photoUrl]);
    const isWriteAllowed = userRole === 'superadmin' || userRole === 'battalion_admin' || userRole === 'admin' || userRole === 'officer';

    return (
        <div 
            onClick={() => onSelect && onSelect(member)}
            className="group relative flex flex-col items-center p-6 bg-white dark:bg-[#0a1628] rounded-[2rem] border border-[#ddd8cc]/60 dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-ncc-gold/40 dark:hover:border-ncc-gold/30 transition-all duration-500 overflow-hidden isolate animate-fadeIn cursor-pointer"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-ncc-navy/5 to-transparent dark:from-white/[0.02] dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {isWriteAllowed && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0 z-20">
                    <button disabled={isFirst} onClick={(e) => { e.stopPropagation(); onMove(member, 'up'); }} className={`p-1.5 rounded-full backdrop-blur-sm ${isFirst ? 'text-gray-300/50 bg-gray-100/50 dark:bg-white/5' : 'text-ncc-navy dark:text-white bg-white dark:bg-white/10 hover:bg-ncc-gold hover:text-white dark:hover:bg-ncc-gold'} shadow-sm transition-all`}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button disabled={isLast} onClick={(e) => { e.stopPropagation(); onMove(member, 'down'); }} className={`p-1.5 rounded-full backdrop-blur-sm ${isLast ? 'text-gray-300/50 bg-gray-100/50 dark:bg-white/5' : 'text-ncc-navy dark:text-white bg-white dark:bg-white/10 hover:bg-ncc-gold hover:text-white dark:hover:bg-ncc-gold'} shadow-sm transition-all`}><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
            )}
            
            {/* Photo */}
            <div className="relative mb-4">
                <div className="absolute inset-0 bg-ncc-gold rounded-full blur-md opacity-20 group-hover:opacity-60 transition-opacity duration-500" />
                {member.photoUrl && !imageError ? (
                    <img src={member.photoUrl} alt={member.name} className="relative w-24 h-24 rounded-full object-cover border-4 border-white dark:border-[#0d2137] shadow-xl group-hover:scale-105 transition-transform duration-500" onError={() => setImageError(true)} />
                ) : (
                    <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-gray-50 to-gray-200 dark:from-[#11233c] dark:to-[#0a1628] flex items-center justify-center border-4 border-white dark:border-[#0d2137] shadow-xl group-hover:scale-105 transition-transform duration-500">
                        <User className="w-10 h-10 text-ncc-navy/30 dark:text-white/20" />
                    </div>
                )}
            </div>

            {/* Name & Rank */}
            <div className="text-center z-10">
                <h4 className="font-display font-bold text-base sm:text-lg text-ncc-navy dark:text-white group-hover:text-ncc-gold transition-colors leading-tight">{member.name}</h4>
                <p className="text-[10px] sm:text-xs text-ncc-gold font-bold uppercase tracking-[0.15em] mt-1">{member.rank}</p>
            </div>

            {isWriteAllowed && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-20">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(member); }} className="p-2 bg-white dark:bg-[#11233c] text-ncc-navy dark:text-white hover:text-white hover:bg-ncc-navy dark:hover:bg-ncc-gold rounded-xl shadow-sm transition-colors border border-gray-100 dark:border-white/5"><Edit className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete({ type: 'staff', id: member.id, name: member.name, email: member.email }); }} className="p-2 bg-white dark:bg-[#11233c] text-red-500 hover:text-white hover:bg-red-500 rounded-xl shadow-sm transition-colors border border-gray-100 dark:border-white/5"><Trash2 className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
};

export const StaffDetailsView = ({ staff }) => {
    const { userRole } = useAuthContext();
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [error, setError] = useState(null);

    const isWriteAllowed = userRole === 'superadmin' || userRole === 'battalion_admin' || userRole === 'admin' || userRole === 'officer';

    const sortedStaff = useMemo(() => {
        const validStaff = (staff || []).filter(s => s && s.name && s.rank);
        return [...validStaff].sort((a, b) => { 
            const pa = a.priority ?? 999, pb = b.priority ?? 999; 
            return pa !== pb ? pa - pb : (a.name || '').localeCompare(b.name || ''); 
        });
    }, [staff]);

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

    const handleModalClose = () => { setIsAddingStaff(false); setEditingStaff(null); setSelectedStaff(null); setItemToDelete(null); setError(null); };
    const handleDeleteConfirm = async () => { 
        setError(null); 
        if (!itemToDelete) return; 
        try { 
            await deleteItem(itemToDelete.type, itemToDelete.id); 
            if (itemToDelete.email) {
                const cleanEmail = itemToDelete.email.trim().toLowerCase();
                try {
                    const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
                    const q = query(usersRef, where('email', '==', cleanEmail));
                    const snap = await getDocs(q);
                    for (const d of snap.docs) {
                        await deleteDoc(d.ref).catch(() => {});
                    }
                } catch (e) {}

                try {
                    const apiUrl = window.location.hostname.includes('vercel.app') 
                        ? '/api/updateUserCredentials' 
                        : 'https://ncc-portal-redesign.vercel.app/api/updateUserCredentials';
                    await fetch(apiUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            action: 'delete',
                            currentEmail: cleanEmail
                        })
                    });
                } catch (authDelErr) {
                    console.warn('Auth user deletion notice:', authDelErr);
                }
            }
            handleModalClose(); 
        } catch (e) { 
            setError(e.message); 
        } 
    };

    return (
        <>
            {(isAddingStaff || editingStaff) && (<ModalOverlay><StaffForm currentStaff={editingStaff || { priority: staff.length }} targetInstitutionId="14a-bn-srikakulam" onSaveSuccess={handleModalClose} onCancel={handleModalClose} /></ModalOverlay>)}
            {selectedStaff && <ModalOverlay><StaffProfileModal member={selectedStaff} onClose={handleModalClose} /></ModalOverlay>}
            {itemToDelete && <ConfirmationModal itemType={itemToDelete.type} itemName={itemToDelete.name} onConfirm={handleDeleteConfirm} onCancel={handleModalClose} />}

            <div className="bg-transparent overflow-hidden px-1">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 sm:p-10 bg-gradient-to-r from-ncc-navy via-[#1a365d] to-ncc-navy dark:from-[#050b14] dark:via-[#0a1628] dark:to-[#050b14] rounded-[2.5rem] shadow-xl mb-8 relative overflow-hidden animate-fadeIn">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-ncc-gold/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute bottom-0 left-0 w-56 h-56 bg-ncc-red/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-2 sm:mb-3">
                            <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-inner">
                                <Briefcase className="w-7 h-7 text-ncc-gold" />
                            </div>
                            <h2 className="text-3xl sm:text-4xl font-display font-black text-white tracking-tight">Staff Directory</h2>
                        </div>
                        <p className="text-white/70 text-sm sm:text-base font-medium max-w-xl">Meet the dedicated officers and staff who lead and support our unit.</p>
                    </div>
                    {isWriteAllowed && (
                        <div className="relative z-10 mt-6 sm:mt-0">
                            <button onClick={() => setIsAddingStaff(true)} className="flex items-center gap-2 px-6 py-3.5 bg-ncc-gold text-ncc-navy font-bold rounded-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(184,131,14,0.3)] group">
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Add Staff Member
                            </button>
                        </div>
                    )}
                </div>

                <div className="">
                    {error && <div className="mb-6"><ErrorDisplay message={error} /></div>}
                    {sortedStaff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-gray-300 dark:border-white/20 animate-fadeIn">
                            <Briefcase className="w-16 h-16 text-gray-300 dark:text-white/20 mb-4" />
                            <p className="text-gray-500 dark:text-white/60 font-medium text-lg">No staff members listed yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                            {sortedStaff.map((member, index) => (
                                <StaffMemberCard key={member.id} member={member} isFirst={index === 0} isLast={index === sortedStaff.length - 1}
                                    onSelect={setSelectedStaff}
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

