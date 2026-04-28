// src/features/Fee/FeeManagementView.jsx
import React, { useState, useMemo, useRef } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { Briefcase, Edit, Plus, Search, Loader, X, CheckCircle, AlertCircle, Download, FileText, CreditCard, TrendingUp, ShieldCheck, Image } from '../../components/Icons.jsx';
import { FeeEditModal } from './FeeEditModal.jsx';
import { FeeBulkUpdateModal } from './FeeBulkUpdateModal.jsx';
import { PaymentSettingsModal } from './PaymentSettingsModal.jsx';
import { requestPaymentVerification } from '../../firebase/firestoreService.js';
import { formatCurrency, calculateDue } from '../../utils/feeUtils.js';
import { toast } from 'react-toastify';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const DEFAULT_ENROLLMENT_FEE = 1000;
const DEFAULT_UNIFORM_FEE = 1500;
const DEFAULT_CAMP_FEE = 0;

export const FeeManagementView = () => {
    const { userRole, userEnrollmentId } = useAuthContext();
    const { cadets, paymentSettings, loading: dataLoading } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingFeeCadet, setEditingFeeCadet] = useState(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showScanner, setShowScanner] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('idle');
    const tableRef = useRef(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

    const calculateGrandTotal = (c) => Number(c.enrollmentFee || DEFAULT_ENROLLMENT_FEE) + Number(c.uniformFee || DEFAULT_UNIFORM_FEE) + Number(c.campFee || DEFAULT_CAMP_FEE);

    const relevantCadets = useMemo(() => {
        let list = [...cadets];
        if (userRole === 'cadet' && userEnrollmentId) list = list.filter((c) => c.enrollmentId === userEnrollmentId);
        if (userRole === 'admin') {
            if (selectedCertificate !== 'All') list = list.filter((c) => c.certificate === selectedCertificate);
            if (selectedCategory !== 'All') list = list.filter((c) => (c.enrollmentId || '').toUpperCase().includes(selectedCategory));
            if (searchTerm) { const q = searchTerm.toLowerCase(); list = list.filter((c) => c.enrollmentId.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)); }
        }
        return list;
    }, [cadets, userRole, userEnrollmentId, searchTerm, selectedCertificate, selectedCategory]);

    const activeCadet = relevantCadets[0];
    const activeGrandTotal = activeCadet ? calculateGrandTotal(activeCadet) : 0;
    const dueAmount = activeCadet ? calculateDue(activeGrandTotal, activeCadet.feePaid || 0) : 0;

    const handleConfirmPayment = async (cadetObj, amount) => {
        setPaymentStatus('verifying');
        try { await requestPaymentVerification(cadetObj.id, amount, cadetObj.name); setPaymentStatus('success'); toast.success('Message sent to Admin successfully!'); }
        catch { setPaymentStatus('idle'); toast.error('Failed to send verification message.'); }
    };

    const handlePdfDownload = async () => {
        if (!tableRef.current) return;
        setIsDownloadingPdf(true);
        try {
            const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true });
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            pdf.setFontSize(14); pdf.text('GMRIT NCC Fee Report', 10, 15);
            pdf.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 10, 25, 277, (canvas.height * 277) / canvas.width);
            pdf.save(`NCC_FeeReport_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch { toast.error('Failed to generate PDF'); } finally { setIsDownloadingPdf(false); }
    };

    const handleExcelDownload = () => {
        setIsDownloadingExcel(true);
        try {
            let csv = 'S.No.,Name,Enrollment ID,Total,Paid,Due\n';
            relevantCadets.forEach((c, i) => { const total = calculateGrandTotal(c); const due = calculateDue(total, c.feePaid || 0); csv += `${i + 1},"${c.name}",${c.enrollmentId},${total},${c.feePaid},${due}\n`; });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
            link.download = 'NCC_FeeReport.csv'; link.click();
        } finally { setIsDownloadingExcel(false); }
    };

    const renderCadetView = () => {
        const cadet = relevantCadets[0];
        if (!cadet) return <div className="p-8 text-center text-gray-400 italic text-sm">Fee record missing. Contact Admin.</div>;
        const grandTotal = calculateGrandTotal(cadet);
        const paidAmount = Number(cadet.feePaid || 0);
        const currentDue = calculateDue(grandTotal, paidAmount);
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    {[{ title: 'Enrollment', amount: cadet.enrollmentFee || DEFAULT_ENROLLMENT_FEE, icon: FileText }, { title: 'Track & Suit', amount: cadet.uniformFee || DEFAULT_UNIFORM_FEE, icon: Briefcase }, { title: 'Camp', amount: cadet.campFee || DEFAULT_CAMP_FEE, icon: TrendingUp }].map((item) => (
                        <div key={item.title} className="p-3 ncc-card text-center">
                            <item.icon className="w-4 h-4 text-ncc-gold mx-auto mb-1" />
                            <p className="text-xs font-bold text-gray-400 uppercase leading-tight mb-1">{item.title}</p>
                            <p className="text-sm font-bold text-ncc-navy">{formatCurrency(item.amount)}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-ncc-navy rounded-2xl p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Financial Summary</p>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div><p className="text-base sm:text-xl font-bold">{formatCurrency(grandTotal)}</p><p className="text-xs text-white/50 font-medium">Total</p></div>
                        <div><p className="text-base sm:text-xl font-bold text-emerald-400">{formatCurrency(paidAmount)}</p><p className="text-xs text-white/50 font-medium">Paid</p></div>
                        <div><p className={`text-base sm:text-xl font-bold ${currentDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>{formatCurrency(currentDue)}</p><p className="text-xs text-white/50 font-medium">Due</p></div>
                    </div>
                    {currentDue > 0 ? (
                        <button onClick={() => { setPaymentStatus('idle'); setShowScanner(true); }} className="w-full py-3 bg-ncc-gold text-ncc-navy font-bold rounded-xl uppercase tracking-widest shadow-lg hover:brightness-110 transition active:scale-95 flex items-center justify-center text-sm">
                            <CreditCard className="w-4 h-4 mr-2" /> Pay {formatCurrency(currentDue)}
                        </button>
                    ) : (
                        <div className="w-full py-3 bg-emerald-800/30 text-emerald-300 rounded-xl flex items-center justify-center font-bold uppercase tracking-widest text-xs">
                            <ShieldCheck className="w-4 h-4 mr-2" /> Dues Cleared
                        </div>
                    )}
                </div>
            </div>
        );
    };

    return (
        <>
            {isScannerModalOpen && <PaymentSettingsModal currentUrl={paymentSettings?.paymentQRUrl} onClose={() => setIsScannerModalOpen(false)} />}
            {showScanner && (
                <ModalOverlay onClose={() => setShowScanner(false)}>
                    <div className="bg-white rounded-2xl p-5 max-w-sm w-full text-center shadow-2xl border border-[#ddd8cc] relative">
                        {paymentStatus === 'idle' && (<>
                            <div className="flex justify-between items-center mb-5">
                                <div className="text-left"><h3 className="text-lg font-bold uppercase tracking-tight text-ncc-navy">Scan to Pay</h3><p className="text-xs font-semibold text-ncc-gold uppercase tracking-widest">PhonePe Merchant</p></div>
                                <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-gray-100 rounded-full"><X className="w-5 h-5 text-gray-400" /></button>
                            </div>
                            <div className="p-4 bg-[#f5f0e8] rounded-2xl border-2 border-dashed border-[#ddd8cc] mb-4">
                                {paymentSettings?.paymentQRUrl ? <img src={paymentSettings.paymentQRUrl} alt="QR" className="w-full h-auto rounded-xl shadow-lg" /> : <div className="py-12 flex flex-col items-center text-gray-400"><AlertCircle className="w-10 h-10 mb-2 opacity-20" /><p className="text-xs italic uppercase font-bold tracking-widest">Scanner Unset</p></div>}
                            </div>
                            <div className="bg-ncc-cream p-3 rounded-xl mb-4 text-left">
                                <p className="text-xs text-ncc-navy font-semibold leading-relaxed">Step 1: Scan with PhonePe App<br />Step 2: Complete the transaction<br />Step 3: Click "Send Message to Admin" below</p>
                            </div>
                            <button onClick={() => handleConfirmPayment(activeCadet, dueAmount)} className="ncc-btn ncc-btn-primary w-full justify-center py-3 text-sm">Send Message to Admin for Approval</button>
                        </>)}
                        {paymentStatus === 'verifying' && <div className="py-16 flex flex-col items-center"><Loader className="animate-spin h-12 w-12 text-ncc-navy mb-4" /><p className="font-bold text-ncc-navy uppercase tracking-widest animate-pulse text-sm">Sending Message...</p></div>}
                        {paymentStatus === 'success' && (<div className="py-10">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                            <h3 className="text-xl font-bold text-ncc-navy uppercase tracking-tight">Message Sent!</h3>
                            <p className="text-xs text-gray-500 mt-2 px-4 leading-relaxed">Admin has been notified and will verify shortly.</p>
                            <button onClick={() => setShowScanner(false)} className="mt-6 w-full py-3 ncc-btn ncc-btn-ghost justify-center">Close</button>
                        </div>)}
                    </div>
                </ModalOverlay>
            )}

            <div className="ncc-card overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center p-5 border-b border-[#ddd8cc] gap-3">
                    <h2 className="ncc-section-title"><Briefcase className="w-5 h-5 text-ncc-gold" />{userRole === 'admin' ? 'Financial Registry' : 'Fee Management'}</h2>
                    {userRole === 'admin' && (
                        <div className="flex flex-wrap gap-1.5">
                            <div className="ncc-filter-group">{['All','SD','SW'].map((o) => <button key={o} onClick={() => setSelectedCategory(o)} className={`ncc-filter-btn ${selectedCategory === o ? 'active' : ''}`}>{o}</button>)}</div>
                            <div className="ncc-filter-group">{['All','B1','B2','C'].map((o) => <button key={o} onClick={() => setSelectedCertificate(o)} className={`ncc-filter-btn ${selectedCertificate === o ? 'active' : ''}`}>{o}</button>)}</div>
                            <button onClick={() => setIsScannerModalOpen(true)} className="ncc-btn ncc-btn-ghost ncc-btn-sm"><Image className="w-3 h-3" /> QR</button>
                            <button onClick={() => setIsBulkModalOpen(true)} className="ncc-btn ncc-btn-primary ncc-btn-sm"><Plus className="w-3 h-3" /> Bulk</button>
                        </div>
                    )}
                </div>

                <div className="p-5">
                    {userRole === 'admin' && (
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input type="text" placeholder="Search cadet name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ncc-input pl-9 text-xs" />
                        </div>
                    )}

                    {dataLoading ? (
                        <div className="py-16 text-center"><Loader className="animate-spin h-10 w-10 text-ncc-navy mx-auto" /></div>
                    ) : relevantCadets.length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-[#ddd8cc] rounded-2xl">
                            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-400 font-semibold uppercase text-xs">No records found</p>
                        </div>
                    ) : userRole === 'admin' ? (
                        <div className="space-y-4">
                            <div ref={tableRef} className="overflow-x-auto ncc-scrollbar rounded-lg border border-[#ddd8cc]">
                                <table className="min-w-full">
                                    <thead>
                                        <tr>
                                            {['#','Name','ID','Total','Paid','Due','Edit'].map((h) => <th key={h} className="ncc-th">{h}</th>)}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {relevantCadets.map((c, index) => {
                                            const total = calculateGrandTotal(c);
                                            const due = calculateDue(total, c.feePaid || 0);
                                            return (
                                                <tr key={c.id} className="ncc-tr">
                                                    <td className="ncc-td text-gray-400">{String(index + 1).padStart(2, '0')}</td>
                                                    <td className="ncc-td font-bold text-ncc-navy">{c.name}</td>
                                                    <td className="ncc-td font-mono text-xs text-gray-500">{c.enrollmentId}</td>
                                                    <td className="ncc-td text-right font-bold text-gray-900">{formatCurrency(total)}</td>
                                                    <td className="ncc-td text-right text-emerald-600 font-bold">{formatCurrency(c.feePaid || 0)}</td>
                                                    <td className={`ncc-td text-right font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(due)}</td>
                                                    <td className="ncc-td text-center"><button onClick={() => setEditingFeeCadet(c)} className="p-1.5 text-ncc-navy hover:bg-ncc-navy/10 rounded-lg transition"><Edit className="w-3.5 h-3.5" /></button></td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handlePdfDownload} disabled={isDownloadingPdf} className="ncc-btn ncc-btn-danger flex-1 justify-center">
                                    {isDownloadingPdf ? <Loader className="animate-spin w-3 h-3" /> : <FileText className="w-3 h-3" />} PDF
                                </button>
                                <button onClick={handleExcelDownload} disabled={isDownloadingExcel} className="ncc-btn ncc-btn-success flex-1 justify-center">
                                    {isDownloadingExcel ? <Loader className="animate-spin w-3 h-3" /> : <Download className="w-3 h-3" />} Excel
                                </button>
                            </div>
                        </div>
                    ) : renderCadetView()}
                </div>
            </div>

            {editingFeeCadet && <FeeEditModal cadet={editingFeeCadet} onClose={() => setEditingFeeCadet(null)} />}
            {isBulkModalOpen && <FeeBulkUpdateModal onClose={() => setIsBulkModalOpen(false)} />}
        </>
    );
};
