// src/features/Analytics/CertificateGenerator.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { db, appId } from '../../firebase/config.js';
import { doc, updateDoc, writeBatch, onSnapshot, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { generateNominalRollPDF, generateCertificateApplicationPDF } from '../../utils/pdfGenerator.js';
import { Award, Download, Users, FileText, Filter, GraduationCap, MapPin, ChevronLeft, Search, Lock, Check, X, Shield } from '../../components/Icons.jsx';
import { toast } from 'react-toastify';
import { sendPushToCollegeANO } from '../../firebase/pushNotifications.js';

// Pure helper function to check cadet eligibility
const checkCadetEligibility = (c, minAttendanceB = 75, minAttendanceC = 75) => {
    const cert = String(c.currentCertificate || c.certificate || c.B || '').toUpperCase().trim();
    const att = typeof c.attendancePercentage === 'number' ? c.attendancePercentage : 0;
    
    // B Certificate (B, B1, B2) attendance check
    if (cert === 'B' || cert === 'B1' || cert === 'B2') {
        if (att < minAttendanceB) {
            return { eligible: false, reason: `B Cert Attendance < ${minAttendanceB}%` };
        }
    }
    
    // C Certificate attendance check
    if (cert === 'C') {
        if (att < minAttendanceC) {
            return { eligible: false, reason: `C Cert Attendance < ${minAttendanceC}%` };
        }
        if ((c.campsAttended || []).length < 2) {
            return { eligible: false, reason: `C Cert requires 2+ camps (attended: ${(c.campsAttended || []).length})` };
        }
    }
    
    return { eligible: true };
};

const CERT_OPTIONS = ['All', 'A', 'B1', 'B2', 'C'];
const DIV_OPTIONS  = ['All', 'SD', 'SW'];

export const CertificateGenerator = ({ initialCertFilter = 'All' }) => {
    const { cadets, units, attendanceData } = useDataContext();
    const { userRole, userInstitutionId } = useAuthContext();

    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';

    // Local selected unit subdomain. 
    // Battalion Admin starts on selection grid (null); local ANOs bypass grid and lock onto their unit.
    const [selectedUnitSubdomain, setSelectedUnitSubdomain] = useState(() => {
        return isBattalionAdmin ? null : userInstitutionId;
    });

    const [collegeSearch, setCollegeSearch] = useState('');
    const [togglingUnitId, setTogglingUnitId] = useState(null);
    const [togglingCadetId, setTogglingCadetId] = useState(null);

    const [certFilter, setCertFilter] = useState(initialCertFilter);
    const [divFilter,  setDivFilter]  = useState('All');
    const [search,     setSearch]     = useState('');

    useEffect(() => {
        if (initialCertFilter) {
            setCertFilter(initialCertFilter);
        }
    }, [initialCertFilter]);
    const [generating, setGenerating] = useState(null); // 'bulk' | cadetId
    const [venue,      setVenue]      = useState('');
    const [eventDate,  setEventDate]  = useState('');

    const [minAttendanceB, setMinAttendanceB] = useState(75);
    const [minAttendanceC, setMinAttendanceC] = useState(75);
    const [savingConfig, setSavingConfig] = useState(false);

    // Subscribe to global certificate config rules in Firestore
    useEffect(() => {
        const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'certificate_config');
        const unsubscribe = onSnapshot(configRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.data();
                if (typeof data.minAttendanceB === 'number') {
                    setMinAttendanceB(data.minAttendanceB);
                } else if (typeof data.minAttendanceLimit === 'number') {
                    setMinAttendanceB(data.minAttendanceLimit);
                }
                if (typeof data.minAttendanceC === 'number') {
                    setMinAttendanceC(data.minAttendanceC);
                } else if (typeof data.minAttendanceLimit === 'number') {
                    setMinAttendanceC(data.minAttendanceLimit);
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSaveConfig = async () => {
        setSavingConfig(true);
        try {
            const configRef = doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'certificate_config');
            await setDoc(configRef, { 
                minAttendanceB: Number(minAttendanceB),
                minAttendanceC: Number(minAttendanceC),
                minAttendanceLimit: Number(minAttendanceB)
            }, { merge: true });

            toast.success(`Exam eligibility criteria saved (B Cert: ${minAttendanceB}%, C Cert: ${minAttendanceC}%).`);
            setSavingConfig(false);

            // Dispatch real-time low-attendance alerts in background without hanging the save UI
            (async () => {
                try {
                    const { checkAndSendLowAttendanceAlert } = await import('../../firebase/firestoreService.js');
                    const activeCadets = (cadets || []).filter(c => c.status !== 'alumni');
                    
                    const lowAttQueue = [];
                    for (const cadet of activeCadets) {
                        const summary = attendanceData?.individualSummaries?.find(s => 
                            s.id === cadet.id || (s.enrollmentId && cadet.enrollmentId && s.enrollmentId.toUpperCase() === cadet.enrollmentId.toUpperCase())
                        );

                        let att = null;
                        if (summary && typeof summary.percentage === 'number') {
                            att = summary.percentage;
                        } else if (typeof cadet.attendancePercentage === 'number') {
                            att = cadet.attendancePercentage;
                        }

                        const certRaw = String(cadet.currentCertificate || cadet.certificate || cadet.B || '').toUpperCase().trim();
                        const isCCert = (certRaw === 'C' || cadet.year === '3RD YEAR' || cadet.year === '3RD');
                        const targetLimit = isCCert ? Number(minAttendanceC) : Number(minAttendanceB);
                        const certTag = isCCert ? 'C' : 'B';

                        if (att !== null && att < targetLimit) {
                            lowAttQueue.push({ cadet, att, certTag, targetLimit });
                        }
                    }

                    // Process in parallel batches of 10
                    for (let i = 0; i < lowAttQueue.length; i += 10) {
                        const batch = lowAttQueue.slice(i, i + 10);
                        await Promise.allSettled(batch.map(item => 
                            checkAndSendLowAttendanceAlert(
                                item.cadet.id,
                                item.att,
                                item.certTag,
                                item.targetLimit,
                                item.cadet.institutionId || 'gmrit',
                                item.cadet.enrollmentId
                            )
                        ));
                    }
                } catch (bgErr) {
                    console.warn('Background low attendance notice dispatch error:', bgErr);
                }
            })();
        } catch (err) {
            console.error('Error saving config:', err);
            toast.error('Failed to update eligibility rules.');
            setSavingConfig(false);
        }
    };

    const isCadetEligible = (c) => checkCadetEligibility(c, minAttendanceB, minAttendanceC);

    // Filter out headquarters from the standard colleges selection list
    const collegesList = useMemo(() => {
        return units.filter(u => !u.isBattalion);
    }, [units]);

    const filteredColleges = useMemo(() => {
        return collegesList.filter(u => {
            const name = (u.collegeName || '').toLowerCase();
            const loc = (u.location || '').toLowerCase();
            const query = collegeSearch.toLowerCase();
            return name.includes(query) || loc.includes(query);
        });
    }, [collegesList, collegeSearch]);

    const currentUnit = useMemo(() => {
        if (!selectedUnitSubdomain) return null;
        return units.find(u => u.subdomain === selectedUnitSubdomain);
    }, [units, selectedUnitSubdomain]);

    // Downloads are allowed if the unit is approved in Firestore, OR if current user is Battalion Admin (bypasses restriction)
    const isDownloadAllowed = useMemo(() => {
        if (isBattalionAdmin) return true;
        return currentUnit?.allowCertDownload === true;
    }, [isBattalionAdmin, currentUnit]);

    // Filter active cadets under the currently selected college and attach attendance details
    const activeCadets = useMemo(() => {
        if (!selectedUnitSubdomain) return [];
        const collegeCadets = cadets.filter(c => c.status !== 'alumni' && c.institutionId === selectedUnitSubdomain);
        return collegeCadets.map(c => {
            const summary = attendanceData?.individualSummaries?.find(s => 
                s.id === c.id || (s.enrollmentId && c.enrollmentId && s.enrollmentId.toUpperCase() === c.enrollmentId.toUpperCase())
            );
            const attendancePercentage = summary && typeof summary.percentage === 'number' ? summary.percentage : null;
            const totalPeriods = summary ? summary.totalPeriods : 0;
            return {
                ...c,
                attendancePercentage,
                totalPeriods
            };
        });
    }, [cadets, selectedUnitSubdomain, attendanceData]);

    const filtered = useMemo(() => {
        return activeCadets.filter(c => {
            const cert = c.certificate || c.B || '';
            const reg  = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
            const div  = reg.includes('SW') ? 'SW' : 'SD';

            const certMatch = certFilter === 'All' || cert === certFilter;
            const divMatch  = divFilter  === 'All' || div  === divFilter;
            const nameMatch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.enrollmentId?.toLowerCase().includes(search.toLowerCase());

            return certMatch && divMatch && nameMatch;
        });
    }, [activeCadets, certFilter, divFilter, search]);

    const deficientCCadets = useMemo(() => {
        return activeCadets.filter(c => {
            const cert = String(c.currentCertificate || c.certificate || c.B || '').toUpperCase().trim();
            const campsCount = (c.campsAttended || []).length;
            const att = typeof c.attendancePercentage === 'number' ? c.attendancePercentage : null;
            const lowAtt = att !== null && att < minAttendanceC;
            return cert === 'C' && (campsCount < 2 || lowAtt);
        });
    }, [activeCadets, minAttendanceC]);

    const deficientCCadetCount = deficientCCadets.length;

    const deficientBCadets = useMemo(() => {
        return activeCadets.filter(c => {
            const cert = String(c.currentCertificate || c.certificate || c.B || '').toUpperCase().trim();
            const isB = cert === 'B' || cert === 'B1' || cert === 'B2';
            const att = typeof c.attendancePercentage === 'number' ? c.attendancePercentage : null;
            return isB && att !== null && att < minAttendanceB;
        });
    }, [activeCadets, minAttendanceB]);

    const deficientBCadetCount = deficientBCadets.length;
    const totalDeficientCount = deficientCCadetCount + deficientBCadetCount;

    const [sendingNotificationB, setSendingNotificationB] = useState(false);
    const [sendingNotificationC, setSendingNotificationC] = useState(false);

    const handleNotifyANOOfDeficientCadets = async (type) => {
        if (type === 'C' && deficientCCadetCount === 0) return;
        if (type === 'B' && deficientBCadetCount === 0) return;

        if (type === 'C') setSendingNotificationC(true);
        if (type === 'B') setSendingNotificationB(true);

        try {
            const today = new Date().toISOString().split('T')[0];
            const baseDoc = {
                noticeDate: today,
                institutionId: '14a-bn-srikakulam',
                senderRole: 'battalion_admin',
                targetAudience: 'ano',
                targetCollege: [selectedUnitSubdomain],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
            };

            const getCadetDivision = (c) => {
                if (c.division) return c.division.toUpperCase();
                const reg = (c.enrollmentId || c.regimentalNumber || '').toUpperCase();
                return reg.includes('SW') ? 'SW' : 'SD';
            };

            if (type === 'C') {
                const sdCadets = deficientCCadets.filter(c => getCadetDivision(c) === 'SD');
                const swCadets = deficientCCadets.filter(c => getCadetDivision(c) === 'SW');

                const publishCNotif = async (cadetsList, divisionTag) => {
                    const cTitle = `⚠️ C-Certificate Eligibility Warning (${divisionTag})`;
                    const cRows = cadetsList
                        .map((c, i) => {
                            const div = getCadetDivision(c);
                            const attStr = typeof c.attendancePercentage === 'number' ? `${c.attendancePercentage}%` : 'N/A';
                            return `| ${i + 1} | ${c.name} | ${c.enrollmentId} | ${div} | ${attStr} (min ${minAttendanceC}%) | ${(c.campsAttended || []).length} / 2 camps |`;
                        })
                        .join('\n');
                    const cContent =
                        `This is an official notice regarding **C-Certificate** exam eligibility for your college unit.\n\n` +
                        `### C-Certificate Deficiencies (${divisionTag})\n\n` +
                        `The following cadets are **ineligible** for the C-Certificate exam due to low attendance (< ${minAttendanceC}%) or attending **less than 2 camps**:\n\n` +
                        `| S.No | Cadet Name | Enrollment ID | Division | Attendance | Camps Attended |\n` +
                        `|------|------------|--------------|----------|------------|----------------|\n` +
                        `${cRows}\n\n` +
                        `> Their certificate exam forms and hall tickets have been **automatically blocked**. Please review their logs immediately.`;

                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
                        ...baseDoc,
                        title: cTitle,
                        content: cContent,
                        targetCertificate: 'C',
                        targetDivision: divisionTag,
                    });
                };

                if (sdCadets.length > 0) {
                    await publishCNotif(sdCadets, 'SD');
                }
                if (swCadets.length > 0) {
                    await publishCNotif(swCadets, 'SW');
                }

                try {
                    await sendPushToCollegeANO(
                        selectedUnitSubdomain,
                        '⚠️ C-Certificate Deficiencies Reported',
                        `Battalion HQ has flagged C-Certificate deficiencies in your unit. Please check your Notice Board.`,
                        'announcements'
                    );
                } catch (fcmErr) {
                    console.warn('Real-time push notification failed (non-critical):', fcmErr);
                }

                toast.success(`C-Certificate deficiency notice sent to the ${selectedUnitSubdomain} ANO successfully.`);
            } else if (type === 'B') {
                const sdCadets = deficientBCadets.filter(c => getCadetDivision(c) === 'SD');
                const swCadets = deficientBCadets.filter(c => getCadetDivision(c) === 'SW');

                const publishBNotif = async (cadetsList, divisionTag) => {
                    const bTitle = `⚠️ B-Certificate Eligibility Warning: Low Attendance (${divisionTag})`;
                    const fRows = cadetsList
                        .map((c, i) => {
                            const div = getCadetDivision(c);
                            const attStr = typeof c.attendancePercentage === 'number' ? `${c.attendancePercentage}%` : 'N/A';
                            return `| ${i + 1} | ${c.name} | ${c.enrollmentId} | ${div} | ${attStr} | < ${minAttendanceB}% |`;
                        })
                        .join('\n');
                    const bContent =
                        `This is an official notice regarding **B-Certificate** (B1 & B2) exam eligibility for your college unit.\n\n` +
                        `### B-Certificate Deficiencies — Low Attendance (${divisionTag})\n\n` +
                        `The following cadets are **ineligible** for the B-Certificate exam due to insufficient attendance:\n\n` +
                        `| S.No | Cadet Name | Enrollment ID | Division | Attendance | Minimum Required |\n` +
                        `|------|------------|--------------|----------|------------|------------------|\n` +
                        `${fRows}\n\n` +
                        `> Their certificate exam forms and hall tickets have been **automatically blocked**. Please review their attendance logs immediately.`;

                    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'announcements'), {
                        ...baseDoc,
                        title: bTitle,
                        content: bContent,
                        targetCertificate: 'B',
                        targetDivision: divisionTag,
                    });
                };

                if (sdCadets.length > 0) {
                    await publishBNotif(sdCadets, 'SD');
                }
                if (swCadets.length > 0) {
                    await publishBNotif(swCadets, 'SW');
                }

                try {
                    await sendPushToCollegeANO(
                        selectedUnitSubdomain,
                        '⚠️ B-Certificate Attendance Deficiencies Reported',
                        `Battalion HQ has flagged B-Certificate attendance deficiencies in your unit. Please check your Notice Board.`,
                        'announcements'
                    );
                } catch (fcmErr) {
                    console.warn('Real-time push notification failed (non-critical):', fcmErr);
                }

                toast.success(`B-Certificate deficiency notice sent to the ${selectedUnitSubdomain} ANO successfully.`);
            }
        } catch (err) {
            console.error('Error sending deficiency notification:', err);
            toast.error('Failed to send notification to the college ANO.');
        } finally {
            if (type === 'C') setSendingNotificationC(false);
            if (type === 'B') setSendingNotificationB(false);
        }
    };

    const handleToggleDownload = async (subdomain, currentStatus) => {
        setTogglingUnitId(subdomain);
        try {
            const unitRef = doc(db, 'artifacts', appId, 'public', 'data', 'units', subdomain);
            await updateDoc(unitRef, { allowCertDownload: !currentStatus });
            
            if (!currentStatus) {
                // If transitioning to allowed, batch approve all active eligible cadets for this college unit
                const collegeCadets = cadets.filter(c => {
                    if (c.status === 'alumni' || c.institutionId !== subdomain || c.certApproved === true) return false;
                    const summary = attendanceData?.individualSummaries?.find(s => s.id === c.id);
                    const attendancePercentage = summary ? summary.percentage : 0;
                    const cadetWithAtt = { ...c, attendancePercentage };
                    return checkCadetEligibility(cadetWithAtt, minAttendanceB, minAttendanceC).eligible;
                });
                if (collegeCadets.length > 0) {
                    const batchLimit = 400; // safety limit under Firestore's 500 max writes
                    for (let i = 0; i < collegeCadets.length; i += batchLimit) {
                        const chunk = collegeCadets.slice(i, i + batchLimit);
                        const batch = writeBatch(db);
                        chunk.forEach(c => {
                            const cadetRef = doc(db, 'artifacts', appId, 'public', 'data', 'cadets', c.id);
                            batch.update(cadetRef, { certApproved: true });
                        });
                        await batch.commit();
                    }
                }
                toast.success(`Download permissions allowed and eligible cadets approved for ${subdomain}.`);
            } else {
                // If transitioning to blocked, batch disapprove all active cadets for this college unit
                const collegeCadets = cadets.filter(c => c.status !== 'alumni' && c.institutionId === subdomain && c.certApproved === true);
                if (collegeCadets.length > 0) {
                    const batchLimit = 400;
                    for (let i = 0; i < collegeCadets.length; i += batchLimit) {
                        const chunk = collegeCadets.slice(i, i + batchLimit);
                        const batch = writeBatch(db);
                        chunk.forEach(c => {
                            const cadetRef = doc(db, 'artifacts', appId, 'public', 'data', 'cadets', c.id);
                            batch.update(cadetRef, { certApproved: false });
                        });
                        await batch.commit();
                    }
                }
                toast.success(`Download permissions blocked and all cadets disapproved for ${subdomain}.`);
            }
        } catch (err) {
            console.error("Error toggling download status:", err);
            toast.error("Failed to update download permissions. Please check network/permissions.");
        } finally {
            setTogglingUnitId(null);
        }
    };

    const handleToggleCadetApproval = async (cadetId, currentStatus) => {
        setTogglingCadetId(cadetId);
        try {
            const cadetRef = doc(db, 'artifacts', appId, 'public', 'data', 'cadets', cadetId);
            await updateDoc(cadetRef, { certApproved: !currentStatus });
            toast.success(`Cadet certificate status updated successfully.`);
        } catch (err) {
            console.error("Error toggling cadet approval:", err);
            toast.error("Failed to update cadet status. Please try again.");
        } finally {
            setTogglingCadetId(null);
        }
    };

    const handleBulkDownload = (numberType) => {
        const approvedAndEligibleCadets = filtered.filter(c => c.certApproved === true && isCadetEligible(c).eligible);
        if (approvedAndEligibleCadets.length === 0) {
            toast.warn('No approved and eligible cadets match the filters.');
            return;
        }
        
        setGenerating('bulk');
        try {
            const title = [
                'Nominal Roll',
                certFilter !== 'All' ? `– Cert ${certFilter}` : '',
                divFilter  !== 'All' ? `(${divFilter})`       : '',
            ].filter(Boolean).join(' ');
            const filename = `NominalRoll_${certFilter}_${divFilter}_${Date.now()}.pdf`;
            generateNominalRollPDF(approvedCadets, title, filename, numberType, venue, eventDate);
        } catch (err) {
            console.error('Nominal Roll PDF error:', err);
            toast.error('PDF generation failed. See console for details.');
        } finally {
            setTimeout(() => setGenerating(null), 1200);
        }
    };

    const handleIndividualDownload = (cadet) => {
        if (cadet.certApproved !== true) {
            toast.error("This cadet has failed the exam or is unapproved. Certificate download locked.");
            return;
        }
        setGenerating(cadet.id);
        try {
            generateCertificateApplicationPDF(cadet);
        } catch (err) {
            console.error('Certificate PDF error:', err);
            toast.error('Certificate generation failed. See console for details.');
        } finally {
            setTimeout(() => setGenerating(null), 1200);
        }
    };

    const certColor = {
        'A':  'bg-gray-100 dark:bg-[#0d2137] text-gray-700 dark:text-white/90',
        'B1': 'bg-emerald-100 text-emerald-700',
        'B2': 'bg-blue-100 text-blue-700',
        'C':  'bg-amber-100 text-amber-800',
    };

    // UI State 1: College Selection Grid (for Battalion Admins)
    if (isBattalionAdmin && selectedUnitSubdomain === null) {
        return (
            <div className="space-y-6 fade-in">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 sm:p-8 bg-gradient-to-r from-ncc-navy via-[#1a365d] to-ncc-navy dark:from-[#050b14] dark:via-[#0a1628] dark:to-[#050b14] rounded-[2rem] shadow-xl relative overflow-hidden animate-fadeIn">
                    <div className="absolute top-0 right-0 w-72 h-72 bg-ncc-gold/15 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
                    <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                    
                    <div className="relative z-10 space-y-1">
                        <p className="text-[10px] font-black text-ncc-gold uppercase tracking-[0.25em] mb-1">Battalion Headquarters</p>
                        <h2 className="text-xl sm:text-2xl font-display font-bold text-white flex items-center gap-3">
                            <Award className="w-7 h-7 text-ncc-gold" /> Certificates Portal
                        </h2>
                        <p className="text-gray-300 text-xs sm:text-sm">Select a college unit to manage certificate applications, nominal rolls, and ANO download permissions.</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 mb-6 pt-2">
                    <div className="flex items-center gap-2 px-3 py-2 border dark:border-white/10 rounded-xl bg-white dark:bg-slate-900 w-full sm:max-w-sm shadow-sm">
                        <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <input
                            type="text"
                            placeholder="Search colleges by name or location..."
                            value={collegeSearch}
                            onChange={e => setCollegeSearch(e.target.value)}
                            className="w-full bg-transparent text-xs outline-none text-ncc-navy dark:text-white placeholder-gray-400 font-bold"
                        />
                    </div>
                    <span className="text-xs text-gray-400 dark:text-gray-500 font-black uppercase tracking-wider pr-1">
                        Active College Units: {collegesList.length}
                    </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredColleges.map((unit) => {
                        const collegeCadets = cadets.filter(c => c.status !== 'alumni' && c.institutionId === unit.subdomain);
                        const approvedCount = collegeCadets.filter(c => c.certApproved === true).length;
                        const isAllowed = unit.allowCertDownload === true;
                        const isToggling = togglingUnitId === unit.subdomain;

                        const initials = (unit.collegeName || '??')
                            .split(' ')
                            .filter(w => w.length > 1)
                            .slice(0, 2)
                            .map(w => w[0].toUpperCase())
                            .join('');

                        return (
                            <div
                                key={unit.subdomain}
                                onClick={() => setSelectedUnitSubdomain(unit.subdomain)}
                                className="group bg-white dark:bg-slate-900 border dark:border-white/10 rounded-[2rem] overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 cursor-pointer flex flex-col justify-between"
                            >
                                <div className="p-5 space-y-4 flex-1">
                                    {/* Header Gradient */}
                                    <div
                                        className="h-20 rounded-2xl relative overflow-hidden flex items-center justify-center"
                                        style={{ background: `linear-gradient(135deg, ${unit.primaryColor || '#1B3A6B'} 0%, ${unit.secondaryColor || '#B8830E'} 100%)` }}
                                    >
                                        <span className="absolute text-3xl font-black text-white/10 font-display select-none">
                                            {initials}
                                        </span>
                                        <GraduationCap className="w-8 h-8 text-white/90 drop-shadow-md" />
                                        
                                        <div className="absolute top-2 right-2">
                                            <span className="text-[9px] font-mono font-bold bg-black/30 text-white/90 px-2 py-0.5 rounded-full backdrop-blur-sm">
                                                /{unit.subdomain}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Text Info */}
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

                                    {/* Counts */}
                                    <div className="bg-gray-50 dark:bg-white/5 rounded-xl p-3 flex justify-between items-center text-xs">
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Cadets</p>
                                            <p className="font-black text-ncc-navy dark:text-white mt-0.5">{collegeCadets.length}</p>
                                        </div>
                                        <div className="w-px h-6 bg-gray-200 dark:bg-white/10" />
                                        <div className="text-center flex-1">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Approved</p>
                                            <p className="font-black text-green-600 dark:text-green-400 mt-0.5">{approvedCount}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Toggle Action on Card Bottom */}
                                <div 
                                    className="px-5 py-3 border-t dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between gap-2"
                                    onClick={e => e.stopPropagation()} // Prevent card selection click trigger
                                >
                                    <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 tracking-wider">
                                        ANO Downloads
                                    </span>
                                    <button
                                        onClick={() => handleToggleDownload(unit.subdomain, isAllowed)}
                                        disabled={isToggling}
                                        className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-wider transition ${
                                            isAllowed 
                                                ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20' 
                                                : 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-500/20'
                                        }`}
                                    >
                                        {isToggling ? (
                                            '…'
                                        ) : isAllowed ? (
                                            <><X className="w-3 h-3" /> Block</>
                                        ) : (
                                            <><Check className="w-3 h-3" /> Allow</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // UI State 2: Certificate Generator scoped to college
    return (
        <div className="space-y-8 fade-in">
            {/* Header controls for Battalion Admin (Back button & Download Toggle) */}
            {isBattalionAdmin && (
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                    <button
                        onClick={() => {
                            setSelectedUnitSubdomain(null);
                            setSearch('');
                            setCertFilter('All');
                            setDivFilter('All');
                        }}
                        className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ncc-navy hover:text-ncc-red dark:text-white dark:hover:text-ncc-gold transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" /> Back to Colleges
                    </button>
                    
                    <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border dark:border-white/10 rounded-2xl px-4 py-2.5 shadow-sm text-xs">
                        <span className="font-bold text-ncc-navy dark:text-white">ANO Downloads</span>
                        <button
                            onClick={() => handleToggleDownload(currentUnit?.subdomain, currentUnit?.allowCertDownload === true)}
                            disabled={togglingUnitId === currentUnit?.subdomain}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-[10px] font-black tracking-wider transition ${
                                currentUnit?.allowCertDownload === true 
                                    ? 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20' 
                                    : 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-500/20'
                            }`}
                        >
                            {togglingUnitId === currentUnit?.subdomain ? (
                                '…'
                            ) : currentUnit?.allowCertDownload === true ? (
                                <><X className="w-3 h-3" /> Block</>
                            ) : (
                                <><Check className="w-3 h-3" /> Allow</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Locked Warning Banner for ANOs when downloads are blocked */}
            {!isDownloadAllowed && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 flex items-center gap-4 text-red-600 dark:text-red-400 animate-fadeIn">
                    <Lock className="w-8 h-8 shrink-0 animate-bounce" />
                    <div>
                        <h4 className="font-black text-sm uppercase tracking-wider">Downloads Locked</h4>
                        <p className="text-xs mt-1">Certificate downloads for this college are pending approval from the Battalion Admin. You can manage status and review eligible cadets, but Nominal Roll and Form downloads are disabled.</p>
                    </div>
                </div>
            )}

            {/* Global Eligibility Rules */}
            <div className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                    <div>
                        <h3 className="text-sm font-black text-ncc-navy dark:text-white uppercase tracking-wider flex items-center gap-2">
                            <Shield className="w-4 h-4 text-ncc-gold" /> Exam Eligibility Criteria
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">Set the minimum attendance requirements for B (B1 & B2) and C Certificate exams.</p>
                    </div>
                    {isBattalionAdmin ? (
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-500">Min. Attendance (B Cert):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={minAttendanceB}
                                    onChange={e => setMinAttendanceB(Number(e.target.value))}
                                    className="w-16 border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-center text-xs text-ncc-navy dark:text-white bg-gray-50 dark:bg-[#0a1628] font-bold"
                                />
                                <span className="text-xs font-bold text-gray-500">%</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs font-bold text-gray-500">Min. Attendance (C Cert):</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={minAttendanceC}
                                    onChange={e => setMinAttendanceC(Number(e.target.value))}
                                    className="w-16 border border-gray-200 dark:border-white/10 rounded-xl px-2.5 py-1 text-center text-xs text-ncc-navy dark:text-white bg-gray-50 dark:bg-[#0a1628] font-bold"
                                />
                                <span className="text-xs font-bold text-gray-500">%</span>
                            </div>
                            <button
                                onClick={handleSaveConfig}
                                disabled={savingConfig}
                                className="bg-ncc-navy hover:bg-blue-900 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2 rounded-xl transition shadow"
                            >
                                {savingConfig ? 'Saving...' : 'Save Rules'}
                            </button>
                        </div>
                    ) : (
                        <div className="text-xs text-gray-500 font-bold bg-gray-50 dark:bg-white/5 px-4 py-2.5 rounded-xl border dark:border-white/10">
                            🛡️ <strong>Battalion Rules:</strong> B Cert Min: <span className="text-ncc-gold">{minAttendanceB}%</span> | C Cert Min: <span className="text-ncc-gold">{minAttendanceC}%</span> | C Cert Min Camps: <span className="text-ncc-gold">2</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Warning Banner for Battalion Admin about deficient C-certificate and B-certificate cadets */}
            {isBattalionAdmin && totalDeficientCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-amber-600 dark:text-amber-400 animate-fadeIn">
                    <div className="flex items-start gap-4">
                        <Shield className="w-8 h-8 shrink-0 text-amber-500 animate-pulse" />
                        <div className="space-y-1">
                            <h4 className="font-black text-sm uppercase tracking-wider text-amber-800 dark:text-amber-300">Deficient Exam Applicants Detected</h4>
                            <p className="text-xs leading-relaxed">
                                We found ineligible cadets in this college unit:
                            </p>
                            <ul className="text-xs list-disc pl-5 space-y-1 font-semibold text-amber-700 dark:text-amber-300">
                                <li>
                                    <strong>C-Certificate Deficiencies:</strong> {deficientCCadetCount} cadets (low attendance &lt; {minAttendanceC}% or &lt; 2 camps).
                                </li>
                                <li>
                                    <strong>B-Certificate Deficiencies:</strong> {deficientBCadetCount} cadets (low attendance &lt; {minAttendanceB}%).
                                </li>
                            </ul>
                            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1 font-bold">
                                You can notify the college ANO of these deficiencies directly.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                        <button
                            onClick={() => handleNotifyANOOfDeficientCadets('C')}
                            disabled={sendingNotificationC || deficientCCadetCount === 0}
                            className="bg-amber-600 hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl transition shadow whitespace-nowrap text-center"
                        >
                            {sendingNotificationC ? 'Sending Alert...' : 'Notify ANO (C-Cert)'}
                        </button>
                        <button
                            onClick={() => handleNotifyANOOfDeficientCadets('B')}
                            disabled={sendingNotificationB || deficientBCadetCount === 0}
                            className="bg-ncc-navy hover:bg-blue-900 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-xl transition shadow whitespace-nowrap text-center"
                        >
                            {sendingNotificationB ? 'Sending Alert...' : 'Notify ANO (B-Cert)'}
                        </button>
                    </div>
                </div>
            )}

            {/* Generator Header (Inputs and PDF download triggers) */}
            <header className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-[0.25em] mb-1">
                            {currentUnit?.collegeName || 'Active College'}
                        </p>
                        <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                            <Award className="w-7 h-7 text-ncc-gold" /> Certificate Generator
                        </h2>
                        <p className="text-gray-400 dark:text-white/80 text-sm mt-1">Generate exam application forms and nominal rolls for approved cadets.</p>
                    </div>
                    {isDownloadAllowed && (
                        <div className="flex flex-col gap-3">
                            <div className="flex flex-col sm:flex-row gap-3">
                                <input
                                    type="text"
                                    placeholder="Exam/Event Venue"
                                    value={venue}
                                    onChange={e => setVenue(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ncc-navy/30 text-gray-800 dark:text-white bg-gray-50 dark:bg-[#0a1628] font-medium"
                                />
                                <input
                                    type="date"
                                    value={eventDate}
                                    onChange={e => setEventDate(e.target.value)}
                                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ncc-navy/30 text-gray-800 dark:text-white bg-gray-50 dark:bg-[#0a1628] font-medium"
                                />
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={() => handleBulkDownload('regimental')}
                                    disabled={filtered.length === 0 || generating === 'bulk'}
                                    className="flex-1 flex items-center justify-center gap-2 bg-ncc-navy text-white font-black text-sm px-4 py-2.5 rounded-xl hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                                >
                                    <Download className="w-4 h-4" />
                                    Regimental No
                                </button>
                                <button
                                    onClick={() => handleBulkDownload('jntu')}
                                    disabled={filtered.length === 0 || generating === 'bulk'}
                                    className="flex-1 flex items-center justify-center gap-2 bg-ncc-navy text-white font-black text-sm px-4 py-2.5 rounded-xl hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-md"
                                >
                                    <Download className="w-4 h-4" />
                                    JNTU No
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </header>

            {/* Filters */}
            <div className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                <div className="flex items-center justify-center gap-2 mb-6">
                    <Filter className="w-4 h-4 text-ncc-navy dark:text-white" />
                    <h3 className="text-xs font-black text-gray-500 dark:text-white/70 uppercase tracking-widest">Filter Cadets</h3>
                </div>
                <div className="flex flex-col md:flex-row items-center justify-center gap-8">
                    {/* Certificate */}
                    <div className="flex flex-col items-center">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Certificate Level</label>
                        <div className="flex flex-wrap gap-2 justify-center">
                            {CERT_OPTIONS.map(opt => (
                                <button
                                    key={opt}
                                    onClick={() => setCertFilter(opt)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${certFilter === opt ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                >
                                    {opt === 'All' ? 'All Certs' : `Cert ${opt}`}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Division */}
                    <div className="flex flex-col items-center">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Division</label>
                        <div className="flex flex-col items-center gap-2">
                            <button
                                onClick={() => setDivFilter('All')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-black transition-all ${divFilter === 'All' ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                            >
                                All Divisions
                            </button>
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setDivFilter('SD')}
                                    className={`px-6 py-1.5 rounded-lg text-xs font-black transition-all ${divFilter === 'SD' ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                >
                                    SD
                                </button>
                                <button
                                    onClick={() => setDivFilter('SW')}
                                    className={`px-6 py-1.5 rounded-lg text-xs font-black transition-all ${divFilter === 'SW' ? 'bg-ncc-navy text-white shadow' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'}`}
                                >
                                    SW
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center w-full max-w-xs">
                        <label className="block text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-2">Search</label>
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Name or Reg. No…"
                            className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-ncc-navy/30 text-black bg-white font-bold"
                        />
                    </div>
                </div>

                {/* Result count */}
                <div className="mt-6 flex justify-center items-center gap-2 text-xs text-gray-500 dark:text-white/70 font-bold">
                    <Users className="w-4 h-4" />
                    <span><span className="text-ncc-navy dark:text-white font-black">{filtered.length}</span> cadets match the current filters</span>
                </div>
            </div>

            {/* Cadet Table */}
            <div className="bg-white dark:bg-[#050b14] rounded-2xl border border-[#ddd8cc] shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-[#ddd8cc] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-ncc-navy dark:text-white" />
                        <h3 className="text-xs font-black text-gray-500 dark:text-white/70 uppercase tracking-widest">Eligible Cadets</h3>
                    </div>
                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">
                        Approved for Exams: {filtered.filter(c => c.certApproved === true).length}
                    </span>
                </div>

                {filtered.length === 0 ? (
                    <div className="p-12 text-center">
                        <Award className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                        <p className="text-gray-400 dark:text-white/80 font-bold text-sm">No cadets match the selected filters.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {filtered.map((cadet, idx) => {
                            const cert = cadet.certificate || cadet.B || '—';
                            const reg  = (cadet.enrollmentId || '').toUpperCase();
                            const div  = reg.includes('SW') ? 'SW' : reg.includes('SD') ? 'SD' : '—';
                            const isLoading = generating === cadet.id;
                            const isApproved = cadet.certApproved === true;
                            const isCadetToggling = togglingCadetId === cadet.id;
                            const eligibility = isCadetEligible(cadet);

                            return (
                                <div key={cadet.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 py-4 hover:bg-gray-50 dark:hover:bg-white/5 dark:bg-[#0a1628] transition-colors group">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <span className="text-xs font-black text-gray-300 w-6 text-right shrink-0">{idx + 1}</span>

                                        <div className="w-9 h-9 rounded-xl bg-ncc-navy text-ncc-gold flex items-center justify-center text-xs font-black shrink-0">
                                            {cadet.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                        </div>

                                        <div className="min-w-0">
                                            <p className="text-sm font-bold text-ncc-navy dark:text-white truncate">{cadet.name}</p>
                                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                                <p className="text-[10px] font-mono text-gray-400 dark:text-white/80">{cadet.enrollmentId}</p>
                                                {!eligibility.eligible && (
                                                    <span className="text-[9px] font-bold text-red-500 dark:text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded">
                                                        Ineligible: {eligibility.reason}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap items-center justify-end gap-3 shrink-0">
                                        {/* Status Toggle (only interactive for Battalion Admin) */}
                                        {isBattalionAdmin ? (
                                            <button
                                                onClick={() => handleToggleCadetApproval(cadet.id, isApproved)}
                                                disabled={isCadetToggling || !eligibility.eligible}
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition ${
                                                    isApproved 
                                                        ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-500/20' 
                                                        : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-500/20'
                                                } ${!eligibility.eligible ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                title={!eligibility.eligible ? `Cannot approve: ${eligibility.reason}` : "Click to toggle certificate approval status"}
                                            >
                                                {isCadetToggling ? (
                                                    '…'
                                                ) : isApproved ? (
                                                    <><Check className="w-3.5 h-3.5" /> Approved</>
                                                ) : (
                                                    <><X className="w-3.5 h-3.5" /> Failed / Not Approved</>
                                                )}
                                            </button>
                                        ) : (
                                            <div
                                                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                                                    isApproved 
                                                        ? 'bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400' 
                                                        : 'bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400'
                                                }`}
                                            >
                                                {isApproved ? (
                                                    <><Check className="w-3.5 h-3.5" /> Approved</>
                                                ) : (
                                                    <><X className="w-3.5 h-3.5" /> Failed / Not Approved</>
                                                )}
                                            </div>
                                        )}

                                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-ncc-navy/10 text-ncc-navy dark:text-white">{cadet.rank || 'CDT'}</span>
                                        <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${certColor[cert] || 'bg-gray-100 dark:bg-[#0d2137] text-gray-500 dark:text-white/70'}`}>
                                            {cert !== '—' ? `Cert ${cert}` : '—'}
                                        </span>
                                        <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80">{div}</span>

                                        {/* Gated Individual Download Action */}
                                        {isDownloadAllowed ? (
                                            <button
                                                onClick={() => handleIndividualDownload(cadet)}
                                                disabled={!!generating || !isApproved || !eligibility.eligible}
                                                className={`flex items-center gap-1.5 text-xs font-black rounded-xl px-3 py-2 transition-all ${
                                                    isApproved && eligibility.eligible
                                                        ? 'text-ncc-navy dark:text-white border border-ncc-navy/20 hover:bg-ncc-navy hover:text-white sm:opacity-0 group-hover:opacity-100'
                                                        : 'text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-white/5 cursor-not-allowed bg-gray-50 dark:bg-[#0d2137]'
                                                }`}
                                            >
                                                {isApproved && eligibility.eligible ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                                {isLoading ? '…' : isApproved && eligibility.eligible ? 'Form' : 'Locked'}
                                            </button>
                                        ) : (
                                            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase flex items-center gap-1 border border-dashed dark:border-white/10 px-3 py-2 rounded-xl">
                                                <Lock className="w-3.5 h-3.5 text-red-500/50" /> Locked
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
