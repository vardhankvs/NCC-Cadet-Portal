import jsPDF from 'jspdf';

export const generatePaymentReceipt = (tx) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // --- Header ---
    doc.setFillColor(27, 58, 107); // NCC Navy
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('14(A) BATTALION NCC', pageWidth / 2, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('SRIKAKULAM, ANDHRA PRADESH', pageWidth / 2, 28, { align: 'center' });
    doc.text('OFFICIAL PAYMENT RECEIPT', pageWidth / 2, 34, { align: 'center' });

    // --- Receipt Info ---
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text(`Receipt No: RCT-${tx.id.substring(0, 8).toUpperCase()}`, 20, 55);
    
    // Use transaction timestamp if available
    const txDate = tx.approvedAt?.toDate ? tx.approvedAt.toDate() : 
                 tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
    doc.text(`Date: ${txDate.toLocaleDateString()}`, pageWidth - 20, 55, { align: 'right' });

    // --- Cadet Details Box ---
    doc.setDrawColor(200, 200, 200);
    doc.rect(20, 65, pageWidth - 40, 50);
    
    doc.setFont('helvetica', 'bold');
    doc.text('CADET DETAILS', 25, 75);
    doc.setFont('helvetica', 'normal');
    doc.text(`Name: ${tx.cadetName}`, 25, 85);
    doc.text(`Regimental No: ${tx.enrollmentId}`, 25, 95);
    doc.text(`Unit: 14(A) BN NCC`, 25, 105);

    // --- Payment Details ---
    doc.setFont('helvetica', 'bold');
    doc.text('PAYMENT SUMMARY', 25, 125);
    
    doc.line(20, 130, pageWidth - 20, 130);
    doc.text('Description', 25, 140);
    doc.text('Amount', pageWidth - 25, 140, { align: 'right' });
    doc.line(20, 145, pageWidth - 20, 145);

    doc.setFont('helvetica', 'normal');
    doc.text('Institutional Fee / Corpus Fund', 25, 155);
    doc.text(`INR ${tx.amount.toLocaleString()}`, pageWidth - 25, 155, { align: 'right' });

    doc.setFillColor(245, 245, 245);
    doc.rect(20, 165, pageWidth - 40, 15, 'F');
    doc.setFont('helvetica', 'bold');
    doc.text('TOTAL PAID', 25, 175);
    doc.text(`INR ${tx.amount.toLocaleString()}`, pageWidth - 25, 175, { align: 'right' });

    // --- Footer & Verification ---
    doc.setFontSize(9);
    doc.setTextColor(100, 100, 100);
    doc.text('This is a computer-generated receipt and does not require a physical signature.', pageWidth / 2, 200, { align: 'center' });
    
    // Virtual Stamp
    doc.setDrawColor(212, 175, 55); // Gold
    doc.setLineWidth(1);
    doc.circle(pageWidth - 40, 230, 20);
    doc.setTextColor(212, 175, 55);
    doc.setFontSize(8);
    doc.text('VERIFIED', pageWidth - 40, 228, { align: 'center' });
    doc.text('14(A) BN NCC', pageWidth - 40, 234, { align: 'center' });

    doc.save(`Receipt_${tx.enrollmentId}_${tx.id.substring(0, 5)}.pdf`);
};
