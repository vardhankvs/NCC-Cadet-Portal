import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { 
    Heart, 
    Plus, 
    Calendar, 
    MapPin, 
    Users, 
    Trash2, 
    Download,
    Search,
    X as XIcon,
    AlertCircle,
    Camera
} from '../../components/Icons.jsx';
import { SocialGalleryModal } from './SocialGalleryModal.jsx';

import { addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { db } from '../../firebase/config.js';
import { toast } from 'react-toastify';
import { sendPushToAll } from '../../firebase/pushNotifications.js';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';
import jsPDF from 'jspdf';
import nccLogo from '../../assets/ncc_logo.jpg.jpg';
import { formatDate } from '../../utils/dateUtils.js';
import { generateNominalRollPDF } from '../../utils/pdfGenerator.js';


export const SocialServiceView = () => {
    const { userRole, userEnrollmentId, userName, userInstitutionId } = useAuthContext();
    const { cadets, socialActivities, loading } = useDataContext();
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [newActivity, setNewActivity] = useState({
        title: '',
        type: 'Swachh Bharat',
        date: new Date().toISOString().split('T')[0],
        location: '',
        description: ''
    });
    const [processing, setProcessing] = useState(false);
    const [selectedActivity, setSelectedActivity] = useState(null); // For volunteer management modal
    const [vmSearch, setVmSearch] = useState('');
    const [vmFilterDiv, setVmFilterDiv] = useState('All');
    const [vmFilterCert, setVmFilterCert] = useState('All');
    const [activeGallery, setActiveGallery] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredActivities = useMemo(() => {
        if (!searchQuery) return socialActivities || [];
        const q = searchQuery.toLowerCase();
        return (socialActivities || []).filter(a => 
            (a.title || '').toLowerCase().includes(q) || 
            (a.type || '').toLowerCase().includes(q)
        );
    }, [socialActivities, searchQuery]);


    const activityTypes = [
        'Swachh Bharat',
        'Blood Donation',
        'Puneet Sagar Abhiyan',
        'Health & Hygiene',
        'Environmental Awareness',
        'Disaster Management',
        'Others'
    ];

    const filteredCadetsForVM = useMemo(() => {
        return cadets.filter(c => {
            const matchesSearch = (c.name || '').toLowerCase().includes(vmSearch.toLowerCase()) || 
                                 (c.enrollmentId || '').toLowerCase().includes(vmSearch.toLowerCase());
            
            // Division logic: Check enrollment ID for SD/SW pattern
            const cadetDiv = (c.enrollmentId || '').toUpperCase().includes('SW') ? 'SW' : 'SD';
            const matchesDiv = vmFilterDiv === 'All' || cadetDiv === vmFilterDiv;
            
            // Certificate logic: support both 'certificate' and 'B' fields
            const cadetCert = c.certificate || c.B || 'NA';
            const matchesCert = vmFilterCert === 'All' || cadetCert === vmFilterCert;
            
            return matchesSearch && matchesDiv && matchesCert;
        });
    }, [cadets, vmSearch, vmFilterDiv, vmFilterCert]);

    const handleBulkToggle = async (activityId, currentVolunteers, visibleCadetIds, action) => {
        try {
            const activityRef = doc(getCollectionRef('social_activities'), activityId);
            let updatedVolunteers = [...(currentVolunteers || [])];
            
            if (action === 'select_all') {
                // Add all visible IDs that are not already present
                const newIds = visibleCadetIds.filter(id => !updatedVolunteers.includes(id));
                updatedVolunteers = [...updatedVolunteers, ...newIds];
            } else {
                // Remove all visible IDs
                updatedVolunteers = updatedVolunteers.filter(id => !visibleCadetIds.includes(id));
            }

            await updateDoc(activityRef, { volunteers: updatedVolunteers });
            toast.success(action === 'select_all' ? "All visible cadets added." : "All visible cadets removed.");
        } catch (err) {
            toast.error("Bulk update failed.");
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setProcessing(true);
        try {
            const activitiesRef = getCollectionRef('social_activities');
            await addDoc(activitiesRef, {
                ...newActivity,
                institutionId: userInstitutionId || '14a-bn-srikakulam',
                volunteers: [],
                imageUrls: [],
                createdBy: userName || 'Admin',
                createdAt: serverTimestamp()
            });
            toast.success("Social activity logged successfully!");
            sendPushToAll('🤝 New Social Activity', 'A new social service activity has been posted');
            setShowAddForm(false);
            setNewActivity({
                title: '',
                type: 'Swachh Bharat',
                date: new Date().toISOString().split('T')[0],
                location: '',
                description: ''
            });
        } catch (err) {
            console.error(err);
            toast.error("Failed to log activity.");
        } finally {
            setProcessing(false);
        }
    };

    const toggleVolunteer = async (activityId, cadetId, isParticipating) => {
        try {
            const activityRef = doc(getCollectionRef('social_activities'), activityId);
            await updateDoc(activityRef, {
                volunteers: isParticipating ? arrayRemove(cadetId) : arrayUnion(cadetId)
            });
        } catch (err) {
            toast.error("Update failed.");
        }
    };

    const generateCertificate = (activity, cadet) => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // 1. Draw Background & Borders
        // Main Navy Background Border
        doc.setFillColor(10, 22, 40); // NCC Navy
        doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'F');
        
        // Inner White Paper Area
        doc.setFillColor(255, 255, 255);
        doc.rect(8, 8, pageWidth - 16, pageHeight - 16, 'F');

        // Elegant Double Border (Gold)
        doc.setDrawColor(184, 131, 14); // NCC Gold
        doc.setLineWidth(1.5);
        doc.rect(12, 12, pageWidth - 24, pageHeight - 24);
        doc.setLineWidth(0.5);
        doc.rect(14, 14, pageWidth - 28, pageHeight - 28);

        // 2. Add Decorative Corners (optional but makes it look effective)
        doc.setLineWidth(2);
        const s = 15;
        // Top Left
        doc.line(12, 12, 12 + s, 12); doc.line(12, 12, 12, 12 + s);
        // Top Right
        doc.line(pageWidth - 12 - s, 12, pageWidth - 12, 12); doc.line(pageWidth - 12, 12, pageWidth - 12, 12 + s);
        // Bottom Left
        doc.line(12, pageHeight - 12, 12 + s, pageHeight - 12); doc.line(12, pageHeight - 12, 12, pageHeight - 12 - s);
        // Bottom Right
        doc.line(pageWidth - 12 - s, pageHeight - 12, pageWidth - 12, pageHeight - 12); doc.line(pageWidth - 12, pageHeight - 12, pageWidth - 12, pageHeight - 12 - s);

        // 3. Title & Branding
        doc.setFont("times", "bold");
        doc.setTextColor(10, 22, 40);
        doc.setFontSize(32);
        doc.text("CERTIFICATE OF APPRECIATION", pageWidth / 2, 45, { align: "center" });

        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 100, 100);
        doc.text("GMR INSTITUTE OF TECHNOLOGY - NCC UNIT (10(A) BN)", pageWidth / 2, 54, { align: "center" });

        // 4. Main Body Content (Drawn OVER background)
        doc.setTextColor(10, 22, 40);
        doc.setFont("times", "italic");
        doc.setFontSize(20);
        doc.text("This certificate is proudly presented to", pageWidth / 2, 75, { align: "center" });

        doc.setFont("times", "bold");
        doc.setFontSize(36);
        doc.setTextColor(184, 131, 14); // Gold for Name
        doc.text(cadet.name.toUpperCase(), pageWidth / 2, 95, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(10, 22, 40);
        doc.text(`Regimental No: ${cadet.enrollmentId} | Rank: ${cadet.rank || 'Cadet'}`, pageWidth / 2, 105, { align: "center" });

        doc.setFont("times", "italic");
        doc.setFontSize(18);
        doc.text("for their exemplary dedication and selfless service during the", pageWidth / 2, 125, { align: "center" });

        doc.setFont("helvetica", "bold");
        doc.setFontSize(22);
        doc.setTextColor(10, 22, 40);
        doc.text(activity.title.toUpperCase(), pageWidth / 2, 140, { align: "center" });

        doc.setFont("helvetica", "normal");
        doc.setFontSize(14);
        doc.setTextColor(80, 80, 80);
        doc.text(`conducted on ${formatDate(activity.date)} at ${activity.location}`, pageWidth / 2, 150, { align: "center" });

        // 5. Signatures & Footer
        // Left Signature (ANO)
        doc.setDrawColor(10, 22, 40);
        doc.setLineWidth(0.5);
        doc.line(40, 180, 100, 180);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.setTextColor(10, 22, 40);
        doc.text("ASSOCIATE NCC OFFICER", 70, 186, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("14(A) BN NCC - Srikakulam", 70, 192, { align: "center" });

        // Right Signature (CO)
        doc.line(pageWidth - 40, 180, pageWidth - 100, 180);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("COMMANDING OFFICER", pageWidth - 70, 186, { align: "center" });
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text("14(A) BATTALION", pageWidth - 70, 192, { align: "center" });

        // Logos (Placeholder if image fails, otherwise addImage)
        try {
            // NCC Logo (Top Left)
            doc.addImage(nccLogo, 'JPEG', 25, 20, 25, 25);
            doc.setFontSize(9);
            doc.text("14(A) BN, Visakhapatnam Group, Srikakulam", pageWidth - 25, 33, { align: "right" });
        } catch (e) {
            console.warn("Logo failed to load for PDF:", e);
        }

        doc.save(`${cadet.enrollmentId}_Social_Service_Certificate.pdf`);
    };

    if (loading) return <div className="p-20 text-center"><LoadingIndicator /></div>;

    return (
        <div className="space-y-6 fade-in">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div>
                    <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white">Social Service Tracking</h2>
                    <p className="text-gray-500 dark:text-white/70 text-sm">Community service, blood donation, and awareness drives.</p>
                </div>
                {userRole === 'admin' && (
                    <button 
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="ncc-btn ncc-btn-primary px-6 flex items-center gap-2"
                    >
                        {showAddForm ? <XIcon className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {showAddForm ? 'Cancel' : 'Add New Activity'}
                    </button>
                )}
            </header>

            {showAddForm && (
                <div className="ncc-card p-6 border-2 border-ncc-gold/30 animate-in slide-in-from-top-4">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="sm:col-span-1">
                                <label className="ncc-label">Activity Title</label>
                                <input 
                                    type="text" required
                                    className="ncc-input"
                                    placeholder="e.g. Puneet Sagar Abhiyan Phase 2"
                                    value={newActivity.title}
                                    onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                                />
                            </div>
                            <div className="sm:col-span-1">
                                <label className="ncc-label">Activity Type</label>
                                <select 
                                    className="ncc-input"
                                    value={newActivity.type}
                                    onChange={e => setNewActivity({...newActivity, type: e.target.value})}
                                >
                                    {activityTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="ncc-label">Date</label>
                                <input 
                                    type="date" required
                                    className="ncc-input"
                                    value={newActivity.date}
                                    onChange={e => setNewActivity({...newActivity, date: e.target.value})}
                                />
                            </div>
                            <div>
                                <label className="ncc-label">Location</label>
                                <input 
                                    type="text" required
                                    className="ncc-input"
                                    placeholder="e.g. Srikakulam / District Stadium"
                                    value={newActivity.location}
                                    onChange={e => setNewActivity({...newActivity, location: e.target.value})}
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="ncc-label">Description (Optional)</label>
                                <textarea 
                                    className="ncc-input h-20"
                                    placeholder="Brief details about the activity..."
                                    value={newActivity.description}
                                    onChange={e => setNewActivity({...newActivity, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={processing}
                            className="ncc-btn ncc-btn-success w-full py-4 text-sm font-black tracking-widest uppercase"
                        >
                            {processing ? 'Logging Activity...' : 'Create Social Activity'}
                        </button>
                    </form>
                </div>
            )}

            {!showAddForm && (socialActivities || []).length > 0 && (
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-white/40" />
                    <input 
                        type="text"
                        placeholder="Search by Title or Activity Type..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy focus:ring-1 focus:ring-ncc-navy transition-all dark:text-white shadow-sm"
                    />
                </div>
            )}

            <div className="grid grid-cols-1 gap-6">
                {(filteredActivities || []).length === 0 ? (
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] border-2 border-dashed border-[#ddd8cc] rounded-2xl p-12 text-center">
                        <Heart className="w-12 h-12 text-[#ddd8cc] mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-white/70 italic">No social activities match your search.</p>
                    </div>
                ) : (
                    filteredActivities.map(activity => {
                        const isParticipating = activity.volunteers?.includes(userEnrollmentId);
                        
                        return (
                            <div key={activity.id} className="ncc-card overflow-hidden group border-[#ddd8cc] hover:border-ncc-gold transition-all duration-300">
                                <div className="p-6">
                                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-3 py-1 bg-ncc-navy/5 text-ncc-navy dark:text-white text-[10px] font-black uppercase tracking-widest rounded-full border border-ncc-navy/10">
                                                    {activity.type}
                                                </span>
                                                <span className="text-gray-400 dark:text-white/60 text-[10px] flex items-center gap-1 font-bold">
                                                    <Calendar className="w-3 h-3" /> {formatDate(activity.date)}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white transition-colors">
                                                {activity.title}
                                            </h3>
                                            <p className="text-gray-500 dark:text-white/70 text-sm mt-2 flex items-center gap-1">
                                                <MapPin className="w-4 h-4 text-ncc-gold" /> {activity.location}
                                            </p>
                                            {activity.description && (
                                                <p className="text-gray-600 dark:text-white/80 text-sm mt-3 border-l-2 border-[#ddd8cc] pl-4 italic">
                                                    {activity.description}
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-2 w-full sm:w-auto">
                                            <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-3 rounded-xl border border-[#ddd8cc] text-center">
                                                <p className="text-[10px] font-black text-gray-500 dark:text-white/80 uppercase tracking-tighter mb-1">Volunteers</p>
                                                <p className="text-2xl font-black text-ncc-navy dark:text-white leading-none">{(activity.volunteers || []).length}</p>
                                            </div>
                                            
                                            {userRole === 'admin' ? (
                                                <button 
                                                    onClick={() => setSelectedActivity(activity)}
                                                    className="ncc-btn ncc-btn-secondary ncc-btn-sm w-full py-2 flex items-center justify-center gap-2 border-2"
                                                >
                                                    <Users className="w-4 h-4" /> Manage Volunteers
                                                </button>
                                            ) : (
                                                isParticipating && (
                                                    <button 
                                                        onClick={() => {
                                                            const cadet = cadets.find(c => c.enrollmentId === userEnrollmentId);
                                                            if (cadet) generateCertificate(activity, cadet);
                                                        }}
                                                        className="ncc-btn ncc-btn-primary ncc-btn-sm flex items-center justify-center gap-2"
                                                    >
                                                        <Download className="w-4 h-4" /> My Certificate
                                                    </button>
                                                )
                                            )}

                                            {userRole === 'admin' && (
                                                <div className="flex flex-col gap-1.5">
                                                    <button 
                                                        onClick={() => {
                                                            const volunteerCadets = (activity.volunteers || []).map(vid => 
                                                                cadets.find(c => c.enrollmentId === vid)
                                                            ).filter(Boolean);
                                                            generateNominalRollPDF(
                                                                volunteerCadets, 
                                                                `Volunteer Roll - ${activity.title}`, 
                                                                `${activity.title}_Roll_Regtl.pdf`,
                                                                'regimental',
                                                                activity.location,
                                                                activity.date
                                                            );
                                                        }}
                                                        className="ncc-btn bg-[#f5f0e8] dark:bg-[#0a1628] text-ncc-navy dark:text-white border border-[#ddd8cc] hover:border-ncc-gold ncc-btn-sm w-full py-2 text-xs flex items-center justify-center gap-2"
                                                    >
                                                        <Download className="w-3.5 h-3.5 text-ncc-gold" /> Regtl Nominal Roll
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            const volunteerCadets = (activity.volunteers || []).map(vid => 
                                                                cadets.find(c => c.enrollmentId === vid)
                                                            ).filter(Boolean);
                                                            generateNominalRollPDF(
                                                                volunteerCadets, 
                                                                `Volunteer Roll - ${activity.title}`, 
                                                                `${activity.title}_Roll_JNTU.pdf`,
                                                                'jntu',
                                                                activity.location,
                                                                activity.date
                                                            );
                                                        }}
                                                        className="ncc-btn bg-[#f5f0e8] dark:bg-[#0a1628] text-ncc-navy dark:text-white border border-[#ddd8cc] hover:border-ncc-gold ncc-btn-sm w-full py-2 text-xs flex items-center justify-center gap-2"
                                                    >
                                                        <Download className="w-3.5 h-3.5 text-ncc-gold" /> JNTU Nominal Roll
                                                    </button>
                                                </div>
                                            )}


                                            <button 
                                                onClick={() => setActiveGallery(activity)}
                                                className="ncc-btn bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border-2 border-[#ddd8cc] hover:border-ncc-gold ncc-btn-sm w-full py-2 flex items-center justify-center gap-2"
                                            >
                                                <Camera className="w-4 h-4 text-ncc-gold" /> Gallery
                                            </button>


                                        </div>
                                    </div>
                                </div>
                                {isParticipating && userRole === 'cadet' && (
                                    <div className="bg-emerald-50 px-6 py-2 border-t border-emerald-100 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">You participated in this activity</span>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Volunteer Management Modal */}
            {selectedActivity && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-ncc-navy/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-[#050b14] w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="bg-ncc-navy p-6 flex justify-between items-center">
                            <div>
                                <h3 className="text-white font-bold uppercase tracking-[0.2em] text-sm">Volunteer Registry</h3>
                                <p className="text-ncc-gold/80 text-xs font-semibold">{selectedActivity.title}</p>
                            </div>
                            <button onClick={() => setSelectedActivity(null)} className="text-white/50 hover:text-white transition">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        
                        <div className="p-4 bg-gray-50 dark:bg-[#0a1628] border-b border-[#ddd8cc] space-y-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <div className="flex-1 relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/60" />
                                    <input 
                                        type="text"
                                        placeholder="Search by name or enrollment ID..."
                                        className="ncc-input pl-10 h-10 text-sm"
                                        value={vmSearch}
                                        onChange={e => setVmSearch(e.target.value)}
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <select 
                                        className="ncc-input h-10 py-0 text-sm w-32"
                                        value={vmFilterDiv}
                                        onChange={e => setVmFilterDiv(e.target.value)}
                                    >
                                        <option value="All">All Div</option>
                                        <option value="SD">SD</option>
                                        <option value="SW">SW</option>
                                    </select>
                                    <select 
                                        className="ncc-input h-10 py-0 text-sm w-32"
                                        value={vmFilterCert}
                                        onChange={e => setVmFilterCert(e.target.value)}
                                    >
                                        <option value="All">All Cert</option>
                                        <option value="B1">B1</option>
                                        <option value="B2">B2</option>
                                        <option value="C">C</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex items-center justify-between px-2">
                                <p className="text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-widest">
                                    Showing {filteredCadetsForVM.length} Cadets
                                </p>
                                <div className="flex items-center gap-4">
                                    <button 
                                        onClick={() => handleBulkToggle(selectedActivity.id, selectedActivity.volunteers, filteredCadetsForVM.map(c => c.enrollmentId), 'select_all')}
                                        className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                                    >
                                        Select All Visible
                                    </button>
                                    <button 
                                        onClick={() => handleBulkToggle(selectedActivity.id, selectedActivity.volunteers, filteredCadetsForVM.map(c => c.enrollmentId), 'deselect_all')}
                                        className="text-[10px] font-black text-red-600 uppercase tracking-widest hover:underline"
                                    >
                                        Deselect All Visible
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="p-6 max-h-[50vh] overflow-y-auto ncc-scrollbar">
                           <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {filteredCadetsForVM.map(cadet => {
                                    const isIncluded = selectedActivity.volunteers?.includes(cadet.enrollmentId);
                                    return (
                                        <div 
                                            key={cadet.id}
                                            onClick={() => toggleVolunteer(selectedActivity.id, cadet.enrollmentId, isIncluded)}
                                            className={`p-3 rounded-xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                                                isIncluded 
                                                    ? 'bg-ncc-navy dark:bg-[#112240] border-ncc-gold shadow-lg scale-[1.02]' 
                                                    : 'bg-white dark:bg-[#0a1628] border-transparent hover:border-ncc-gold/30'
                                            }`}
                                        >
                                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                                isIncluded ? 'bg-ncc-gold border-ncc-gold text-ncc-navy' : 'bg-white dark:bg-[#0a1628] border-gray-300'
                                            }`}>
                                                {isIncluded && <Users className="w-3 h-3" />}
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`text-xs font-bold truncate ${isIncluded ? 'text-white' : 'text-ncc-navy dark:text-white'}`}>{cadet.name}</p>
                                                <p className={`text-[9px] font-mono ${isIncluded ? 'text-white/70' : 'text-gray-500 dark:text-white/70'}`}>{cadet.enrollmentId}</p>
                                            </div>
                                        </div>
                                    );
                                })}
                                {filteredCadetsForVM.length === 0 && (
                                    <div className="col-span-full py-12 text-center text-gray-400 dark:text-white/60 italic text-sm">
                                        No cadets match your active filters.
                                    </div>
                                )}
                           </div>
                        </div>

                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-6 border-t border-[#ddd8cc] flex justify-between items-center">
                            <p className="text-xs font-bold text-gray-500 dark:text-white/70">
                                {(selectedActivity.volunteers || []).length} Volunteers Selected
                            </p>
                            <button onClick={() => setSelectedActivity(null)} className="ncc-btn ncc-btn-primary px-8">Done</button>
                        </div>
                    </div>
                </div>
            )}

            {activeGallery && (
                <SocialGalleryModal 
                    activity={activeGallery} 
                    userRole={userRole} 
                    onClose={() => setActiveGallery(null)} 
                />
            )}
        </div>

    );
};
