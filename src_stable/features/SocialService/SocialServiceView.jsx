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
    Camera,
    Edit,
    Filter,
    Check,
    ChevronDown
} from '../../components/Icons.jsx';
import { SocialGalleryModal } from './SocialGalleryModal.jsx';

import { addDoc, doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { getCollectionRef } from '../../firebase/firestoreService.js';
import { db } from '../../firebase/config.js';
import { toast } from 'react-toastify';
import { sendPushToAll, sendPushToUser } from '../../firebase/pushNotifications.js';
import { LoadingIndicator } from '../../components/ui/LoadingIndicator.jsx';
import jsPDF from 'jspdf';
import nccLogo from '../../assets/ncc_logo.jpg';
import { formatDate } from '../../utils/dateUtils.js';
import { generateNominalRollPDF } from '../../utils/pdfGenerator.js';
import * as XLSX from 'xlsx';


export const SocialServiceView = () => {
    const { userRole, isDelegatedCadet, userEnrollmentId, userName, userInstitutionId, user } = useAuthContext();
    const { cadets, socialActivities, loading } = useDataContext();
    
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingActivityId, setEditingActivityId] = useState(null);
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
    const [selectedTypes, setSelectedTypes] = useState([]);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activityCertFilter, setActivityCertFilter] = useState({});

    const activityTypes = [
        'Swachh Bharat',
        'Blood Donation',
        'Puneet Sagar Abhiyan',
        'Health & Hygiene',
        'Environmental Awareness',
        'Disaster Management',
        'Others'
    ];

    const availableActivityTypes = useMemo(() => {
        const types = new Set();
        (socialActivities || []).forEach(a => {
            if (a.type && a.type.trim()) {
                types.add(a.type.trim());
            }
        });
        return Array.from(types).sort();
    }, [socialActivities]);

    const activityTypeCounts = useMemo(() => {
        const counts = {};
        (socialActivities || []).forEach(a => {
            if (a.type) counts[a.type] = (counts[a.type] || 0) + 1;
        });
        return counts;
    }, [socialActivities]);

    const toggleType = (type) => {
        setSelectedTypes(prev => 
            prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]
        );
    };

    const filteredActivities = useMemo(() => {
        let list = socialActivities || [];
        if (selectedTypes.length > 0) {
            list = list.filter(a => selectedTypes.includes(a.type));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(a => 
                (a.title || '').toLowerCase().includes(q) || 
                (a.type || '').toLowerCase().includes(q) ||
                (a.location || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [socialActivities, searchQuery, selectedTypes]);

    const totalVolunteersCount = useMemo(() => {
        return (filteredActivities || []).reduce((sum, a) => sum + (a.volunteers?.length || 0), 0);
    }, [filteredActivities]);

    const uniqueLocationsCount = useMemo(() => {
        return new Set((filteredActivities || []).map(a => (a.location || '').trim()).filter(Boolean)).size;
    }, [filteredActivities]);

    const myParticipationsCount = useMemo(() => {
        if (!userEnrollmentId) return 0;
        return (filteredActivities || []).filter(a => a.volunteers?.includes(userEnrollmentId)).length;
    }, [filteredActivities, userEnrollmentId]);

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
                const newIds = visibleCadetIds.filter(id => !updatedVolunteers.includes(id));
                updatedVolunteers = [...updatedVolunteers, ...newIds];
                
                // Send push notification to newly added cadets
                newIds.forEach(cadetId => {
                    sendPushToUser(cadetId, 'Volunteer Registry', `You have been selected as a volunteer for: ${selectedActivity?.title || 'a social activity'}`, 'social');
                });
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
            if (isDelegatedCadet) {
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'social',
                    moduleName: 'Social Activities',
                    actionType: editingActivityId ? 'update' : 'create',
                    targetDocId: editingActivityId || null,
                    title: `Social Activity: ${newActivity.title} (${newActivity.type})`,
                    payload: {
                        ...newActivity,
                        id: editingActivityId || null
                    }
                });
                toast.success("Social activity submitted for ANO verification!");
                setShowAddForm(false);
                setEditingActivityId(null);
                setNewActivity({
                    title: '',
                    type: 'Swachh Bharat',
                    date: new Date().toISOString().split('T')[0],
                    location: '',
                    description: ''
                });
                return;
            }

            if (editingActivityId) {
                const activityRef = doc(getCollectionRef('social_activities'), editingActivityId);
                await updateDoc(activityRef, {
                    title: newActivity.title,
                    type: newActivity.type,
                    date: newActivity.date,
                    location: newActivity.location,
                    description: newActivity.description
                });
                toast.success("Activity updated successfully!");
                sendPushToAll('Social Activity Updated', `The social service activity "${newActivity.title}" has been updated.`, 'social');
            } else {
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
                sendPushToAll('New Social Activity', `A new social service activity has been posted: ${newActivity.title}`, 'social');
            }
            setShowAddForm(false);
            setEditingActivityId(null);
            setNewActivity({
                title: '',
                type: 'Swachh Bharat',
                date: new Date().toISOString().split('T')[0],
                location: '',
                description: ''
            });
        } catch (err) {
            console.error(err);
            toast.error(editingActivityId ? "Failed to update activity." : "Failed to log activity.");
        } finally {
            setProcessing(false);
        }
    };

    const handleEdit = (activity) => {
        let formattedDate = new Date().toISOString().split('T')[0];
        if (activity.date) {
            if (typeof activity.date === 'string') {
                formattedDate = activity.date.split('T')[0];
            } else if (activity.date.toDate) {
                const d = activity.date.toDate();
                formattedDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            }
        }

        setEditingActivityId(activity.id);
        setNewActivity({
            title: activity.title || '',
            type: activity.type || 'Swachh Bharat',
            date: formattedDate,
            location: activity.location || '',
            description: activity.description || ''
        });
        setShowAddForm(true);
        
        // Scroll to the top of the page so the user sees the form
        setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
            const mainContent = document.querySelector('main');
            if (mainContent) mainContent.scrollTo({ top: 0, behavior: 'smooth' });
        }, 50);
    };

    const handleDelete = async (activityId) => {
        if (!window.confirm("Are you sure you want to delete this activity? This cannot be undone.")) return;
        try {
            await deleteDoc(doc(getCollectionRef('social_activities'), activityId));
            toast.success("Activity deleted.");
        } catch (err) {
            toast.error("Failed to delete activity.");
        }
    };

    const toggleVolunteer = async (activityId, cadetId, isParticipating) => {
        try {
            const activityRef = doc(getCollectionRef('social_activities'), activityId);
            await updateDoc(activityRef, {
                volunteers: isParticipating ? arrayRemove(cadetId) : arrayUnion(cadetId)
            });
            
            if (!isParticipating) {
                // If they were NOT participating, they just got added.
                sendPushToUser(cadetId, 'Volunteer Registry', `You have been selected as a volunteer for: ${selectedActivity?.title || 'a social activity'}`);
            }
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

    const handleExportActivityExcel = (activity, type, certFilter = 'All') => {
        let selectedCadets = (activity.volunteers || [])
            .map(vid => cadets.find(c => c.enrollmentId === vid || c.regimentalNumber === vid || c.id === vid))
            .filter(Boolean);

        if (certFilter && certFilter !== 'All') {
            selectedCadets = selectedCadets.filter(c => {
                const cert = (c.currentCertificate || c.certificate || c.B || '').trim().toUpperCase();
                return cert === certFilter.toUpperCase();
            });
        }

        if (selectedCadets.length === 0) {
            toast.warn(`No selected cadets${certFilter !== 'All' ? ` with ${certFilter} Certificate` : ''} for this activity.`);
            return;
        }

        const venue = activity.location || activity.venue || 'GMRIT, Rajam';
        const dateStr = formatDate(activity.date) || 'N/A';

        // Sort in branch-wise order (primary: Branch, secondary: JNTU No. / Regimental No.)
        const sortedCadets = [...selectedCadets].sort((a, b) => {
            const branchA = (a.branch || '').trim().toUpperCase();
            const branchB = (b.branch || '').trim().toUpperCase();
            const branchCompare = branchA.localeCompare(branchB);
            if (branchCompare !== 0) return branchCompare;

            if (type === 'jntu') {
                const idA = (a.jntuNo || a.jntuNumber || a.name || '').trim().toUpperCase();
                const idB = (b.jntuNo || b.jntuNumber || b.name || '').trim().toUpperCase();
                return idA.localeCompare(idB);
            } else {
                const idA = (a.regimentalNumber || a.enrollmentId || a.name || '').trim().toUpperCase();
                const idB = (b.regimentalNumber || b.enrollmentId || b.name || '').trim().toUpperCase();
                return idA.localeCompare(idB);
            }
        });

        const rows = sortedCadets.map((cadet, index) => {
            if (type === 'jntu') {
                return {
                    'S.No.': index + 1,
                    'JNTU No.': cadet.jntuNo || cadet.jntuNumber || '',
                    'Name of the Cadet': cadet.name || '',
                    'Branch': cadet.branch || '',
                    'Venue': venue,
                    'Date': dateStr,
                };
            } else {
                return {
                    'S.No.': index + 1,
                    'Regimental No.': cadet.regimentalNumber || cadet.enrollmentId || '',
                    'Name of the Cadet': cadet.name || '',
                    'Branch': cadet.branch || '',
                    'Venue': venue,
                    'Date': dateStr,
                };
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);

        worksheet['!cols'] = [
            { wch: 8 },  // S.No.
            { wch: type === 'jntu' ? 18 : 22 }, // JNTU No. / Regimental No.
            { wch: 28 }, // Name of the Cadet
            { wch: 14 }, // Branch
            { wch: 24 }, // Venue
            { wch: 14 }, // Date
        ];

        const workbook = XLSX.utils.book_new();
        const certTag = certFilter !== 'All' ? `_${certFilter}` : '';
        const sheetName = type === 'jntu' ? `Cadets_JNTU${certTag}` : `Cadets_Regimental${certTag}`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

        const safeTitle = (activity.title || 'Social_Activity')
            .replace(/[/\\?%*:|"<>]/g, '_')
            .trim();
        const fileName = `${safeTitle}${certTag}_${type === 'jntu' ? 'JNTU' : 'Regimental_No'}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        toast.success(`Excel downloaded: ${selectedCadets.length} cadet(s) (${certFilter === 'All' ? 'All Certs' : `${certFilter} Cert`}).`);
    };

    if (loading) return <div className="p-20 text-center"><LoadingIndicator /></div>;

    return (
        <div className="space-y-6 fade-in w-full">
            {/* ── Top Hero Header & Quick Stats ── */}
            <div className="bg-white dark:bg-[#050b14] rounded-2xl border border-[#ddd8cc] dark:border-white/10 p-6 shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-ncc-navy text-ncc-gold dark:bg-white/10 dark:text-ncc-gold">
                                Community & Outreach
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                            <Heart className="w-7 h-7 text-ncc-red fill-ncc-red/20" />
                            Social Service Tracking
                        </h2>
                        <p className="text-gray-500 dark:text-white/70 text-sm mt-1">
                            Community service drives, blood donation registries, cleanliness campaigns, and environmental initiatives.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        {userRole === 'admin' && (
                            <button 
                                onClick={() => {
                                    if (showAddForm) {
                                        setShowAddForm(false);
                                        setEditingActivityId(null);
                                        setNewActivity({
                                            title: '',
                                            type: 'Swachh Bharat',
                                            date: new Date().toISOString().split('T')[0],
                                            location: '',
                                            description: ''
                                        });
                                    } else {
                                        setShowAddForm(true);
                                    }
                                }}
                                className="ncc-btn ncc-btn-primary px-6 py-3 flex-1 lg:flex-none flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                            >
                                {showAddForm ? <XIcon className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                                {showAddForm ? 'Cancel' : 'Add New Activity'}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── KPI Stat Badges ── */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-[#ddd8cc] dark:border-white/10">
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-xl border border-[#ddd8cc] dark:border-white/10">
                        <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Total Drives</p>
                        <p className="text-2xl sm:text-3xl font-black text-ncc-navy dark:text-white mt-1">{(filteredActivities || []).length}</p>
                    </div>
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-xl border border-[#ddd8cc] dark:border-white/10">
                        <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Volunteers Engaged</p>
                        <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{totalVolunteersCount}</p>
                    </div>
                    <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-xl border border-[#ddd8cc] dark:border-white/10">
                        <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">Active Locations</p>
                        <p className="text-2xl sm:text-3xl font-black text-ncc-gold mt-1">{uniqueLocationsCount}</p>
                    </div>
                    {userRole === 'cadet' && (
                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-4 rounded-xl border border-[#ddd8cc] dark:border-white/10">
                            <p className="text-[10px] font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">My Participations</p>
                            <p className="text-2xl sm:text-3xl font-black text-ncc-red mt-1">{myParticipationsCount}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Add / Edit Form ── */}
            {showAddForm && (
                <div className="ncc-card p-6 sm:p-8 border-2 border-ncc-gold/40 shadow-xl animate-in slide-in-from-top-4">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#ddd8cc] dark:border-white/10">
                        <h3 className="text-lg font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                            <Heart className="w-5 h-5 text-ncc-gold" />
                            {editingActivityId ? 'Edit Social Activity' : 'Create New Social Initiative'}
                        </h3>
                        <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="sm:col-span-2 lg:col-span-2">
                                <label className="ncc-label">Activity Title</label>
                                <input 
                                    type="text" required
                                    className="ncc-input"
                                    placeholder="e.g. Puneet Sagar Abhiyan Phase 2"
                                    value={newActivity.title}
                                    onChange={e => setNewActivity({...newActivity, title: e.target.value})}
                                />
                            </div>
                            <div>
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
                            <div className="sm:col-span-2 lg:col-span-2">
                                <label className="ncc-label">Location</label>
                                <input 
                                    type="text" required
                                    className="ncc-input"
                                    placeholder="e.g. Srikakulam / GMRIT Campus"
                                    value={newActivity.location}
                                    onChange={e => setNewActivity({...newActivity, location: e.target.value})}
                                />
                            </div>
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className="ncc-label">Description (Optional)</label>
                                <textarea 
                                    className="ncc-input h-24"
                                    placeholder="Brief summary of objectives, impact, and activities..."
                                    value={newActivity.description}
                                    onChange={e => setNewActivity({...newActivity, description: e.target.value})}
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button 
                                type="button" 
                                onClick={() => setShowAddForm(false)} 
                                className="ncc-btn ncc-btn-secondary px-6"
                            >
                                Cancel
                            </button>
                            <button 
                                type="submit" 
                                disabled={processing}
                                className="ncc-btn ncc-btn-success px-8 py-3 text-sm font-black tracking-wider uppercase"
                            >
                                {processing ? 'Saving...' : (editingActivityId ? 'Save Changes' : 'Publish Activity')}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* ── Search & Checkbox Filter Bar ── */}
            <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                    {/* Search Bar */}
                    <div className="relative flex-1">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                        <input 
                            type="text"
                            placeholder="Search activities by title, location, or type..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-10 py-3 rounded-2xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy dark:focus:border-ncc-gold transition-all text-xs sm:text-sm dark:text-white shadow-sm"
                        />
                        {searchQuery && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                            >
                                <XIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Checkbox-based Filter Dropdown Button */}
                    <div className="relative">
                        <button
                            type="button"
                            onClick={() => setIsFilterOpen(!isFilterOpen)}
                            className={`w-full sm:w-auto px-4 py-3 rounded-2xl border flex items-center justify-between sm:justify-center gap-2.5 transition-all text-xs font-bold shadow-sm ${
                                selectedTypes.length > 0
                                    ? 'bg-ncc-navy text-white border-ncc-navy dark:bg-ncc-gold dark:text-ncc-navy dark:border-ncc-gold'
                                    : 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold'
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Filter className="w-4 h-4" />
                                <span>Filter by Category</span>
                                {selectedTypes.length > 0 && (
                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                        selectedTypes.length > 0 
                                            ? 'bg-ncc-gold text-ncc-navy dark:bg-ncc-navy dark:text-white' 
                                            : 'bg-gray-100 text-gray-600'
                                    }`}>
                                        {selectedTypes.length}
                                    </span>
                                )}
                            </div>
                            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isFilterOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Card with Checkboxes */}
                        {isFilterOpen && (
                            <>
                                <div 
                                    className="fixed inset-0 z-40" 
                                    onClick={() => setIsFilterOpen(false)} 
                                />
                                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white dark:bg-[#0a1628] rounded-2xl border border-[#ddd8cc] dark:border-white/10 shadow-2xl z-50 p-4 animate-in fade-in zoom-in-95 duration-150">
                                    <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#ddd8cc] dark:border-white/10">
                                        <span className="text-xs font-bold uppercase tracking-wider text-ncc-navy dark:text-white">
                                            Activity Categories
                                        </span>
                                        {selectedTypes.length > 0 ? (
                                            <button 
                                                type="button"
                                                onClick={() => setSelectedTypes([])}
                                                className="text-[11px] font-bold text-red-500 hover:underline"
                                            >
                                                Clear All
                                            </button>
                                        ) : (
                                            <span className="text-[10px] font-semibold text-gray-400 dark:text-white/40">All Selected</span>
                                        )}
                                    </div>

                                    <div className="space-y-1 max-h-64 overflow-y-auto ncc-scrollbar">
                                        {availableActivityTypes.length === 0 ? (
                                            <p className="text-xs text-gray-400 dark:text-white/50 text-center py-4 italic">No active activities found.</p>
                                        ) : (
                                            availableActivityTypes.map(type => {
                                                const isChecked = selectedTypes.includes(type);
                                                const count = activityTypeCounts[type] || 0;
                                                return (
                                                    <div 
                                                        key={type}
                                                        onClick={() => toggleType(type)}
                                                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer select-none transition-all ${
                                                            isChecked 
                                                                ? 'bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white font-bold' 
                                                                : 'hover:bg-gray-50 dark:hover:bg-white/5 text-gray-600 dark:text-white/70'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${
                                                                isChecked 
                                                                    ? 'bg-ncc-navy dark:bg-ncc-gold border-ncc-navy dark:border-ncc-gold text-white dark:text-ncc-navy shadow-sm' 
                                                                    : 'border-gray-300 dark:border-white/20 bg-white dark:bg-transparent'
                                                            }`}>
                                                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                            </div>
                                                            <span className="text-xs">{type}</span>
                                                        </div>
                                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-white/60">
                                                            {count}
                                                        </span>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>

                                    <div className="pt-3 mt-3 border-t border-[#ddd8cc] dark:border-white/10 flex justify-between items-center">
                                        <p className="text-[11px] text-gray-400 dark:text-white/50">
                                            {selectedTypes.length === 0 ? 'Showing all activities' : `${selectedTypes.length} selected`}
                                        </p>
                                        <button 
                                            type="button"
                                            onClick={() => setIsFilterOpen(false)}
                                            className="px-4 py-1.5 rounded-lg bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy text-xs font-bold shadow-sm"
                                        >
                                            Done
                                        </button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Active Filter Pills Display */}
                {selectedTypes.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <span className="text-[11px] font-bold text-gray-400 dark:text-white/50">Active Filters:</span>
                        {selectedTypes.map(type => (
                            <span 
                                key={type}
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white border border-ncc-navy/20 dark:border-white/10"
                            >
                                {type}
                                <button 
                                    type="button"
                                    onClick={() => toggleType(type)}
                                    className="hover:text-red-500 transition-colors"
                                >
                                    <XIcon className="w-3.5 h-3.5" />
                                </button>
                            </span>
                        ))}
                        <button 
                            type="button"
                            onClick={() => setSelectedTypes([])}
                            className="text-xs font-bold text-red-500 hover:underline ml-1"
                        >
                            Clear All
                        </button>
                    </div>
                )}
            </div>

            {/* ── Activities Card Grid (Wider 2-Column on Desktop) ── */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 w-full">
                {(filteredActivities || []).length === 0 ? (
                    <div className="col-span-full bg-[#f5f0e8] dark:bg-[#0a1628] border-2 border-dashed border-[#ddd8cc] dark:border-white/10 rounded-2xl p-12 text-center">
                        <Heart className="w-12 h-12 text-[#ddd8cc] dark:text-white/20 mx-auto mb-4" />
                        <p className="text-gray-500 dark:text-white/70 italic">No social service activities found matching your criteria.</p>
                    </div>
                ) : (
                    filteredActivities.map(activity => {
                        const isParticipating = activity.volunteers?.includes(userEnrollmentId);
                        const volunteerCount = (activity.volunteers || []).length;
                        
                        return (
                            <div 
                                key={activity.id} 
                                className="ncc-card overflow-hidden group border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold transition-all duration-300 flex flex-col justify-between"
                            >
                                <div className="p-6">
                                    {/* Card Header & Badges */}
                                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="px-3 py-1 bg-ncc-navy/5 dark:bg-white/10 text-ncc-navy dark:text-ncc-gold text-[10px] font-black uppercase tracking-widest rounded-full border border-ncc-navy/10 dark:border-white/10">
                                                {activity.type}
                                            </span>
                                            {isParticipating && userRole === 'cadet' && (
                                                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-emerald-500/30 flex items-center gap-1">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Participating
                                                </span>
                                            )}
                                        </div>
                                        <span className="text-gray-500 dark:text-white/60 text-xs flex items-center gap-1 font-bold">
                                            <Calendar className="w-3.5 h-3.5 text-ncc-gold" /> {formatDate(activity.date)}
                                        </span>
                                    </div>

                                    {/* Title & Location */}
                                    <h3 className="text-xl font-display font-bold text-ncc-navy dark:text-white group-hover:text-ncc-gold transition-colors">
                                        {activity.title}
                                    </h3>
                                    <p className="text-gray-500 dark:text-white/70 text-xs mt-1.5 flex items-center gap-1.5 font-medium">
                                        <MapPin className="w-3.5 h-3.5 text-ncc-gold flex-shrink-0" /> {activity.location}
                                    </p>

                                    {/* Description */}
                                    {activity.description && (
                                        <p className="text-gray-600 dark:text-white/80 text-xs sm:text-sm mt-3.5 border-l-2 border-ncc-gold/40 pl-3.5 leading-relaxed line-clamp-3">
                                            {activity.description}
                                        </p>
                                    )}

                                    {/* Volunteers Summary Stat */}
                                    <div className="mt-5 pt-4 border-t border-[#ddd8cc] dark:border-white/10 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="w-8 h-8 rounded-lg bg-ncc-navy/5 dark:bg-white/10 flex items-center justify-center text-ncc-navy dark:text-white">
                                                <Users className="w-4 h-4 text-ncc-gold" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 dark:text-white/60 uppercase tracking-tight leading-none">Registered Volunteers</p>
                                                <p className="text-base font-black text-ncc-navy dark:text-white mt-0.5">{volunteerCount} Cadets</p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={() => setActiveGallery(activity)}
                                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-gold flex items-center gap-1.5 transition-all shadow-sm"
                                        >
                                            <Camera className="w-3.5 h-3.5 text-ncc-gold" /> Gallery
                                        </button>
                                    </div>
                                </div>

                                {/* ── Action Footer ── */}
                                <div className="bg-[#f5f0e8] dark:bg-[#0a1628] px-6 py-4 border-t border-[#ddd8cc] dark:border-white/10">
                                    {userRole === 'admin' ? (
                                        <div className="flex flex-col gap-2.5">
                                            <button 
                                                onClick={() => setSelectedActivity(activity)}
                                                className="ncc-btn ncc-btn-secondary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-black tracking-wider uppercase border-2 shadow-sm"
                                            >
                                                <Users className="w-4 h-4" /> Manage Volunteers
                                            </button>

                                            {/* Certificate Filter for Activity Excel */}
                                            {(() => {
                                                const currentCertFilter = activityCertFilter[activity.id] || 'All';
                                                const volunteerCadets = (activity.volunteers || [])
                                                    .map(vid => cadets.find(c => c.enrollmentId === vid || c.regimentalNumber === vid || c.id === vid))
                                                    .filter(Boolean);
                                                const filteredVolunteers = currentCertFilter === 'All'
                                                    ? volunteerCadets
                                                    : volunteerCadets.filter(c => {
                                                        const cert = (c.currentCertificate || c.certificate || c.B || '').trim().toUpperCase();
                                                        return cert === currentCertFilter.toUpperCase();
                                                    });
                                                const countB1 = volunteerCadets.filter(c => (c.currentCertificate || c.certificate || c.B || '').trim().toUpperCase() === 'B1').length;
                                                const countB2 = volunteerCadets.filter(c => (c.currentCertificate || c.certificate || c.B || '').trim().toUpperCase() === 'B2').length;
                                                const countC = volunteerCadets.filter(c => (c.currentCertificate || c.certificate || c.B || '').trim().toUpperCase() === 'C').length;

                                                return (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between gap-2 p-1.5 bg-ncc-navy/5 dark:bg-white/5 rounded-xl border border-ncc-navy/10 dark:border-white/10">
                                                            <span className="text-[11px] font-bold text-gray-600 dark:text-white/70 flex items-center gap-1.5">
                                                                <Filter className="w-3.5 h-3.5 text-ncc-gold flex-shrink-0" /> Cert Filter:
                                                            </span>
                                                            <select
                                                                value={currentCertFilter}
                                                                onChange={(e) => setActivityCertFilter(prev => ({ ...prev, [activity.id]: e.target.value }))}
                                                                className="text-[11px] font-bold py-1 px-2.5 rounded-lg bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border border-[#ddd8cc] dark:border-white/10 focus:border-ncc-gold focus:outline-none cursor-pointer"
                                                            >
                                                                <option value="All">All Certs ({volunteerCadets.length})</option>
                                                                <option value="B1">B1 Cert ({countB1})</option>
                                                                <option value="B2">B2 Cert ({countB2})</option>
                                                                <option value="C">C Cert ({countC})</option>
                                                            </select>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-2">
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleExportActivityExcel(activity, 'jntu', currentCertFilter)}
                                                                disabled={filteredVolunteers.length === 0}
                                                                title={filteredVolunteers.length === 0 ? `No ${currentCertFilter !== 'All' ? currentCertFilter + ' ' : ''}volunteers found` : `Download Excel (JNTU) for ${filteredVolunteers.length} cadet(s)`}
                                                                className={`px-3 py-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all truncate ${
                                                                    filteredVolunteers.length > 0
                                                                        ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border-[#ddd8cc] dark:border-white/10 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shadow-sm active:scale-95'
                                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 border-gray-200 dark:border-white/10 cursor-not-allowed opacity-60'
                                                                }`}
                                                            >
                                                                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> Excel(JNTU) {currentCertFilter !== 'All' ? `(${currentCertFilter})` : ''}
                                                            </button>
                                                            <button 
                                                                type="button"
                                                                onClick={() => handleExportActivityExcel(activity, 'regimental', currentCertFilter)}
                                                                disabled={filteredVolunteers.length === 0}
                                                                title={filteredVolunteers.length === 0 ? `No ${currentCertFilter !== 'All' ? currentCertFilter + ' ' : ''}volunteers found` : `Download Excel (Regimental No.) for ${filteredVolunteers.length} cadet(s)`}
                                                                className={`px-3 py-2 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all truncate ${
                                                                    filteredVolunteers.length > 0
                                                                        ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border-[#ddd8cc] dark:border-white/10 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 cursor-pointer shadow-sm active:scale-95'
                                                                        : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 border-gray-200 dark:border-white/10 cursor-not-allowed opacity-60'
                                                                }`}
                                                            >
                                                                <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 flex-shrink-0" /> Excel(Regimental number) {currentCertFilter !== 'All' ? `(${currentCertFilter})` : ''}
                                                            </button>
                                                        </div>
                                                    </div>
                                                );
                                            })()}

                                            <div className="flex gap-2 pt-1">
                                                <button 
                                                    onClick={() => handleEdit(activity)}
                                                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white border border-[#ddd8cc] dark:border-white/10 hover:border-ncc-navy flex items-center justify-center gap-1.5 transition"
                                                >
                                                    <Edit className="w-3.5 h-3.5" /> Edit
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(activity.id)}
                                                    className="flex-1 py-1.5 px-3 rounded-lg text-xs font-bold bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 hover:bg-red-100 flex items-center justify-center gap-1.5 transition"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" /> Delete
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between gap-3">
                                            {isParticipating ? (
                                                <button 
                                                    onClick={() => {
                                                        const cadet = cadets.find(c => c.enrollmentId === userEnrollmentId);
                                                        if (cadet) generateCertificate(activity, cadet);
                                                    }}
                                                    className="ncc-btn ncc-btn-primary w-full py-2.5 flex items-center justify-center gap-2 text-xs font-black tracking-wider uppercase"
                                                >
                                                    <Download className="w-4 h-4" /> Download Certificate
                                                </button>
                                            ) : (
                                                <p className="text-xs text-gray-500 dark:text-white/60 italic w-full text-center py-1">
                                                    Open to all battalion cadets. Contact your ANO to volunteer.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
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

                        <div className="bg-[#f5f0e8] dark:bg-[#0a1628] p-6 border-t border-[#ddd8cc] flex flex-wrap justify-between items-center gap-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="text-xs font-bold text-gray-500 dark:text-white/70 mr-2">
                                    {(selectedActivity.volunteers || []).length} Volunteers Selected
                                </p>
                                <button 
                                    type="button"
                                    onClick={() => handleExportActivityExcel(selectedActivity, 'jntu', vmFilterCert)}
                                    disabled={(selectedActivity.volunteers || []).length === 0}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
                                        (selectedActivity.volunteers || []).length > 0
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 border-gray-200 dark:border-white/10 cursor-not-allowed opacity-60'
                                    }`}
                                >
                                    <Download className="w-3.5 h-3.5" /> Excel(JNTU) {vmFilterCert !== 'All' ? `(${vmFilterCert})` : ''}
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => handleExportActivityExcel(selectedActivity, 'regimental', vmFilterCert)}
                                    disabled={(selectedActivity.volunteers || []).length === 0}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
                                        (selectedActivity.volunteers || []).length > 0
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-sm'
                                            : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 border-gray-200 dark:border-white/10 cursor-not-allowed opacity-60'
                                    }`}
                                >
                                    <Download className="w-3.5 h-3.5" /> Excel(Regimental number) {vmFilterCert !== 'All' ? `(${vmFilterCert})` : ''}
                                </button>
                            </div>
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
