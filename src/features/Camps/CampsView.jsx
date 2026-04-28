import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { Tent, Plus, Calendar, MapPin, Users } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';

import { CampForm } from './CampForm.jsx';
import { CampDetailsModal } from './CampDetailsModal.jsx';

export const CampsView = () => {
    const { userRole, userEnrollmentId } = useAuthContext();
    const { camps = [] } = useDataContext();
    const [showForm, setShowForm] = useState(false);
    const [selectedCamp, setSelectedCamp] = useState(null);

    // If cadet, maybe only see camps they are in or just active camps. 
    // Usually standard app lets them see all active camps, then they click to see their status or roster.
    const visibleCamps = camps.sort((a, b) => new Date(b.startDate) - new Date(a.startDate)); // newest first

    return (
        <div className="space-y-6 fade-in">
            {/* Top Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white border border-[#ddd8cc] shadow-sm">
                        <Tent className="w-5 h-5 text-ncc-navy" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold font-display text-ncc-navy">Camp Management</h2>
                        <p className="text-sm text-gray-500">Track deployments, selections, and achievements.</p>
                    </div>
                </div>
                {userRole === 'admin' && (
                    <button onClick={() => setShowForm(true)} className="ncc-btn ncc-btn-primary">
                        <Plus className="w-4 h-4" /> Create Camp
                    </button>
                )}
            </div>

            {/* Camps Grid */}
            {visibleCamps.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm border border-[#ddd8cc] p-12 text-center">
                    <Tent className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 font-medium">No camps scheduled yet.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {visibleCamps.map(camp => {
                        const rosterCount = camp.roster ? camp.roster.length : 0;
                        const endDateObj = new Date(camp.endDate);
                        const isPast = endDateObj < new Date();

                        // Check if cadet is in this camp
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
                                className="bg-white rounded-xl shadow-sm border border-[#ddd8cc] overflow-hidden hover:shadow-md transition cursor-pointer flex flex-col"
                            >
                                <div className="p-5 flex-1 relative">
                                    <div className="flex justify-between items-start mb-3">
                                        <span className={`px-2.5 py-1 text-[10px] font-bold tracking-widest uppercase rounded ${
                                            isPast ? 'bg-gray-100 text-gray-500' : 'bg-ncc-navy text-white'
                                        }`}>
                                            {camp.type}
                                        </span>
                                        {cadetStatusBadge}
                                    </div>
                                    <h3 className="font-bold text-lg text-ncc-navy leading-tight mb-2">{camp.name}</h3>
                                    
                                    <div className="space-y-1.5 mt-4">
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <Calendar className="w-3.5 h-3.5" />
                                            <span>{formatDate(camp.startDate)} to {formatDate(camp.endDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-600">
                                            <MapPin className="w-3.5 h-3.5" />
                                            <span>{camp.location}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-[#f5f0e8] px-5 py-3 border-t border-[#ddd8cc] flex items-center justify-between text-xs font-semibold text-gray-600">
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

            {showForm && <CampForm onClose={() => setShowForm(false)} />}
            {selectedCamp && <CampDetailsModal camp={selectedCamp} onClose={() => setSelectedCamp(null)} />}
        </div>
    );
};
