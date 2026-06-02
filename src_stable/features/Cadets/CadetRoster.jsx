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
    Award
} from '../../components/Icons.jsx';
import { BulkImportModal } from './BulkImportModal.jsx';
import { CertificateUploadModal } from './CertificateUploadModal.jsx';
import { toast } from 'react-toastify';
import { formatDate } from '../../utils/dateUtils.js';


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

export const CadetRoster = ({ cadets, tenant, userInstitutionId }) => {
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
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

    const downloadTemplate = () => {
        const headers = ['Name','Regimental Number','JNTU NO','Rank','CERT','Father Name','Mother Name','Year','Branch','Aadhaar Number','Phone number (Personal)','Phone Number (Parents)','Address (Present)','Address (Permanent) If both present & Permanent are Same Just Ignore','Hosteler / Days scholar','ECA/CCA','Date of Birth','Email ID (Personal)','Email ID (College Mail)','Blood Group'];
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
        const tableColumn = ['S.No','Name','Regimental No','JNTU No','Rank','CERT','Father Name','Mother Name','Year','Branch','Aadhaar','Personal Phone','Parent Phone','Present Address','Permanent Address','Hosteler/Scholar','ECA/CCA','DOB','Personal Email','College Email','Blood Group'];
        const tableRows = filteredCadets.map((cadet, index) => [
            index + 1, cadet.name || '-', cadet.enrollmentId || cadet.regimentalNumber || '-',
            cadet.jntuNo || '-', cadet.rank || '-', cadet.certificate || cadet.B || '-',
            cadet.fatherName || '-', cadet.motherName || '-', cadet.year || '-', cadet.branch || '-',
            cadet.aadhaarNumber || '-', cadet.phonePersonal || cadet.phone || '-', cadet.phoneParents || '-',
            cadet.addressPresent || '-', cadet.addressPermanent || '-', cadet.hostelerType || '-',
            cadet.ecaCca || '-', formatDate(cadet.dob), cadet.personalEmail || '-', cadet.collegeEmail || '-', cadet.bloodGroup || '-',
        ]);
        doc.text(`14(A) BN NCC Srikakulam - ${selectedCategory} ${selectedCertificate} Roster`, 14, 15);
        autoTable(doc, { head: [tableColumn], body: tableRows, startY: 20, theme: 'grid', styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' }, headStyles: { fillColor: [10, 22, 40] } });
        doc.save(`NCC_Roster_${selectedCategory}_${selectedCertificate}.pdf`);
    };

    const downloadExcel = () => {
        const excelData = filteredCadets.map((cadet, index) => ({
            'S.No': index + 1, Name: cadet.name,
            'Regimental Number': cadet.enrollmentId || cadet.regimentalNumber,
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
            const count = await promoteSpecificCadets(from, to);
            toast.success(`Success! Updated ${count} cadets from ${from} to ${to}.`);
            setPromotionOption('');
        } catch (e) {
            setError('Update failed: ' + e.message);
            toast.error('Update failed: ' + e.message);
        } finally { setIsPromoting(false); }
    };

    const getBase64ImageFromUrl = async (imageUrl) => {
        try {
            const res = await fetch(imageUrl, { mode: 'cors' });
            const blob = await res.blob();
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.error("Failed to load image for PDF:", e);
            return null;
        }
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
        for (let i = 0; i < selectedIds.length; i++) {
            const cadet = filteredCadets.find(c => c.id === selectedIds[i]);
            if (!cadet) continue;

            if (count > 0 && count % (maxPerRow * maxPerCol) === 0) {
                doc.addPage();
                xOffset = 10;
                yOffset = 10;
            }

            const col = count % maxPerRow;
            const row = Math.floor((count % (maxPerRow * maxPerCol)) / maxPerRow);

            const currentX = xOffset + (col * (cardWidth + marginX));
            const currentY = yOffset + (row * (cardHeight + marginY));

            // Draw Card Boundary
            doc.setDrawColor(10, 22, 40); // ncc-navy
            doc.setLineWidth(0.5);
            doc.rect(currentX, currentY, cardWidth, cardHeight);

            // Header Background
            doc.setFillColor(10, 22, 40);
            doc.rect(currentX, currentY, cardWidth, 12, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            doc.text("NATIONAL CADET CORPS", currentX + cardWidth/2, currentY + 6, { align: 'center' });
            doc.setFontSize(6);
            doc.setFont('helvetica', 'normal');
            doc.text("14(A) BN NCC Srikakulam", currentX + cardWidth/2, currentY + 10, { align: 'center' });

            // Photo Placeholder (Left)
            const photoUrl = cadet.photoUrl || cadet.photoURL;
            let imgData = null;
            if (photoUrl) {
                imgData = await getBase64ImageFromUrl(photoUrl);
            }

            if (imgData) {
                doc.setDrawColor(200, 200, 200);
                doc.rect(currentX + 4, currentY + 16, 17, 22);
                try {
                    // Try to guess the format or just use 'JPEG' / 'PNG' based on the data URL
                    const format = imgData.substring("data:image/".length, imgData.indexOf(";base64"));
                    doc.addImage(imgData, format.toUpperCase(), currentX + 4, currentY + 16, 17, 22);
                } catch (e) {
                    console.error("Error adding image to pdf", e);
                    doc.setDrawColor(200, 200, 200);
                    doc.setFillColor(240, 240, 240);
                    doc.rect(currentX + 4, currentY + 16, 17, 22, 'FD');
                    doc.setTextColor(150, 150, 150);
                    doc.setFontSize(6);
                    doc.text("PHOTO ERR", currentX + 12.5, currentY + 28, { align: 'center' });
                }
            } else {
                doc.setDrawColor(200, 200, 200);
                doc.setFillColor(240, 240, 240);
                doc.rect(currentX + 4, currentY + 16, 17, 22, 'FD');
                doc.setTextColor(150, 150, 150);
                doc.setFontSize(6);
                doc.text("PHOTO", currentX + 12.5, currentY + 28, { align: 'center' });
            }

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
        let list = cadets.filter(c => c.status !== 'alumni');
        if (selectedCertificate !== 'All') {
            list = list.filter((c) => {
                const rawCert = c.certificate || c.B || '';
                const cadetCert = typeof rawCert === 'string' ? rawCert.trim().toUpperCase() : String(rawCert);
                return cadetCert === selectedCertificate.toUpperCase();
            });
        }
        if (selectedCategory !== 'All') list = list.filter((c) => (c.enrollmentId || c.regimentalNumber || '').toUpperCase().includes(selectedCategory));
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter((c) => c.name?.toLowerCase().includes(q) || (c.enrollmentId || c.regimentalNumber || '').toLowerCase().includes(q) || c.jntuNo?.toLowerCase().includes(q));
        }
        return list;
    }, [cadets, selectedCertificate, selectedCategory, searchTerm]);

    const handleSelectAll = (e) => { if (e.target.checked) setSelectedIds(filteredCadets.map((c) => c.id)); else setSelectedIds([]); };
    const handleSelectOne = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
    const handleBulkDeleteInitiate = () => { if (!selectedIds.length) return; setItemToDelete({ type: 'cadets', id: selectedIds, name: `${selectedIds.length} selected cadets`, isBulk: true }); };
    const handleModalClose = () => { setIsAdding(false); setEditingCadet(null); setItemToDelete(null); setIsImporting(false); setError(null); setCertModalCadet(null); };
    const handleDeleteConfirm = async () => {
        setError(null);
        if (!itemToDelete) return;
        try {
            if (itemToDelete.isBulk) { await Promise.all(itemToDelete.id.map((id) => deleteItem(itemToDelete.type, id))); setSelectedIds([]); }
            else { await deleteItem(itemToDelete.type, itemToDelete.id); setSelectedIds((prev) => prev.filter((id) => id !== itemToDelete.id)); }
            handleModalClose();
            toast.success('Cadet(s) deleted successfully');
        } catch (e) { setError(e.message); }
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

            {/* ── Action Bar ── */}
            <div className="flex flex-wrap gap-2 mb-5">
                <div className="ncc-filter-group">
                    {['All', 'SD', 'SW'].map((cat) => (
                        <button key={cat} onClick={() => setSelectedCategory(cat)} className={`ncc-filter-btn ${selectedCategory === cat ? 'active' : ''}`}>
                            {cat === 'All' ? 'All Div.' : cat}
                        </button>
                    ))}
                </div>
                <div className="ncc-filter-group">
                    {['All', 'B1', 'B2', 'C'].map((cert) => (
                        <button key={cert} onClick={() => setSelectedCertificate(cert)} className={`ncc-filter-btn ${selectedCertificate === cert ? 'active' : ''}`}>
                            {cert === 'All' ? 'All Certs' : cert}
                        </button>
                    ))}
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg border border-[#ddd8cc] bg-[#f5f0e8] dark:bg-[#0a1628]">
                    <select value={promotionOption} onChange={(e) => setPromotionOption(e.target.value)}
                        className="text-xs font-semibold border-none bg-transparent dark:bg-[#0a1628] focus:ring-0 text-gray-700 dark:text-white/90 cursor-pointer min-w-[140px] py-1">
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
                    <button disabled={isPromoting || !promotionOption} onClick={handlePromoteAction}
                        className="ncc-btn ncc-btn-primary ncc-btn-sm disabled:opacity-40">
                        {isPromoting ? '...' : <ShieldCheck className="w-3.5 h-3.5" />}
                    </button>
                </div>
                <div className="flex-1" />
                {selectedIds.length > 0 && (
                    <div className="flex gap-2">
                        <button className="ncc-btn ncc-btn-primary ncc-btn-sm" onClick={generateBatchIds}>
                            <ShieldCheck className="w-3.5 h-3.5" /> Batch IDs ({selectedIds.length})
                        </button>
                        <button className="ncc-btn ncc-btn-danger ncc-btn-sm" onClick={handleBulkDeleteInitiate}>
                            <Trash2 className="w-3.5 h-3.5" /> Delete ({selectedIds.length})
                        </button>
                    </div>
                )}
                <button className="ncc-btn ncc-btn-ghost ncc-btn-sm" onClick={downloadTemplate}><Download className="w-3.5 h-3.5" /> Template</button>
                <button className="ncc-btn ncc-btn-ghost ncc-btn-sm" onClick={() => { setIsImporting(true); setError(null); }}><FileText className="w-3.5 h-3.5" /> Import CSV</button>
                <button className="ncc-btn ncc-btn-primary ncc-btn-sm" onClick={() => { setIsAdding(true); setEditingCadet(null); setError(null); }}><UserPlus className="w-3.5 h-3.5" /> Add Cadet</button>
            </div>

            {error && <div className="mb-4"><ErrorDisplay message={error} /></div>}

            <div className="ncc-card overflow-hidden">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 border-b border-[#ddd8cc]">
                    <h2 className="ncc-section-title">
                        <List className="w-5 h-5 text-ncc-gold" />
                        {selectedCategory !== 'All' ? `${selectedCategory} ` : ''}Cadet Roster
                        <span className="ml-2 text-sm font-normal text-gray-400 dark:text-white/80">({filteredCadets.length})</span>
                    </h2>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/80" />
                        <input type="text" placeholder="Search name, reg. no. or JNTU no..." value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)} className="ncc-input pl-9 text-xs" />
                    </div>
                </div>

                {filteredCadets.length === 0 ? (
                    <div className="py-16 text-center">
                        <p className="text-gray-400 dark:text-white/80 text-sm">{searchTerm ? `No cadets matching "${searchTerm}".` : 'No cadets in this division/category.'}</p>
                        {searchTerm && <button onClick={() => setSearchTerm('')} className="mt-2 text-ncc-gold hover:underline text-xs font-semibold">Clear search</button>}
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto ncc-scrollbar">
                            <table className="min-w-full">
                                <thead>
                                    <tr>
                                        <th className="ncc-th w-8 text-center">
                                            <input type="checkbox" className="rounded" onChange={handleSelectAll}
                                                checked={filteredCadets.length > 0 && selectedIds.length === filteredCadets.length} />
                                        </th>
                                        {['#','Name','Reg. No','JNTU No','Father','Mother','Cert','Year','Branch','Aadhaar','Ph. Personal','Ph. Parents','Addr. Present','Addr. Perm.','Hosteler','ECA/CCA','DOB','Email (P)','Email (C)','Blood','Actions'].map((h) => (
                                            <th key={h} className="ncc-th">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredCadets.map((cadet, index) => {
                                        const cert = cadet.certificate || cadet.B;
                                        const certCls = cert === 'C' ? 'cert-c' : cert === 'B2' ? 'cert-b2' : cert ? 'cert-b1' : '';
                                        return (
                                            <tr key={cadet.id} className={`ncc-tr dark:hover:bg-white/5 ${selectedIds.includes(cadet.id) ? 'ncc-tr-selected' : ''}`}>
                                                <td className="ncc-td text-center"><input type="checkbox" checked={selectedIds.includes(cadet.id)} onChange={() => handleSelectOne(cadet.id)} className="rounded" /></td>
                                                <td className="ncc-td text-gray-400 dark:text-white/80">{index + 1}</td>
                                                <td className="ncc-td font-semibold text-ncc-navy dark:text-white whitespace-nowrap">{cadet.name}</td>
                                                <td className="ncc-td font-mono text-xs whitespace-nowrap">{cadet.enrollmentId || cadet.regimentalNumber}</td>
                                                <td className="ncc-td text-xs">{cadet.jntuNo || '—'}</td>
                                                <td className="ncc-td whitespace-nowrap text-xs">{cadet.fatherName || '—'}</td>
                                                <td className="ncc-td whitespace-nowrap text-xs">{cadet.motherName || '—'}</td>
                                                <td className="ncc-td">{cert ? <span className={certCls}>{cert}</span> : '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.year || '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.branch || '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.aadhaarNumber || '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.phonePersonal || cadet.phone || '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.phoneParents || '—'}</td>
                                                <td className="ncc-td text-xs truncate max-w-[120px]">{cadet.addressPresent || '—'}</td>
                                                <td className="ncc-td text-xs truncate max-w-[120px]">{cadet.addressPermanent || '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.hostelerType || '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.ecaCca || '—'}</td>
                                                <td className="ncc-td text-xs whitespace-nowrap">{formatDate(cadet.dob)}</td>
                                                <td className="ncc-td text-xs">{cadet.personalEmail || '—'}</td>
                                                <td className="ncc-td text-xs">{cadet.collegeEmail || '—'}</td>
                                                <td className="ncc-td"><span className="font-bold text-red-600 text-xs">{cadet.bloodGroup || '—'}</span></td>
                                                <td className="ncc-td text-right whitespace-nowrap">
                                                    <button onClick={() => setEditingCadet({ ...cadet, dob: formatDateForInput(cadet.dob) })} className="inline-flex p-1.5 rounded-lg hover:bg-ncc-navy/10 transition">
                                                        <Edit className="w-3.5 h-3.5 text-ncc-navy dark:text-white" />
                                                    </button>

                                                    <button onClick={() => setItemToDelete({ type: 'cadets', id: cadet.id, name: cadet.name })} className="inline-flex p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-0.5">
                                                        <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-5 border-t border-[#ddd8cc]">
                            <button onClick={downloadPDF} className="ncc-btn ncc-btn-danger w-full sm:w-auto justify-center"><FileText className="w-4 h-4" /> Export PDF</button>
                            <button onClick={downloadExcel} className="ncc-btn ncc-btn-success w-full sm:w-auto justify-center"><Download className="w-4 h-4" /> Export Excel</button>
                        </div>
                    </>
                )}
            </div>
        </>
    );
};
