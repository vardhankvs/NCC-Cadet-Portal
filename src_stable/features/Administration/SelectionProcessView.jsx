import React, { useState, useEffect, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { db } from '../../firebase/config.js';
import { onSnapshot, query, where } from 'firebase/firestore';
import { 
    getCollectionRef, 
    saveApplicant, 
    dropoutApplicant, 
    submitApplicantList, 
    approveSubmittedApplicants, 
    updateUnitVacancies,
    deleteItem 
} from '../../firebase/firestoreService.js';
import { 
    Users, 
    CheckCircle, 
    XCircle, 
    Plus, 
    Search, 
    Activity, 
    FileText, 
    Phone, 
    Mail, 
    Trash2, 
    UserCheck,
    Clock,
    AlertCircle,
    Download,
    Award,
    Shield,
    Calendar,
    ChevronDown,
    ChevronRight,
    TrendingUp
} from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';

export const SelectionProcessView = () => {
    const { userRole, actualRole, isDelegatedCadet, userInstitutionId, userEnrollmentId, userName, user } = useAuthContext();
    const isCadetUser = isDelegatedCadet || userRole === 'cadet' || actualRole === 'cadet';
    const { units = [], cadets = [] } = useDataContext();

    // Check role types
    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';
    const isCollegeAno = userRole === 'admin' || userRole === 'officer';

    // Tabs inside Selection dashboard
    // Admin tabs: 'drive' | 'submissions' | 'vacancies'
    // ANO tabs: 'review'
    const [subTab, setSubTab] = useState(isBattalionAdmin ? 'drive' : 'review');

    const [applicants, setApplicants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [collegeSearchTerm, setCollegeSearchTerm] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('All');
    const [selectedGender, setSelectedGender] = useState('All');

    // Vacancy editing state for Battalion Admin
    const [editingVacancyId, setEditingVacancyId] = useState(null);
    const [editingVacancyVal, setEditingVacancyVal] = useState('');

    // College selection for Battalion Admin conducting selection drives
    const [selectedDriveCollegeId, setSelectedDriveCollegeId] = useState('');

    // Detailed Review Modal for Battalion Admin
    const [reviewingCollege, setReviewingCollege] = useState(null);
    const [assignedRegimentalIds, setAssignedRegimentalIds] = useState({}); // mapping: applicantId -> enrollmentId
    const [approveDetails, setApproveDetails] = useState({
        rank: 'CDT',
        certificate: 'NA',
        company: 'A COY'
    });

    // ANO Dropout Modal
    const [dropoutTarget, setDropoutTarget] = useState(null);
    const [dropoutReason, setDropoutReason] = useState('Academic reasons');
    const [dropoutReasonCustom, setDropoutReasonCustom] = useState('');
    const [isDropoutModalOpen, setIsDropoutModalOpen] = useState(false);

    // Modals for Adding/Editing Candidate Vitals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedApplicant, setSelectedApplicant] = useState(null);

    // Candidate form state
    const [formData, setFormData] = useState({
        fullName: '',
        studentId: '',
        email: '',
        phone: '',
        department: '',
        year: '1st',
        gender: 'SD',
        status: 'Applied',
        physicalStats: { height: '', weight: '' },
        trialScores: { runTime: '', pushups: '', situps: '', pullups: '', runWithinLimit: 'Pending' },
        writtenScore: '',
        interviewScore: '',
        medicalStatus: 'Pending'
    });

    // Real-time listener for applicants (filtered by institution if ANO)
    useEffect(() => {
        setLoading(true);
        const ref = getCollectionRef('applicants');
        if (!ref) return;

        let q = query(ref);
        if (isCollegeAno && userInstitutionId) {
            q = query(ref, where('institutionId', '==', userInstitutionId));
        }

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setApplicants(list);
            setLoading(false);
        }, (err) => {
            console.error(err);
            toast.error("Failed to sync applicants database");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [isCollegeAno, userInstitutionId]);

    // Active College/Unit for ANO
    const currentCollege = useMemo(() => {
        if (!userInstitutionId) return null;
        return units.find(u => u.subdomain === userInstitutionId);
    }, [units, userInstitutionId]);

    // Vacancy (Allotted count) for ANO
    const currentCollegeVacancyLimit = currentCollege?.allottedCadetCount || 0;

    // Enrolled Active Cadets in current college roster
    const currentCollegeEnrolledCount = useMemo(() => {
        if (!userInstitutionId) return 0;
        return cadets.filter(c => c.institutionId === userInstitutionId && c.status !== 'alumni').length;
    }, [cadets, userInstitutionId]);

    const driveInstitutionId = isCollegeAno ? userInstitutionId : selectedDriveCollegeId;

    const driveApplicants = useMemo(() => {
        if (isCollegeAno) {
            return applicants;
        }
        return applicants.filter(a => a.institutionId === selectedDriveCollegeId);
    }, [applicants, isCollegeAno, selectedDriveCollegeId]);

    // Compute automatic merit score based on trials
    const calculateMerit = (phys, trials, written, interview) => {
        let score = 0;
        const pushups = Number(trials.pushups) || 0;
        score += Math.min((pushups / 45) * 10, 10);

        const situps = Number(trials.situps) || 0;
        score += Math.min((situps / 45) * 10, 10);

        const pullups = Number(trials.pullups) || 0;
        score += Math.min((pullups / 12) * 10, 10);

        const runtimeStr = trials.runTime || '';
        if (runtimeStr && runtimeStr.includes(':')) {
            const [mins, secs] = runtimeStr.split(':').map(Number);
            const totalSecs = (mins * 60) + (secs || 0);
            if (totalSecs > 0) {
                if (totalSecs <= 330) score += 30; // 5:30 mins
                else if (totalSecs <= 360) score += 25; // 6:00 mins
                else if (totalSecs <= 390) score += 20; // 6:30 mins
                else if (totalSecs <= 420) score += 15; // 7:00 mins
                else if (totalSecs <= 480) score += 10; // 8:00 mins
                else score += 5;
            }
        }

        const writtenRaw = Number(written) || 0;
        score += Math.min((writtenRaw / 50) * 30, 30);

        const interviewRaw = Number(interview) || 0;
        score += Math.min(interviewRaw, 10);

        return Math.round(score * 10) / 10;
    };

    // Filtered applicant list
    const filteredApplicants = useMemo(() => {
        let list = isCollegeAno ? applicants : applicants.filter(a => a.institutionId === selectedDriveCollegeId);
        
        // Filter by tab restrictions
        if (subTab === 'review') {
            // Under review tab, ANO only looks at post-selection (Selected, Dropped, Submitted, Approved)
            list = list.filter(a => ['Selected', 'Dropped', 'Submitted', 'Approved'].includes(a.status));
        } else if (subTab === 'drive') {
            // Under drive tab, ANO looks at active filtration drive candidates (Applied, Screening, Rejected)
            list = list.filter(a => ['Applied', 'Screening', 'Rejected'].includes(a.status));
        }

        if (selectedStatus !== 'All') {
            list = list.filter(a => a.status === selectedStatus);
        }
        if (selectedGender !== 'All') {
            list = list.filter(a => a.gender === selectedGender);
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(a => 
                a.fullName?.toLowerCase().includes(q) || 
                a.studentId?.toLowerCase().includes(q) ||
                a.email?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [applicants, subTab, selectedStatus, selectedGender, searchTerm, isCollegeAno, selectedDriveCollegeId]);

    // Handle vacancy limit update
    const handleSaveVacancyLimit = async (unitId) => {
        const val = parseInt(editingVacancyVal);
        if (isNaN(val) || val < 0) {
            return toast.error("Please enter a valid vacancy count");
        }
        try {
            await updateUnitVacancies(unitId, val);
            toast.success("Vacancies updated successfully!");
            setEditingVacancyId(null);
        } catch (err) {
            toast.error("Failed to update vacancies");
        }
    };

    // Open add candidate modal
    const handleOpenAdd = () => {
        setSelectedApplicant(null);
        setFormData({
            fullName: '',
            studentId: '',
            email: '',
            phone: '',
            department: '',
            year: '1st',
            gender: 'SD',
            status: 'Applied',
            physicalStats: { height: '', weight: '' },
            trialScores: { runTime: '', pushups: '', situps: '', pullups: '', runWithinLimit: 'Pending' },
            writtenScore: '',
            interviewScore: '',
            medicalStatus: 'Pending'
        });
        setIsAddModalOpen(true);
    };

    // Open edit/scores modal
    const handleOpenEdit = (app) => {
        setSelectedApplicant(app);
        setFormData({
            fullName: app.fullName || '',
            studentId: app.studentId || '',
            email: app.email || '',
            phone: app.phone || '',
            department: app.department || '',
            year: app.year || '1st',
            gender: app.gender || 'SD',
            status: app.status || 'Applied',
            physicalStats: {
                height: app.physicalStats?.height || '',
                weight: app.physicalStats?.weight || ''
            },
            trialScores: {
                runTime: app.trialScores?.runTime || '',
                pushups: app.trialScores?.pushups || '',
                situps: app.trialScores?.situps || '',
                pullups: app.trialScores?.pullups || '',
                runWithinLimit: app.trialScores?.runWithinLimit || 'Pending'
            },
            writtenScore: app.writtenScore || '',
            interviewScore: app.interviewScore || '',
            medicalStatus: app.medicalStatus || 'Pending'
        });
        setIsEditModalOpen(true);
    };

    // Submit add / edit candidate
    const handleSubmitForm = async (e) => {
        e.preventDefault();
        try {
            let bmiVal = 0;
            const h = Number(formData.physicalStats.height) / 100;
            const w = Number(formData.physicalStats.weight);
            if (h > 0 && w > 0) {
                bmiVal = Math.round((w / (h * h)) * 10) / 10;
            }

            const meritScore = calculateMerit(
                formData.physicalStats,
                formData.trialScores,
                formData.writtenScore,
                formData.interviewScore
            );

            const payload = {
                ...formData,
                physicalStats: {
                    ...formData.physicalStats,
                    bmi: bmiVal
                },
                meritScore
            };

            if (isCadetUser) {
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'selection_process',
                    moduleName: 'Cadet Selection Process',
                    actionType: selectedApplicant ? 'update' : 'create',
                    targetDocId: selectedApplicant?.id || null,
                    title: `${selectedApplicant ? 'Evaluate' : 'Register'} Applicant: ${formData.fullName}`,
                    payload
                });
                toast.success("Candidate entry submitted for ANO verification!");
                setIsAddModalOpen(false);
                setIsEditModalOpen(false);
                setSelectedApplicant(null);
                return;
            }

            await saveApplicant(payload, selectedApplicant?.id || null, driveInstitutionId);
            toast.success(selectedApplicant ? "Candidate evaluation updated!" : "Candidate registered successfully!");
            setIsAddModalOpen(false);
            setIsEditModalOpen(false);
            setSelectedApplicant(null);
        } catch (err) {
            toast.error(err.message || "Failed to save applicant data");
        }
    };

    // Handle Dropout
    const handleOpenDropout = (app) => {
        setDropoutTarget(app);
        setDropoutReason('Academic reasons');
        setDropoutReasonCustom('');
        setIsDropoutModalOpen(true);
    };

    const submitDropout = async () => {
        if (!dropoutTarget) return;
        const finalReason = dropoutReason === 'Other' ? dropoutReasonCustom : dropoutReason;
        if (!finalReason.trim()) {
            return toast.error("Please provide a reason for dropping out.");
        }
        try {
            if (isCadetUser) {
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                await submitDelegatedTask({
                    institutionId: userInstitutionId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'selection_process',
                    moduleName: 'Cadet Selection Process',
                    actionType: 'update',
                    targetDocId: dropoutTarget.id,
                    title: `Candidate Dropout: ${dropoutTarget.fullName}`,
                    payload: {
                        id: dropoutTarget.id,
                        status: 'Dropped',
                        dropoutReason: finalReason
                    }
                });
                toast.success("Candidate dropout submitted for ANO verification!");
                setIsDropoutModalOpen(false);
                setDropoutTarget(null);
                return;
            }

            await dropoutApplicant(dropoutTarget.id, finalReason);
            toast.success(`${dropoutTarget.fullName} marked as Dropped.`);
            setIsDropoutModalOpen(false);
            setDropoutTarget(null);
        } catch (err) {
            toast.error("Failed to update candidate status");
        }
    };

    // Submit selection list to Battalion HQ
    const handleANOFinalSubmit = async () => {
        const selectedApps = driveApplicants.filter(a => a.status === 'Selected');
        if (selectedApps.length === 0) {
            return toast.error("There are no Selected candidates to submit.");
        }
        if (!window.confirm(`Submit final list of ${selectedApps.length} candidates to Battalion HQ? This will freeze edits.`)) {
            return;
        }

        try {
            await submitApplicantList(driveInstitutionId);
            toast.success("Final list of selected cadets submitted to Battalion Admin!");
        } catch (err) {
            toast.error(err.message || "Submission failed");
        }
    };

    // Delete candidate
    const handleDeleteCandidate = async (id) => {
        if (!window.confirm("Delete this candidate profile permanently?")) return;
        try {
            await deleteItem('applicants', id);
            toast.success("Candidate deleted");
        } catch (err) {
            toast.error("Failed to delete candidate");
        }
    };

    // Review submitted selections (Battalion Admin)
    const handleOpenReview = (college) => {
        setReviewingCollege(college);
        // Pre-populate regimental IDs with generated sequence suggestions
        const collegeSubmitted = applicants.filter(a => a.institutionId === college.subdomain && a.status === 'Submitted');
        const generated = {};
        const yearSuffix = new Date().getFullYear().toString().substring(2);
        
        collegeSubmitted.forEach((app, idx) => {
            const prefix = `AP${yearSuffix}${app.gender === 'SD' ? 'SDA' : 'SWA'}`;
            const sequentialNum = String(100001 + idx + cadets.length);
            generated[app.id] = `${prefix}${sequentialNum}`;
        });
        setAssignedRegimentalIds(generated);
    };

    // Confirm bulk enrollment approvals
    const handleApproveSelections = async () => {
        if (!reviewingCollege) return;
        const submittedApps = applicants.filter(a => a.institutionId === reviewingCollege.subdomain && a.status === 'Submitted');
        
        // Verify all regimental IDs are filled
        const listToEnroll = [];
        for (const app of submittedApps) {
            const enrollId = assignedRegimentalIds[app.id]?.trim();
            if (!enrollId) {
                return toast.error(`Please assign a Regimental ID for ${app.fullName}`);
            }
            listToEnroll.push({
                applicantId: app.id,
                enrollmentId: enrollId,
                rank: approveDetails.rank,
                certificate: approveDetails.certificate,
                company: approveDetails.company
            });
        }

        try {
            await approveSubmittedApplicants(reviewingCollege.subdomain, listToEnroll);
            toast.success(`Cadet enrollment approved! ${listToEnroll.length} new cadets registered.`);
            setReviewingCollege(null);
        } catch (err) {
            toast.error(err.message || "Failed to finalize enrollment");
        }
    };

    // Computed views for Battalion Admin
    const submittedCollegesList = useMemo(() => {
        if (!isBattalionAdmin) return [];
        // Group applicants by college
        const results = [];
        units.filter(u => !u.isBattalion).forEach(col => {
            const colApplicants = applicants.filter(a => a.institutionId === col.subdomain);
            const submitted = colApplicants.filter(a => a.status === 'Submitted');
            const enrolled = colApplicants.filter(a => a.status === 'Approved');
            const dropped = colApplicants.filter(a => a.status === 'Dropped');

            if (submitted.length > 0 || enrolled.length > 0 || dropped.length > 0) {
                results.push({
                    unitInfo: col,
                    submittedCount: submitted.length,
                    enrolledCount: enrolled.length,
                    droppedCount: dropped.length,
                    droppedList: dropped,
                    submittedList: submitted
                });
            }
        });
        return results;
    }, [isBattalionAdmin, units, applicants]);

    const filteredSubmittedCollegesList = useMemo(() => {
        let list = submittedCollegesList;
        if (collegeSearchTerm.trim()) {
            const q = collegeSearchTerm.toLowerCase();
            list = list.filter(col => 
                (col.unitInfo.collegeName || col.unitInfo.unitName || '').toLowerCase().includes(q) ||
                (col.unitInfo.subdomain || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [submittedCollegesList, collegeSearchTerm]);

    const filteredVacancyUnits = useMemo(() => {
        let list = units.filter(u => !u.isBattalion);
        if (collegeSearchTerm.trim()) {
            const q = collegeSearchTerm.toLowerCase();
            list = list.filter(col => 
                (col.collegeName || col.unitName || '').toLowerCase().includes(q) ||
                (col.subdomain || '').toLowerCase().includes(q)
            );
        }
        return list;
    }, [units, collegeSearchTerm]);

    return (
        <div className="space-y-6 fade-in text-sm" style={{ color: 'var(--text-main)' }}>
            
            {/* Header */}
            <header className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-ncc-navy/5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-display font-black text-ncc-navy dark:text-white mb-2">
                        {isBattalionAdmin ? "Battalion Recruitment Control" : `Recruitment Portal: ${currentCollege?.collegeName || 'GMRIT'}`}
                    </h2>
                    <p className="text-gray-500 dark:text-white/70">
                        {isBattalionAdmin 
                            ? "Configure vacancy quotas across units, audit dropout statistics, and enroll new cadets."
                            : "Conduct candidate trials, filter applicants, drop out unmotivated cadets, and submit final lists."}
                    </p>
                </div>
                {(isBattalionAdmin && subTab === 'drive' && selectedDriveCollegeId) && (
                    <button onClick={handleOpenAdd} className="ncc-btn ncc-btn-primary flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-ncc-navy/10 self-start md:self-center">
                        <Plus className="w-4 h-4" /> Add Candidate
                    </button>
                )}
            </header>

            {/* Dashboard Sub-navigation Tabs */}
            <div className="flex border-b border-gray-100 dark:border-white/10">
                {isBattalionAdmin ? (
                    <>
                        <button onClick={() => { setSubTab('drive'); setSelectedStatus('All'); }} className={`px-6 py-3 font-bold border-b-2 transition-all ${subTab === 'drive' ? 'border-ncc-gold text-ncc-gold font-black' : 'border-transparent text-gray-500 hover:text-ncc-navy'}`}>
                            1. Conduct Selection Drive ({applicants.filter(a => ['Applied', 'Screening', 'Rejected'].includes(a.status)).length})
                        </button>
                        <button onClick={() => setSubTab('submissions')} className={`px-6 py-3 font-bold border-b-2 transition-all ${subTab === 'submissions' ? 'border-ncc-gold text-ncc-gold font-black' : 'border-transparent text-gray-500 hover:text-ncc-navy'}`}>
                            2. Submitted Selections ({submittedCollegesList.filter(c => c.submittedCount > 0).length})
                        </button>
                        <button onClick={() => setSubTab('vacancies')} className={`px-6 py-3 font-bold border-b-2 transition-all ${subTab === 'vacancies' ? 'border-ncc-gold text-ncc-gold font-black' : 'border-transparent text-gray-500 hover:text-ncc-navy'}`}>
                            3. Quota Allocation &amp; Vacancies
                        </button>
                    </>
                ) : (
                    <>
                        <button onClick={() => { setSubTab('review'); setSelectedStatus('All'); }} className={`px-6 py-3 font-bold border-b-2 transition-all ${subTab === 'review' ? 'border-ncc-gold text-ncc-gold font-black' : 'border-transparent text-gray-500 hover:text-ncc-navy'}`}>
                            Post-Selection Review ({applicants.filter(a => ['Selected', 'Dropped', 'Submitted', 'Approved'].includes(a.status)).length})
                        </button>
                    </>
                )}
            </div>

            {/* drive stats row for ANO */}
            {(isCollegeAno || (isBattalionAdmin && ['drive', 'review'].includes(subTab) && selectedDriveCollegeId)) && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="ncc-card p-6 bg-ncc-navy text-white relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-ncc-gold mb-1">Vacancies Quota (N)</p>
                        <p className="text-3xl font-display font-bold">
                            {isCollegeAno ? currentCollegeVacancyLimit : (units.find(u => u.subdomain === selectedDriveCollegeId)?.allottedCadetCount || 0)}
                        </p>
                        <Shield className="absolute -right-4 -bottom-4 w-20 h-20 text-white/5" />
                    </div>
                    <div className="ncc-card p-6 bg-white dark:bg-[#050b14] border border-ncc-navy/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Current Enrolled Cadets</p>
                        <p className="text-3xl font-display font-bold text-ncc-navy dark:text-white">
                            {isCollegeAno ? currentCollegeEnrolledCount : cadets.filter(c => c.institutionId === selectedDriveCollegeId && c.status !== 'alumni').length}
                        </p>
                    </div>
                    <div className="ncc-card p-6 bg-emerald-500 text-white relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-widest text-white/70 mb-1">Selected Candidates</p>
                        <p className="text-3xl font-display font-bold">
                            {driveApplicants.filter(a => a.status === 'Selected').length}
                        </p>
                        <CheckCircle className="absolute -right-4 -bottom-4 w-20 h-20 text-white/10" />
                    </div>
                    <div className="ncc-card p-6 bg-white dark:bg-[#050b14] border border-ncc-navy/5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Dropped Out</p>
                        <p className="text-3xl font-display font-bold text-ncc-navy dark:text-white">
                            {driveApplicants.filter(a => a.status === 'Dropped').length}
                        </p>
                    </div>
                </div>
            )}

            {/* =========================================================================
                ANO - VIEW 1: SELECTION DRIVE / FILTRATION
                ========================================================================= */}
            {(isCollegeAno || isBattalionAdmin) && subTab === 'drive' && (
                <div className="space-y-6">
                    {isBattalionAdmin && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ncc-navy/5 p-6 rounded-3xl border border-ncc-navy/10 animate-fade-in">
                            <div className="space-y-1">
                                <h4 className="font-bold text-base text-ncc-navy dark:text-white">Active College Selection</h4>
                                <p className="text-xs text-gray-500 dark:text-white/70">Select the college unit you want to view, edit, or evaluate candidate details for.</p>
                            </div>
                            <div className="w-full md:w-72">
                                <select 
                                    value={selectedDriveCollegeId} 
                                    onChange={(e) => setSelectedDriveCollegeId(e.target.value)}
                                    className="ncc-input text-xs bg-white dark:bg-[#050b14] font-bold"
                                >
                                    <option value="">-- Select College Unit --</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.subdomain}>
                                            {unit.collegeName || unit.unitName} ({unit.subdomain})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {isBattalionAdmin && !selectedDriveCollegeId && (
                        <div className="bg-white dark:bg-[#050b14] p-12 rounded-3xl border border-ncc-navy/5 shadow-xl text-center space-y-3">
                            <Shield className="w-12 h-12 text-ncc-gold mx-auto opacity-40 animate-pulse" />
                            <h4 className="font-bold text-ncc-navy dark:text-white">No College Selected</h4>
                            <p className="text-gray-500 max-w-md mx-auto text-xs">Please choose a college from the selection menu above to manage applicants and view filtration trials.</p>
                        </div>
                    )}

                    {(!isBattalionAdmin || selectedDriveCollegeId) && (
                        <div className="space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            <div className="ncc-filter-group flex-shrink-0">
                                {['All', 'Applied', 'Screening', 'Rejected'].map((st) => (
                                    <button key={st} onClick={() => setSelectedStatus(st)} className={`ncc-filter-btn px-4 py-2 text-xs ${selectedStatus === st ? 'active' : ''}`}>
                                        {st}
                                    </button>
                                ))}
                            </div>
                            <div className="ncc-filter-group flex-shrink-0">
                                {['All', 'SD', 'SW'].map((g) => (
                                    <button key={g} onClick={() => setSelectedGender(g)} className={`ncc-filter-btn px-4 py-2 text-xs ${selectedGender === g ? 'active' : ''}`}>
                                        {g === 'All' ? 'All Wings' : g}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="Search name, roll..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ncc-input pl-9 text-xs" />
                        </div>
                    </div>

                    {/* Applicants Table */}
                    <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-ncc-navy/5 shadow-xl overflow-hidden">
                        {loading ? (
                            <div className="p-12 text-center text-gray-400">Syncing database files...</div>
                        ) : filteredApplicants.length === 0 ? (
                            <div className="p-12 text-center text-gray-500 italic">No candidates registered under drive view. Click "Add Candidate" to begin.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-ncc-navy text-white text-[10px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Candidate</th>
                                            <th className="px-6 py-4">Contact</th>
                                            <th className="px-6 py-4">Physical Vitals</th>
                                            <th className="px-6 py-4">Trials (Run/Reps)</th>
                                            <th className="px-6 py-4">Merit Score</th>
                                            <th className="px-6 py-4 text-center">Status</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-ncc-navy/5">
                                        {filteredApplicants.map((app) => (
                                            <tr key={app.id} className="hover:bg-ncc-navy/[0.01] dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-ncc-navy dark:text-white">{app.fullName}</div>
                                                    <div className="text-[10px] text-ncc-gold font-mono font-bold uppercase">{app.studentId}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs space-y-0.5 text-gray-500 dark:text-white/70">
                                                    <div>{app.department} · {app.year} ({app.gender})</div>
                                                    <div className="flex items-center gap-1"><Phone className="w-3 h-3 opacity-60" /> {app.phone}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs space-y-0.5 text-gray-600 dark:text-white/80">
                                                    <div>Ht: <span className="font-bold text-ncc-navy dark:text-white">{app.physicalStats?.height || '-'}</span> cm</div>
                                                    <div>Wt: <span className="font-bold text-ncc-navy dark:text-white">{app.physicalStats?.weight || '-'}</span> kg (BMI: {app.physicalStats?.bmi || '-'})</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs space-y-0.5 text-gray-600 dark:text-white/80 font-mono">
                                                    <div>1.6KM: <span className="font-bold text-ncc-navy dark:text-white">{app.trialScores?.runTime || '-'}</span> ({app.trialScores?.runWithinLimit === 'Pass' ? <span className="text-emerald-600 font-bold">Pass</span> : app.trialScores?.runWithinLimit === 'Fail' ? <span className="text-red-600 font-bold">Fail</span> : <span className="text-amber-600 font-bold">Pending</span>})</div>
                                                    <div>Pushups: <span className="font-bold text-ncc-navy dark:text-white">{app.trialScores?.pushups || 0}</span> | Pullups: <span className="font-bold text-ncc-navy dark:text-white">{app.trialScores?.pullups || 0}</span></div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-base font-display font-black text-ncc-navy dark:text-white">{app.meritScore || 0}</div>
                                                    <div className="text-[9px] text-gray-400">Written: {app.writtenScore || 0}/50 · Int: {app.interviewScore || 0}/10</div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                        app.status === 'Rejected' ? 'bg-red-100 text-red-700' :
                                                        app.status === 'Screening' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {app.status}
                                                    </span>
                                                    <div className="text-[9px] text-gray-400 mt-1 uppercase font-bold">{app.medicalStatus === 'Fit' ? 'Med. Fit' : app.medicalStatus === 'Unfit' ? 'Med. Unfit' : 'Med. Pending'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1.5">
                                                        <button onClick={() => handleOpenEdit(app)} title="Record Trials / Vitals" className="p-2 bg-gray-50 dark:bg-white/5 hover:bg-ncc-navy dark:hover:bg-ncc-gold hover:text-white rounded-lg transition-all">
                                                            <Activity className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button onClick={() => handleDeleteCandidate(app.id)} title="Delete candidate" className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-all">
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        </div>
                        </div>
                    )}
                </div>
            )}

            {/* =========================================================================
                ANO - VIEW 2: POST-SELECTION REVIEW & DROPOUT LOGGER
                ========================================================================= */}
            {(isCollegeAno || isBattalionAdmin) && subTab === 'review' && (
                <div className="space-y-6">
                    {isBattalionAdmin && (
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ncc-navy/5 p-6 rounded-3xl border border-ncc-navy/10 animate-fade-in">
                            <div className="space-y-1">
                                <h4 className="font-bold text-base text-ncc-navy dark:text-white">Active College Selection</h4>
                                <p className="text-xs text-gray-500 dark:text-white/70">Select the college unit you want to audit selected and dropped out candidates.</p>
                            </div>
                            <div className="w-full md:w-72">
                                <select 
                                    value={selectedDriveCollegeId} 
                                    onChange={(e) => setSelectedDriveCollegeId(e.target.value)}
                                    className="ncc-input text-xs bg-white dark:bg-[#050b14] font-bold"
                                >
                                    <option value="">-- Select College Unit --</option>
                                    {units.map(unit => (
                                        <option key={unit.id} value={unit.subdomain}>
                                            {unit.collegeName || unit.unitName} ({unit.subdomain})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}

                    {isBattalionAdmin && !selectedDriveCollegeId && (
                        <div className="bg-white dark:bg-[#050b14] p-12 rounded-3xl border border-ncc-navy/5 shadow-xl text-center space-y-3">
                            <Shield className="w-12 h-12 text-ncc-gold mx-auto opacity-40 animate-pulse" />
                            <h4 className="font-bold text-ncc-navy dark:text-white">No College Selected</h4>
                            <p className="text-gray-500 max-w-md mx-auto text-xs">Please choose a college from the selection menu above to audit selected and dropped out candidates.</p>
                        </div>
                    )}

                    {(!isBattalionAdmin || selectedDriveCollegeId) && (
                        <div className="space-y-6">
                            <header className="bg-amber-500/5 p-6 rounded-3xl border border-amber-500/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div className="space-y-1">
                                    <h4 className="font-bold text-base text-ncc-navy dark:text-white flex items-center gap-2"><Clock className="w-5 h-5 text-ncc-gold" /> Post-Selection Queue</h4>
                                    <p className="text-xs text-gray-500 dark:text-white/70">Review selected candidates. Log drop-outs with reasons before submitting the final enrollment list to HQ.</p>
                                </div>
                                {driveApplicants.filter(a => a.status === 'Selected').length > 0 && (
                                    <button onClick={handleANOFinalSubmit} className="ncc-btn ncc-btn-primary flex items-center gap-2 px-6 py-3.5 text-xs font-black uppercase tracking-widest shadow-xl">
                                        <UserCheck className="w-4 h-4" /> Submit Final List to HQ
                                    </button>
                                )}
                            </header>

                            <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-ncc-navy/5 shadow-xl overflow-hidden">
                                {driveApplicants.filter(a => ['Selected', 'Dropped', 'Submitted', 'Approved'].includes(a.status)).length === 0 ? (
                                    <div className="p-12 text-center text-gray-500 italic">No candidates have been marked as "Selected" yet in the Selection Drive.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-ncc-navy text-white text-[10px] font-black uppercase tracking-widest">
                                                <tr>
                                                    <th className="px-6 py-4">Candidate</th>
                                                    <th className="px-6 py-4">Wing / Year</th>
                                                    <th className="px-6 py-4">Trials Merit</th>
                                                    <th className="px-6 py-4">Dropout Audit / Status</th>
                                                    <th className="px-6 py-4 text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-ncc-navy/5">
                                                {driveApplicants.filter(a => ['Selected', 'Dropped', 'Submitted', 'Approved'].includes(a.status)).map((app) => (
                                            <tr key={app.id} className="hover:bg-ncc-navy/[0.01] dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-ncc-navy dark:text-white">{app.fullName}</div>
                                                    <div className="text-[10px] text-ncc-gold font-mono font-bold uppercase">{app.studentId}</div>
                                                </td>
                                                <td className="px-6 py-4 text-xs text-gray-500 dark:text-white/70">
                                                    {app.gender === 'SD' ? 'Senior Division (SD)' : 'Senior Wing (SW)'} · {app.year}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-ncc-navy dark:text-white">Score: {app.meritScore || 0}</div>
                                                    <div className="text-[10px] text-gray-400">Written: {app.writtenScore || 0} | Interview: {app.interviewScore || 0}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {app.status === 'Dropped' ? (
                                                        <div className="space-y-1">
                                                            <span className="px-2 py-0.5 rounded bg-red-100 text-red-700 text-[9px] font-black uppercase tracking-widest">Dropped Out</span>
                                                            <p className="text-xs text-red-600 font-medium italic">Reason: {app.dropoutReason}</p>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-1">
                                                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                                app.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' :
                                                                app.status === 'Submitted' ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'
                                                            }`}>
                                                                {app.status === 'Selected' ? 'Selected / Pending Submit' : app.status}
                                                            </span>
                                                            {app.enrolledAs && (
                                                                <p className="text-[10px] font-mono text-emerald-600 font-bold">Reg. ID: {app.enrolledAs}</p>
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {app.status === 'Selected' && (
                                                        <button onClick={() => handleOpenDropout(app)} className="px-4 py-2 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-xl text-xs font-bold transition-all">
                                                            Log Drop Out
                                                        </button>
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
                    )}
                </div>
            )}

            {/* =========================================================================
                BATTALION ADMIN - VIEW 1: SUBMITTED RECRUITMENT REVIEW
                ========================================================================= */}
            {isBattalionAdmin && subTab === 'submissions' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ncc-navy/5 p-6 rounded-3xl border border-ncc-navy/10">
                        <div className="space-y-1">
                            <h4 className="font-bold text-base text-ncc-navy dark:text-white">Active Recruitment Submissions</h4>
                            <p className="text-xs text-gray-500 dark:text-white/70">Review final selections, verify dropout metrics, assign Regimental Numbers, and enroll cadets into rosters.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search colleges..." 
                                value={collegeSearchTerm} 
                                onChange={(e) => setCollegeSearchTerm(e.target.value)} 
                                className="ncc-input pl-9 text-xs bg-white dark:bg-[#050b14]" 
                            />
                        </div>
                    </div>

                    {filteredSubmittedCollegesList.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 border border-dashed rounded-3xl">
                            {collegeSearchTerm ? "No colleges match your search query." : "No colleges have submitted final selection lists yet."}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-6">
                            {filteredSubmittedCollegesList.map((col) => {
                                const activeCadetsCount = cadets.filter(c => c.institutionId === col.unitInfo.subdomain && c.status !== 'alumni').length;
                                const quota = col.unitInfo.allottedCadetCount || 0;
                                const remainingVacancies = Math.max(quota - activeCadetsCount, 0);

                                return (
                                    <div key={col.unitInfo.subdomain} className="ncc-card p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                        <div className="space-y-2 flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-lg font-display font-black text-ncc-navy dark:text-white">{col.unitInfo.collegeName || col.unitInfo.unitName}</h4>
                                                <span className="px-3 py-1 bg-ncc-navy/5 text-ncc-navy dark:text-white/75 text-[9px] font-black uppercase tracking-widest rounded-full">{col.unitInfo.subdomain}</span>
                                            </div>
                                            
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs font-semibold pt-2">
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Vacancy Quota</p>
                                                    <p className="text-sm font-bold text-ncc-navy dark:text-white">{quota} Seats</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Enrolled Active</p>
                                                    <p className="text-sm font-bold text-ncc-navy dark:text-white">{activeCadetsCount} Cadets</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Submitted Selections</p>
                                                    <p className="text-sm font-bold text-emerald-600">{col.submittedCount} Candidates</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-0.5">Total Dropped Out</p>
                                                    <p className="text-sm font-bold text-red-500">{col.droppedCount} Candidates</p>
                                                </div>
                                            </div>

                                            {col.droppedCount > 0 && (
                                                <div className="bg-red-50 dark:bg-red-950/10 p-3.5 rounded-xl border border-red-100 dark:border-red-950/20 text-xs text-red-700 mt-2 space-y-1">
                                                    <p className="font-bold flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> Dropout Summary:</p>
                                                    <ul className="list-disc pl-5 font-medium space-y-0.5">
                                                        {col.droppedList.map((app, idx) => (
                                                            <li key={idx}><span className="font-bold">{app.fullName}</span>: {app.dropoutReason}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {col.submittedCount > 0 ? (
                                                <button onClick={() => handleOpenReview(col.unitInfo)} className="ncc-btn ncc-btn-primary px-6 py-3.5 text-xs font-black uppercase tracking-widest shadow-lg shadow-ncc-navy/10 flex items-center gap-2">
                                                    <UserCheck className="w-4 h-4" /> Review &amp; Enroll Selection ({col.submittedCount})
                                                </button>
                                            ) : (
                                                <span className="px-4 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl flex items-center gap-1"><CheckCircle className="w-4 h-4" /> Enrollment Finalized</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* =========================================================================
                BATTALION ADMIN - VIEW 2: VACANCY ALLOCATION EDITOR
                ========================================================================= */}
            {isBattalionAdmin && subTab === 'vacancies' && (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-ncc-navy/5 p-6 rounded-3xl border border-ncc-navy/10">
                        <div className="space-y-1">
                            <h4 className="font-bold text-base text-ncc-navy dark:text-white">College Vacancy Allocation Grid</h4>
                            <p className="text-xs text-gray-500 dark:text-white/70">Allocate vacancy quotas ($N$) to colleges. This enforces registration ceilings on cadet sign-ups and recruitment drives.</p>
                        </div>
                        <div className="relative w-full md:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search colleges..." 
                                value={collegeSearchTerm} 
                                onChange={(e) => setCollegeSearchTerm(e.target.value)} 
                                className="ncc-input pl-9 text-xs bg-white dark:bg-[#050b14]" 
                            />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-ncc-navy/5 shadow-xl overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-ncc-navy text-white text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-6 py-4">College Unit</th>
                                    <th className="px-6 py-4">Subdomain ID</th>
                                    <th className="px-6 py-4 text-center">Active Enrolled Cadets</th>
                                    <th className="px-6 py-4 text-center">Allotted Vacancy Limit ($N$)</th>
                                    <th className="px-6 py-4 text-center">New Vacancies</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-ncc-navy/5">
                                {filteredVacancyUnits.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="p-12 text-center text-gray-500 italic">
                                            No colleges match your search.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredVacancyUnits.map((col) => {
                                        const activeCadetsCount = cadets.filter(c => c.institutionId === col.subdomain && c.status !== 'alumni').length;
                                        const isEditing = editingVacancyId === col.id;

                                        return (
                                            <tr key={col.id} className="hover:bg-ncc-navy/[0.01] dark:hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4 font-bold text-ncc-navy dark:text-white">
                                                    {col.collegeName || col.unitName}
                                                </td>
                                                <td className="px-6 py-4 font-mono text-gray-500 dark:text-white/70">
                                                    {col.subdomain}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-ncc-navy dark:text-white">
                                                    {activeCadetsCount} Cadets
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-gray-500 dark:text-white/60">
                                                    {col.allottedCadetCount || 0} Seats
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    {isEditing ? (
                                                        <input 
                                                            type="number" 
                                                            value={editingVacancyVal} 
                                                            onChange={e => setEditingVacancyVal(e.target.value)} 
                                                            className="w-20 text-center bg-gray-50 dark:bg-white/5 border border-ncc-gold rounded px-2 py-1 font-bold text-sm" 
                                                        />
                                                    ) : (
                                                        <span className="font-display font-black text-ncc-gold text-base">{col.newVacancies || 0} Seats</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    {isEditing ? (
                                                        <div className="flex justify-end gap-1.5">
                                                            <button onClick={() => handleSaveVacancyLimit(col.id)} className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600 transition-all">Save</button>
                                                            <button onClick={() => setEditingVacancyId(null)} className="px-3 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition-all">Cancel</button>
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => {
                                                                setEditingVacancyId(col.id);
                                                                setEditingVacancyVal(col.newVacancies || 0);
                                                            }} 
                                                            className="px-3 py-1.5 border-2 border-ncc-gold/40 hover:border-ncc-gold text-ncc-gold hover:text-ncc-navy hover:bg-ncc-gold/10 rounded-lg text-xs font-bold transition-all"
                                                        >
                                                            Add New Vacancies
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* =========================================================================
                MODAL: ANO DROPOUT LOG REASON
                ========================================================================= */}
            {isDropoutModalOpen && dropoutTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white dark:bg-[#0a1628] rounded-[2rem] border border-ncc-navy/10 shadow-2xl max-w-md w-full overflow-hidden">
                        <div className="h-1.5 w-full flex bg-ncc-red"></div>
                        <div className="p-6 border-b border-ncc-navy/5 flex justify-between items-center bg-gray-50 dark:bg-[#050b14]">
                            <div>
                                <h3 className="text-lg font-display font-black text-ncc-navy dark:text-white">Log Candidate Drop Out</h3>
                                <p className="text-xs text-gray-500 dark:text-white/70 mt-1">Submit dropout notification for {dropoutTarget.fullName}</p>
                            </div>
                            <button onClick={() => { setIsDropoutModalOpen(false); setDropoutTarget(null); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Reason for Dropping Out</label>
                                <select value={dropoutReason} onChange={e => setDropoutReason(e.target.value)} className="ncc-input text-xs bg-transparent">
                                    <option value="Personal issues">Personal issue / health concerns</option>
                                    <option value="Academic reasons">Academic reasons / pressure</option>
                                    <option value="Family reasons">Parents are not willing / family issues</option>
                                    <option value="Distance issues">Too much distance to attend classes</option>
                                    <option value="Other">Other (Specify below)</option>
                                </select>
                            </div>
                            {dropoutReason === 'Other' && (
                                <div className="space-y-1 animate-slide-down">
                                    <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Specify custom reason</label>
                                    <input 
                                        type="text" 
                                        value={dropoutReasonCustom} 
                                        onChange={e => setDropoutReasonCustom(e.target.value)} 
                                        className="ncc-input text-xs" 
                                        placeholder="Write custom reason..." 
                                    />
                                </div>
                            )}

                            <button onClick={submitDropout} className="w-full bg-red-600 text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-red-600/25 hover:brightness-110 active:scale-95 transition-all">
                                Log Drop Out &amp; Release Vacancy
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                MODAL: BATTALION ADMIN SELECTION REVIEW & REGIMENTAL ID ASSIGNER
                ========================================================================= */}
            {reviewingCollege && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white dark:bg-[#0a1628] rounded-[2rem] border border-ncc-navy/10 shadow-2xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="h-1.5 w-full flex bg-ncc-gold"></div>
                        <div className="p-6 border-b border-ncc-navy/5 flex justify-between items-center bg-gray-50 dark:bg-[#050b14]">
                            <div>
                                <h3 className="text-xl font-display font-black text-ncc-navy dark:text-white">Audit &amp; Enroll Selections</h3>
                                <p className="text-xs text-gray-500 mt-1">Reviewing final selection drive submission from {reviewingCollege.collegeName || reviewingCollege.unitName}</p>
                            </div>
                            <button onClick={() => setReviewingCollege(null)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto flex-1 space-y-6">
                            {/* Allocation Settings */}
                            <div className="space-y-4 bg-gray-50 dark:bg-white/5 p-5 rounded-2xl border border-ncc-navy/5">
                                <h4 className="text-[10px] font-black text-ncc-gold uppercase tracking-widest pl-1">Roster Allocation Configuration</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Assigned Initial Rank</label>
                                        <select value={approveDetails.rank} onChange={e => setApproveDetails({...approveDetails, rank: e.target.value})} className="ncc-input text-xs bg-transparent">
                                            <option value="CDT">CDT (Cadet)</option>
                                            <option value="LCP">L/CPL (Lance Corporal)</option>
                                            <option value="CPL">CPL (Corporal)</option>
                                            <option value="SGT">SGT (Sergeant)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Starting Certificate Level</label>
                                        <select value={approveDetails.certificate} onChange={e => setApproveDetails({...approveDetails, certificate: e.target.value})} className="ncc-input text-xs bg-transparent">
                                            <option value="NA">N/A</option>
                                            <option value="B1">B1 Certificate</option>
                                            <option value="B2">B2 Certificate</option>
                                            <option value="C">C Certificate</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Starting Company</label>
                                        <input type="text" value={approveDetails.company} onChange={e => setApproveDetails({...approveDetails, company: e.target.value})} className="ncc-input text-xs" />
                                    </div>
                                </div>
                            </div>

                            {/* Candidate Table with Regimental Inputs */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-ncc-gold uppercase tracking-widest pl-1">Assigned Regimental IDs for Final List</h4>
                                <div className="border border-ncc-navy/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-xs text-left">
                                        <thead className="bg-ncc-navy text-white text-[9px] font-black uppercase tracking-wider">
                                            <tr>
                                                <th className="px-4 py-3">Candidate Details</th>
                                                <th className="px-4 py-3">Physical Merit Score</th>
                                                <th className="px-4 py-3">Assigned Regimental Number</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-ncc-navy/5">
                                            {applicants.filter(a => a.institutionId === reviewingCollege.subdomain && a.status === 'Submitted').map((app) => (
                                                <tr key={app.id}>
                                                    <td className="px-4 py-3 font-semibold">
                                                        <div className="font-bold text-ncc-navy dark:text-white">{app.fullName}</div>
                                                        <div className="text-[9px] text-gray-400">{app.studentId} · {app.gender} · {app.year}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-bold text-ncc-navy dark:text-white">Score: {app.meritScore}</div>
                                                        <div className="text-[9px] text-gray-400">Written: {app.writtenScore} | Interview: {app.interviewScore}</div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input 
                                                            type="text" 
                                                            required 
                                                            value={assignedRegimentalIds[app.id] || ''} 
                                                            onChange={e => setAssignedRegimentalIds({
                                                                ...assignedRegimentalIds,
                                                                [app.id]: e.target.value.toUpperCase()
                                                            })} 
                                                            className="ncc-input text-xs font-mono py-1 px-3 border border-gray-200 focus:border-ncc-gold outline-none w-52" 
                                                            placeholder="AP26SDA..." 
                                                        />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-ncc-navy/5 bg-gray-50 dark:bg-[#050b14] flex justify-end gap-2">
                            <button onClick={() => setReviewingCollege(null)} className="px-6 py-3 border rounded-xl font-bold hover:bg-gray-100 transition-all text-xs">Close</button>
                            <button onClick={handleApproveSelections} className="ncc-btn ncc-btn-primary px-8 py-3 rounded-xl font-black uppercase tracking-wider text-xs flex items-center gap-2">
                                <UserCheck className="w-4 h-4" /> Accept List &amp; Enroll Cadets
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* =========================================================================
                ADD / EDIT APPLICANT Vitals FORM MODAL (ANO)
                ========================================================================= */}
            {(isAddModalOpen || isEditModalOpen) && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-[#0a1628] rounded-[2rem] border border-ncc-navy/10 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="h-1.5 w-full flex">
                            <div className="flex-1 bg-ncc-red" /><div className="flex-1 bg-ncc-gold" /><div className="flex-1 bg-ncc-navy" />
                        </div>
                        <div className="p-6 border-b border-ncc-navy/5 flex justify-between items-center bg-gray-50 dark:bg-[#050b14]">
                            <h3 className="text-xl font-display font-black text-ncc-navy dark:text-white">
                                {isEditModalOpen ? `Evaluate Candidate: ${formData.fullName}` : "Register Selection Candidate"}
                            </h3>
                            <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                        </div>
                        <form onSubmit={handleSubmitForm} className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                            {/* Personal Info */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-ncc-gold uppercase tracking-widest border-b pb-1">1. Primary Registration Info</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Full Name</label>
                                        <input type="text" required value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} className="ncc-input text-xs" placeholder="Candidate Full Name" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Student Roll ID</label>
                                        <input type="text" required value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} className="ncc-input text-xs font-mono" placeholder="College Roll / Register No" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Email</label>
                                        <input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="ncc-input text-xs" placeholder="email@gmail.com" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Phone</label>
                                        <input type="text" required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="ncc-input text-xs" placeholder="10-digit mobile" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Branch / Dept</label>
                                        <input type="text" required value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="ncc-input text-xs" placeholder="e.g. CSE, ECE" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Year</label>
                                            <select value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="ncc-input text-xs bg-transparent">
                                                <option value="1st">1st Year</option>
                                                <option value="2nd">2nd Year</option>
                                                <option value="3rd">3rd Year</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Gender / Wing</label>
                                            <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="ncc-input text-xs bg-transparent">
                                                <option value="SD">SD (Male)</option>
                                                <option value="SW">SW (Female)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Physical Parameters */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-ncc-gold uppercase tracking-widest border-b pb-1">2. Physical Trials &amp; Medical Filtration</h4>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Height (cm)</label>
                                        <input type="number" value={formData.physicalStats.height} onChange={e => setFormData({...formData, physicalStats: {...formData.physicalStats, height: e.target.value}})} className="ncc-input text-xs" placeholder="172" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Weight (kg)</label>
                                        <input type="number" value={formData.physicalStats.weight} onChange={e => setFormData({...formData, physicalStats: {...formData.physicalStats, weight: e.target.value}})} className="ncc-input text-xs" placeholder="62" />
                                    </div>
                                    <div className="space-y-1 col-span-2">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Medical Clearance</label>
                                        <select value={formData.medicalStatus} onChange={e => setFormData({...formData, medicalStatus: e.target.value})} className="ncc-input text-xs bg-transparent">
                                            <option value="Pending">Pending Checkup</option>
                                            <option value="Fit">Medically Fit</option>
                                            <option value="Unfit">Medically Unfit</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">1.6KM Run (MM:SS)</label>
                                        <input type="text" value={formData.trialScores.runTime} onChange={e => setFormData({...formData, trialScores: {...formData.trialScores, runTime: e.target.value}})} className="ncc-input text-xs font-mono" placeholder="05:45" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Run Time Limit</label>
                                        <select value={formData.trialScores.runWithinLimit} onChange={e => setFormData({...formData, trialScores: {...formData.trialScores, runWithinLimit: e.target.value}})} className="ncc-input text-xs bg-transparent">
                                            <option value="Pending">Pending</option>
                                            <option value="Pass">Within Time Limit</option>
                                            <option value="Fail">Exceeded Limit</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Pushups (Reps)</label>
                                        <input type="number" value={formData.trialScores.pushups} onChange={e => setFormData({...formData, trialScores: {...formData.trialScores, pushups: e.target.value}})} className="ncc-input text-xs" placeholder="40" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Situps (Reps)</label>
                                        <input type="number" value={formData.trialScores.situps} onChange={e => setFormData({...formData, trialScores: {...formData.trialScores, situps: e.target.value}})} className="ncc-input text-xs" placeholder="45" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Pullups (Reps)</label>
                                        <input type="number" value={formData.trialScores.pullups} onChange={e => setFormData({...formData, trialScores: {...formData.trialScores, pullups: e.target.value}})} className="ncc-input text-xs" placeholder="10" />
                                    </div>
                                </div>
                            </div>

                            {/* Tests & Outcomes */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-ncc-gold uppercase tracking-widest border-b pb-1">3. Academic Scores &amp; Outcome</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Written Test (Max 50)</label>
                                        <input type="number" max={50} value={formData.writtenScore} onChange={e => setFormData({...formData, writtenScore: e.target.value})} className="ncc-input text-xs" placeholder="38" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Interview (Max 10)</label>
                                        <input type="number" max={10} value={formData.interviewScore} onChange={e => setFormData({...formData, interviewScore: e.target.value})} className="ncc-input text-xs" placeholder="8" />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest pl-1">Recruitment Status</label>
                                        <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="ncc-input text-xs bg-transparent">
                                            <option value="Applied">Applied</option>
                                            <option value="Screening">In Screening</option>
                                            <option value="Rejected">Rejected</option>
                                            <option value="Selected">Selected</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button type="submit" className="w-full ncc-btn ncc-btn-primary py-4 font-black uppercase tracking-widest shadow-xl flex items-center justify-center">
                                {isEditModalOpen ? "Save Metrics & Scores" : "Add Candidate Profile"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
