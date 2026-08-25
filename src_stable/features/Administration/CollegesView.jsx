// src/features/Administration/CollegesView.jsx
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import { db, appId } from '../../firebase/config.js';
import { collection, doc, setDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import emailjs from '@emailjs/browser';
import { StaffForm } from '../Staff/StaffForm.jsx';
import { StaffProfileModal } from '../Staff/StaffProfileModal.jsx';
import { CadetProfileModal } from '../Ranks/CadetProfileModal.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { deleteItem, deduplicateStaff } from '../../firebase/firestoreService.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from '../../utils/dateUtils.js';
import {
    Plus,
    Edit2,
    Trash2,
    Users,
    GraduationCap,
    MapPin,
    Check,
    Briefcase,
    Activity,
    Flag,
    Award,
    ChevronLeft,
    Search,
    Mail,
    Phone,
    Download,
    Key,
    RefreshCcw,
    ShieldCheck,
    Loader
} from '../../components/Icons.jsx';

// ── CollegeCard ──────────────────────────────────────────────────────────────
// Simple card with a gradient header using the college's theme colors.
function CollegeCard({ unit, isActive, metrics, onOpen, onEdit, onDelete, onToggleFilter }) {
    const initials = (unit.collegeName || '??')
        .split(' ')
        .filter(w => w.length > 1)
        .slice(0, 2)
        .map(w => w[0].toUpperCase())
        .join('');

    return (
        <div
            onClick={onOpen}
            className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm transition-all duration-300 cursor-pointer hover:shadow-md hover:-translate-y-0.5 ${
                isActive ? 'ring-2 ring-ncc-gold border-transparent scale-[1.01]' : 'dark:border-white/10 hover:border-gray-300 dark:hover:border-white/25'
            }`}
        >
            {/* Card Header — clean gradient using college theme colors */}
            <div
                className="h-24 relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${unit.primaryColor || '#1B3A6B'} 0%, ${unit.secondaryColor || '#B8830E'} 100%)` }}
            >
                {/* Decorative circles */}
                <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
                <div className="absolute -bottom-8 -left-4 w-20 h-20 rounded-full bg-black/10" />

                {/* Initials watermark */}
                <span className="absolute inset-0 flex items-center justify-center text-5xl font-black text-white/10 font-display select-none">
                    {initials}
                </span>

                {/* Action buttons */}
                <div className="absolute top-3 right-3 flex gap-2">
                    <button onClick={onEdit} className="w-7 h-7 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white rounded-full flex items-center justify-center transition" title="Edit Config">
                        <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={onDelete} className="w-7 h-7 bg-red-500/20 hover:bg-red-500/40 backdrop-blur-md text-red-200 rounded-full flex items-center justify-center transition" title="Delete College">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>

                {/* Color swatches bottom-left */}
                <div className="absolute bottom-3 left-4 flex gap-1.5">
                    <span className="w-3 h-3 rounded-full border-2 border-white/40" style={{ backgroundColor: unit.primaryColor }} />
                    <span className="w-3 h-3 rounded-full border-2 border-white/40" style={{ backgroundColor: unit.secondaryColor }} />
                </div>

                {/* Subdomain chip */}
                <div className="absolute bottom-3 right-3">
                    <span className="text-[9px] font-mono font-bold bg-black/30 text-white/80 px-2 py-0.5 rounded-full backdrop-blur-sm">
                        /{unit.subdomain}
                    </span>
                </div>
            </div>

            {/* Card Body */}
            <div className="px-5 py-4 space-y-4">
                <div>
                    <h4 className="font-bold text-base text-ncc-navy dark:text-white truncate" title={unit.collegeName}>
                        {unit.collegeName}
                    </h4>
                    <p className="text-[10px] text-ncc-gold uppercase tracking-wider font-extrabold mt-0.5">
                        {unit.unitName}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-gray-500 dark:text-gray-400 mt-1">
                        <MapPin className="w-3 h-3 text-red-500" />
                        <span>{unit.location}</span>
                    </div>
                </div>

                <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                    <div className="text-center flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Cadets</p>
                        <p className="font-black text-ncc-navy dark:text-white mt-0.5">
                            {metrics.cadetsCount} <span className="text-[10px] text-gray-400 font-normal">/ {unit.allottedCadetCount || 0}</span>
                        </p>
                    </div>
                    <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />
                    <div className="text-center flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">ANO</p>
                        <p className="font-black text-ncc-navy dark:text-white mt-0.5">{metrics.staffCount}</p>
                    </div>
                    <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />
                    <div className="text-center flex-1">
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Attendance</p>
                        <p className="font-black text-ncc-navy dark:text-white mt-0.5">{metrics.attendancePercentage}%</p>
                    </div>
                </div>

                <button
                    onClick={onToggleFilter}
                    className={`w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                        isActive
                            ? 'bg-ncc-gold text-ncc-navy hover:bg-ncc-gold/90'
                            : 'bg-ncc-navy text-white hover:bg-ncc-navy-mid dark:bg-white/10 dark:text-white dark:hover:bg-white/20'
                    }`}
                >
                    {isActive ? (<><Check className="w-4 h-4" /> Active College View</>) : 'Filter Portal View'}
                </button>
            </div>
        </div>
    );
}
// ─────────────────────────────────────────────────────────────────────────────


export function CollegesView({ mode }) {
    const { isDarkMode } = useTheme();
    const {
        units,
        selectedCollege,
        setSelectedCollege,
        allCadets,
        staff
    } = useDataContext();

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedUnitForEdit, setSelectedUnitForEdit] = useState(null);

    // Form states
    const [subdomain, setSubdomain] = useState('');
    const [collegeName, setCollegeName] = useState('');
    const [location, setLocation] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [motto, setMotto] = useState('Unity and Discipline');
    const [primaryColor, setPrimaryColor] = useState('#1B3A6B');
    const [secondaryColor, setSecondaryColor] = useState('#B8830E');
    const [heroBg, setHeroBg] = useState('');
    const [logo, setLogo] = useState('');
    const [allottedAnoCount, setAllottedAnoCount] = useState(0);
    const [allottedCadetCount, setAllottedCadetCount] = useState(0);

    // Unit name is always fixed for every college under this battalion
    const BATTALION_UNIT_NAME = '14(A) BN NCC';

    // Staff CRUD states
    const [isAddingStaff, setIsAddingStaff] = useState(false);
    const [editingStaff, setEditingStaff] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [selectedMember, setSelectedMember] = useState(null);

    // Drill-down states
    const [activeDrillDownSubdomain, setActiveDrillDownSubdomain] = useState(null);
    const [drillDownTab, setDrillDownTab] = useState('staff');
    const [cadetSearchQuery, setCadetSearchQuery] = useState('');
    const [drillDownCertFilter, setDrillDownCertFilter] = useState('All');
    const [drillDownWingFilter, setDrillDownWingFilter] = useState('All');
    const [drillDownSort, setDrillDownSort] = useState('regNo'); // 'regNo' | 'name' | 'attendance'

    // College list search
    const [collegeSearchQuery, setCollegeSearchQuery] = useState('');
    const [activeSubTab, setActiveSubTab] = useState('overall'); // 'overall' or 'directory'
    const currentTab = mode || activeSubTab;
    const [overallSection, setOverallSection] = useState('summary'); // 'summary', 'cadets', 'anos'
    const [allCadetsSearch, setAllCadetsSearch] = useState('');
    const [allCadetsCollegeFilter, setAllCadetsCollegeFilter] = useState('All');
    const [allCadetsWingFilter, setAllCadetsWingFilter] = useState('All');
    const [allCadetsCertFilter, setAllCadetsCertFilter] = useState('All');
    const [allAnosSearch, setAllAnosSearch] = useState('');
    const [allAnosCollegeFilter, setAllAnosCollegeFilter] = useState('All');
    const [selectedCadetForModal, setSelectedCadetForModal] = useState(null);
    const [expandedColleges, setExpandedColleges] = useState({}); // track collapsed college groups

    // Release / Unblock Email Modal States
    const [isReleaseEmailModalOpen, setIsReleaseEmailModalOpen] = useState(false);
    const [emailToRelease, setEmailToRelease] = useState('');
    const [releaseLoading, setReleaseLoading] = useState(false);

    // Filter out the main battalion headquarters doc from standard college list
    const collegesList = useMemo(() => {
        return units.filter(u => !u.isBattalion);
    }, [units]);

    // Filtered colleges based on search query and selected college filter
    const filteredCollegesList = useMemo(() => {
        let list = collegesList;
        if (selectedCollege && selectedCollege !== 'All') {
            list = list.filter(u => u.subdomain === selectedCollege);
        }
        if (!collegeSearchQuery.trim()) return list;
        const q = collegeSearchQuery.toLowerCase();
        return list.filter(u =>
            u.collegeName?.toLowerCase().includes(q) ||
            u.location?.toLowerCase().includes(q) ||
            u.subdomain?.toLowerCase().includes(q)
        );
    }, [collegesList, collegeSearchQuery, selectedCollege]);

    const activeUnit = useMemo(() => {
        return units.find(u => u.subdomain === activeDrillDownSubdomain);
    }, [units, activeDrillDownSubdomain]);
    // Aggregate statistics
    const stats = useMemo(() => {
        const totalColleges = collegesList.length;
        const totalCadets = allCadets.filter(c => c.status !== 'alumni').length;
        const totalStaff = staff.filter(s => 
            s.institutionId && s.institutionId !== '14a-bn-srikakulam'
        ).length;
        
        return {
            totalColleges,
            totalCadets,
            totalStaff
        };
    }, [collegesList, allCadets, staff]);

    // Calculate cadet, staff, ANO count, and attendance percentage per college
    const collegeDetailsMetrics = useMemo(() => {
        const metrics = {};
        collegesList.forEach(c => {
            // Only count active (non-alumni) cadets
            const collegeCadets = allCadets.filter(cad => cad.institutionId === c.subdomain && cad.status !== 'alumni');
            
            // Staff are filtered by institutionId — show ALL staff for that college
            const collegeStaff = staff.filter(s => s.institutionId === c.subdomain);
            const collegeAnos = collegeStaff; // All staff of this college are ANOs/officers
            const anoCount = collegeAnos.length;

            // Attendance calculation
            const dates = new Set();
            collegeCadets.forEach(cadet => {
                Object.keys(cadet.attendance || {}).forEach(date => {
                    dates.add(date);
                });
            });
            const periodsHeld = dates.size;
            
            let totalPresent = 0;
            collegeCadets.forEach(cadet => {
                Object.values(cadet.attendance || {}).forEach(status => {
                    const s = String(status).trim().toUpperCase();
                    if (s === 'PRESENT' || s === 'P' || s === 'VERIFIED' || s === 'LATE' || s === 'ATTENDED' || s === '1') {
                        totalPresent++;
                    }
                });
            });
            
            const maxPossible = collegeCadets.length * periodsHeld;
            const attendancePercentage = maxPossible > 0 ? parseFloat(((totalPresent / maxPossible) * 100).toFixed(2)) : 0;

            // Individual cadet attendance percentage for list
            const cadetsListWithAttendance = collegeCadets.map(cadet => {
                let presentCount = 0;
                Object.values(cadet.attendance || {}).forEach(s => {
                    const str = String(s).trim().toUpperCase();
                    if (str === 'PRESENT' || str === 'P' || str === 'VERIFIED' || str === 'LATE' || str === 'ATTENDED' || str === '1') {
                        presentCount++;
                    }
                });
                const totalPeriods = Object.keys(cadet.attendance || {}).length;
                const pct = totalPeriods > 0 ? parseFloat(((presentCount / totalPeriods) * 100).toFixed(2)) : 0;
                return {
                    ...cadet,
                    presentCount,
                    totalPeriods,
                    attendancePresentCount: presentCount,
                    attendanceTotalPeriods: totalPeriods,
                    attendancePercentage: pct
                };
            });

            metrics[c.subdomain] = {
                cadetsCount: collegeCadets.length,
                anoCount: anoCount,
                staffCount: anoCount,
                attendancePercentage: attendancePercentage,
                cadetsList: cadetsListWithAttendance,
                staffList: collegeAnos,
                // Wing breakdown
                sdCount: collegeCadets.filter(cad => (cad.enrollmentId || cad.regimentalNumber || '').toUpperCase().includes('SD')).length,
                swCount: collegeCadets.filter(cad => (cad.enrollmentId || cad.regimentalNumber || '').toUpperCase().includes('SW')).length,
                // Certificate breakdown
                b1Count: collegeCadets.filter(cad => (cad.certificate || cad.B) === 'B1').length,
                b2Count: collegeCadets.filter(cad => (cad.certificate || cad.B) === 'B2').length,
                cCount:  collegeCadets.filter(cad => (cad.certificate || cad.B) === 'C').length,
            };
        });
        return metrics;
    }, [collegesList, allCadets, staff]);

    const activeCadetsAllColleges = useMemo(() => {
        return allCadets.filter(c => c.status !== 'alumni' && c.institutionId && c.institutionId !== '14a-bn-srikakulam');
    }, [allCadets]);

    const cadetsAllCollegesWithAttendance = useMemo(() => {
        return activeCadetsAllColleges.map(c => {
            let presentCount = 0;
            Object.values(c.attendance || {}).forEach(s => {
                const str = String(s).trim().toUpperCase();
                if (str === 'PRESENT' || str === 'P' || str === 'VERIFIED' || str === 'LATE' || str === 'ATTENDED' || str === '1') {
                    presentCount++;
                }
            });
            const totalPeriods = Object.keys(c.attendance || {}).length;
            const pct = totalPeriods > 0 ? parseFloat(((presentCount / totalPeriods) * 100).toFixed(2)) : 0;
            return {
                ...c,
                presentCount,
                totalPeriods,
                attendancePresentCount: presentCount,
                attendanceTotalPeriods: totalPeriods,
                attendancePercentage: pct
            };
        });
    }, [activeCadetsAllColleges]);

    const filteredAllCadets = useMemo(() => {
        return cadetsAllCollegesWithAttendance.filter(c => {
            const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const cert = c.certificate || c.B;
            const collegeMatch = allCadetsCollegeFilter === 'All' || c.institutionId === allCadetsCollegeFilter;
            const wingMatch = allCadetsWingFilter === 'All' ||
                (allCadetsWingFilter === 'SD' && reg.includes('SD')) ||
                (allCadetsWingFilter === 'SW' && reg.includes('SW'));
            const certMatch = allCadetsCertFilter === 'All' || cert === allCadetsCertFilter;
            const q = allCadetsSearch.toLowerCase();
            const searchMatch = !allCadetsSearch ||
                c.name?.toLowerCase().includes(q) ||
                (c.enrollmentId || '').toLowerCase().includes(q) ||
                (c.regimentalNumber || '').toLowerCase().includes(q) ||
                (c.jntuNo || '').toLowerCase().includes(q) ||
                (c.branch || '').toLowerCase().includes(q) ||
                (c.fatherName || '').toLowerCase().includes(q) ||
                (c.motherName || '').toLowerCase().includes(q);
            return collegeMatch && wingMatch && certMatch && searchMatch;
        });
    }, [cadetsAllCollegesWithAttendance, allCadetsCollegeFilter, allCadetsWingFilter, allCadetsCertFilter, allCadetsSearch]);

    const activeStaffAllColleges = useMemo(() => {
        return staff.filter(s => s.institutionId && s.institutionId !== '14a-bn-srikakulam');
    }, [staff]);

    const filteredAllAnos = useMemo(() => {
        return activeStaffAllColleges.filter(s => {
            const collegeMatch = allAnosCollegeFilter === 'All' || s.institutionId === allAnosCollegeFilter;
            const searchMatch = !allAnosSearch ||
                s.name?.toLowerCase().includes(allAnosSearch.toLowerCase()) ||
                s.email?.toLowerCase().includes(allAnosSearch.toLowerCase());
            return collegeMatch && searchMatch;
        });
    }, [activeStaffAllColleges, allAnosCollegeFilter, allAnosSearch]);

    const handleOpenAddModal = () => {
        setSubdomain('');
        setCollegeName('');
        setLocation('');
        setContactEmail('');
        setMotto('Unity and Discipline');
        setPrimaryColor('#1B3A6B');
        setSecondaryColor('#B8830E');
        setHeroBg('');
        setLogo('');
        setAllottedAnoCount(0);
        setAllottedCadetCount(0);
        setIsAddModalOpen(true);
    };

    const handleOpenEditModal = (unit) => {
        setSelectedUnitForEdit(unit);
        setSubdomain(unit.subdomain);
        setCollegeName(unit.collegeName || '');
        setLocation(unit.location || '');
        setContactEmail(unit.contactEmail || '');
        setMotto(unit.motto || 'Unity and Discipline');
        setPrimaryColor(unit.primaryColor || '#1B3A6B');
        setSecondaryColor(unit.secondaryColor || '#B8830E');
        setHeroBg(unit.heroBg || '');
        setLogo(unit.logo || '');
        setAllottedAnoCount(unit.allottedAnoCount || 0);
        setAllottedCadetCount(unit.allottedCadetCount || 0);
        setIsEditModalOpen(true);
    };

    const handleSaveCollege = async (e, isEdit = false) => {
        e.preventDefault();
        if (!subdomain.trim() || !collegeName.trim() || !contactEmail.trim()) {
            toast.error('Subdomain, College Name, and Contact Email are required.');
            return;
        }

        const cleanSubdomain = subdomain.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

        if (!isEdit && units.some(u => u.subdomain === cleanSubdomain)) {
            toast.error(`A college with subdomain "${cleanSubdomain}" already exists.`);
            return;
        }

        if (isEdit) {
            const activeCadetsCount = collegeDetailsMetrics[cleanSubdomain]?.cadetsCount || 0;
            const newLimit = Number(allottedCadetCount) || 0;
            if (newLimit > 0 && newLimit < activeCadetsCount) {
                toast.error(`Invalid Vacancy Limit: Allotted Cadet Vacancies (${newLimit}) cannot be less than the number of currently active cadets in this college (${activeCadetsCount}).`);
                return;
            }
        }

        // Unit name is always 14(A) BN NCC — never derived from UI inputs
        const payload = {
            subdomain: cleanSubdomain,
            collegeName: collegeName.trim(),
            unitName: BATTALION_UNIT_NAME,
            location: location.trim(),
            contactEmail: contactEmail.trim().toLowerCase(),
            motto: motto.trim(),
            primaryColor: primaryColor.trim(),
            secondaryColor: secondaryColor.trim(),
            heroBg: heroBg.trim() || 'https://images.unsplash.com/photo-1599708153386-62e257e10884?auto=format&fit=crop&q=80&w=2000',
            logo: logo.trim() || 'https://firebasestorage.googleapis.com/v0/b/gmrit-ncc-fb1df.appspot.com/o/assets%2Fncc_logo.png?alt=media',
            battalionId: '14a-bn-srikakulam',
            allottedAnoCount: Number(allottedAnoCount) || 0,
            allottedCadetCount: Number(allottedCadetCount) || 0,
            updatedAt: new Date()
        };

        try {
            const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
            await setDoc(doc(unitsRef, cleanSubdomain), payload, { merge: true });

            // Trigger Welcome Email to the college if adding a new one
            if (!isEdit && contactEmail.trim()) {
                try {
                    await emailjs.send(
                        'service_hk68vnz', // Service ID
                        'template_5a7vqzw', // Template ID
                        {
                            email: contactEmail.trim().toLowerCase(),
                            passcode: `your college has been implemented NCC by 14(A) BN NCC SKLM...Thank you...`,
                            time: new Date().toLocaleDateString()
                        },
                        'iCSap5JY6cLaHx2wc' // Public Key
                    );
                    console.log(`Welcome email successfully sent to ${contactEmail}`);
                } catch (mailError) {
                    console.error('Failed to send welcome email via EmailJS:', mailError);
                }
            }

            toast.success(isEdit ? 'College configuration updated successfully!' : 'New college added successfully!');
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Error saving college:', error);
            toast.error('Failed to save college. Please check database permissions.');
        }
    };

    const handleDeleteCollege = async (subdomainToDelete) => {
        if (!window.confirm('Are you sure you want to delete this college? This will NOT delete associated cadet records, but the college portal configuration will be removed.')) {
            return;
        }
        try {
            const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
            await deleteDoc(doc(unitsRef, subdomainToDelete));
            toast.success('College portal configuration deleted.');
            if (selectedCollege === subdomainToDelete) {
                setSelectedCollege('All');
            }
            if (activeDrillDownSubdomain === subdomainToDelete) {
                setActiveDrillDownSubdomain(null);
            }
        } catch (error) {
            console.error('Error deleting college:', error);
            toast.error('Failed to delete college configuration.');
        }
    };

    const handleStaffModalClose = () => {
        setIsAddingStaff(false);
        setEditingStaff(null);
        setItemToDelete(null);
        setSelectedMember(null);
    };

    const handleDeleteStaffConfirm = async () => {
        if (!itemToDelete) return;
        try {
            await deleteItem(itemToDelete.type, itemToDelete.id);

            // Clean up corresponding user doc and Firebase Auth account if email exists
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

            handleStaffModalClose();
            toast.success('Staff member deleted and email released.');
        } catch (e) {
            toast.error('Failed to delete: ' + e.message);
        }
    };

    const handleReleaseEmailSubmit = async (e) => {
        e.preventDefault();
        if (!emailToRelease || !emailToRelease.trim()) {
            toast.error('Please enter an email address to release.');
            return;
        }
        setReleaseLoading(true);
        const cleanEmail = emailToRelease.trim().toLowerCase();
        try {
            // 1. Delete matching user docs from Firestore
            try {
                const usersRef = collection(db, 'artifacts', appId, 'public', 'data', 'users');
                const q = query(usersRef, where('email', '==', cleanEmail));
                const snap = await getDocs(q);
                for (const d of snap.docs) {
                    await deleteDoc(d.ref).catch(() => {});
                }
            } catch (fsErr) {
                console.warn('Firestore user doc cleanup notice:', fsErr);
            }

            // 2. Call backend API to delete from Firebase Authentication
            const apiUrl = window.location.hostname.includes('vercel.app') 
                ? '/api/updateUserCredentials' 
                : 'https://ncc-portal-redesign.vercel.app/api/updateUserCredentials';

            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'release',
                    currentEmail: cleanEmail
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                toast.success(`Email "${cleanEmail}" has been completely released and unblocked! You can now use it freely.`);
            } else {
                toast.info(`Local user doc cleaned up. Auth status: ${data?.message || 'Ready'}`);
            }

            setEmailToRelease('');
            setIsReleaseEmailModalOpen(false);
        } catch (err) {
            console.error('Release email error:', err);
            toast.error('Failed to release email: ' + err.message);
        } finally {
            setReleaseLoading(false);
        }
    };

    const handleCleanDuplicateAnos = useCallback(async () => {
        if (!window.confirm('This will scan for and remove duplicate or auto-generated dummy ANO profiles. Proceed?')) return;
        try {
            const res = await deduplicateStaff();
            if (res.removedCount > 0) {
                toast.success(`Removed ${res.removedCount} duplicate/corrupt ANO record(s).`);
            } else {
                toast.info('No duplicate ANO records found.');
            }
        } catch (err) {
            toast.error('Deduplication failed: ' + err.message);
        }
    }, []);

    // ── One-time patch: set unitName = '14(A) BN NCC' on all colleges in Firestore ──
    const handlePatchAllUnitNames = useCallback(async () => {
        if (!window.confirm('This will set unitName to "14(A) BN NCC" for every college record in Firestore. Proceed?')) return;
        const unitsRef = collection(db, 'artifacts', appId, 'public', 'data', 'units');
        let patched = 0;
        for (const unit of collegesList) {
            if (unit.unitName !== '14(A) BN NCC') {
                await setDoc(doc(unitsRef, unit.subdomain), { unitName: '14(A) BN NCC' }, { merge: true });
                patched++;
            }
        }
        if (patched === 0) {
            toast.info('All college unit names are already correct.');
        } else {
            toast.success(`✔ Patched ${patched} college record(s) — all now show "14(A) BN NCC".`);
        }
    }, [collegesList]);

    // ── Export Helpers ────────────────────────────────────────────────────────
    const exportSummaryToExcel = useCallback(() => {
        const rows = collegesList.map(c => {
            const m = collegeDetailsMetrics[c.subdomain] || {};
            const allottedCadets = c.allottedCadetCount || 0;
            const activeCadets = m.cadetsCount || 0;
            return {
                'College': c.collegeName,
                'Location': c.location,
                'Subdomain': c.subdomain,
                'Active Cadets': activeCadets,
                'Allotted Cadets': allottedCadets,
                'Utilization %': allottedCadets > 0 ? Math.min(100, Math.round((activeCadets / allottedCadets) * 100)) : 0,
                'Active ANOs': m.anoCount || 0,
                'Allotted ANOs': c.allottedAnoCount || 0,
                'Avg Attendance %': m.attendancePercentage || 0,
                'SD Wing': m.sdCount || 0,
                'SW Wing': m.swCount || 0,
                'B1 Cert': m.b1Count || 0,
                'B2 Cert': m.b2Count || 0,
                'C Cert': m.cCount || 0,
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Colleges Summary');
        XLSX.writeFile(wb, '14A_BN_NCC_Colleges_Summary.xlsx');
    }, [collegesList, collegeDetailsMetrics]);

    const exportSummaryToPDF = useCallback(() => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.text('14(A) BN NCC — Colleges Summary', 14, 15);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 22);
        const rows = collegesList.map(c => {
            const m = collegeDetailsMetrics[c.subdomain] || {};
            const allottedCadets = c.allottedCadetCount || 0;
            const activeCadets = m.cadetsCount || 0;
            return [
                c.collegeName,
                `${activeCadets} / ${allottedCadets}`,
                `${m.anoCount || 0} / ${c.allottedAnoCount || 0}`,
                `${m.attendancePercentage || 0}%`,
                `SD: ${m.sdCount || 0}  SW: ${m.swCount || 0}`,
                `B1: ${m.b1Count || 0}  B2: ${m.b2Count || 0}  C: ${m.cCount || 0}`,
            ];
        });
        autoTable(doc, {
            startY: 28,
            head: [['College', 'Cadets (Active/Allotted)', 'ANO (Active/Allotted)', 'Avg Attendance', 'Wings', 'Certificates']],
            body: rows,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [27, 58, 107] },
        });
        doc.save('14A_BN_NCC_Colleges_Summary.pdf');
    }, [collegesList, collegeDetailsMetrics]);

    const exportCadetsToExcel = useCallback(() => {
        // Sort by college name A-Z then cadet name
        const sorted = [...filteredAllCadets].sort((a, b) => {
            const ca = collegesList.find(u => u.subdomain === a.institutionId)?.collegeName || a.institutionId;
            const cb = collegesList.find(u => u.subdomain === b.institutionId)?.collegeName || b.institutionId;
            return ca.localeCompare(cb) || (a.name || '').localeCompare(b.name || '');
        });
        const rows = sorted.map((c, idx) => {
            const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const wing = reg.includes('SD') ? 'SD' : reg.includes('SW') ? 'SW' : '';
            const collegeObj = collegesList.find(u => u.subdomain === c.institutionId);
            return {
                'S.No': idx + 1,
                'College': collegeObj?.collegeName || c.institutionId,
                'Regimental No.': c.enrollmentId || c.regimentalNumber || '',
                'Name': c.name || '',
                'Rank': c.rank || 'CDT',
                'Wing': wing,
                'Certificate': c.certificate || c.B || '',
                'Year': c.year || '',
                'Father Name': c.fatherName || '',
                'Mother Name': c.motherName || '',
                'Phone': c.phonePersonal || c.phone || '',
                'Date of Birth': formatDate(c.dob),
                'Camps Attended': (c.campsAttended || []).length,
                'Attendance %': c.attendancePercentage,
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'All Cadets');
        XLSX.writeFile(wb, '14A_BN_NCC_All_Cadets.xlsx');
    }, [filteredAllCadets, collegesList]);

    const exportCadetsToPDF = useCallback(() => {
        const doc = new jsPDF({ orientation: 'landscape', format: 'a1' });
        doc.setFontSize(16);
        doc.text('14(A) BN NCC Srikakulam — Complete Cadet Roster (College-wise)', 14, 18);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${filteredAllCadets.length} cadets`, 14, 26);
        // Sort by college A-Z
        const sorted = [...filteredAllCadets].sort((a, b) => {
            const ca = collegesList.find(u => u.subdomain === a.institutionId)?.collegeName || a.institutionId;
            const cb = collegesList.find(u => u.subdomain === b.institutionId)?.collegeName || b.institutionId;
            return ca.localeCompare(cb) || (a.name || '').localeCompare(b.name || '');
        });
        const rows = sorted.map((c, idx) => {
            const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const wing = reg.includes('SD') ? 'SD' : reg.includes('SW') ? 'SW' : '';
            const collegeObj = collegesList.find(u => u.subdomain === c.institutionId);
            return [
                idx + 1,
                collegeObj?.collegeName || c.institutionId,
                c.enrollmentId || c.regimentalNumber || '',
                c.name || '',
                c.rank || 'CDT',
                wing,
                c.certificate || c.B || '',
                c.year || '',
                c.fatherName || '',
                c.motherName || '',
                c.phonePersonal || c.phone || '',
                formatDate(c.dob),
                (c.campsAttended || []).length,
                `${c.attendancePercentage}%`,
            ];
        });
        autoTable(doc, {
            startY: 32,
            head: [['#', 'College', 'Reg. No.', 'Name', 'Rank', 'Wing', 'Cert', 'Year', 'Father', 'Mother', 'Phone', 'DOB', 'Camps Attended', 'Attendance']],
            body: rows,
            styles: { fontSize: 6.5, cellPadding: 2, overflow: 'linebreak' },
            headStyles: { fillColor: [27, 58, 107], fontSize: 7 },
            theme: 'grid',
        });
        doc.save('14A_BN_NCC_All_Cadets.pdf');
    }, [filteredAllCadets, collegesList]);

    const exportAnosToExcel = useCallback(() => {
        const rows = filteredAllAnos.map((s, idx) => {
            const collegeObj = collegesList.find(u => u.subdomain === s.institutionId);
            return {
                'S.No': idx + 1,
                'College': collegeObj?.collegeName || s.institutionId,
                'Name': s.name,
                'Rank': s.rank || '',
                'Email': s.email || '',
                'Phone': s.phone || '',
                'Qualification': s.qualification || '',
                'Experience (Yrs)': s.experience || '',
            };
        });
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'All ANOs');
        XLSX.writeFile(wb, '14A_BN_NCC_All_ANOs.xlsx');
    }, [filteredAllAnos, collegesList]);

    const exportAnosToPDF = useCallback(() => {
        const doc = new jsPDF({ orientation: 'landscape' });
        doc.setFontSize(14);
        doc.text('14(A) BN NCC — ANO Directory', 14, 15);
        doc.setFontSize(9);
        doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${filteredAllAnos.length} officers`, 14, 22);
        const rows = filteredAllAnos.map((s, idx) => {
            const collegeObj = collegesList.find(u => u.subdomain === s.institutionId);
            return [
                idx + 1,
                collegeObj?.collegeName || s.institutionId,
                s.name,
                s.rank || '',
                s.email || '',
                s.phone || '',
            ];
        });
        autoTable(doc, {
            startY: 28,
            head: [['#', 'College', 'Name', 'Rank', 'Email', 'Phone']],
            body: rows,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [27, 58, 107] },
        });
        doc.save('14A_BN_NCC_All_ANOs.pdf');
    }, [filteredAllAnos, collegesList]);
    // ─────────────────────────────────────────────────────────────────────────

    // --- Branch: College Drill Down View ---
    if (activeDrillDownSubdomain) {
        const unit = collegesList.find(c => c.subdomain === activeDrillDownSubdomain);
        if (!unit) {
            setActiveDrillDownSubdomain(null);
            return null;
        }

        const metrics = collegeDetailsMetrics[unit.subdomain] || {
            cadetsCount: 0,
            anoCount: 0,
            staffCount: 0,
            attendancePercentage: 0,
            cadetsList: [],
            staffList: []
        };

        const filteredCadetsForDrillDown = metrics.cadetsList
            .filter(c => {
                const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
                const cert = c.certificate || c.B;
                const q = cadetSearchQuery.toLowerCase();
                const matchSearch = !cadetSearchQuery ||
                    c.name?.toLowerCase().includes(q) ||
                    (c.enrollmentId || '').toLowerCase().includes(q) ||
                    (c.regimentalNumber || '').toLowerCase().includes(q) ||
                    (c.jntuNo || '').toLowerCase().includes(q) ||
                    (c.branch || '').toLowerCase().includes(q) ||
                    (c.fatherName || '').toLowerCase().includes(q) ||
                    (c.motherName || '').toLowerCase().includes(q);
                const matchWing = drillDownWingFilter === 'All' ||
                    (drillDownWingFilter === 'SD' && reg.includes('SD')) ||
                    (drillDownWingFilter === 'SW' && reg.includes('SW'));
                const matchCert = drillDownCertFilter === 'All' || cert === drillDownCertFilter;
                return matchSearch && matchWing && matchCert;
            })
            .sort((a, b) => {
                if (drillDownSort === 'attendance') {
                    return (b.attendancePercentage || 0) - (a.attendancePercentage || 0);
                } else if (drillDownSort === 'name') {
                    return (a.name || '').localeCompare(b.name || '');
                } else {
                    const regA = a.enrollmentId || a.regimentalNumber || '';
                    const regB = b.enrollmentId || b.regimentalNumber || '';
                    return regA.localeCompare(regB);
                }
            });

        return (
            <div className="space-y-6 animate-fade-in pb-10">
                {/* Back Button and Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <button
                        onClick={() => {
                            setActiveDrillDownSubdomain(null);
                            setCadetSearchQuery('');
                            setDrillDownCertFilter('All');
                            setDrillDownWingFilter('All');
                        }}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ncc-navy hover:text-ncc-red dark:text-white dark:hover:text-ncc-gold transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to Colleges
                    </button>
                    <button
                        onClick={() => setSelectedCollege(selectedCollege === unit.subdomain ? 'All' : unit.subdomain)}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                            selectedCollege === unit.subdomain
                                ? 'bg-ncc-gold text-ncc-navy hover:bg-ncc-gold/90'
                                : 'bg-ncc-navy text-white dark:bg-white/10 dark:text-white hover:bg-ncc-navy-mid'
                        }`}
                    >
                        {selectedCollege === unit.subdomain ? 'Active College Filter ON' : 'Set as Active Portal Filter'}
                    </button>
                </div>

                {/* College Header Banner — gradient from college theme colors */}
                <div className="relative rounded-3xl overflow-hidden border dark:border-white/10 shadow-lg">
                    <div
                        className="h-36 sm:h-44 relative overflow-hidden"
                        style={{ background: `linear-gradient(135deg, ${unit.primaryColor || '#1B3A6B'} 0%, ${unit.secondaryColor || '#B8830E'} 100%)` }}
                    >
                        {/* Decorative shapes */}
                        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/10" />
                        <div className="absolute -bottom-12 -left-8 w-40 h-40 rounded-full bg-black/10" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[120px] font-black text-white/5 font-display select-none">
                            {(unit.collegeName || '').split(' ').filter(w => w.length > 1).slice(0, 2).map(w => w[0]).join('')}
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 px-6 pt-6 pb-6 relative">
                        <div className="space-y-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <h3 className="text-xl sm:text-2xl font-black text-ncc-navy dark:text-white font-display">
                                        {unit.collegeName}
                                    </h3>
                                    <p className="text-xs text-ncc-gold uppercase tracking-widest font-extrabold mt-0.5">
                                        {unit.unitName}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 text-xs bg-gray-100 dark:bg-white/10 px-3 py-1.5 rounded-xl font-mono text-gray-600 dark:text-gray-300">
                                    <span>Subdomain: <strong>/{unit.subdomain}</strong></span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400 pt-2">
                                <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-red-500" />
                                    <span>{unit.location}</span>
                                </div>
                                <div className="hidden sm:block text-gray-300 dark:text-gray-700">•</div>
                                <div className="italic">
                                    "{unit.motto}"
                                </div>
                                {unit.contactEmail && (
                                    <>
                                        <div className="hidden sm:block text-gray-300 dark:text-gray-700">•</div>
                                        <div className="flex items-center gap-1">
                                            <Mail className="w-3.5 h-3.5 text-ncc-navy dark:text-ncc-gold" />
                                            <a href={`mailto:${unit.contactEmail}`} className="hover:underline">{unit.contactEmail}</a>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* College Metrics Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div
                        onClick={() => { setDrillDownTab('cadets'); setDrillDownSort('attendance'); }}
                        className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-ncc-navy/30 dark:hover:border-ncc-gold/30 transition-all group"
                    >
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold flex-shrink-0 ${
                            metrics.attendancePercentage >= 75
                                ? 'bg-green-500/20 text-green-500'
                                : metrics.attendancePercentage >= 60
                                ? 'bg-yellow-500/20 text-yellow-500'
                                : 'bg-red-500/20 text-red-500'
                        }`}>
                            <Activity className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 group-hover:text-ncc-navy dark:group-hover:text-ncc-gold transition-colors">Overall Attendance</p>
                            <h3 className="text-2xl font-black mt-1 text-ncc-navy dark:text-white font-display">
                                {metrics.attendancePercentage}%
                            </h3>
                            <p className="text-[9px] text-gray-400 mt-0.5">Click to view attendance list</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl p-5 shadow-sm flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-ncc-navy/20 dark:bg-white/10 flex items-center justify-center text-ncc-navy dark:text-white flex-shrink-0">
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">ANO</p>
                            <h3 className="text-2xl font-black mt-1 text-ncc-navy dark:text-white font-display">
                                {metrics.anoCount}
                            </h3>
                        </div>
                    </div>

                    <div
                        onClick={() => { setDrillDownTab('cadets'); setDrillDownSort('name'); }}
                        className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl p-5 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md hover:border-ncc-navy/30 dark:hover:border-ncc-gold/30 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-xl bg-ncc-gold/20 flex items-center justify-center text-ncc-gold flex-shrink-0">
                            <Users className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400 group-hover:text-ncc-navy dark:group-hover:text-ncc-gold transition-colors">Active Cadets</p>
                            <h3 className="text-2xl font-black mt-1 text-ncc-navy dark:text-white font-display">
                                {metrics.cadetsCount} <span className="text-xs text-gray-400 dark:text-gray-500 font-normal">/ {activeUnit?.allottedCadetCount || 0} Vacancies</span>
                            </h3>
                            <p className="text-[9px] text-gray-400 mt-0.5">Click to view cadet roster</p>
                        </div>
                    </div>
                </div>

                {/* Tabs & Content */}
                <div className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-3xl overflow-hidden shadow-sm">
                    <div className="flex border-b dark:border-white/10 bg-gray-50 dark:bg-white/5 p-1.5">
                        <button
                            onClick={() => setDrillDownTab('staff')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                                drillDownTab === 'staff'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                    : 'text-gray-500 hover:text-ncc-navy dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            <Briefcase className="w-4 h-4" /> ANO ({metrics.staffCount})
                        </button>
                        <button
                            onClick={() => setDrillDownTab('cadets')}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                                drillDownTab === 'cadets'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                    : 'text-gray-500 hover:text-ncc-navy dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            <Users className="w-4 h-4" /> Cadet Roster ({metrics.cadetsCount})
                        </button>
                    </div>

                    <div className="p-6">
                        {drillDownTab === 'staff' ? (
                            <div className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b dark:border-white/10">
                                    <div>
                                        <h3 className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-wider">ANO Directory</h3>
                                        <p className="text-xs text-gray-500 mt-1">
                                            Allotted ANOs: <span className="font-bold text-ncc-navy dark:text-ncc-gold">{activeUnit?.allottedAnoCount || 0}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => setIsReleaseEmailModalOpen(true)}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs uppercase tracking-widest rounded-xl transition"
                                            title="Release an email address stuck in authentication"
                                        >
                                            <Key className="w-3.5 h-3.5" /> Release Email
                                        </button>
                                        <button 
                                            onClick={handleCleanDuplicateAnos}
                                            className="flex items-center gap-1.5 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 font-bold text-xs uppercase tracking-widest rounded-xl transition"
                                            title="Clean duplicate or empty ANO profiles"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Clean Duplicates
                                        </button>
                                        <button 
                                            onClick={() => setIsAddingStaff(true)}
                                            className="flex items-center gap-1.5 px-4 py-2 bg-ncc-navy hover:bg-ncc-navy-mid dark:bg-ncc-gold dark:hover:bg-ncc-gold/80 text-white dark:text-ncc-navy font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-md"
                                        >
                                            <Plus className="w-4 h-4" /> Add ANO
                                        </button>
                                    </div>
                                </div>
                                {metrics.staffList.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-xs">
                                        No ANO records found for this college unit.
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {metrics.staffList.map((member) => (
                                            <div 
                                                key={member.id} 
                                                onClick={() => setSelectedMember(member)}
                                                className="flex gap-4 p-4 border dark:border-white/10 rounded-2xl bg-gray-50 dark:bg-white/5 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all"
                                            >
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-ncc-navy dark:bg-ncc-gold" />
                                                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setEditingStaff(member); }}
                                                        className="p-1.5 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white hover:text-ncc-gold dark:hover:text-ncc-gold rounded-lg shadow border dark:border-white/5 transition"
                                                        title="Edit Personnel"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setItemToDelete({ type: 'staff', id: member.id, name: member.name, email: member.email }); }}
                                                        className="p-1.5 bg-white dark:bg-slate-800 text-red-500 hover:bg-red-600 hover:text-white rounded-lg shadow border dark:border-white/5 transition"
                                                        title="Delete Personnel"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                                <div className="w-14 h-14 rounded-xl overflow-hidden border bg-gray-200 flex-shrink-0">
                                                    <img 
                                                        src={member.photoUrl || 'https://placehold.co/150/0A1628/C9922A?text=Staff'} 
                                                        alt={member.name} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                                <div className="space-y-1 min-w-0">
                                                    <h4 className="font-bold text-sm text-ncc-navy dark:text-white truncate pr-14">{member.name}</h4>
                                                    <p className="text-[10px] text-ncc-gold uppercase tracking-wider font-extrabold">{member.rank}</p>
                                                    
                                                    <div className="flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400 pt-1.5">
                                                        {member.email && (
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                                                <span className="truncate">{member.email}</span>
                                                            </div>
                                                        )}
                                                        {member.phone && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                                                <span>{member.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Filters row */}
                                <div className="flex flex-wrap items-center gap-3">
                                    {/* Search */}
                                    <div className="flex items-center gap-2 px-3 py-2 border dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 flex-1 min-w-[200px] max-w-sm">
                                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                        <input
                                            type="text"
                                            placeholder="Search name, reg. no..."
                                            value={cadetSearchQuery}
                                            onChange={(e) => setCadetSearchQuery(e.target.value)}
                                            className="w-full bg-transparent text-xs outline-none text-ncc-navy dark:text-white placeholder-gray-400"
                                        />
                                        {cadetSearchQuery && (
                                            <button onClick={() => setCadetSearchQuery('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs font-bold">✕</button>
                                        )}
                                    </div>

                                    {/* Division dropdown */}
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Division</label>
                                        <select value={drillDownWingFilter} onChange={(e) => setDrillDownWingFilter(e.target.value)}
                                            className="text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                            <option value="All">All Divisions</option>
                                            <option value="SD">SD (Senior Division)</option>
                                            <option value="SW">SW (Senior Wing)</option>
                                        </select>
                                    </div>

                                    {/* Certificate dropdown */}
                                    <div className="flex flex-col gap-0.5">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Certificate</label>
                                        <select value={drillDownCertFilter} onChange={(e) => setDrillDownCertFilter(e.target.value)}
                                            className="text-xs font-bold border dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                            <option value="All">All Certificates</option>
                                            <option value="B1">B1 Certificate</option>
                                            <option value="B2">B2 Certificate</option>
                                            <option value="C">C Certificate</option>
                                        </select>
                                    </div>

                                    {/* Sort Toggle */}
                                    <div className="flex flex-col gap-0.5 ml-auto">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Sort By</label>
                                        <div className="flex border border-gray-200 dark:border-white/10 rounded-xl overflow-hidden">
                                            <button onClick={() => setDrillDownSort('regNo')}
                                                className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition ${
                                                    drillDownSort === 'regNo' ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-ncc-navy dark:hover:text-white'
                                                }`}>Reg. No</button>
                                            <button onClick={() => setDrillDownSort('name')}
                                                className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition border-l border-gray-200 dark:border-white/10 ${
                                                    drillDownSort === 'name' ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-ncc-navy dark:hover:text-white'
                                                }`}>Name A→Z</button>
                                            <button onClick={() => setDrillDownSort('attendance')}
                                                className={`px-3 py-2 text-xs font-black uppercase tracking-wider transition border-l border-gray-200 dark:border-white/10 ${
                                                    drillDownSort === 'attendance' ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy' : 'bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400 hover:text-ncc-navy dark:hover:text-white'
                                                }`}>Attendance ↓</button>
                                        </div>
                                    </div>
                                </div>

                                {/* Result count */}
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                    Showing {filteredCadetsForDrillDown.length} of {metrics.cadetsCount} cadets &nbsp;·&nbsp; Allotted: {activeUnit?.allottedCadetCount || 0} &nbsp;·&nbsp;
                                    Sorted by: <span className="text-ncc-navy dark:text-ncc-gold">{drillDownSort === 'regNo' ? 'Reg. No' : drillDownSort === 'name' ? 'Name A→Z' : 'Attendance ↓'}</span>
                                </p>

                                {filteredCadetsForDrillDown.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-xs">
                                        {metrics.cadetsList.length === 0
                                            ? 'No cadets enrolled in this college.'
                                            : 'No cadets match the search query.'}
                                    </div>
                                ) : (
                                    <div className="overflow-x-auto rounded-xl border dark:border-white/10">
                                        <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                                            <thead>
                                                <tr className="bg-gray-100 dark:bg-white/5 text-gray-400 uppercase font-black tracking-wider text-[10px] border-b dark:border-white/10">
                                                    <th className="px-3 py-3 w-6">#</th>
                                                    <th className="px-3 py-3">Reg. No.</th>
                                                    <th className="px-3 py-3">Name</th>
                                                    <th className="px-3 py-3">Rank</th>
                                                    <th className="px-3 py-3">Wing</th>
                                                    <th className="px-3 py-3">Cert</th>
                                                    <th className="px-3 py-3">Year</th>
                                                    <th className="px-3 py-3">Father's Name</th>
                                                    <th className="px-3 py-3">Mother's Name</th>
                                                    <th className="px-3 py-3">Phone</th>
                                                    <th className="px-3 py-3">DOB</th>
                                                    <th className="px-3 py-3 text-center">Camps Attended</th>
                                                    <th className="px-3 py-3 text-right">Attendance</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y dark:divide-white/10 text-ncc-navy dark:text-gray-300">
                                                {filteredCadetsForDrillDown.map((cadet, idx) => {
                                                    const reg = (cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase();
                                                    const wing = reg.includes('SD') ? 'SD' : reg.includes('SW') ? 'SW' : '—';
                                                    const cert = cadet.certificate || cadet.B || '—';
                                                    const certColor = cert === 'B1' ? 'bg-emerald-500/10 text-emerald-600'
                                                                    : cert === 'B2' ? 'bg-blue-500/10 text-blue-600'
                                                                    : cert === 'C'  ? 'bg-yellow-500/10 text-yellow-600'
                                                                    : 'bg-gray-100 text-gray-400 dark:bg-white/5';
                                                    return (
                                                        <tr
                                                            key={cadet.id}
                                                            onClick={() => setSelectedCadetForModal(cadet)}
                                                            className="hover:bg-ncc-gold/5 dark:hover:bg-white/5 transition cursor-pointer"
                                                        >
                                                            <td className="px-3 py-2.5 text-gray-400">{idx + 1}</td>
                                                            <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap">{cadet.enrollmentId || cadet.regimentalNumber}</td>
                                                            <td className="px-3 py-2.5 font-bold whitespace-nowrap text-ncc-navy dark:text-white">{cadet.name}</td>
                                                            <td className="px-3 py-2.5">
                                                                <span className="bg-ncc-navy/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold">{cadet.rank || 'CDT'}</span>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                                                    wing === 'SD' ? 'bg-ncc-navy/10 text-ncc-navy dark:bg-white/10 dark:text-white'
                                                                                 : wing === 'SW' ? 'bg-pink-500/10 text-pink-600' : 'text-gray-400'
                                                                }`}>{wing}</span>
                                                            </td>
                                                            <td className="px-3 py-2.5">
                                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${certColor}`}>{cert}</span>
                                                            </td>
                                                            <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{cadet.year || '—'}</td>
                                                            <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{cadet.fatherName || '—'}</td>
                                                            <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{cadet.motherName || '—'}</td>
                                                            <td className="px-3 py-2.5 font-mono text-gray-500 dark:text-gray-400">{cadet.phonePersonal || cadet.phone || '—'}</td>
                                                            <td className="px-3 py-2.5 text-gray-500 dark:text-gray-400">{formatDate(cadet.dob) || '—'}</td>
                                                            <td className="px-3 py-2.5 text-center font-bold text-ncc-navy dark:text-ncc-gold">
                                                                {(cadet.campsAttended || []).length}
                                                            </td>
                                                            <td className="px-3 py-2.5 text-right font-black">
                                                                <span className={
                                                                    cadet.attendancePercentage >= 75 ? 'text-green-500'
                                                                    : cadet.attendancePercentage >= 60 ? 'text-yellow-500' : 'text-red-500'
                                                                }>{cadet.attendancePercentage}%</span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {(isAddingStaff || editingStaff) && (
                    <ModalOverlay>
                        <StaffForm 
                            currentStaff={editingStaff || { 
                                institutionId: activeDrillDownSubdomain, 
                                priority: (collegeDetailsMetrics[activeDrillDownSubdomain]?.staffCount || 0) 
                            }} 
                            targetInstitutionId={activeDrillDownSubdomain || (selectedCollege !== 'All' ? selectedCollege : null)}
                            onSaveSuccess={handleStaffModalClose} 
                            onCancel={handleStaffModalClose} 
                        />
                    </ModalOverlay>
                )}

                {selectedMember && (
                    <ModalOverlay onClose={handleStaffModalClose}>
                        <StaffProfileModal 
                            member={selectedMember} 
                            onClose={handleStaffModalClose} 
                        />
                    </ModalOverlay>
                )}

                {itemToDelete && itemToDelete.type === 'staff' && (
                    <ConfirmationModal 
                        itemType={itemToDelete.type} 
                        itemName={itemToDelete.name} 
                        onConfirm={handleDeleteStaffConfirm} 
                        onCancel={handleStaffModalClose} 
                    />
                )}

                {/* Cadet Full Detail Modal */}
                {selectedCadetForModal && (
                    <CadetProfileModal
                        cadet={selectedCadetForModal}
                        attendancePct={selectedCadetForModal.attendancePercentage ?? 0}
                        attendancePresentCount={selectedCadetForModal.attendancePresentCount ?? 0}
                        attendanceTotalPeriods={selectedCadetForModal.attendanceTotalPeriods ?? 0}
                        onClose={() => setSelectedCadetForModal(null)}
                    />
                )}
            </div>
        );
    }

    // --- Branch: Normal Dashboard list ---
    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-ncc-navy dark:text-white font-display">
                        {currentTab === 'overall' ? 'OVERALL DETAILS' : 'BATTALION COLLEGES'}
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {currentTab === 'overall'
                            ? 'Comprehensive overview of cadets and ANOs across all colleges under Srikakulam 14(A) Battalion.'
                            : 'Monitor, configure, and switch active portals for colleges registered under Srikakulam 14(A) Battalion.'}
                    </p>
                </div>
                {currentTab !== 'overall' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePatchAllUnitNames}
                            title="Fix all unit names to 14(A) BN NCC in Firestore"
                            className="flex items-center justify-center gap-2 px-3 py-2 border border-ncc-navy/30 dark:border-white/10 text-ncc-navy dark:text-gray-300 hover:bg-ncc-navy/5 dark:hover:bg-white/5 font-bold text-xs uppercase tracking-widest rounded-lg transition-all"
                        >
                            Fix Unit Names
                        </button>
                        <button
                            onClick={handleOpenAddModal}
                            className="flex items-center justify-center gap-2 px-4 py-2 bg-ncc-navy hover:bg-ncc-navy-mid dark:bg-ncc-gold dark:hover:bg-ncc-gold/80 text-white dark:text-ncc-navy font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-md"
                        >
                            <Plus className="w-4 h-4" /> Add College
                        </button>
                    </div>
                )}
            </div>

            {/* Sub Tabs */}
            {!mode && (
                <div className="flex border-b dark:border-white/10 bg-gray-50 dark:bg-white/5 p-1.5 rounded-xl">
                    <button
                        onClick={() => setActiveSubTab('overall')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            activeSubTab === 'overall'
                                ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                : 'text-gray-500 hover:text-ncc-navy dark:text-gray-400 dark:hover:text-white'
                        }`}
                    >
                        <Activity className="w-4 h-4" /> Overall Details
                    </button>
                    <button
                        onClick={() => setActiveSubTab('directory')}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition ${
                            activeSubTab === 'directory'
                                ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                : 'text-gray-500 hover:text-ncc-navy dark:text-gray-400 dark:hover:text-white'
                        }`}
                    >
                        <GraduationCap className="w-4 h-4" /> Colleges Directory
                    </button>
                </div>
            )}

            {currentTab === 'overall' ? (
                <div className="space-y-6">
                    {/* Metrics Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-white/5 border dark:border-white/10 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-ncc-gold/20 flex items-center justify-center text-ncc-gold flex-shrink-0">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Total Colleges</p>
                                <h3 className="text-2xl font-black mt-1 text-ncc-navy dark:text-white font-display">{stats.totalColleges}</h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-white/5 border dark:border-white/10 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-ncc-navy/20 dark:bg-white/10 flex items-center justify-center text-ncc-navy dark:text-white flex-shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Total Cadets</p>
                                <h3 className="text-2xl font-black mt-1 text-ncc-navy dark:text-white font-display">{stats.totalCadets}</h3>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-white/5 border dark:border-white/10 rounded-2xl p-5 shadow-sm relative overflow-hidden flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center text-green-500 flex-shrink-0">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">ANO</p>
                                <h3 className="text-2xl font-black mt-1 text-ncc-navy dark:text-white font-display">{stats.totalStaff}</h3>
                            </div>
                        </div>
                    </div>

                    {/* Overall Sub-section Tabs */}
                    <div className="flex border dark:border-white/10 bg-gray-50 dark:bg-white/5 p-1.5 rounded-xl w-fit">
                        <button
                            onClick={() => setOverallSection('summary')}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                overallSection === 'summary'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                    : 'text-gray-500 hover:text-ncc-navy dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            Colleges Summary
                        </button>
                        <button
                            onClick={() => setOverallSection('cadets')}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                overallSection === 'cadets'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                    : 'text-gray-500 hover:text-ncc-navy dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            All Cadets ({activeCadetsAllColleges.length})
                        </button>
                        <button
                            onClick={() => setOverallSection('anos')}
                            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                                overallSection === 'anos'
                                    ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                    : 'text-gray-500 hover:text-ncc-navy dark:text-gray-400 dark:hover:text-white'
                            }`}
                        >
                            All ANOs ({activeStaffAllColleges.length})
                        </button>
                    </div>

                    {/* Detailed Summary Table */}
                    {overallSection === 'summary' && (
                        <div className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b dark:border-white/10 pb-4">
                                <div>
                                    <h3 className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-wider">
                                        Colleges Roster Summary
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Overview of cadet allocation, vacancy utilization, staff, and attendance across all institutional units.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={exportSummaryToExcel}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-sm"
                                        title="Export to Excel"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Excel
                                    </button>
                                    <button
                                        onClick={exportSummaryToPDF}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-sm"
                                        title="Export to PDF"
                                    >
                                        <Download className="w-3.5 h-3.5" /> PDF
                                    </button>
                                </div>
                            </div>

                            <div className="overflow-x-auto rounded-2xl border dark:border-white/10">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 dark:bg-white/5 text-gray-400 uppercase font-black tracking-wider text-[10px] border-b dark:border-white/10">
                                            <th className="px-4 py-3.5">College</th>
                                            <th className="px-4 py-3.5">Cadet Utilization</th>
                                            <th className="px-4 py-3.5">ANO Strength</th>
                                            <th className="px-4 py-3.5">Avg Attendance</th>
                                            <th className="px-4 py-3.5">Wings</th>
                                            <th className="px-4 py-3.5 text-right">Certs (B1/B2/C)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y dark:divide-white/10 text-ncc-navy dark:text-gray-300">
                                        {collegesList.map((c) => {
                                            const m = collegeDetailsMetrics[c.subdomain] || {
                                                cadetsCount: 0,
                                                anoCount: 0,
                                                attendancePercentage: 0,
                                                sdCount: 0,
                                                swCount: 0,
                                                b1Count: 0,
                                                b2Count: 0,
                                                cCount: 0
                                            };
                                            const allottedCadets = c.allottedCadetCount || 0;
                                            const activeCadets = m.cadetsCount || 0;
                                            const utilizationPct = allottedCadets > 0 ? Math.min(100, Math.round((activeCadets / allottedCadets) * 100)) : 0;
                                            
                                            const allottedAno = c.allottedAnoCount || 0;
                                            const activeAno = m.anoCount || 0;

                                            return (
                                                <tr
                                                    key={c.subdomain}
                                                    onClick={() => {
                                                        setActiveDrillDownSubdomain(c.subdomain);
                                                        setDrillDownTab('staff');
                                                    }}
                                                    className="hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200 cursor-pointer"
                                                >
                                                    <td className="px-4 py-3.5">
                                                        <p className="font-bold text-ncc-navy dark:text-white">{c.collegeName}</p>
                                                        <span className="text-[9px] font-mono font-bold bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full mt-1 inline-block">
                                                            /{c.subdomain}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 min-w-[150px]">
                                                        <div className="flex items-center justify-between text-[11px] font-black mb-1">
                                                            <span>{activeCadets} / {allottedCadets}</span>
                                                            <span className={
                                                                utilizationPct >= 90 ? 'text-ncc-gold' : 
                                                                utilizationPct >= 50 ? 'text-emerald-600' : 'text-red-500'
                                                            }>{utilizationPct}%</span>
                                                        </div>
                                                        <div className="w-full bg-gray-100 dark:bg-white/10 h-2 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full transition-all duration-500 ${
                                                                    utilizationPct >= 90 ? 'bg-amber-500' :
                                                                    utilizationPct >= 50 ? 'bg-emerald-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ 
                                                                    width: `${utilizationPct}%`,
                                                                    background: utilizationPct >= 90 ? 'linear-gradient(90deg, #1B3A6B 0%, #B8830E 100%)' : undefined
                                                                }}
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 font-bold">
                                                        <span className={activeAno < allottedAno ? 'text-yellow-600' : activeAno === 0 ? 'text-red-500' : 'text-ncc-navy dark:text-white'}>
                                                            {activeAno}
                                                        </span>
                                                        <span className="text-gray-400 font-normal"> / {allottedAno}</span>
                                                    </td>
                                                    <td className="px-4 py-3.5 font-black">
                                                        <span className={
                                                            m.attendancePercentage >= 75
                                                                ? 'text-green-500'
                                                                : m.attendancePercentage >= 60
                                                                ? 'text-yellow-500'
                                                                : 'text-red-500'
                                                        }>
                                                            {m.attendancePercentage}%
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-[11px]">
                                                        <div className="flex gap-2">
                                                            <span className="bg-ncc-navy/10 text-ncc-navy dark:bg-white/10 dark:text-white px-1.5 py-0.5 rounded font-black">
                                                                SD: {m.sdCount}
                                                            </span>
                                                            <span className="bg-pink-500/10 text-pink-600 px-1.5 py-0.5 rounded font-black">
                                                                SW: {m.swCount}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="inline-flex gap-1">
                                                            <span className="bg-emerald-500/10 text-emerald-600 px-1.5 py-0.5 rounded font-bold" title="B1 Cert">
                                                                B1: {m.b1Count}
                                                            </span>
                                                            <span className="bg-blue-500/10 text-blue-600 px-1.5 py-0.5 rounded font-bold" title="B2 Cert">
                                                                B2: {m.b2Count}
                                                            </span>
                                                            <span className="bg-yellow-500/10 text-yellow-600 px-1.5 py-0.5 rounded font-bold" title="C Cert">
                                                                C: {m.cCount}
                                                            </span>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* All Cadets Roster Section — College-wise Grouped */}
                    {overallSection === 'cadets' && (() => {
                        // Group filtered cadets by college, sorted A-Z by college name
                        const groupedByCollege = collegesList
                            .slice()
                            .sort((a, b) => (a.collegeName || '').localeCompare(b.collegeName || ''))
                            .map(c => ({
                                college: c,
                                cadets: filteredAllCadets
                                    .filter(cadet => cadet.institutionId === c.subdomain)
                                    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
                            }))
                            .filter(g => g.cadets.length > 0);

                        return (
                            <div className="space-y-4">
                                {/* Header + Filters + Export */}
                                <div className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b dark:border-white/10 pb-4">
                                        <div>
                                            <h3 className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-wider">
                                                All Colleges — Complete Cadet Details (A → Z)
                                            </h3>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                Full cadet records grouped college-wise. Click any cadet row to view complete profile.
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={exportCadetsToExcel}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-sm"
                                                title="Export Full Details to Excel"
                                            >
                                                <Download className="w-3.5 h-3.5" /> Excel (Full)
                                            </button>
                                            <button
                                                onClick={exportCadetsToPDF}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-sm"
                                                title="Export Full Details to PDF"
                                            >
                                                <Download className="w-3.5 h-3.5" /> PDF (Full)
                                            </button>
                                        </div>
                                    </div>

                                    {/* Filters Row */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        <div className="flex items-center gap-2.5 px-3.5 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 flex-1 min-w-[200px] max-w-sm">
                                            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                            <input
                                                type="text"
                                                placeholder="Search name, reg. no..."
                                                value={allCadetsSearch}
                                                onChange={(e) => setAllCadetsSearch(e.target.value)}
                                                className="w-full bg-transparent text-xs outline-none text-ncc-navy dark:text-white placeholder-gray-400"
                                            />
                                            {allCadetsSearch && (
                                                <button onClick={() => setAllCadetsSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs font-bold">✕</button>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">College</label>
                                            <select value={allCadetsCollegeFilter} onChange={(e) => setAllCadetsCollegeFilter(e.target.value)}
                                                className="text-xs font-bold border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                                <option value="All">All Colleges</option>
                                                {collegesList.slice().sort((a,b)=>(a.collegeName||'').localeCompare(b.collegeName||'')).map(u => (
                                                    <option key={u.subdomain} value={u.subdomain}>{u.collegeName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Division</label>
                                            <select value={allCadetsWingFilter} onChange={(e) => setAllCadetsWingFilter(e.target.value)}
                                                className="text-xs font-bold border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                                <option value="All">All Divisions</option>
                                                <option value="SD">SD (Senior Division)</option>
                                                <option value="SW">SW (Senior Wing)</option>
                                            </select>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">Certificate</label>
                                            <select value={allCadetsCertFilter} onChange={(e) => setAllCadetsCertFilter(e.target.value)}
                                                className="text-xs font-bold border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm">
                                                <option value="All">All Certificates</option>
                                                <option value="B1">B1 Certificate</option>
                                                <option value="B2">B2 Certificate</option>
                                                <option value="C">C Certificate</option>
                                            </select>
                                        </div>
                                    </div>

                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                        {filteredAllCadets.length} cadets across {groupedByCollege.length} colleges
                                    </p>
                                </div>

                                {/* College Groups A → Z */}
                                {groupedByCollege.length === 0 ? (
                                    <div className="text-center py-10 text-gray-400 text-xs bg-white dark:bg-slate-900 border dark:border-white/10 rounded-3xl">No cadets found.</div>
                                ) : groupedByCollege.map(({ college, cadets: groupCadets }, gi) => {
                                    const isExpanded = expandedColleges[college.subdomain] !== false; // default open
                                    return (
                                        <div key={college.subdomain} className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl overflow-hidden shadow-sm">
                                            {/* College Group Header */}
                                            <button
                                                onClick={() => setExpandedColleges(prev => ({ ...prev, [college.subdomain]: !isExpanded }))}
                                                className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 dark:hover:bg-white/5 transition"
                                                style={{ background: `linear-gradient(135deg, ${college.primaryColor || '#1B3A6B'}15 0%, transparent 100%)` }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: college.primaryColor || '#1B3A6B' }} />
                                                    <div className="text-left">
                                                        <p className="font-black text-sm text-ncc-navy dark:text-white">{college.collegeName}</p>
                                                        <p className="text-[10px] text-gray-400 font-mono mt-0.5">{college.location} · /{college.subdomain}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white font-black text-xs px-2.5 py-1 rounded-full">
                                                        {groupCadets.length} cadets
                                                    </span>
                                                    <span className="text-gray-400 text-xs font-bold">{isExpanded ? '▲' : '▼'}</span>
                                                </div>
                                            </button>

                                            {/* Cadet Table — Full Details */}
                                            {isExpanded && (
                                                <div className="overflow-x-auto border-t dark:border-white/10">
                                                    <table className="w-full text-left text-xs border-collapse min-w-[1200px]">
                                                        <thead>
                                                            <tr className="bg-gray-55 dark:bg-white/5 text-gray-400 uppercase font-black tracking-wider text-[10px] border-b dark:border-white/10">
                                                                <th className="px-3 py-2.5 w-6">#</th>
                                                                <th className="px-3 py-2.5">Reg. No.</th>
                                                                <th className="px-3 py-2.5">Name</th>
                                                                <th className="px-3 py-2.5">Rank</th>
                                                                <th className="px-3 py-2.5">Wing</th>
                                                                <th className="px-3 py-2.5">Cert</th>
                                                                <th className="px-3 py-2.5">Year</th>
                                                                <th className="px-3 py-2.5">Father's Name</th>
                                                                <th className="px-3 py-2.5">Mother's Name</th>
                                                                <th className="px-3 py-2.5">Phone</th>
                                                                <th className="px-3 py-2.5">DOB</th>
                                                                <th className="px-3 py-2.5 text-center">Camps Attended</th>
                                                                <th className="px-3 py-2.5 text-right">Attend.</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y dark:divide-white/10 text-ncc-navy dark:text-gray-300">
                                                            {groupCadets.map((cadet, idx) => {
                                                                const reg = (cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase();
                                                                const wing = reg.includes('SD') ? 'SD' : reg.includes('SW') ? 'SW' : '—';
                                                                const cert = cadet.certificate || cadet.B || '—';
                                                                const certColor = cert === 'B1' ? 'bg-emerald-500/10 text-emerald-600'
                                                                                : cert === 'B2' ? 'bg-blue-500/10 text-blue-600'
                                                                                : cert === 'C'  ? 'bg-yellow-500/10 text-yellow-600'
                                                                                : 'bg-gray-100 text-gray-400 dark:bg-white/5';
                                                                return (
                                                                    <tr
                                                                        key={cadet.id}
                                                                        onClick={() => setSelectedCadetForModal(cadet)}
                                                                        className="hover:bg-ncc-gold/5 dark:hover:bg-white/5 transition cursor-pointer"
                                                                    >
                                                                        <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                                                                        <td className="px-3 py-2 font-mono font-bold whitespace-nowrap">{cadet.enrollmentId || cadet.regimentalNumber}</td>
                                                                        <td className="px-3 py-2 font-bold whitespace-nowrap text-ncc-navy dark:text-white">{cadet.name}</td>
                                                                        <td className="px-3 py-2">
                                                                            <span className="bg-ncc-navy/5 dark:bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold">{cadet.rank || 'CDT'}</span>
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${
                                                                                wing === 'SD' ? 'bg-ncc-navy/10 text-ncc-navy dark:bg-white/10 dark:text-white'
                                                                                             : wing === 'SW' ? 'bg-pink-500/10 text-pink-600' : 'text-gray-400'
                                                                            }`}>{wing}</span>
                                                                        </td>
                                                                        <td className="px-3 py-2">
                                                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-black ${certColor}`}>{cert}</span>
                                                                        </td>
                                                                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{cadet.year || '—'}</td>
                                                                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{cadet.fatherName || '—'}</td>
                                                                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{cadet.motherName || '—'}</td>
                                                                        <td className="px-3 py-2 font-mono text-gray-500 dark:text-gray-400">{cadet.phonePersonal || cadet.phone || '—'}</td>
                                                                        <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{formatDate(cadet.dob) || '—'}</td>
                                                                        <td className="px-3 py-2 text-center font-bold text-ncc-navy dark:text-ncc-gold">
                                                                            {(cadet.campsAttended || []).length}
                                                                        </td>
                                                                        <td className="px-3 py-2 text-right font-black">
                                                                            <span className={
                                                                                cadet.attendancePercentage >= 75 ? 'text-green-500'
                                                                                : cadet.attendancePercentage >= 60 ? 'text-yellow-500' : 'text-red-500'
                                                                            }>{cadet.attendancePercentage}%</span>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    })()}

                    {/* All ANOs Directory Section */}
                    {overallSection === 'anos' && (
                        <div className="bg-white dark:bg-slate-900 border dark:border-white/10 rounded-3xl p-6 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b dark:border-white/10 pb-4">
                                <div>
                                    <h3 className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-wider">
                                        Associate NCC Officers (ANOs) Directory
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Directory list of all commissioned ANOs and caretakers managing college units.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setIsReleaseEmailModalOpen(true)}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-sm"
                                        title="Release and unblock an email address stuck in authentication"
                                    >
                                        <Key className="w-3.5 h-3.5" /> Release Email
                                    </button>
                                    <button
                                        onClick={exportAnosToExcel}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-sm"
                                        title="Export to Excel"
                                    >
                                        <Download className="w-3.5 h-3.5" /> Excel
                                    </button>
                                    <button
                                        onClick={exportAnosToPDF}
                                        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-sm"
                                        title="Export to PDF"
                                    >
                                        <Download className="w-3.5 h-3.5" /> PDF
                                    </button>
                                </div>
                            </div>

                            {/* Filters Row */}
                            <div className="flex flex-wrap items-center gap-3">
                                {/* Search */}
                                <div className="flex items-center gap-2.5 px-3.5 py-2 border border-gray-200 dark:border-white/10 rounded-xl bg-gray-50 dark:bg-white/5 flex-1 min-w-[200px] max-w-sm">
                                    <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                                    <input
                                        type="text"
                                        placeholder="Search by name or email..."
                                        value={allAnosSearch}
                                        onChange={(e) => setAllAnosSearch(e.target.value)}
                                        className="w-full bg-transparent text-xs outline-none text-ncc-navy dark:text-white placeholder-gray-400"
                                    />
                                    {allAnosSearch && (
                                        <button onClick={() => setAllAnosSearch('')} className="text-gray-400 hover:text-gray-600 dark:hover:text-white text-xs font-bold">✕</button>
                                    )}
                                </div>

                                {/* College Filter */}
                                <div className="flex flex-col gap-0.5">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 pl-1">College</label>
                                    <select
                                        value={allAnosCollegeFilter}
                                        onChange={(e) => setAllAnosCollegeFilter(e.target.value)}
                                        className="text-xs font-bold border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 bg-white dark:bg-slate-800 text-ncc-navy dark:text-white outline-none cursor-pointer shadow-sm"
                                    >
                                        <option value="All">All Colleges</option>
                                        {collegesList.map(u => (
                                            <option key={u.subdomain} value={u.subdomain}>{u.collegeName}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* ANO Directory Results Count */}
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                                Showing {filteredAllAnos.length} of {activeStaffAllColleges.length} officers
                            </p>

                            {filteredAllAnos.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-xs">
                                    No ANOs found matching the filters.
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {filteredAllAnos.map((member) => {
                                        const collegeObj = collegesList.find(u => u.subdomain === member.institutionId);
                                        return (
                                            <div 
                                                key={member.id} 
                                                onClick={() => setSelectedMember(member)}
                                                className="flex gap-4 p-4 border dark:border-white/10 rounded-2xl bg-gray-50 dark:bg-white/5 relative overflow-hidden group cursor-pointer hover:shadow-md transition-all"
                                            >
                                                <div className="absolute top-0 left-0 w-1.5 h-full bg-ncc-navy dark:bg-ncc-gold" />
                                                <div className="w-14 h-14 rounded-xl overflow-hidden border bg-gray-200 flex-shrink-0">
                                                    <img 
                                                        src={member.photoUrl || 'https://placehold.co/150/0A1628/C9922A?text=Staff'} 
                                                        alt={member.name} 
                                                        className="w-full h-full object-cover" 
                                                    />
                                                </div>
                                                <div className="space-y-1 min-w-0 flex-1">
                                                    <h4 className="font-bold text-sm text-ncc-navy dark:text-white truncate">{member.name}</h4>
                                                    <div className="flex flex-wrap items-center gap-1.5">
                                                        <span className="text-[10px] text-ncc-gold uppercase tracking-wider font-extrabold">{member.rank}</span>
                                                        <span className="text-[9px] bg-ncc-navy/10 text-ncc-navy dark:bg-white/10 dark:text-white px-1.5 py-0.5 rounded font-black max-w-[120px] truncate" title={collegeObj?.collegeName}>
                                                            {collegeObj?.collegeName || member.institutionId}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className="flex flex-col gap-0.5 text-xs text-gray-500 dark:text-gray-400 pt-1.5">
                                                        {member.email && (
                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                <Mail className="w-3.5 h-3.5 flex-shrink-0" />
                                                                <span className="truncate">{member.email}</span>
                                                            </div>
                                                        )}
                                                        {member.phone && (
                                                            <div className="flex items-center gap-1.5">
                                                                <Phone className="w-3.5 h-3.5 flex-shrink-0" />
                                                                <span>{member.phone}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Search Bar */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl shadow-sm">
                            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <input
                                type="text"
                                placeholder="Search colleges by name, location or subdomain..."
                                value={collegeSearchQuery}
                                onChange={(e) => setCollegeSearchQuery(e.target.value)}
                                className="flex-1 bg-transparent text-sm outline-none text-ncc-navy dark:text-white placeholder-gray-400 dark:placeholder-white/30"
                            />
                            {collegeSearchQuery && (
                                <button
                                    onClick={() => setCollegeSearchQuery('')}
                                    className="text-gray-400 hover:text-gray-600 dark:hover:text-white transition-colors text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                        {collegeSearchQuery && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-semibold whitespace-nowrap">
                                {filteredCollegesList.length} of {collegesList.length} colleges
                            </span>
                        )}
                    </div>

                    {/* Colleges Grid */}
                    {filteredCollegesList.length === 0 ? (
                        <div className="text-center py-16 text-gray-400">
                            <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                            <p className="font-bold text-sm">No colleges found</p>
                            <p className="text-xs mt-1">Try a different name, location or subdomain</p>
                        </div>
                    ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredCollegesList.map((unit) => {
                            const isActive = selectedCollege === unit.subdomain;
                            const metrics = collegeDetailsMetrics[unit.subdomain] || { cadetsCount: 0, staffCount: 0, attendancePercentage: 0 };

                            return (
                                <CollegeCard
                                    key={unit.subdomain}
                                    unit={unit}
                                    isActive={isActive}
                                    metrics={metrics}
                                    onOpen={() => { setActiveDrillDownSubdomain(unit.subdomain); setDrillDownTab('staff'); }}
                                    onEdit={(e) => { e.stopPropagation(); handleOpenEditModal(unit); }}
                                    onDelete={(e) => { e.stopPropagation(); handleDeleteCollege(unit.subdomain); }}
                                    onToggleFilter={(e) => { e.stopPropagation(); setSelectedCollege(isActive ? 'All' : unit.subdomain); }}
                                />
                            );
                        })}
                    </div>
                    )}
                </div>
            )}


            {/* Modal: Add College */}
            {isAddModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border dark:border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden scale-in">
                        <div className="px-6 py-4 border-b dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            <h3 className="font-black text-sm uppercase tracking-widest text-ncc-navy dark:text-white font-display">ADD NEW COLLEGE UNIT</h3>
                            <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
                        </div>
                        <form onSubmit={(e) => handleSaveCollege(e, false)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto ncc-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Subdomain / ID</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. aitam"
                                        value={subdomain}
                                        onChange={(e) => setSubdomain(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Location</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Tekkali, Srikakulam"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">College Name</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="e.g. Aditya Institute of Technology"
                                    value={collegeName}
                                    onChange={(e) => setCollegeName(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Contact/College Email</label>
                                <input
                                    type="email"
                                    required
                                    placeholder="e.g. principal@gmrit.edu.in"
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-ncc-navy/5 dark:bg-white/5 border border-ncc-navy/20 dark:border-white/10 rounded-lg">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Unit</span>
                                <span className="text-xs font-black text-ncc-navy dark:text-ncc-gold">14(A) BN NCC</span>
                                <span className="ml-auto text-[9px] text-gray-400 italic">auto-assigned</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Primary Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-white/10"
                                        />
                                        <input
                                            type="text"
                                            value={primaryColor}
                                            onChange={(e) => setPrimaryColor(e.target.value)}
                                            className="flex-1 px-3 py-1.5 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white font-mono"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Secondary Color</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={secondaryColor}
                                            onChange={(e) => setSecondaryColor(e.target.value)}
                                            className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-white/10"
                                        />
                                        <input
                                            type="text"
                                            value={secondaryColor}
                                            onChange={(e) => setSecondaryColor(e.target.value)}
                                            className="flex-1 px-3 py-1.5 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white font-mono"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Motto</label>
                                <input
                                    type="text"
                                    value={motto}
                                    onChange={(e) => setMotto(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Allotted ANO Count</label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="allottedAnoCount"
                                        id="add-allottedAnoCount"
                                        placeholder="e.g. 2"
                                        value={allottedAnoCount}
                                        onChange={(e) => setAllottedAnoCount(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Allotted Cadet Vacancies</label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="allottedCadetCount"
                                        id="add-allottedCadetCount"
                                        placeholder="e.g. 100"
                                        value={allottedCadetCount}
                                        onChange={(e) => setAllottedCadetCount(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                            </div>


                            <div className="pt-4 flex justify-end gap-3 border-t dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy font-bold text-xs uppercase tracking-widest rounded-lg transition"
                                >
                                    Add college
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal: Edit College */}
            {isEditModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 border dark:border-white/10 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden scale-in">
                        <div className="px-6 py-4 border-b dark:border-white/10 flex justify-between items-center bg-gray-50 dark:bg-white/5">
                            <h3 className="font-black text-sm uppercase tracking-widest text-ncc-navy dark:text-white font-display">EDIT PORTAL CONFIGURATION</h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-white">✕</button>
                        </div>
                        <form onSubmit={(e) => handleSaveCollege(e, true)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto ncc-scrollbar">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Subdomain (Read-Only)</label>
                                <input
                                    type="text"
                                    disabled
                                    value={subdomain}
                                    className="w-full px-3 py-2 border dark:border-white/10 bg-gray-100 dark:bg-white/5 rounded-lg text-xs outline-none text-gray-500 dark:text-gray-400 font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">College Name</label>
                                <input
                                    type="text"
                                    required
                                    value={collegeName}
                                    onChange={(e) => setCollegeName(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Contact/College Email</label>
                                <input
                                    type="email"
                                    required
                                    value={contactEmail}
                                    onChange={(e) => setContactEmail(e.target.value)}
                                    className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                />
                            </div>

                            <div className="flex items-center gap-2 px-3 py-2 bg-ncc-navy/5 dark:bg-white/5 border border-ncc-navy/20 dark:border-white/10 rounded-lg">
                                <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">Unit</span>
                                <span className="text-xs font-black text-ncc-navy dark:text-ncc-gold">14(A) BN NCC</span>
                                <span className="ml-auto text-[9px] text-gray-400 italic">auto-assigned</span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Location</label>
                                    <input
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Motto</label>
                                    <input
                                        type="text"
                                        value={motto}
                                        onChange={(e) => setMotto(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Allotted ANO Count</label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="allottedAnoCount"
                                        id="edit-allottedAnoCount"
                                        placeholder="e.g. 2"
                                        value={allottedAnoCount}
                                        onChange={(e) => setAllottedAnoCount(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Allotted Cadet Vacancies</label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="allottedCadetCount"
                                        id="edit-allottedCadetCount"
                                        placeholder="e.g. 100"
                                        value={allottedCadetCount}
                                        onChange={(e) => setAllottedCadetCount(e.target.value)}
                                        className="w-full px-3 py-2 border dark:border-white/10 bg-transparent rounded-lg text-xs outline-none text-ncc-navy dark:text-white"
                                    />
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t dark:border-white/10">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="px-4 py-2 text-xs font-bold uppercase tracking-widest text-gray-500 hover:text-gray-700 dark:hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy font-bold text-xs uppercase tracking-widest rounded-lg transition"
                                >
                                    Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {(isAddingStaff || editingStaff) && (
                <ModalOverlay>
                    <StaffForm 
                        currentStaff={editingStaff || { 
                            institutionId: activeDrillDownSubdomain, 
                            priority: (collegeDetailsMetrics[activeDrillDownSubdomain]?.staffCount || 0) 
                        }} 
                        targetInstitutionId={activeDrillDownSubdomain || (selectedCollege !== 'All' ? selectedCollege : null)}
                        onSaveSuccess={handleStaffModalClose} 
                        onCancel={handleStaffModalClose} 
                    />
                </ModalOverlay>
            )}

            {itemToDelete && itemToDelete.type === 'staff' && (
                <ConfirmationModal 
                    itemType={itemToDelete.type} 
                    itemName={itemToDelete.name} 
                    onConfirm={handleDeleteStaffConfirm} 
                    onCancel={handleStaffModalClose} 
                />
            )}

            {selectedMember && (
                <ModalOverlay onClose={handleStaffModalClose}>
                    <StaffProfileModal 
                        member={selectedMember} 
                        onClose={handleStaffModalClose} 
                    />
                </ModalOverlay>
            )}

            {/* Cadet Full Detail Modal */}
            {selectedCadetForModal && (
                <CadetProfileModal
                    cadet={selectedCadetForModal}
                    attendancePct={selectedCadetForModal.attendancePercentage ?? 0}
                    attendancePresentCount={selectedCadetForModal.attendancePresentCount ?? 0}
                    attendanceTotalPeriods={selectedCadetForModal.attendanceTotalPeriods ?? 0}
                    onClose={() => setSelectedCadetForModal(null)}
                />
            )}

            {/* Release / Unblock Email Modal */}
            {isReleaseEmailModalOpen && (
                <ModalOverlay onClose={() => { setIsReleaseEmailModalOpen(false); setEmailToRelease(''); }}>
                    <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="w-full max-w-md bg-white dark:bg-[#050b14] rounded-3xl p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-white/10 relative overflow-hidden animate-fadeIn"
                    >
                        {/* Top gold bar */}
                        <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-ncc-gold to-amber-600" />

                        <div className="flex items-center justify-between pb-4 mb-4 border-b dark:border-white/10">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                                    <Key className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-display font-black text-base text-ncc-navy dark:text-white">
                                        Release / Unblock Email
                                    </h3>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                        Free up emails stuck with "email already in use"
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => { setIsReleaseEmailModalOpen(false); setEmailToRelease(''); }}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-white rounded-lg transition"
                            >
                                ✕
                            </button>
                        </div>

                        <form onSubmit={handleReleaseEmailSubmit} className="space-y-4">
                            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed bg-amber-50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200 dark:border-amber-900/30">
                                If an old ANO email was changed or left in authentication, enter it below. This will safely remove the stale authentication record and release the email for new accounts.
                            </p>

                            <div className="space-y-1.5">
                                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    Email Address to Unblock <span className="text-red-500">*</span>
                                </label>
                                <div className="relative">
                                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                        type="email"
                                        required
                                        placeholder="e.g. ano.name@college.edu or old-email@..."
                                        value={emailToRelease}
                                        onChange={(e) => setEmailToRelease(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl text-sm outline-none text-ncc-navy dark:text-white focus:border-ncc-gold transition"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-end gap-3 pt-4 border-t dark:border-white/10">
                                <button
                                    type="button"
                                    disabled={releaseLoading}
                                    onClick={() => { setIsReleaseEmailModalOpen(false); setEmailToRelease(''); }}
                                    className="px-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={releaseLoading || !emailToRelease.trim()}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition shadow-md"
                                >
                                    {releaseLoading ? (
                                        <>
                                            <Loader className="w-3.5 h-3.5 animate-spin" /> Releasing…
                                        </>
                                    ) : (
                                        <>
                                            <Key className="w-3.5 h-3.5" /> Release Email Now
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </ModalOverlay>
            )}
        </div>
    );
}
