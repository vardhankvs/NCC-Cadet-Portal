import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { Tent, Plus, Calendar, MapPin, Users, Search } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';

import { CampForm } from './CampForm.jsx';
import { CampDetailsModal } from './CampDetailsModal.jsx';
import { CampNominationView } from './CampNominationView.jsx';

export const CampsView = () => {
    const { userRole, userEnrollmentId } = useAuthContext();
    const { camps = [] } = useDataContext();
    const [showForm, setShowForm] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState(null);
    const [activeTab, setActiveTab] = useState('camps'); // 'camps' or 'nominations'
    const [searchQuery, setSearchQuery] = useState('');

    const visibleCamps = React.useMemo(() => {
        let filtered = camps || [];
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(c => 
                (c.name || '').toLowerCase().includes(q) || 
                (c.type || '').toLowerCase().includes(q)
            );
        }
        return filtered.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // newest first
    }, [camps, searchQuery]);

    return (
        <div className="space-y-6 fade-in">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-[#050b14] border border-[#ddd8cc] shadow-sm">
                        <Tent className="w-5 h-5 text-ncc-navy dark:text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-ncc-navy dark:text-white">Camp Management</h2>
                        <p className="text-sm text-gray-500 dark:text-white/70 dark:text-white/70">Track deployments, selections, and achievements.</p>
                    </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <div className="flex bg-ncc-navy/5 dark:bg-white/5 p-1 rounded-2xl">
                        <button 
                            onClick={() => setActiveTab('camps')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'camps' ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-sm' : 'text-ncc-navy dark:text-white/40 hover:text-ncc-navy dark:hover:text-white'}`}
                        >
                            Active Camps
                        </button>
                        <button 
                            onClick={() => setActiveTab('nominations')}
                            className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'nominations' ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-sm' : 'text-ncc-navy dark:text-white/40 hover:text-ncc-navy dark:hover:text-white'}`}
                        >
                            Nominations
                        </button>
                    </div>
                    {userRole === 'admin' && activeTab === 'camps' && (
                        <button onClick={() => setShowForm(true)} className="ncc-btn ncc-btn-primary whitespace-nowrap">
                            <Plus className="w-4 h-4" /> Create Camp
                        </button>
                    )}
                </div>
            </div>

            {activeTab === 'nominations' ? (
                <CampNominationView />
            ) : (
                <div className="space-y-6">
                    {camps.length > 0 && (
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
                            <input 
                                type="text"
                                placeholder="Search by Camp Title or Type..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy focus:ring-1 focus:ring-ncc-navy transition-all dark:text-white shadow-sm"
                            />
                        </div>
                    )}

                    {/* Camps Grid */}
                    {visibleCamps.length === 0 ? (
                        <div className="bg-white dark:bg-[#050b14] rounded-xl shadow-sm border border-[#ddd8cc] p-12 text-center">
                            <Tent className="w-12 h-12 text-gray-500 dark:text-white/70 mx-auto mb-4" />
                            <p className="text-gray-500 dark:text-white/70 dark:text-white/70 font-medium">No camps scheduled yet.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {visibleCamps.map(camp => {
                                const rosterCount = camp.roster ? camp.roster.length : 0;
                                const endDateObj = new Date(camp.endDate);
                                const isPast = endDateObj < new Date();

                                let cadetStatusBadge = null;
                                if (userRole === 'cadet') {
                                    const myEntry = camp.roster?.find(r => r.enrollmentId === userEnrollmentId);
                                    if (myEntry) {
                                        cadetStatusBadge = (
                                            <span className={`px-2 py-1 text-[10px] font-bold rounded ${
                                                myEntry.status === 'Selected' || myEntry.status === 'Attended' 
                                                    ? 'bg-emerald-100 text-emerald-800' 
                                                    : 'bg-blue-100 text-blue-800'
                                            }`}>
                                                You: {myEntry.status}
                                            </span>
                                        );
                                    }
                                }

                                return (
                                    <div 
                                        key={camp.id} 
                                        onClick={() => setSelectedCamp(camp)}
                                        className="bg-white dark:bg-[#050b14] rounded-xl shadow-sm border border-[#ddd8cc] overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col"
                                    >
                                        <div className="p-5 flex-1 relative">
                                            <div className="flex justify-between items-start mb-3">
                                                <span className={`px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded ${
                                                    isPast ? 'bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70 dark:text-white/70' : 'bg-ncc-navy text-white'
                                                }`}>
                                                    {camp.type}
                                                </span>
                                                {cadetStatusBadge}
                                            </div>
                                            <h3 className="font-bold text-lg text-ncc-navy dark:text-white leading-tight mb-2">{camp.name}</h3>
                                            
                                            <div className="space-y-1.5 mt-4">
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/80">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{formatDate(camp.startDate)} to {formatDate(camp.endDate)}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-white/80">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span>{camp.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] px-5 py-3 border-t border-[#ddd8cc] flex items-center justify-between text-xs font-semibold text-ncc-navy dark:text-white">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-3.5 h-3.5" /> {rosterCount} Cadets
                                            </div>
                                            <span className="text-ncc-gold hover:underline">View Details &rarr;</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {showForm && <CampForm onClose={() => setShowForm(false)} />}
            {selectedCamp && <CampDetailsModal camp={selectedCamp} onClose={() => setSelectedCamp(null)} />}
        </div>
    );
};
