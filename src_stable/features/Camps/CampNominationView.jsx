
import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { nominateForCamp, updateNominationStatus } from '../../firebase/firestoreService.js';
import { Tent, Users, CheckCircle, XCircle, Clock, MapPin, Calendar, Search } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';

export const CampNominationView = () => {
    const { user, userRole, userEnrollmentId, userName } = useAuthContext();
    const { camps = [], cadets = [] } = useDataContext();
    const isAdmin = userRole === 'admin' || userRole === 'officer';
    const [searchTerm, setSearchTerm] = useState('');

    const activeCamps = camps.filter(c => new Date(c.endDate) >= new Date());
    const currentCadet = cadets.find(c => c.enrollmentId === userEnrollmentId);

    const handleApply = async (campId) => {
        if (!currentCadet) return toast.error("Cadet profile not found");
        try {
            await nominateForCamp(campId, {
                cadetId: currentCadet.id,
                cadetName: userName,
                enrollmentId: userEnrollmentId,
                rank: currentCadet.rank || 'Cdt',
                company: currentCadet.company || 'N/A'
            });
            toast.success("Nomination application submitted!");
        } catch (err) {
            toast.error("Failed to submit application");
        }
    };

    const handleStatusUpdate = async (campId, cadetId, status) => {
        try {
            await updateNominationStatus(campId, cadetId, status);
            toast.success(`Nomination ${status.toLowerCase()}ed`);
        } catch (err) {
            toast.error("Status update failed");
        }
    };

    if (isAdmin) {
        return (
            <div className="space-y-8 fade-in">
                <header className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-ncc-navy/5 shadow-sm">
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-2">Camp Nomination Control</h2>
                    <p className="text-gray-500 dark:text-white/70 dark:text-white/70">Review and approve cadet nominations for upcoming specialized camps.</p>
                </header>

                <div className="space-y-6">
                    {activeCamps.map(camp => {
                        const nominations = camp.nominations || [];
                        const pending = nominations.filter(n => n.status === 'Pending');
                        
                        return (
                            <div key={camp.id} className="ncc-card overflow-hidden">
                                <div className="bg-ncc-navy p-6 text-white flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-display font-bold">{camp.name}</h3>
                                        <div className="flex items-center gap-4 mt-2 text-white/60 text-xs">
                                            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {camp.location}</span>
                                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(camp.startDate)}</span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black uppercase tracking-widest text-ncc-gold mb-1">Queue Status</p>
                                        <p className="text-lg font-bold">{pending.length} Pending Requests</p>
                                    </div>
                                </div>
                                
                                <div className="p-6">
                                    {nominations.length === 0 ? (
                                        <p className="text-center py-8 text-sm text-gray-500 dark:text-white/70 italic">No nominations received for this camp yet.</p>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-widest border-b border-ncc-navy/5">
                                                        <th className="px-4 py-3 text-left">Cadet Details</th>
                                                        <th className="px-4 py-3 text-left">Unit Context</th>
                                                        <th className="px-4 py-3 text-left">Application Date</th>
                                                        <th className="px-4 py-3 text-center">Status</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-ncc-navy/5">
                                                    {nominations.map((nom, idx) => (
                                                        <tr key={idx} className="hover:bg-ncc-navy/[0.01]">
                                                            <td className="px-4 py-4">
                                                                <div className="font-bold text-ncc-navy dark:text-white">{nom.cadetName}</div>
                                                                <div className="text-[10px] text-ncc-gold font-black uppercase tracking-widest">{nom.enrollmentId}</div>
                                                            </td>
                                                            <td className="px-4 py-4">
                                                                <div className="text-xs font-bold text-gray-600 dark:text-white/80">{nom.rank}</div>
                                                                <div className="text-[10px] text-gray-500 dark:text-white/70 uppercase font-black">{nom.company}</div>
                                                            </td>
                                                            <td className="px-4 py-4 text-xs text-gray-500 dark:text-white/70 dark:text-white/70">{formatDate(nom.appliedAt)}</td>
                                                            <td className="px-4 py-4 text-center">
                                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                    nom.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                                    nom.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                    {nom.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-4 text-right">
                                                                {nom.status === 'Pending' && (
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={() => handleStatusUpdate(camp.id, nom.cadetId, 'Approved')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all"><CheckCircle className="w-4 h-4" /></button>
                                                                        <button onClick={() => handleStatusUpdate(camp.id, nom.cadetId, 'Rejected')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all"><XCircle className="w-4 h-4" /></button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 fade-in">
            <header className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-ncc-navy/5 shadow-sm">
                <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-2">Available Camp Opportunities</h2>
                <p className="text-gray-500 dark:text-white/70 dark:text-white/70">Nominate yourself for upcoming specialized training camps and deployments.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeCamps.map(camp => {
                    const myNomination = camp.nominations?.find(n => n.cadetId === currentCadet?.id);
                    
                    return (
                        <div key={camp.id} className="ncc-card flex flex-col group">
                            <div className="p-8 flex-1 space-y-6">
                                <div className="flex justify-between items-start">
                                    <span className="px-3 py-1 bg-ncc-navy text-white text-[10px] font-black uppercase tracking-widest rounded-full">{camp.type}</span>
                                    {myNomination && (
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            myNomination.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                            myNomination.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                        }`}>
                                            {myNomination.status}
                                        </span>
                                    )}
                                </div>
                                
                                <div>
                                    <h3 className="text-2xl font-display font-bold text-ncc-navy dark:text-white group-hover:text-ncc-gold transition-colors">{camp.name}</h3>
                                    <div className="flex items-center gap-2 text-gray-500 dark:text-white/70 text-sm mt-1">
                                        <MapPin className="w-3.5 h-3.5" /> {camp.location}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-ncc-navy/5">
                                    <div>
                                        <p className="text-[10px] font-black text-ncc-navy dark:text-white/30 uppercase tracking-widest mb-1">Start Date</p>
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">{formatDate(camp.startDate)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-ncc-navy dark:text-white/30 uppercase tracking-widest mb-1">End Date</p>
                                        <p className="text-sm font-bold text-ncc-navy dark:text-white">{formatDate(camp.endDate)}</p>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-6 bg-gray-50 dark:bg-[#0a1628] border-t border-ncc-navy/5">
                                <button 
                                    onClick={() => handleApply(camp.id)}
                                    disabled={!!myNomination}
                                    className={`w-full py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all ${
                                        myNomination 
                                            ? 'bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70 cursor-not-allowed' 
                                            : 'bg-ncc-navy text-white hover:bg-ncc-gold shadow-lg shadow-ncc-navy/10'
                                    }`}
                                >
                                    {myNomination ? `Application ${myNomination.status}` : 'Apply for Nomination'}
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
