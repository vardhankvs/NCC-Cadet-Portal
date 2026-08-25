import React from 'react';
import { X, Mail, Phone, MapPin, Droplet, Briefcase, List, Calendar, Award, Shield, Download, FileText, User } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { getMaskedCadet } from '../../utils/maskUtils.js';

export const CadetProfileModal = ({ cadet: rawCadet, attendancePct, attendancePresentCount, attendanceTotalPeriods, onClose, hideJntuAndBranch }) => {
    const { userRole, userEnrollmentId } = useAuthContext();
    const cadet = getMaskedCadet(rawCadet, userRole, userEnrollmentId);
    if (!cadet) return null;

    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';

    const initials = cadet.name ? cadet.name.split(' ').map(s => s[0] || '').join('').slice(0, 2).toUpperCase() : 'NC';
    const cert = cadet.certificate || cadet.B;
    const reg = (cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase();
    const division = reg.includes('SW') ? 'SW' : reg.includes('SD') ? 'SD' : '—';

    const certColor = cert === 'C' ? 'bg-ncc-gold text-white' : cert === 'B2' ? 'bg-blue-600 text-white' : cert === 'B1' ? 'bg-emerald-600 text-white' : 'bg-gray-400 text-white';

    // Robust calculation of attendance metrics if props are empty or zero
    const rawAttendanceMap = cadet.attendance || rawCadet.attendance || {};
    const attendanceEntries = Object.entries(rawAttendanceMap);
    
    let computedPresent = 0;
    let computedTotal = attendanceEntries.length;

    attendanceEntries.forEach(([_, status]) => {
        const s = String(status).toUpperCase().trim();
        if (s === 'PRESENT' || s === 'P' || s === '1' || s === 'ATTENDED') {
            computedPresent++;
        }
    });

    if (computedPresent === 0) {
        if (typeof cadet.totalAttended === 'number') computedPresent = cadet.totalAttended;
        else if (typeof cadet.attendedParades === 'number') computedPresent = cadet.attendedParades;
        else if (typeof cadet.paradesAttended === 'number') computedPresent = cadet.paradesAttended;
        else if (typeof cadet.presentCount === 'number') computedPresent = cadet.presentCount;
        else if (typeof cadet.attendancePresentCount === 'number') computedPresent = cadet.attendancePresentCount;
    }

    if (computedTotal === 0) {
        if (typeof cadet.totalParades === 'number') computedTotal = cadet.totalParades;
        else if (typeof cadet.totalPeriods === 'number') computedTotal = cadet.totalPeriods;
        else if (typeof cadet.attendanceTotalPeriods === 'number') computedTotal = cadet.attendanceTotalPeriods;
    }

    const effectivePresent = (attendancePresentCount && attendancePresentCount > 0) ? attendancePresentCount : computedPresent;
    const effectiveTotal = (attendanceTotalPeriods && attendanceTotalPeriods > 0) ? attendanceTotalPeriods : (computedTotal > 0 ? computedTotal : effectivePresent);
    
    let effectivePct = (attendancePct !== undefined && attendancePct !== null && attendancePct > 0) ? attendancePct : (cadet.attendancePercentage ?? cadet.attendancePct);
    if ((effectivePct === undefined || effectivePct === null || effectivePct === 0) && effectiveTotal > 0) {
        effectivePct = Math.round((effectivePresent / effectiveTotal) * 100);
    }
    if (effectivePct === undefined || effectivePct === null) {
        effectivePct = 0;
    }

    const displayClassesText = (effectiveTotal > 0)
        ? `${effectivePresent} / ${effectiveTotal} NCC Classes Attended`
        : (effectivePresent > 0 ? `${effectivePresent} NCC Classes Attended` : (effectivePct > 0 ? `Attendance ${effectivePct}%` : `0 Classes Attended`));

    const handleDownloadPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFillColor(15, 46, 74); // NCC Navy
        doc.rect(0, 0, pageWidth, 40, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text(cadet.name.toUpperCase(), 15, 20);
        
        doc.setFontSize(10);
        doc.setTextColor(212, 175, 55); // NCC Gold
        doc.text(`REGIMENTAL NO: ${reg}`, 15, 30);
        doc.text(`RANK: ${cadet.rank || 'CADET'} | CERT: ${cert || 'N/A'} | DIV: ${division}`, 15, 35);

        // Content
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text("Cadet Profile Summary", 15, 55);
        doc.setLineWidth(0.5);
        doc.line(15, 57, 70, 57);

        // Primary Details Table
        autoTable(doc, {
            startY: 65,
            head: [['Field', 'Information']],
            body: [
                ...(!isBattalionAdmin && !hideJntuAndBranch ? [['JNTU Number', cadet.jntuNo || 'N/A']] : []),
                ['Father\'s Name', cadet.fatherName || 'N/A'],
                ['Mother\'s Name', cadet.motherName || 'N/A'],
                ['Date of Birth', cadet.dob || 'N/A'],
                ...(!isBattalionAdmin ? [['Blood Group', cadet.bloodGroup || 'N/A']] : []),
                ...(!isBattalionAdmin && !hideJntuAndBranch ? [['Branch / Dept', cadet.branch || 'N/A']] : []),
                ...(!isBattalionAdmin ? [['Fee Status', cadet.feePaid ? 'Paid' : 'Pending']] : []),
                ...(!isBattalionAdmin ? [['Address', cadet.addressPresent || 'N/A']] : []),
                ...(!isBattalionAdmin ? [['Email', cadet.personalEmail || cadet.email || 'N/A']] : []),
                ['Phone', cadet.phonePersonal || cadet.phone || 'N/A'],
            ],
            theme: 'striped',
            headStyles: { fillColor: [15, 46, 74] },
            styles: { fontSize: 9 }
        });

        // Attendance Stats
        const finalY = (doc.lastAutoTable?.finalY || 140) + 15;
        doc.setFontSize(12);
        doc.text("Performance & Attendance", 15, finalY);
        autoTable(doc, {
            startY: finalY + 5,
            head: [['Metric', 'Value']],
            body: [
                ['Attendance Percentage', `${effectivePct}%`],
                ['NCC Classes Attended', `${effectivePresent} / ${effectiveTotal}`],
                ...(!isBattalionAdmin ? [
                    ['Merit Points', String(cadet.meritPoints || 0)],
                    ['Demerit Points', String(cadet.demeritPoints || 0)],
                ] : []),
            ],
            theme: 'grid',
            headStyles: { fillColor: [212, 175, 55], textColor: [15, 46, 74] },
            styles: { fontSize: 9 }
        });

        // Camps
        const campsY = (doc.lastAutoTable?.finalY || finalY + 50) + 15;
        doc.text("Camps Attended", 15, campsY);
        if (cadet.campsAttended && cadet.campsAttended.length > 0) {
            autoTable(doc, {
                startY: campsY + 5,
                head: [['Camp Name', 'Year', 'Location']],
                body: cadet.campsAttended.map(c => [c.name || c, c.year || 'N/A', c.location || 'N/A']),
                theme: 'striped',
                headStyles: { fillColor: [15, 46, 74] },
                styles: { fontSize: 8 }
            });
        } else {
            doc.setFontSize(9);
            doc.text("No camp records found.", 15, campsY + 10);
        }

        // Footer
        const totalPages = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Generated on ${new Date().toLocaleDateString()} | 14(A) BN NCC Portal`, 15, 285);
            doc.text(`Page ${i} of ${totalPages}`, pageWidth - 30, 285);
        }

        doc.save(`NCC_Profile_${reg}.pdf`);
    };

    const handleDownloadNominationForm = () => {
        if (isBattalionAdmin) return;
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;
        
        // Header
        doc.setFontSize(16);
        doc.setTextColor(15, 46, 74);
        doc.text("NATIONAL CADET CORPS (NCC)", 105, 20, { align: 'center' });
        doc.setFontSize(14);
        doc.text("CAMP NOMINATION FORM", 105, 30, { align: 'center' });
        doc.line(20, 35, 190, 35);

        // Section 1: Cadet Particulars
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("SECTION 1: CADET PARTICULARS", 20, 45);
        doc.setFont("helvetica", "normal");

        const data = [
            ["Regimental Number", reg || "N/A"],
            ["Rank & Name", `${cadet.rank || 'CDT'} ${cadet.name || ''}`],
            ["Father's Name", cadet.fatherName || "N/A"],
            ["Mother's Name", cadet.motherName || "N/A"],
            ["Date of Birth", cadet.dob || "N/A"],
            ["Unit/Group", "14(A) BN NCC / Visakhapatnam"],
            ["Certificate Level", cert || "N/A"],
            ["Aadhaar Number", cadet.aadhaarNumber || "N/A"],
            ["Personal Phone", cadet.phonePersonal || cadet.phone || "N/A"]
        ];

        autoTable(doc, {
            startY: 50,
            body: data,
            theme: 'grid',
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: { 0: { fontStyle: 'bold', width: 60 } }
        });

        const finalY = (doc.lastAutoTable?.finalY || 150) + 15;

        // Medical Declaration
        doc.setFont("helvetica", "bold");
        doc.text("SECTION 2: MEDICAL FITNESS DECLARATION", 20, finalY);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text("Certified that I have examined the above cadet and found him/her fit for training in NCC Camp.", 20, finalY + 8);
        doc.text("Blood Group: " + (cadet.bloodGroup || "N/A"), 20, finalY + 16);
        doc.text("Identification Marks: 1. _________________________________ 2. _________________________________", 20, finalY + 24);

        // Signatures
        const sigY = finalY + 60;
        doc.line(20, sigY, 70, sigY);
        doc.text("Signature of Cadet", 25, sigY + 5);
        
        doc.line(140, sigY, 190, sigY);
        doc.text("Signature of ANO/CO", 145, sigY + 5);

        // Footer
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Generated via GMRIT NCC Portal - " + new Date().toLocaleDateString(), 105, 285, { align: 'center' });

        doc.save(`${reg}_NominationForm.pdf`);
    };

    const DetailRow = ({ icon: Icon, label, value }) => (
        value ? (
            <div className="flex items-start gap-3 py-3 border-b border-gray-100 dark:border-white/5 last:border-0">
                <div className="w-8 h-8 rounded-lg bg-gray-50 dark:bg-[#0a1628] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-ncc-navy dark:text-white" />
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">{label}</p>
                    <p className="text-sm font-bold text-gray-800 dark:text-white mt-0.5">{value}</p>
                </div>
            </div>
        ) : null
    );

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#050b14] w-full h-full flex flex-col animate-in slide-in-from-bottom-8 duration-500"
                onClick={e => e.stopPropagation()}
            >
                {/* Compact Immersive Header */}
                <div className="bg-ncc-navy py-4 px-6 md:px-10 relative shadow-xl border-b border-white/5">
                    <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl ring-2 ring-ncc-gold/40 overflow-hidden bg-white dark:bg-[#050b14]/10 flex items-center justify-center text-2xl font-black text-ncc-navy dark:text-white shrink-0 shadow-xl">
                                {cadet.photoURL || cadet.photoUrl
                                    ? <img src={cadet.photoURL || cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                                    : <span>{initials}</span>
                                }
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-3">
                                    <h2 className="font-display text-2xl md:text-3xl font-bold text-white tracking-tight leading-none">{cadet.name}</h2>
                                    <span className="px-2 py-0.5 bg-ncc-gold text-ncc-navy dark:text-white text-[8px] font-black rounded uppercase">Ver 2.0</span>
                                </div>
                                <p className="font-mono text-xs text-white/40 uppercase tracking-[0.2em] mt-1">{cadet.enrollmentId}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-3">
                                    <span className="bg-ncc-gold text-ncc-navy dark:text-white text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest">
                                        {cadet.rank || 'CADET'}
                                    </span>
                                    <span className={`text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest ${certColor}`}>
                                        Cert {cert || 'N/A'}
                                    </span>
                                    <span className="bg-ncc-navy/20 dark:bg-white/10 text-white text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest">
                                        {division}
                                    </span>
                                </div>
                            </div>
                        </div>
                        {/* Actions */}
                        <div className="flex items-center gap-3">
                            <button 
                                onClick={handleDownloadPDF}
                                className="flex items-center gap-2 px-5 py-2.5 bg-ncc-gold text-ncc-navy rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-ncc-gold/20"
                            >
                                <Download className="w-4 h-4" /> Profile
                            </button>
                            <button 
                                onClick={handleDownloadNominationForm}
                                className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-white/10 text-ncc-navy dark:text-white border border-white/20 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-50 dark:hover:bg-white/20 transition-all shadow-lg"
                            >
                                <FileText className="w-4 h-4" /> Nomination
                            </button>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all text-white/60"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Performance Strip */}
                <div className="bg-ncc-navy/95 border-b border-white/5 py-3 px-6 md:px-10">
                    <div className="max-w-7xl mx-auto w-full grid grid-cols-3 md:grid-cols-6 gap-4">
                        <div className="text-center md:text-left">
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Merit Points</p>
                            <p className="text-lg font-black text-emerald-400">{cadet.meritPoints || 0}</p>
                        </div>
                        <div className="text-center md:text-left">
                            <p className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-0.5">Demerit Points</p>
                            <p className="text-lg font-black text-red-400">{cadet.demeritPoints || 0}</p>
                        </div>
                        <div className="col-span-1 md:col-span-2 col-start-1 md:col-start-3">
                            <div className="flex justify-between items-center mb-1">
                                <p className="text-[8px] font-black text-white/30 uppercase tracking-widest">Attendance</p>
                                <p className="text-[10px] font-black text-emerald-400">{effectivePct}%</p>
                            </div>
                            <div className="h-1.5 w-full bg-white dark:bg-[#050b14]/10 rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-400" style={{ width: `${effectivePct}%` }} />
                            </div>
                        </div>
                        <div className="hidden md:block col-span-2 text-right self-center">
                            <p className="text-[10px] font-black text-ncc-gold uppercase tracking-[0.2em]">{displayClassesText}</p>
                        </div>
                    </div>
                </div>

                {/* Content Body */}
                <div className="overflow-y-auto flex-1 p-8 md:p-12 ncc-scrollbar bg-[#fcfbf9] dark:bg-[#03070d]">
                    <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-3 gap-12">
                        
                        {/* Left Column: Details */}
                        <div className="lg:col-span-2 space-y-12">
                            <section>
                                <h3 className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                                    Primary Records <div className="flex-1 h-px bg-ncc-navy/10 dark:bg-white/10" />
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-1">
                                    <div>
                                        <DetailRow icon={List}       label="Regimental No." value={cadet.regimentalNumber || cadet.enrollmentId} />
                                        {!hideJntuAndBranch && <DetailRow icon={List}       label="JNTU Number"    value={cadet.jntuNo || 'N/A'} />}
                                        <DetailRow icon={Calendar}   label="Date of Birth"  value={cadet.dob || 'N/A'} />
                                        <DetailRow icon={User}       label="Father's Name"  value={cadet.fatherName || 'N/A'} />
                                        <DetailRow icon={User}       label="Mother's Name"  value={cadet.motherName || 'N/A'} />
                                        <DetailRow icon={Droplet}    label="Blood Group"    value={cadet.bloodGroup || 'N/A'} />
                                    </div>
                                    <div>
                                        {!hideJntuAndBranch && <DetailRow icon={Briefcase}  label="Branch / Dept"  value={cadet.branch || 'N/A'} />}
                                        <DetailRow icon={Award}      label="Certificate"    value={cert ? `Cert ${cert}` : 'N/A'} />
                                        <DetailRow icon={Shield}     label="Fee Status"     value={cadet.feePaid ? 'Paid' : 'Pending'} />
                                        <DetailRow icon={MapPin}     label="Address"        value={cadet.addressPresent || cadet.address || 'N/A'} />
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                                    Rank History & Promotion Timeline <div className="flex-1 h-px bg-ncc-navy/10 dark:bg-white/10" />
                                </h3>
                                {cadet.rankHistory && cadet.rankHistory.length > 0 ? (
                                    <div className="relative pl-10 space-y-6">
                                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-100 dark:bg-[#0d2137]" />
                                        {cadet.rankHistory.slice().reverse().map((h, idx) => (
                                            <div key={idx} className="relative">
                                                <div className={`absolute -left-[2.15rem] top-1 w-6 h-6 rounded-full border-4 border-[#fcfbf9] flex items-center justify-center shadow-sm ${idx === 0 ? 'bg-ncc-gold' : 'bg-gray-200'}`}>
                                                    <Award className={`w-3 h-3 ${idx === 0 ? 'text-ncc-navy dark:text-white' : 'text-gray-400 dark:text-white/80'}`} />
                                                </div>
                                                <div className="bg-white dark:bg-[#050b14] p-4 rounded-2xl shadow-sm border border-ncc-navy/5 inline-block min-w-[280px]">
                                                    <div className="flex items-center gap-3 mb-1">
                                                        <span className={`text-[10px] font-black px-3 py-0.5 rounded-full uppercase tracking-widest ${idx === 0 ? 'bg-ncc-navy text-ncc-gold' : 'bg-gray-50 dark:bg-[#0a1628] text-gray-500 dark:text-white/70'}`}>
                                                            {h.rank}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-gray-400 dark:text-white/80">{formatDate(h.date)}</span>
                                                    </div>
                                                    {h.reason && <p className="text-xs text-gray-500 dark:text-white/70 mt-1 leading-relaxed">{h.reason}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-[#050b14] p-6 rounded-3xl border border-dashed border-gray-200 dark:border-white/10 flex items-center gap-3">
                                        <Award className="w-5 h-5 text-ncc-gold" />
                                        <div>
                                            <p className="text-xs font-bold text-ncc-navy dark:text-white uppercase tracking-wider">Initial Rank: {cadet.rank || 'CDT'}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-white/70 mt-0.5">No formal promotion events recorded yet.</p>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-12">
                            <section>
                                <h3 className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-[0.3em] mb-6 flex items-center gap-4">
                                    Contact Details <div className="flex-1 h-px bg-ncc-navy/10 dark:bg-white/10" />
                                </h3>
                                <div className="bg-white dark:bg-[#0a1628] p-6 rounded-[2rem] border border-ncc-navy/5 dark:border-white/5 shadow-sm space-y-5">
                                    {(cadet.personalEmail || cadet.email) && (
                                        <a 
                                            href={`mailto:${cadet.personalEmail || cadet.email}`}
                                            className="flex items-center gap-4 pb-4 border-b border-gray-50 dark:border-white/5 group hover:opacity-90 transition-all cursor-pointer"
                                            title="Click to send email"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Email Address</p>
                                                <p className="text-sm font-bold text-ncc-navy dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:underline">{cadet.personalEmail || cadet.email}</p>
                                            </div>
                                        </a>
                                    )}
                                    {(cadet.phonePersonal || cadet.phone) && (
                                        <a 
                                            href={`tel:${cadet.phonePersonal || cadet.phone}`}
                                            className="flex items-center gap-4 group hover:opacity-90 transition-all cursor-pointer"
                                            title="Click to call mobile number"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <Phone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Mobile Phone</p>
                                                <p className="text-sm font-bold text-ncc-navy dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 group-hover:underline">{cadet.phonePersonal || cadet.phone}</p>
                                            </div>
                                        </a>
                                    )}
                                    {cadet.phoneParents && (
                                        <a 
                                            href={`tel:${cadet.phoneParents}`}
                                            className="flex items-center gap-4 pt-4 border-t border-gray-50 dark:border-white/5 group hover:opacity-90 transition-all cursor-pointer"
                                            title="Click to call parents contact"
                                        >
                                            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                                                <Phone className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[8px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Parents Contact</p>
                                                <p className="text-sm font-bold text-ncc-navy dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:underline">{cadet.phoneParents}</p>
                                            </div>
                                        </a>
                                    )}
                                </div>
                            </section>

                            <section>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-[10px] font-black text-ncc-navy dark:text-white/40 uppercase tracking-[0.3em] flex-1">
                                        Camps Attended
                                    </h3>
                                    <span className="bg-ncc-navy text-ncc-gold text-[10px] font-black px-4 py-1 rounded-full shadow-md uppercase tracking-widest">
                                        {(cadet.campsAttended || []).length} Total
                                    </span>
                                </div>
                                <div className="space-y-4">
                                    {cadet.campsAttended && cadet.campsAttended.length > 0 ? (
                                        cadet.campsAttended.map((camp, i) => (
                                            <div key={i} className="p-5 bg-white dark:bg-[#0a1628] rounded-3xl border border-ncc-navy/5 dark:border-white/5 shadow-sm hover:shadow-lg transition-all group relative overflow-hidden">
                                                <div className="absolute left-0 top-0 w-1 h-full bg-ncc-gold" />
                                                <p className="text-xs font-bold text-ncc-navy dark:text-white group-hover:text-ncc-gold transition-colors">{camp.name || camp}</p>
                                                <div className="flex justify-between items-center mt-3">
                                                    <p className="text-[9px] text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest font-mono bg-gray-50 dark:bg-[#0a1628] px-2 py-0.5 rounded">{camp.year || 'N/A'}</p>
                                                    <span className="text-[9px] font-black text-ncc-navy dark:text-white/30 uppercase tracking-tighter">{camp.location || 'NCC CAMP'}</span>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-16 text-center bg-white dark:bg-[#050b14] rounded-[2.5rem] border border-dashed border-gray-200 dark:border-white/10">
                                            <p className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em]">No Camp Records</p>
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
