// src/utils/pdfGenerator.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './dateUtils';

/**
 * Core utility for generating military-standard NCC documents.
 */

const NCC_NAVY = [10, 22, 40];   // #0A1628
const NCC_GOLD = [184, 134, 11]; // #B8860B

/**
 * Highly robust download trigger to bypass silent browser blocking.
 * Sometimes doc.save() is blocked by pop-up blockers or security policies 
 * in certain browsers or environments. This explicit Blob method is more reliable.
 */
const safeDownload = (doc, filename) => {
    try {
        const blob = doc.output('blob');
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        
        // Trigger download
        a.click();
        
        // Cleanup after sufficient time for browser to start download
        setTimeout(() => {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 1000);
        console.log(`[PDF] Successfully triggered download: ${filename}`);
    } catch (err) {
        console.error('[PDF] Custom download failed, falling back to doc.save():', err);
        doc.save(filename); // Fallback to native jsPDF save
    }
};

/**
 * Adds an official header to the PDF
 */
const addHeader = (doc, title, isJntu = false) => {
    const pageWidth = doc.internal.pageSize.width;

    if (isJntu) {
        // GMRIT JNTU Header
        doc.setFontSize(16);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(29, 78, 169); // College Blue
        doc.text('GMR INSTITUTE OF TECHNOLOGY', pageWidth / 2, 16, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0); // Black
        doc.text('(An Autonomous Institution, Accredited by NBA of AICTE, NAAC of UGC & an ISO 9001:2008 Institution)', pageWidth / 2, 22, { align: 'center' });

        // Dynamic heading
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(title.toUpperCase(), pageWidth / 2, 32, { align: 'center' });
    } else {
        // Standard NCC Header
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(...NCC_NAVY);
        doc.text('14(A) BN NCC - SRIKAKULAM', pageWidth / 2, 18, { align: 'center' });

        doc.setFontSize(10);
        doc.text('VISAKHAPATNAM GROUP', pageWidth / 2, 24, { align: 'center' });

        doc.setDrawColor(...NCC_GOLD);
        doc.setLineWidth(0.5);
        doc.line(20, 27, pageWidth - 20, 27);

        // Document Title
        doc.setFontSize(14);
        doc.setTextColor(...NCC_NAVY);
        doc.text(title.toUpperCase(), pageWidth / 2, 36, { align: 'center' });
    }

    // Date Generated
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(`Date: ${formatDate(new Date())}`, pageWidth - 20, 36, { align: 'right' });
};

/**
 * Generates a standard Nominal Roll PDF.
 * @param {Array}  cadets   - List of cadet objects
 * @param {string} title    - Document title
 * @param {string} filename - Output filename
 * @param {string} numberType - 'regimental' or 'jntu'
 * @param {string} venue    - Event Venue
 * @param {string} eventDate - Event Date
 * @throws  Will throw on any jsPDF error so the caller can surface it via toast.
 */
export const generateNominalRollPDF = (cadets, title = 'Nominal Roll', filename = 'Nominal_Roll.pdf', numberType = 'regimental', venue = '', eventDate = '') => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape

    const isJntu = numberType === 'jntu';
    addHeader(doc, title, isJntu);

    const headers = [
        ['S.NO', numberType === 'jntu' ? 'JNTU NO' : 'REGTL NO', 'NAME OF THE CADET', 'BRANCH', 'VENUE', 'DATE']
    ];

    const data = cadets.map((c, i) => {
        const displayId = numberType === 'jntu' ? (c.jntuNo || '—') : (c.enrollmentId || '—');
        const branchStr = c.branch || c.department || '—';
        
        return [
            i + 1,
            displayId,
            c.name || '—',
            branchStr.toUpperCase(),
            '', // Venue is manually drawn to span entire column
            ''  // Date is manually drawn to span entire column
        ];
    });

    let pageBodyStartY = 0;
    let pageBodyEndY = 0;

    autoTable(doc, {
        startY: 46,
        head: headers,
        body: data,
        theme: 'grid',
        styles: {
            lineColor: [0, 0, 0], // Solid black borders to match reference
            lineWidth: 0.1,
        },
        headStyles: {
            fillColor: [255, 255, 255], // White background
            textColor: [0, 0, 0],       // Dark bold text
            fontSize: 9,
            fontStyle: 'bold',
            halign: 'center',
        },
        bodyStyles: {
            fontSize: 8,
            cellPadding: 2.5,
            valign: 'middle',
            textColor: [30, 30, 30],
            fillColor: [255, 255, 255],
        },
        alternateRowStyles: { fillColor: [255, 255, 255] },
        columnStyles: {
            0: { halign: 'center', cellWidth: 15 },
            1: { halign: 'center', fontStyle: 'bold', cellWidth: 45 },
            2: { cellWidth: 60 },
            3: { halign: 'center', cellWidth: 45 },
            4: { cellWidth: 60 },
            5: { halign: 'center', cellWidth: 44 },
        },
        willDrawCell: (data) => {
            // Remove horizontal borders for Venue and Date to create a massive merged column effect
            if (data.section === 'body' && (data.column.index === 4 || data.column.index === 5)) {
                data.cell.styles.lineWidth = { 
                    top: 0, 
                    bottom: 0, 
                    left: 0.1, 
                    right: 0.1 
                };
            }
        },
        didDrawCell: (data) => {
            if (data.section === 'body') {
                if (pageBodyStartY === 0) {
                    pageBodyStartY = data.cell.y; // Top of the first row on this page
                }
                pageBodyEndY = data.cell.y + data.cell.height; // Continually updates to bottom of current row
            }
        },
        didDrawPage: (data) => {
            // --- Draw custom centered Venue and Date text ---
            if (pageBodyStartY !== 0 && pageBodyEndY !== 0) {
                const midY = pageBodyStartY + (pageBodyEndY - pageBodyStartY) / 2;
                
                doc.setFontSize(10);
                doc.setTextColor(30, 30, 30);
                doc.setFont('helvetica', 'bold'); // Make Venue and Date bold
                
                // Draw Venue (Wrapped to fit 55mm)
                if (venue) {
                    const venueLines = doc.splitTextToSize(venue, 55);
                    doc.text(venueLines, 209, midY, { align: 'center', baseline: 'middle' });
                }
                
                // Draw Date
                if (eventDate) {
                    const dateText = (typeof eventDate === 'string' && (eventDate.includes('/') || eventDate.includes('to'))) 
                        ? eventDate 
                        : formatDate(eventDate);
                    doc.text(dateText, 261, midY, { align: 'center', baseline: 'middle' });
                }

                // Perfectly close the table top and bottom for Venue and Date columns on this page
                doc.setDrawColor(0, 0, 0);
                doc.setLineWidth(0.1);
                
                // Top line (immediately under the column headers)
                doc.line(179, pageBodyStartY, 283, pageBodyStartY);
                
                // Bottom line (closing the table body)
                doc.line(179, pageBodyEndY, 283, pageBodyEndY);

                // Reset for the next page
                pageBodyStartY = 0;
                pageBodyEndY = 0;
            }

        },
    });

    // Signature block on last page (Only for Regimental downloads)
    if (!isJntu) {
        const finalY = doc.lastAutoTable.finalY + 16;
        const ph     = doc.internal.pageSize.height;
        const pw     = doc.internal.pageSize.width;

        if (finalY + 30 < ph) {
            doc.setFontSize(10);
            doc.setTextColor(...NCC_NAVY);
            doc.setFont('helvetica', 'bold');
            doc.text('Commanding Officer', pw - 25, finalY + 20, { align: 'right' });
            doc.setFont('helvetica', 'normal');
            doc.text('14(A) BN NCC, Srikakulam', pw - 25, finalY + 27, { align: 'right' });
        }
    }

    console.log('[PDF] Preparing to download nominal roll:', filename);
    safeDownload(doc, filename);
};

/**
 * Generates an Individual Certificate Application Form.
 * @param {object} cadet - Cadet object from Firestore
 * @throws  Will throw on any jsPDF error so the caller can surface it via toast.
 */
export const generateCertificateApplicationPDF = (cadet) => {
    const doc = new jsPDF('p', 'mm', 'a4');

    addHeader(doc, `Application for ${cadet.certificate || 'B/C'} Certificate Examination`);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const startY      = 52;
    const labelX      = 25;
    const valueX      = 80;
    const lineSpacing = 12;

    const reg = (cadet.enrollmentId || '').toUpperCase();
    const div = reg.includes('SW') ? 'SW' : reg.includes('SD') ? 'SD' : (cadet.division || 'SD/SW');

    const fields = [
        ["Regimental Number", cadet.enrollmentId],
        ["Rank",              cadet.rank],
        ["Name in Capitals",  cadet.name?.toUpperCase()],
        ["Father's Name",     cadet.fatherName],
        ["Date of Birth",     cadet.dob ? formatDate(cadet.dob) : 'N/A'],
        ["Date of Enrollment", cadet.enrollmentDate
            ? formatDate(cadet.enrollmentDate)
            : cadet.createdAt ? formatDate(cadet.createdAt) : 'N/A'],
        ["School / College",  cadet.school || 'NCC SRIKAKULAM'],
        ["Unit",              "14(A) BN NCC"],
        ["Division / Wing",   div],
        ["Certificate Sought", cadet.certificate || 'B/C'],
    ];

    fields.forEach((field, i) => {
        const y = startY + i * lineSpacing;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(40, 40, 40);
        doc.text(`${field[0]}:`, labelX, y);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`${field[1] || 'N/A'}`, valueX, y);

        // Underline for the value field
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.2);
        doc.line(valueX, y + 1.5, 185, y + 1.5);
    });

    // Signature blocks
    const footerY = 230;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    doc.line(25,  footerY, 85,  footerY);
    doc.text("Signature of Cadet",    25,  footerY + 7);

    doc.line(125, footerY, 185, footerY);
    doc.text("Signature of ANO / CO", 125, footerY + 7);

    // Faint watermark — use setGState only if available, fallback gracefully
    try {
        doc.setFontSize(55);
        doc.setTextColor(220, 220, 220);
        doc.text('UNIT COPY', 105, 160, { align: 'center', angle: 45 });
    } catch (_) { /* watermark is cosmetic — ignore if unsupported */ }

    const filename = `${cadet.enrollmentId || 'Cadet'}_Application.pdf`;
    console.log('[PDF] Preparing to download certificate:', filename);
    safeDownload(doc, filename);
};

/**
 * Generates an official Certificate of Examination Results PDF.
 * @param {object} cadet - Cadet object
 * @param {object} cert - Certificate object containing marks and grade
 */
export const generateResultCertificatePDF = (cadet, cert) => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Premium Background - faint cream color
    doc.setFillColor(253, 251, 247);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Ornamental Borders
    doc.setDrawColor(...NCC_GOLD); // Gold
    doc.setLineWidth(4);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20); // Outer border
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(...NCC_NAVY); // Navy
    doc.rect(15, 15, pageWidth - 30, pageHeight - 30); // Inner border 1
    
    doc.setDrawColor(...NCC_GOLD);
    doc.rect(16.5, 16.5, pageWidth - 33, pageHeight - 33); // Inner border 2

    // Corner Accents (Squares)
    doc.setFillColor(...NCC_NAVY);
    doc.rect(15, 15, 4, 4, 'F'); // Top-left
    doc.rect(pageWidth - 19, 15, 4, 4, 'F'); // Top-right
    doc.rect(15, pageHeight - 19, 4, 4, 'F'); // Bottom-left
    doc.rect(pageWidth - 19, pageHeight - 19, 4, 4, 'F'); // Bottom-right

    // Distinction watermark if Grade A
    const isDistinction = cert.finalGrade === 'A' || cert.finalGrade === 'A+';
    if (isDistinction) {
        doc.setFont('times', 'bolditalic');
        doc.setFontSize(100);
        doc.setTextColor(250, 240, 210); // Very faint gold
        doc.text('DISTINCTION', pageWidth / 2, pageHeight / 2 + 20, { align: 'center', angle: 25 });
    }

    doc.setFontSize(42);
    doc.setFont('times', 'bold');
    doc.setTextColor(...NCC_NAVY);
    doc.text('NATIONAL CADET CORPS', pageWidth / 2, 50, { align: 'center' });

    doc.setFontSize(16);
    doc.setFont('times', 'normal');
    doc.setTextColor(...NCC_GOLD);
    doc.text('C E R T I F I C A T E   O F   E X A M I N A T I O N', pageWidth / 2, 65, { align: 'center' });

    doc.setDrawColor(...NCC_GOLD);
    doc.setLineWidth(0.5);
    doc.line(pageWidth / 2 - 40, 72, pageWidth / 2 + 40, 72);

    doc.setFontSize(16);
    doc.setFont('times', 'italic');
    doc.setTextColor(80, 80, 80);
    doc.text(`This is to certify that`, pageWidth / 2, 90, { align: 'center' });

    doc.setFontSize(32);
    doc.setFont('times', 'bold');
    doc.setTextColor(...NCC_NAVY);
    doc.text(cadet.name?.toUpperCase() || 'CADET', pageWidth / 2, 110, { align: 'center' });

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(`Regimental No. ${cadet.enrollmentId || 'N/A'}`, pageWidth / 2, 122, { align: 'center' });

    const rawCertLevel = cert.certLevel.replace(' Certificate', '');
    
    doc.setFontSize(16);
    doc.setFont('times', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`has successfully passed the `, pageWidth / 2 - 5, 142, { align: 'right' });
    
    doc.setFont('times', 'bold');
    doc.setTextColor(...NCC_NAVY);
    doc.text(`${rawCertLevel} Certificate Examination`, pageWidth / 2, 142, { align: 'left' });

    doc.setFontSize(14);
    doc.setFont('times', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`held in the year ${cert.year}.`, pageWidth / 2, 155, { align: 'center' });

    doc.setFontSize(18);
    doc.setFont('times', 'italic');
    doc.text(`Grade Awarded:`, pageWidth / 2 - 10, 175, { align: 'right' });
    
    doc.setFontSize(32);
    doc.setFont('times', 'bold');
    if (cert.finalGrade === 'Fail') {
        doc.setTextColor(220, 38, 38);
    } else if (isDistinction) {
        doc.setTextColor(217, 119, 6); // Amber-600
    } else {
        doc.setTextColor(16, 185, 129); // Emerald-500
    }
    doc.text(cert.finalGrade, pageWidth / 2, 177, { align: 'left' });

    if (isDistinction) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(217, 119, 6);
        doc.text(`(PASSED WITH DISTINCTION)`, pageWidth / 2, 188, { align: 'center' });
    }

    // Signatures
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NCC_NAVY);
    
    doc.line(30, pageHeight - 40, 85, pageHeight - 40);
    const today = new Date();
    doc.setFontSize(10);
    doc.text(`${today.toLocaleDateString()}`, 57.5, pageHeight - 43, { align: 'center' });
    doc.setFontSize(12);
    doc.text('Date', 57.5, pageHeight - 32, { align: 'center' });

    doc.line(pageWidth - 85, pageHeight - 40, pageWidth - 30, pageHeight - 40);
    doc.text('Commanding Officer', pageWidth - 57.5, pageHeight - 32, { align: 'center' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text('14(A) BN NCC', pageWidth - 57.5, pageHeight - 26, { align: 'center' });

    const filename = `${cadet.enrollmentId || 'Cadet'}_${rawCertLevel}_Certificate.pdf`;
    console.log('[PDF] Preparing to download result certificate:', filename);
    safeDownload(doc, filename);
};
