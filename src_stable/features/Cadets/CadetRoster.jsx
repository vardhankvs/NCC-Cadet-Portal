// src/features/Cadets/CadetRoster.jsx
import React, { useState, useMemo } from 'react';
import { CadetForm } from './CadetForm.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import {
    deleteItem,
    promoteSpecificCadets,
} from '../../firebase/firestoreService.js';
import {
    List,
    UserPlus,
    Edit,
    Trash2,
    FileText,
    Search,
    Download,
    ShieldCheck,
    Award,
    Users,
    Phone,
    Mail,
    X,
    Filter,
    Check,
    Shield,
    Sparkles,
    Eye
} from '../../components/Icons.jsx';
import { BulkImportModal } from './BulkImportModal.jsx';
import { CertificateUploadModal } from './CertificateUploadModal.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { getMaskedCadet } from '../../utils/maskUtils.js';
import { CadetProfileModal } from '../Ranks/CadetProfileModal.jsx';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import QRCode from 'qrcode';

const formatDateForInput = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const RANK_BADGES = {
    'SUO': { name: 'SUO', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30' },
    'JUO': { name: 'JUO', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30' },
    'CSM': { name: 'CSM', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30' },
    'CQMS': { name: 'CQMS', color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30' },
    'SGT': { name: 'SGT', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30' },
    'CPL': { name: 'CPL', color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/30' },
    'LCPL': { name: 'LCPL', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' },
    'CDT': { name: 'CDT', color: 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20' }
};

export const CadetRoster = ({ cadets, tenant, userInstitutionId }) => {
    const { userRole, actualRole, isDelegatedCadet, userEnrollmentId, userName, user, userInstitutionId: authInstId } = useAuthContext();
    const effectiveInstId = userInstitutionId || authInstId;
    const isCadetUser = isDelegatedCadet || userRole === 'cadet' || actualRole === 'cadet';

    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedRank, setSelectedRank] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [editingCadet, setEditingCadet] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [error, setError] = useState(null);
    const [isPromoting, setIsPromoting] = useState(false);
    const [promotionOption, setPromotionOption] = useState('');
    const [selectedIds, setSelectedIds] = useState([]);
    const [certModalCadet, setCertModalCadet] = useState(null);
    const [selectedCadetForModal, setSelectedCadetForModal] = useState(null);

    // KPI Metrics Calculation
    const rosterKPIs = useMemo(() => {
        const activeList = (cadets || []).filter(c => c.status !== 'alumni');
        const total = activeList.length;
        const sd = activeList.filter(c => (c.enrollmentId || c.regimentalNumber || '').toUpperCase().includes('SD')).length;
        const sw = activeList.filter(c => (c.enrollmentId || c.regimentalNumber || '').toUpperCase().includes('SW')).length;
        const certC = activeList.filter(c => (c.certificate || c.B || '').toUpperCase() === 'C').length;
        const certB2 = activeList.filter(c => (c.certificate || c.B || '').toUpperCase() === 'B2').length;
        const certB1 = activeList.filter(c => (c.certificate || c.B || '').toUpperCase() === 'B1' || (c.certificate || c.B || '').toUpperCase() === 'B').length;
        const appointed = activeList.filter(c => c.rank && c.rank !== 'CDT').length;

        return { total, sd, sw, certC, certB2, certB1, appointed };
    }, [cadets]);

    const downloadTemplate = () => {
        const headers = ['Name','Regimental Number','Institution ID','JNTU NO','Rank','CERT','Father Name','Mother Name','Year','Branch','Aadhaar Number','Phone number (Personal)','Phone Number (Parents)','Address (Present)','Address (Permanent) If both present & Permanent are Same Just Ignore','Hosteler / Days scholar','ECA/CCA','Date of Birth','Email ID (Personal)','Email ID (College Mail)','Blood Group'];
        const csvContent = 'data:text/csv;charset=utf-8,' + headers.join(',');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', 'cadet_bulk_template.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadPDF = () => {
        const doc = new jsPDF('l', 'mm', 'a1');
        const tableColumn = ['S.No','Name','Regimental No','Institution ID','JNTU No','Rank','CERT','Father Name','Mother Name','Year','Branch','Aadhaar','Personal Phone','Parent Phone','Present Address','Permanent Address','Hosteler/Scholar','ECA/CCA','DOB','Personal Email','College Email','Blood Group'];
        const tableRows = filteredCadets.map((cadet, index) => [
            index + 1, cadet.name || '-', cadet.enrollmentId || cadet.regimentalNumber || '-',
            cadet.institutionId || effectiveInstId || 'gmrit',
            cadet.jntuNo || '-', cadet.rank || '-', cadet.certificate || cadet.B || '-',
            cadet.fatherName || '-', cadet.motherName || '-', cadet.year || '-', cadet.branch || '-',
            cadet.aadhaarNumber || '-', cadet.phonePersonal || cadet.phone || '-', cadet.phoneParents || '-',
            cadet.addressPresent || '-', cadet.addressPermanent || '-', cadet.hostelerType || '-',
            cadet.ecaCca || '-', formatDate(cadet.dob), cadet.personalEmail || '-', cadet.collegeEmail || '-', cadet.bloodGroup || '-',
        ]);
        doc.text(`14(A) BN NCC GMRIT Unit - ${selectedCategory} ${selectedCertificate} Roster`, 14, 15);
        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20, theme: 'grid', styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [10, 22, 40] } });
        doc.save(`NCC_Roster_${selectedCategory}_${selectedCertificate}.pdf`);
    };

    const downloadExcel = () => {
        const excelData = filteredCadets.map((cadet, index) => ({
            'S.No': index + 1, Name: cadet.name,
            'Regimental Number': cadet.enrollmentId || cadet.regimentalNumber,
            'Institution ID': cadet.institutionId || effectiveInstId || 'gmrit',
            'JNTU NO': cadet.jntuNo || '-', Rank: cadet.rank || '-',
            CERT: cadet.certificate || cadet.B || '-', 'Father Name': cadet.fatherName || '-',
            'Mother Name': cadet.motherName || '-', Year: cadet.year || '-',
            Branch: cadet.branch || '-', 'Aadhaar Number': cadet.aadhaarNumber || '-',
            'Phone number (Personal)': cadet.phonePersonal || cadet.phone || '-',
            'Phone Number (Parents)': cadet.phoneParents || '-',
            'Address (Present)': cadet.addressPresent || '-', 'Address (Permanent)': cadet.addressPermanent || '-',
            'Hosteler / Days scholar': cadet.hostelerType || '-', 'ECA/CCA': cadet.ecaCca || '-',
            'Date of Birth': formatDate(cadet.dob), 'Email ID (Personal)': cadet.personalEmail || '-',
            'Email ID (College Mail)': cadet.collegeEmail || '-', 'Blood Group': cadet.bloodGroup || '-',
        }));
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Cadets');
        XLSX.writeFile(workbook, `NCC_Roster_${selectedCategory}_Full.xlsx`);
    };

    const handlePromoteAction = async () => {
        if (!promotionOption) { toast.error('Please select a promotion option.'); return; }
        const [from, to] = promotionOption.split('->');
        const confirmed = window.confirm(`CONFIRM UPDATE:\n\nUpdate all ${from} cadets to ${to}?`);
        if (!confirmed) return;
        setIsPromoting(true); setError(null);
        try {
            if (isCadetUser) {
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                await submitDelegatedTask({
                    institutionId: effectiveInstId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'list',
                    moduleName: 'Cadet Roster',
                    actionType: 'update',
                    title: `Batch Session Promotion: ${from} → ${to}`,
                    payload: {
                        action: 'promote_session',
                        from,
                        to
                    }
                });
                toast.success(`Session promotion (${from} → ${to}) submitted for ANO verification!`);
                setPromotionOption('');
                return;
            }

            const count = await promoteSpecificCadets(from, to);
            toast.success(`Success! Updated ${count} cadets from ${from} to ${to}.`);
            setPromotionOption('');
        } catch (e) {
            setError('Update failed: ' + e.message);
            toast.error('Update failed: ' + e.message);
        } finally { setIsPromoting(false); }
    };

    const generateBatchIds = async () => {
        if (!selectedIds.length) return;
        toast.info(`Generating ${selectedIds.length} Smart ID Cards...`);
        const doc = new jsPDF('p', 'mm', 'a4');
        let xOffset = 10;
        let yOffset = 10;
        const cardWidth = 85;
        const cardHeight = 55;
        const marginX = 10;
        const marginY = 10;
        const maxPerRow = 2;
        const maxPerCol = 4;
        
        let count = 0;

        for (const cadetId of selectedIds) {
            const cadet = cadets.find(c => c.id === cadetId);
            if (!cadet) continue;

            if (count > 0 && count % (maxPerRow * maxPerCol) === 0) {
                doc.addPage();
                xOffset = 10;
                yOffset = 10;
            }

            const row = Math.floor((count % (maxPerRow * maxPerCol)) / maxPerRow);
            const col = (count % (maxPerRow * maxPerCol)) % maxPerRow;
            const currentX = xOffset + col * (cardWidth + marginX);
            const currentY = yOffset + row * (cardHeight + marginY);

            // Card Background & Border
            doc.setFillColor(255, 255, 255);
            doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, 'FD');
            doc.setDrawColor(200, 169, 81);
            doc.setLineWidth(0.4);
            doc.roundedRect(currentX, currentY, cardWidth, cardHeight, 3, 3, 'D');

            // Header Banner
            doc.setFillColor(10, 22, 40);
            doc.rect(currentX, currentY, cardWidth, 12, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            doc.text("14(A) BN NCC - GMRIT UNIT", currentX + cardWidth / 2, currentY + 6, { align: 'center' });
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(200, 169, 81);
            doc.text("CADET IDENTITY CARD", currentX + cardWidth / 2, currentY + 9.5, { align: 'center' });

            // Photo Placeholder / Box
            doc.setFillColor(240, 240, 240);
            doc.setDrawColor(200, 200, 200);
            doc.rect(currentX + 4, currentY + 16, 17, 22, 'FD');
            doc.setTextColor(150, 150, 150);
            doc.setFontSize(6);
            doc.text("PHOTO", currentX + 12.5, currentY + 28, { align: 'center' });

            // Content (Middle)
            doc.setTextColor(10, 22, 40);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'bold');
            let name = cadet.name || "N/A";
            if (name.length > 25) name = name.substring(0, 23) + '...';
            doc.text(name, currentX + 23, currentY + 20);
            
            doc.setFontSize(6.5);
            doc.setFont('helvetica', 'normal');
            doc.text(`Reg No: ${cadet.enrollmentId || cadet.regimentalNumber || 'N/A'}`, currentX + 23, currentY + 25);
            doc.text(`Rank: ${cadet.rank || 'CDT'}`, currentX + 23, currentY + 29);
            doc.text(`DOB: ${formatDate(cadet.dob)}`, currentX + 23, currentY + 33);
            doc.text(`Blood Grp: ${cadet.bloodGroup || 'N/A'}`, currentX + 23, currentY + 37);

            // QR Code Generation (Right)
            try {
                const verificationUrl = `${window.location.origin}/verify/${cadet.id}`;
                const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 0, color: { dark: '#0a1628', light: '#ffffff' } });
                doc.addImage(qrDataUrl, 'PNG', currentX + cardWidth - 20, currentY + 16, 16, 16);
            } catch (e) {
                console.error("QR Code generation failed", e);
            }
            
            // Footer text under QR
            doc.setFontSize(4);
            doc.text("SCAN TO VERIFY", currentX + cardWidth - 12, currentY + 34, { align: 'center' });

            // Footer / Signature
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.text("Issuing Authority", currentX + cardWidth - 20, currentY + 50);
            doc.line(currentX + cardWidth - 27, currentY + 47, currentX + cardWidth - 5, currentY + 47);
            
            doc.setFontSize(5);
            doc.setTextColor(150, 150, 150);
            doc.text("Valid for NCC official purposes only.", currentX + 4, currentY + 52);

            count++;
        }

        doc.save(`NCC_Smart_IDs_${Date.now()}.pdf`);
        toast.success("Smart ID Cards Generated successfully!");
    };

    const filteredCadets = useMemo(() => {
        let list = (cadets || []).filter(c => c.status !== 'alumni');
        
        // Division Filter
        if (selectedCategory !== 'All') {
            list = list.filter((c) => (c.enrollmentId || c.regimentalNumber || '').toUpperCase().includes(selectedCategory));
        }

        // Certificate Filter
        if (selectedCertificate !== 'All') {
            list = list.filter((c) => {
                const rawCert = c.certificate || c.B || '';
                const cadetCert = typeof rawCert === 'string' ? rawCert.trim().toUpperCase() : String(rawCert);
                return cadetCert === selectedCertificate.toUpperCase();
            });
        }

        // Rank Filter
        if (selectedRank !== 'All') {
            list = list.filter((c) => (c.rank || 'CDT').toUpperCase() === selectedRank.toUpperCase());
        }

        // Search Term
        if (searchTerm.trim()) {
            const q = searchTerm.toLowerCase();
            list = list.filter((c) => 
                (c.name || '').toLowerCase().includes(q) || 
                (c.enrollmentId || c.regimentalNumber || '').toLowerCase().includes(q) || 
                (c.jntuNo || '').toLowerCase().includes(q) ||
                (c.branch || '').toLowerCase().includes(q) ||
                (c.fatherName || '').toLowerCase().includes(q) ||
                (c.motherName || '').toLowerCase().includes(q) ||
                (c.bloodGroup || '').toLowerCase().includes(q) ||
                (c.aadhaarNumber || '').toLowerCase().includes(q)
            );
        }

        return list.map(c => {
            const masked = getMaskedCadet(c, userRole, userEnrollmentId);
            const rawAtt = c.attendance || {};
            let presentCount = 0;
            Object.values(rawAtt).forEach(s => {
                const str = String(s).trim().toUpperCase();
                if (str === 'PRESENT' || str === 'P' || str === 'VERIFIED' || str === 'LATE' || str === 'ATTENDED' || str === '1') {
                    presentCount++;
                }
            });
            const totalPeriods = Object.keys(rawAtt).length;
            const pct = totalPeriods > 0 ? parseFloat(((presentCount / totalPeriods) * 100).toFixed(2)) : 0;
            return {
                ...masked,
                presentCount: c.presentCount ?? presentCount,
                totalPeriods: c.totalPeriods ?? totalPeriods,
                attendancePresentCount: c.attendancePresentCount ?? presentCount,
                attendanceTotalPeriods: c.attendanceTotalPeriods ?? totalPeriods,
                attendancePercentage: c.attendancePercentage ?? pct
            };
        });
    }, [cadets, selectedCertificate, selectedCategory, selectedRank, searchTerm, userRole, userEnrollmentId]);

    const handleSelectAll = (e) => { 
        if (e.target.checked) setSelectedIds(filteredCadets.map((c) => c.id)); 
        else setSelectedIds([]); 
    };

    const handleSelectOne = (id) => {
        setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    };

    const handleBulkDeleteInitiate = () => { 
        if (!selectedIds.length) return; 
        setItemToDelete({ type: 'cadets', id: selectedIds, name: `${selectedIds.length} selected cadets`, isBulk: true }); 
    };

    const handleModalClose = () => { 
        setIsAdding(false); 
        setEditingCadet(null); 
        setItemToDelete(null); 
        setIsImporting(false); 
        setError(null); 
        setCertModalCadet(null); 
    };

    const handleDeleteConfirm = async () => {
        setError(null);
        if (!itemToDelete) return;
        try {
            if (isCadetUser) {
                const { submitDelegatedTask } = await import('../../firebase/delegationWorkflowService.js');
                const isBulk = itemToDelete.isBulk;
                await submitDelegatedTask({
                    institutionId: effectiveInstId,
                    cadetEnrollmentId: userEnrollmentId,
                    cadetName: userName,
                    cadetUid: user?.uid,
                    moduleId: 'list',
                    moduleName: 'Cadet Roster',
                    actionType: 'delete',
                    targetDocId: isBulk ? null : itemToDelete.id,
                    title: `Delete Cadet${isBulk ? 's' : ''}: ${itemToDelete.name}`,
                    payload: {
                        isBulk,
                        cadetIds: isBulk ? itemToDelete.id : [itemToDelete.id],
                        name: itemToDelete.name
                    }
                });
                toast.success(`Cadet deletion request submitted for ANO verification!`);
                setSelectedIds([]);
                handleModalClose();
                return;
            }

            if (itemToDelete.isBulk) { 
                await Promise.all(itemToDelete.id.map((id) => deleteItem(itemToDelete.type, id))); 
                setSelectedIds([]); 
            } else { 
                await deleteItem(itemToDelete.type, itemToDelete.id); 
                setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id)); 
            }
            handleModalClose();
            toast.success('Cadet(s) deleted successfully');
        } catch (e) { 
            setError(e.message); 
        }
    };

    return (
        <>
            {(isAdding || editingCadet) && (
                <ModalOverlay>
                    <CadetForm currentCadet={editingCadet} onSaveSuccess={handleModalClose} onCancel={handleModalClose} />
                </ModalOverlay>
            )}
            {isImporting && <BulkImportModal onClose={handleModalClose} />}
            {certModalCadet && <CertificateUploadModal cadet={certModalCadet} onClose={() => setCertModalCadet(null)} />}
            {itemToDelete && (
                <ConfirmationModal itemType={itemToDelete.type} itemName={itemToDelete.name} onConfirm={handleDeleteConfirm} onCancel={handleModalClose} />
            )}

            <div className="space-y-6 fade-in w-full">
                {/* ── Top Hero & Executive KPI Cards ── */}
                <div className="bg-white dark:bg-[#050b14] p-6 sm:p-8 rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        <div>
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-ncc-navy/5 dark:bg-white/10 text-ncc-navy dark:text-ncc-gold text-xs font-bold uppercase tracking-wider mb-3">
                                <Users className="w-3.5 h-3.5" />
                                Battalion Unit Nominal Roll
                            </div>
                            <h2 className="text-2xl sm:text-3xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-2">
                                GMRIT Cadet Company Master Directory
                            </h2>
                            <p className="text-gray-500 dark:text-white/70 text-sm mt-1 max-w-2xl">
                                Complete A to Z enrollment records, regimental credentials, academic profiles, biographical information, and military appointments.
                            </p>
                        </div>

                        {/* Top Action Buttons */}
                        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                            <button 
                                onClick={downloadTemplate} 
                                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#ddd8cc] dark:border-white/10 bg-[#f5f0e8] dark:bg-white/5 text-gray-700 dark:text-white/80 hover:bg-white dark:hover:bg-white/10 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <Download className="w-3.5 h-3.5 text-ncc-gold" /> Template
                            </button>
                            
                            <button 
                                onClick={() => { setIsImporting(true); setError(null); }} 
                                className="px-3.5 py-2 rounded-xl text-xs font-bold border border-[#ddd8cc] dark:border-white/10 bg-[#f5f0e8] dark:bg-white/5 text-gray-700 dark:text-white/80 hover:bg-white dark:hover:bg-white/10 transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <FileText className="w-3.5 h-3.5 text-blue-500" /> Import CSV
                            </button>

                            <button 
                                onClick={() => { setIsAdding(true); setEditingCadet(null); setError(null); }} 
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy hover:shadow-lg transition-all flex items-center gap-1.5 shadow-sm"
                            >
                                <UserPlus className="w-3.5 h-3.5" /> Add Cadet
                            </button>
                        </div>
                    </div>
                </div>

                {error && <ErrorDisplay message={error} />}

                {/* ── Search, Filters, Batch Actions & Session Promotion ── */}
                <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
                    {/* Left: Division & Certificate & Rank Chips */}
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Division Filter */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-1 shadow-sm">
                            {['All', 'SD', 'SW'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        selectedCategory === cat
                                            ? 'bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy shadow-sm'
                                            : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    {cat === 'All' ? 'All Div.' : cat}
                                </button>
                            ))}
                        </div>

                        {/* Certificate Filter */}
                        <div className="flex items-center gap-1 bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-2xl p-1 shadow-sm">
                            {['All', 'B1', 'B2', 'C'].map((cert) => (
                                <button
                                    key={cert}
                                    onClick={() => setSelectedCertificate(cert)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                                        selectedCertificate === cert
                                            ? 'bg-ncc-gold text-ncc-navy shadow-sm'
                                            : 'text-gray-600 dark:text-white/70 hover:text-ncc-navy dark:hover:text-white'
                                    }`}
                                >
                                    {cert === 'All' ? 'All Certs' : `Cert ${cert}`}
                                </button>
                            ))}
                        </div>

                        {/* Rank Filter Dropdown */}
                        <select
                            value={selectedRank}
                            onChange={(e) => setSelectedRank(e.target.value)}
                            className="text-xs font-bold px-3 py-2 rounded-2xl border border-[#ddd8cc] dark:border-white/10 bg-white dark:bg-[#050b14] text-gray-700 dark:text-white/90 cursor-pointer shadow-sm outline-none"
                        >
                            <option value="All">All Ranks</option>
                            <option value="SUO">SUO (Senior Under Officer)</option>
                            <option value="JUO">JUO (Junior Under Officer)</option>
                            <option value="CSM">CSM (Company Sgt Major)</option>
                            <option value="CQMS">CQMS (Company Quartermaster)</option>
                            <option value="SGT">SGT (Sergeant)</option>
                            <option value="CPL">CPL (Corporal)</option>
                            <option value="LCPL">LCPL (Lance Corporal)</option>
                            <option value="CDT">CDT (Cadet)</option>
                        </select>

                        {/* Promote Session Dropdown */}
                        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-2xl border border-[#ddd8cc] dark:border-white/10 bg-white dark:bg-[#050b14] shadow-sm">
                            <select
                                value={promotionOption}
                                onChange={(e) => setPromotionOption(e.target.value)}
                                className="text-xs font-bold border-none bg-transparent dark:bg-[#050b14] focus:ring-0 text-gray-700 dark:text-white/90 cursor-pointer min-w-[130px]"
                            >
                                <option value="">Promote Session...</option>
                                <option value="B1->B2">B1 → B2 (Promote)</option>
                                <option value="B2->C">B2 → C (Promote)</option>
                                <option value="B1->C">B1 → C (Double)</option>
                                <option value="B2->B1">B2 → B1 (Downgrade)</option>
                                <option value="C->B2">C → B2 (Downgrade)</option>
                                <option value="NA->B1">NA → B1 (Enroll)</option>
                                <option value="B2->B2">B2 → B2 (Repeat)</option>
                                <option value="B1->B1">B1 → B1 (Repeat)</option>
                            </select>
                            <button
                                disabled={isPromoting || !promotionOption}
                                onClick={handlePromoteAction}
                                className="px-2.5 py-1 rounded-xl text-xs font-bold bg-ncc-navy text-white dark:bg-ncc-gold dark:text-ncc-navy disabled:opacity-40 shadow-sm"
                                title="Execute session promotion"
                            >
                                {isPromoting ? '...' : <ShieldCheck className="w-3.5 h-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Right: Search & Batch Action Badges */}
                    <div className="flex items-center gap-2">
                        {selectedIds.length > 0 && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={generateBatchIds}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy hover:shadow-md transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    Smart IDs ({selectedIds.length})
                                </button>
                                <button
                                    onClick={handleBulkDeleteInitiate}
                                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-ncc-red/10 text-ncc-red hover:bg-ncc-red hover:text-white border border-ncc-red/20 transition-all flex items-center gap-1.5 shadow-sm"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete ({selectedIds.length})
                                </button>
                            </div>
                        )}

                        {/* Search Bar */}
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/40" />
                            <input
                                type="text"
                                placeholder="Search cadet name, reg no, JNTU no..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 outline-none focus:border-ncc-navy dark:focus:border-ncc-gold transition-all text-xs dark:text-white shadow-sm"
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-white"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── MASTER DIRECTORY A-Z TABLE VIEW ── */}
                <div className="bg-white dark:bg-[#050b14] rounded-3xl border border-[#ddd8cc] dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-[#ddd8cc] dark:border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-ncc-gold/10 text-ncc-gold">
                                <List className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-display font-bold text-base text-ncc-navy dark:text-white">
                                    Cadet Nominal Roll Directory (A to Z Details)
                                </h3>
                                <p className="text-xs text-gray-400 dark:text-white/60">
                                    Displaying comprehensive bio-data and service records for {filteredCadets.length} cadets
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={downloadPDF}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-ncc-red/10 text-ncc-red hover:bg-ncc-red hover:text-white border border-ncc-red/20 transition-all flex items-center gap-1.5"
                            >
                                <FileText className="w-3.5 h-3.5" /> PDF
                            </button>
                            <button
                                onClick={downloadExcel}
                                className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-600 hover:text-white border border-emerald-500/20 transition-all flex items-center gap-1.5"
                            >
                                <Download className="w-3.5 h-3.5" /> Excel
                            </button>
                        </div>
                    </div>

                    {filteredCadets.length === 0 ? (
                        <div className="py-16 text-center">
                            <Users className="w-12 h-12 text-gray-300 dark:text-white/20 mx-auto mb-3" />
                            <p className="text-gray-500 dark:text-white/70 text-sm font-bold">
                                {searchTerm ? `No cadets matching "${searchTerm}".` : 'No cadets found matching selected filters.'}
                            </p>
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="mt-2 text-ncc-gold hover:underline text-xs font-bold"
                                >
                                    Clear search
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto ncc-scrollbar">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="bg-[#f5f0e8] dark:bg-[#0a1628] border-b border-[#ddd8cc] dark:border-white/10 text-gray-500 dark:text-white/60 uppercase font-black tracking-wider text-[10px] whitespace-nowrap">
                                        <th className="p-3.5 text-center w-10 sticky left-0 bg-[#f5f0e8] dark:bg-[#0a1628] z-10">
                                            <input
                                                type="checkbox"
                                                className="rounded"
                                                onChange={handleSelectAll}
                                                checked={filteredCadets.length > 0 && selectedIds.length === filteredCadets.length}
                                            />
                                        </th>
                                        <th className="p-3.5 w-12 text-center">#</th>
                                        <th className="p-3.5 min-w-[200px]">Cadet Name</th>
                                        <th className="p-3.5 min-w-[170px]">Regimental No</th>
                                        <th className="p-3.5 min-w-[130px]">Institution ID</th>
                                        <th className="p-3.5 min-w-[130px]">JNTU NO</th>
                                        <th className="p-3.5 text-center min-w-[90px]">Rank</th>
                                        <th className="p-3.5 text-center min-w-[80px]">Cert</th>
                                        <th className="p-3.5 min-w-[80px]">Year</th>
                                        <th className="p-3.5 min-w-[100px]">Branch</th>
                                        <th className="p-3.5 min-w-[160px]">Father Name</th>
                                        <th className="p-3.5 min-w-[160px]">Mother Name</th>
                                        <th className="p-3.5 min-w-[110px]">DOB</th>
                                        <th className="p-3.5 text-center min-w-[90px]">Blood Grp</th>
                                        <th className="p-3.5 min-w-[140px]">Aadhaar No</th>
                                        <th className="p-3.5 min-w-[130px]">Phone (Personal)</th>
                                        <th className="p-3.5 min-w-[130px]">Phone (Parents)</th>
                                        <th className="p-3.5 min-w-[180px]">Personal Email</th>
                                        <th className="p-3.5 min-w-[180px]">College Email</th>
                                        <th className="p-3.5 min-w-[200px]">Present Address</th>
                                        <th className="p-3.5 min-w-[200px]">Permanent Address</th>
                                        <th className="p-3.5 min-w-[130px]">Hosteler / Scholar</th>
                                        <th className="p-3.5 min-w-[120px]">ECA / CCA</th>
                                        <th className="p-3.5 text-center min-w-[100px]">Parade Att.</th>
                                        <th className="p-3.5 text-right pr-5 sticky right-0 bg-[#f5f0e8] dark:bg-[#0a1628] z-10">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#ddd8cc]/60 dark:divide-white/5">
                                    {filteredCadets.map((cadet, index) => {
                                        const unmaskedCadet = (cadets || []).find(c => c.id === cadet.id) || cadet;
                                        const cert = cadet.certificate || cadet.B || '';
                                        const isSW = (cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase().includes('SW');
                                        const rankInfo = RANK_BADGES[cadet.rank] || RANK_BADGES['CDT'];
                                        const attPct = cadet.attendancePercentage ?? 0;
                                        const initials = cadet.name ? cadet.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'NC';

                                        return (
                                            <tr
                                                key={cadet.id}
                                                onClick={() => setSelectedCadetForModal(unmaskedCadet)}
                                                className={`hover:bg-ncc-navy/5 dark:hover:bg-white/5 transition-colors cursor-pointer group whitespace-nowrap ${
                                                    selectedIds.includes(cadet.id) ? 'bg-ncc-gold/10 dark:bg-ncc-gold/5' : ''
                                                }`}
                                            >
                                                {/* Checkbox */}
                                                <td className="p-3.5 text-center sticky left-0 bg-white dark:bg-[#050b14] group-hover:bg-[#f5f0e8] dark:group-hover:bg-[#0a1628] z-10" onClick={e => e.stopPropagation()}>
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(cadet.id)}
                                                        onChange={() => handleSelectOne(cadet.id)}
                                                        className="rounded"
                                                    />
                                                </td>

                                                {/* Serial Number */}
                                                <td className="p-3.5 text-center font-mono text-gray-400 dark:text-white/60">
                                                    {index + 1}
                                                </td>

                                                {/* Cadet Avatar & Name */}
                                                <td className="p-3.5">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-white/5 flex items-center justify-center font-black text-xs text-ncc-navy dark:text-ncc-gold border border-[#ddd8cc] dark:border-white/10">
                                                            {cadet.photoUrl ? (
                                                                <img src={cadet.photoUrl} alt={cadet.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span>{initials}</span>
                                                            )}
                                                        </div>
                                                        <span className="font-bold text-ncc-navy dark:text-white group-hover:text-ncc-gold transition-colors">
                                                            {cadet.name}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Regimental Number */}
                                                <td className="p-3.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className={`text-[8px] font-black px-1.5 py-0.2 rounded uppercase ${
                                                            isSW ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                        }`}>
                                                            {isSW ? 'SW' : 'SD'}
                                                        </span>
                                                        <span className="font-mono text-xs text-gray-600 dark:text-white/80 font-bold">
                                                            {cadet.enrollmentId || cadet.regimentalNumber}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Institution ID */}
                                                <td className="p-3.5">
                                                    <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-ncc-navy/5 dark:bg-white/10 border border-[#ddd8cc] dark:border-white/10 text-ncc-navy dark:text-ncc-gold">
                                                        {cadet.institutionId || effectiveInstId || 'gmrit'}
                                                    </span>
                                                </td>

                                                {/* JNTU NO */}
                                                <td className="p-3.5 font-mono text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.jntuNo || '—'}
                                                </td>

                                                {/* Rank */}
                                                <td className="p-3.5 text-center">
                                                    <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${rankInfo.color}`}>
                                                        {cadet.rank || 'CDT'}
                                                    </span>
                                                </td>

                                                {/* Certificate */}
                                                <td className="p-3.5 text-center">
                                                    {cert ? (
                                                        <span className="px-2 py-0.5 rounded text-[10px] font-black bg-ncc-gold/15 text-ncc-gold uppercase border border-ncc-gold/30">
                                                            {cert}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Year */}
                                                <td className="p-3.5 text-xs text-gray-700 dark:text-white/90">
                                                    {cadet.year ? `${cadet.year} Year` : '—'}
                                                </td>

                                                {/* Branch */}
                                                <td className="p-3.5 text-xs font-semibold text-gray-700 dark:text-white/90">
                                                    {cadet.branch || '—'}
                                                </td>

                                                {/* Father Name */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.fatherName || '—'}
                                                </td>

                                                {/* Mother Name */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.motherName || '—'}
                                                </td>

                                                {/* DOB */}
                                                <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-white/80">
                                                    {formatDate(cadet.dob) || '—'}
                                                </td>

                                                {/* Blood Group */}
                                                <td className="p-3.5 text-center">
                                                    {cadet.bloodGroup ? (
                                                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                                                            {cadet.bloodGroup}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Aadhaar Number */}
                                                <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-white/80">
                                                    {cadet.aadhaarNumber || '—'}
                                                </td>

                                                {/* Phone (Personal) */}
                                                <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-white/80">
                                                    {cadet.phonePersonal || cadet.phone || '—'}
                                                </td>

                                                {/* Phone (Parents) */}
                                                <td className="p-3.5 text-xs font-mono text-gray-600 dark:text-white/80">
                                                    {cadet.phoneParents || '—'}
                                                </td>

                                                {/* Email (Personal) */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.personalEmail || '—'}
                                                </td>

                                                {/* Email (College) */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.collegeEmail || '—'}
                                                </td>

                                                {/* Present Address */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80 max-w-[220px] truncate" title={cadet.addressPresent}>
                                                    {cadet.addressPresent || '—'}
                                                </td>

                                                {/* Permanent Address */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80 max-w-[220px] truncate" title={cadet.addressPermanent}>
                                                    {cadet.addressPermanent || '—'}
                                                </td>

                                                {/* Hosteler / Day Scholar */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.hostelerType || '—'}
                                                </td>

                                                {/* ECA / CCA */}
                                                <td className="p-3.5 text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.ecaCca || '—'}
                                                </td>

                                                {/* Attendance Rate */}
                                                <td className="p-3.5 text-center">
                                                    <div className="inline-flex flex-col items-center">
                                                        <span className={`text-[10px] font-black ${
                                                            attPct >= 75 ? 'text-emerald-600 dark:text-emerald-400' :
                                                            attPct >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
                                                        }`}>
                                                            {attPct}%
                                                        </span>
                                                        <div className="w-12 h-1 bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden mt-0.5">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    attPct >= 75 ? 'bg-emerald-500' :
                                                                    attPct >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                                                }`}
                                                                style={{ width: `${Math.min(attPct, 100)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Action Buttons */}
                                                <td className="p-3.5 text-right pr-5 sticky right-0 bg-white dark:bg-[#050b14] group-hover:bg-[#f5f0e8] dark:group-hover:bg-[#0a1628] z-10" onClick={e => e.stopPropagation()}>
                                                    <div className="inline-flex items-center gap-1">
                                                        <button
                                                            onClick={() => setSelectedCadetForModal(unmaskedCadet)}
                                                            className="p-1.5 rounded-lg text-gray-500 hover:text-ncc-navy hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                                                            title="View Full Profile"
                                                        >
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditingCadet({ ...unmaskedCadet, dob: formatDateForInput(unmaskedCadet.dob) })}
                                                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                                                            title="Edit Cadet Record"
                                                        >
                                                            <Edit className="w-3.5 h-3.5" />
                                                        </button>
                                                        <button
                                                            onClick={() => setItemToDelete({ type: 'cadets', id: cadet.id, name: cadet.name })}
                                                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                            title="Delete Cadet"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Cadet Profile Modal ── */}
            {selectedCadetForModal && (
                <CadetProfileModal
                    cadet={selectedCadetForModal}
                    attendancePct={selectedCadetForModal.attendancePercentage ?? 0}
                    attendancePresentCount={selectedCadetForModal.attendancePresentCount ?? 0}
                    attendanceTotalPeriods={selectedCadetForModal.attendanceTotalPeriods ?? 0}
                    onClose={() => setSelectedCadetForModal(null)}
                />
            )}
        </>
    );
};
