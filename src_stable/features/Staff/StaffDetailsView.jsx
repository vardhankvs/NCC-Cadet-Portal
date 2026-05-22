// src/features/Staff/StaffDetailsView.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { useAuthContext } from '../../context/AuthContext';
import { StaffForm } from './StaffForm';
import { ModalOverlay } from '../../components/ui/ModalOverlay';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay';
import { deleteItem, saveStaff } from '../../firebase/firestoreService';
import { Briefcase, Plus, User, Phone, Mail, Edit, Trash2, ChevronUp, ChevronDown, Calendar, MapPin, GraduationCap, Award, X } from '../../components/Icons.jsx';

const StaffProfileModal = ({ member, onClose }) => {
    const parseExperience = (text) => {
        if (!text) return [];
        return text.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split('|').map(s => s.trim());
            return { 
                designation: parts[0] || '---', 
                employer: parts[1] || '---', 
                length: parts[2] || '---' 
            };
        });
    };

    const parseAcademic = (text) => {
        if (!text) return [];
        return text.split('\n').filter(l => l.trim()).map(line => {
            const parts = line.split('|').map(s => s.trim());
            return { 
                qualification: parts[0] || '---', 
                university: parts[1] || '---', 
                result: parts[2] || '---' 
            };
        });
    };

    const experience = parseExperience(member.professionalExperience);
    const academic = parseAcademic(member.academicProfile);

    return (
        <div className="mx-auto w-full max-w-2xl max-h-[90vh] overflow-y-auto ncc-scrollbar rounded-[2.5rem] bg-white dark:bg-[#050b14] p-8 shadow-2xl border border-[#ddd8cc] dark:border-white/10 relative animate-modalIn">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-ncc-navy dark:bg-ncc-gold" />
            
            <div className="mb-8 flex items-start justify-between">
                <div className="flex gap-6">
                    <div className="flex-shrink-0">
                        {member.photoUrl ? (
                            <img src={member.photoUrl} alt={member.name} className="w-24 h-24 rounded-3xl object-cover border-4 border-ncc-cream dark:border-[#0d2137] shadow-xl" />
                        ) : (
                            <div className="w-24 h-24 rounded-3xl bg-ncc-navy/5 flex items-center justify-center border-4 border-ncc-cream dark:border-[#0d2137]">
                                <User className="w-10 h-10 text-ncc-navy/20" />
                            </div>
                        )}
                    </div>
                    <div>
                        <h2 className="text-2xl font-display font-black text-ncc-navy dark:text-white uppercase tracking-tight">{member.name}</h2>
                        <p className="text-ncc-gold font-bold uppercase tracking-widest text-xs mt-1">{member.rank}</p>
                        <div className="mt-4 space-y-2">
                            {member.phone && <p className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium"><Phone className="w-3.5 h-3.5 mr-2 text-ncc-navy dark:text-ncc-gold" /> {member.phone}</p>}
                            {member.email && <p className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium"><Mail className="w-3.5 h-3.5 mr-2 text-ncc-navy dark:text-ncc-gold" /> {member.email}</p>}
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 bg-gray-50 dark:bg-white/5 rounded-xl text-gray-400 hover:text-ncc-red transition-colors">
                    <X className="h-6 w-6" />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 bg-ncc-cream/30 dark:bg-white/5 p-5 rounded-3xl border border-[#ddd8cc]/30 dark:border-white/5">
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date of Birth</p>
                    <p className="text-sm font-bold text-ncc-navy dark:text-white">{member.dob || '---'}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date of Joining</p>
                    <p className="text-sm font-bold text-ncc-navy dark:text-white">{member.doj || '---'}</p>
                </div>
                <div className="space-y-1 md:col-span-3 lg:col-span-1">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-2.5 h-2.5" /> Address</p>
                    <p className="text-sm font-bold text-ncc-navy dark:text-white leading-tight">{member.address || '---'}</p>
                </div>
            </div>

            <div className="space-y-8">
                {academic.length > 0 && (
                    <section>
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-[0.2em] mb-4">
                            <GraduationCap className="w-4 h-4 text-ncc-gold" /> Academic Profile
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Qualification</th>
                                        <th className="px-4 py-3">University</th>
                                        <th className="px-4 py-3">Class</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                    {academic.map((item, idx) => (
                                        <tr key={idx} className="dark:text-white/80">
                                            <td className="px-4 py-3 font-bold">{item.qualification}</td>
                                            <td className="px-4 py-3 font-medium opacity-80">{item.university}</td>
                                            <td className="px-4 py-3 text-ncc-gold font-bold">{item.result}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}

                {experience.length > 0 && (
                    <section>
                        <h3 className="flex items-center gap-2 text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-[0.2em] mb-4">
                            <Briefcase className="w-4 h-4 text-ncc-gold" /> Professional Experience
                        </h3>
                        <div className="overflow-hidden rounded-2xl border border-gray-100 dark:border-white/5 shadow-sm">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-gray-50 dark:bg-white/5 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-4 py-3">Designation</th>
                                        <th className="px-4 py-3">Employer</th>
                                        <th className="px-4 py-3">Service</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50 dark:divide-white/5">
                                    {experience.map((item, idx) => (
                                        <tr key={idx} className="dark:text-white/80">
                                            <td className="px-4 py-3 font-bold">{item.designation}</td>
                                            <td className="px-4 py-3 font-medium opacity-80">{item.employer}</td>
                                            <td className="px-4 py-3 text-ncc-navy dark:text-ncc-gold font-black">{item.length}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                )}
            </div>
        </div>
    );
};

const StaffMemberCard = ({ member, onEdit, onDelete, onMove, onSelect, userRole, isFirst, isLast }) => {
    const [imageError, setImageError] = useState(false);
    useEffect(() => { setImageError(false); }, [member.photoUrl]);
    return (
        <div 
            onClick={() => onSelect(member)}
            className="group relative flex flex-col p-6 bg-white dark:bg-[#0a1628] rounded-[2rem] border border-[#ddd8cc]/60 dark:border-white/5 shadow-sm hover:shadow-2xl hover:border-ncc-gold/40 dark:hover:border-ncc-gold/30 transition-all duration-500 cursor-pointer overflow-hidden isolate animate-fadeIn"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-ncc-navy/5 to-transparent dark:from-white/[0.02] dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            {userRole === 'admin' && (
                <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0 z-20">
                    <button disabled={isFirst} onClick={(e) => { e.stopPropagation(); onMove(member, 'up'); }} className={`p-1.5 rounded-full backdrop-blur-sm ${isFirst ? 'text-gray-300/50 bg-gray-100/50 dark:bg-white/5' : 'text-ncc-navy dark:text-white bg-white dark:bg-white/10 hover:bg-ncc-gold hover:text-white dark:hover:bg-ncc-gold'} shadow-sm transition-all`}><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button disabled={isLast} onClick={(e) => { e.stopPropagation(); onMove(member, 'down'); }} className={`p-1.5 rounded-full backdrop-blur-sm ${isLast ? 'text-gray-300/50 bg-gray-100/50 dark:bg-white/5' : 'text-ncc-navy dark:text-white bg-white dark:bg-white/10 hover:bg-ncc-gold hover:text-white dark:hover:bg-ncc-gold'} shadow-sm transition-all`}><ChevronDown className="w-3.5 h-3.5" /></button>
                </div>
            )}
            
            <div className={`flex items-start gap-5 z-10 ${userRole === 'admin' ? 'ml-6 sm:ml-8' : ''} transition-all duration-300`}>
                <div className="relative flex-shrink-0">
                    <div className="absolute inset-0 bg-ncc-gold rounded-full blur-md opacity-20 group-hover:opacity-60 transition-opacity duration-500" />
                    {member.photoUrl && !imageError ? (
                        <img src={member.photoUrl} alt={member.name} className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-[3px] border-white dark:border-[#0d2137] shadow-lg group-hover:scale-105 transition-transform duration-500" onError={() => setImageError(true)} />
                    ) : (
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-gray-50 to-gray-200 dark:from-[#11233c] dark:to-[#0a1628] flex items-center justify-center border-[3px] border-white dark:border-[#0d2137] shadow-lg group-hover:scale-105 transition-transform duration-500">
                            <User className="w-8 h-8 text-ncc-navy/30 dark:text-white/20" />
                        </div>
                    )}
                </div>
                
                <div className="flex-grow min-w-0 pt-1">
                    <h4 className="font-display font-bold text-base sm:text-lg text-ncc-navy dark:text-white truncate group-hover:text-ncc-gold transition-colors">{member.name}</h4>
                    <p className="text-[10px] sm:text-xs text-ncc-gold font-bold uppercase tracking-[0.15em] mt-0.5">{member.rank}</p>
                    
                    <div className="mt-3 space-y-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {member.phone && <p className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium"><Phone className="w-3 h-3 mr-2 text-ncc-navy/50 dark:text-ncc-gold/70" /><span className="truncate">{member.phone}</span></p>}
                        {member.email && <p className="flex items-center text-xs text-gray-500 dark:text-gray-400 font-medium"><Mail className="w-3 h-3 mr-2 text-ncc-navy/50 dark:text-ncc-gold/70" /><span className="truncate">{member.email}</span></p>}
                    </div>
                </div>
            </div>

            {userRole === 'admin' && (
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 z-20">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(member); }} className="p-2 bg-white dark:bg-[#11233c] text-ncc-navy dark:text-white hover:text-white hover:bg-ncc-navy dark:hover:bg-ncc-gold rounded-xl shadow-sm transition-colors border border-gray-100 dark:border-white/5"><Edit className="w-4 h-4" /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete({ type: 'staff', id: member.id, name: member.name }); }} className="p-2 bg-white dark:bg-[#11233c] text-red-500 hover:text-white hover:bg-red-500 rounded-xl shadow-sm transition-colors border border-gray-100 dark:border-white/5"><Trash2 className="w-4 h-4" /></button>
                </div>
            )}
        </div>
    );
};

export const StaffDetailsView = ({ staff }) => {
    const { userRole } = useAuthContext();
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);
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

    const handleModalClose = () => { setIsAddingStaff(false); setEditingStaff(null); setSelectedMember(null); setItemToDelete(null); setError(null); };
    const handleDeleteConfirm = async () => { setError(null); if (!itemToDelete) return; try { await deleteItem(itemToDelete.type, itemToDelete.id); handleModalClose(); } catch (e) { setError(e.message); } };

    return (
        <>
            {(isAddingStaff || editingStaff) && (<ModalOverlay><StaffForm currentStaff={editingStaff || { priority: staff.length }} onSaveSuccess={handleModalClose} onCancel={handleModalClose} /></ModalOverlay>)}
            {selectedMember && (<ModalOverlay onClose={handleModalClose}><StaffProfileModal member={selectedMember} onClose={handleModalClose} /></ModalOverlay>)}
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
                    {userRole === 'admin' && (
                        <div className="relative z-10 mt-6 sm:mt-0">
                            <button onClick={() => setIsAddingStaff(true)} className="flex items-center gap-2 px-6 py-3.5 bg-ncc-gold text-ncc-navy font-bold rounded-2xl hover:bg-white hover:scale-105 transition-all duration-300 shadow-[0_0_20px_rgba(184,131,14,0.3)] group">
                                <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" /> Add Staff Member
                            </button>
                        </div>
                    )}
                </div>

                <div className="">
                    {error && <div className="mb-6"><ErrorDisplay message={error} /></div>}
                    {staff.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 bg-white/40 dark:bg-white/5 rounded-[2.5rem] border border-dashed border-gray-300 dark:border-white/20 animate-fadeIn">
                            <Briefcase className="w-16 h-16 text-gray-300 dark:text-white/20 mb-4" />
                            <p className="text-gray-500 dark:text-white/60 font-medium text-lg">No staff members listed yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {sortedStaff.map((member, index) => (
                                <StaffMemberCard key={member.id} member={member} isFirst={index === 0} isLast={index === sortedStaff.length - 1}
                                    onMove={handleMoveStaff} onEdit={(m) => { setEditingStaff(m); setError(null); }}
                                    onSelect={(m) => setSelectedMember(m)}
                                    onDelete={(item) => { setItemToDelete(item); setError(null); }} userRole={userRole} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
