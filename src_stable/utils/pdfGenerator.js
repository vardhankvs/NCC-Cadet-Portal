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
