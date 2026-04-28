// src/utils/pdfGenerator.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatDate } from './dateUtils';

/**
 * Core utility for generating military-standard NCC documents.
 */

const NCC_NAVY = [0, 32, 78]; // #00204E
const NCC_GOLD = [184, 134, 11]; // #B8860B

/**
 * Adds an official header to the PDF
 */
const addHeader = (doc, title) => {
    const pageWidth = doc.internal.pageSize.width;

    // Unit Name Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...NCC_NAVY);
    doc.text('GMR INSTITUTE OF TECHNOLOGY', pageWidth / 2, 15, { align: 'center' });

    doc.setFontSize(12);
    doc.text('2(A) ENGR COY NCC - VIZIANAGARAM', pageWidth / 2, 22, { align: 'center' });

    doc.setDrawColor(...NCC_GOLD);
    doc.setLineWidth(0.5);
    doc.line(20, 25, pageWidth - 20, 25);

    // Document Title
    doc.setFontSize(14);
    doc.text(title.toUpperCase(), pageWidth / 2, 35, { align: 'center' });

    // Date Generated
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Generated on: ${formatDate(new Date())}`, pageWidth - 20, 35, { align: 'right' });
};

/**
 * Generates a standard Nominal Roll PDF
 * @param {Array} cadets - List of cadet objects
 * @param {string} title - Title of the document
 * @param {string} filename - Output filename
 */
export const generateNominalRollPDF = (cadets, title = 'Nominal Roll', filename = 'Nominal_Roll.pdf') => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape for rolls
    addHeader(doc, title);

    // Simplified Headers
    const headers = [
        ['S.No', 'Regtl No', 'Rank', 'Name', 'Father\'s Name', 'DOB', 'Cert', 'Remarks']
    ];

    const data = cadets.map((c, index) => [
        index + 1,
        c.enrollmentId || 'N/A',
        c.rank || 'CDT',
        c.name || 'N/A',
        c.fatherName || 'N/A',
        c.dob ? formatDate(c.dob) : 'N/A',
        c.certificate || 'N/A',
        'Participated' // Updated Remarks
    ]);

    // Functional call instead of doc.autoTable
    autoTable(doc, {
        startY: 45,
        head: headers,
        body: data,
        theme: 'grid',
        headStyles: { 
            fillColor: NCC_NAVY, 
            textColor: [255, 255, 255],
            fontSize: 10,
            halign: 'center' 
        },
        styles: { 
            fontSize: 9, 
            cellPadding: 3,
            valign: 'middle'
        },
        columnStyles: {
            0: { halign: 'center', cellWidth: 12 },
            1: { fontStyle: 'bold' },
            5: { halign: 'center' }, // DOB
            6: { halign: 'center' }, // Cert
            7: { halign: 'center' }  // Remarks
        },
        didDrawPage: (data) => {
            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(
                `Page ${doc.internal.getCurrentPageInfo().pageNumber} of ${pageCount}`,
                doc.internal.pageSize.width / 2,
                doc.internal.pageSize.height - 10,
                { align: 'center' }
            );
        }
    });

    doc.save(filename);
};

/**
 * Generates an Individual Application Form (B/C Cert Mockup)
 */
export const generateCertificateApplicationPDF = (cadet) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    addHeader(doc, `Application for ${cadet.certificate || 'B/C'} Certificate Examination`);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const startY = 50;
    const labelX = 25;
    const valueX = 75;
    const lineSpacing = 10;

    const fields = [
        ['Regimental Number', cadet.enrollmentId],
        ['Rank', cadet.rank],
        ['Name in Capitals', cadet.name?.toUpperCase()],
        ['Father\'s Name', cadet.fatherName],
        ['Date of Birth', formatDate(cadet.dob)],
        ['Date of Enrollment', cadet.enrollmentDate ? formatDate(cadet.enrollmentDate) : (cadet.createdAt ? formatDate(cadet.createdAt) : 'N/A')],
        ['School/College', 'GMR INSTITUTE OF TECHNOLOGY'],
        ['Unit', '2(A) ENGR COY NCC'],
        ['Division/Wing', cadet.division || 'SD/SW'],
        ['Attendance Percentage', '75% (Min required)']
    ];

    fields.forEach((field, i) => {
        const y = startY + (i * lineSpacing);
        doc.setFont('helvetica', 'bold');
        doc.text(`${field[0]}:`, labelX, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`${field[1] || 'N/A'}`, valueX, y);
        doc.line(valueX, y + 2, 185, y + 2); // Underline for signature style
    });

    // Signature boxes
    const footerY = 220;
    doc.setFontSize(10);
    doc.text('__________________________', 25, footerY);
    doc.text('Signature of Cadet', 35, footerY + 8);

    doc.text('__________________________', 135, footerY);
    doc.text('Signature of ANO/CO', 145, footerY + 8);

    // Official Seal Watermark Placeholder
    doc.setGState(new doc.GState({ opacity: 0.1 }));
    doc.setFontSize(60);
    doc.text('UNIT SEAL', 105, 150, { align: 'center', angle: 45 });

    doc.save(`${cadet.enrollmentId}_Application.pdf`);
};
