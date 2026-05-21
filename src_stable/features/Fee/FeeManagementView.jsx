// src/features/Fee/FeeManagementView.jsx
import React, { useState, useMemo, useRef } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { Briefcase, Edit, Plus, Search, Loader, X, CheckCircle, AlertCircle, Download, FileText, CreditCard, TrendingUp, ShieldCheck, ImageIcon, Upload, History } from '../../components/Icons.jsx';
import { FeeEditModal } from './FeeEditModal.jsx';
import { FeeBulkUpdateModal } from './FeeBulkUpdateModal.jsx';
import { PaymentSettingsModal } from './PaymentSettingsModal.jsx';
import { requestPaymentVerification, approveTransaction, rejectTransaction, deleteTransaction, addNotification } from '../../firebase/firestoreService.js';
import { formatCurrency, calculateDue } from '../../utils/feeUtils.js';
import { toast } from 'react-toastify';
import { sendPushToUser } from '../../firebase/pushNotifications.js';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { generatePaymentReceipt } from '../../utils/receiptGenerator.js';
import CountUp from 'react-countup';
import Tilt from 'react-parallax-tilt';
import { motion } from 'framer-motion';
import Skeleton, { SkeletonTheme } from 'react-loading-skeleton';
import 'react-loading-skeleton/dist/skeleton.css';

const DEFAULT_ENROLLMENT_FEE = 1000;
const DEFAULT_UNIFORM_FEE = 1500;
const DEFAULT_CAMP_FEE = 0;

export const FeeManagementView = () => {
    const { user, userRole, userEnrollmentId } = useAuthContext();
    const { cadets, paymentSettings, transactions, loading: dataLoading } = useDataContext();
    const [searchTerm, setSearchTerm] = useState('');
    const [editingFeeCadet, setEditingFeeCadet] = useState(null);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [showScanner, setShowScanner] = useState(false);
    const [paymentStatus, setPaymentStatus] = useState('idle');
    const [receiptFile, setReceiptFile] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [activeFeeTab, setActiveFeeTab] = useState('registry'); // 'registry' or 'pending'
    const tableRef = useRef(null);
    const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
    const [customAmount, setCustomAmount] = useState('');

    const calculateGrandTotal = (c) => Number(c.enrollmentFee || DEFAULT_ENROLLMENT_FEE) + Number(c.uniformFee || DEFAULT_UNIFORM_FEE) + Number(c.campFee || DEFAULT_CAMP_FEE);

    const relevantCadets = useMemo(() => {
        // Filter out corrupted records without name or ID
        let list = cadets.filter(c => c.name && c.enrollmentId);
        
        if (userRole === 'cadet' && userEnrollmentId) {
            list = list.filter((c) => c.enrollmentId === userEnrollmentId);
        }
        if (userRole === 'admin') {
            if (selectedCertificate !== 'All') list = list.filter((c) => c.certificate === selectedCertificate);
            if (selectedCategory !== 'All') list = list.filter((c) => (c.enrollmentId || '').toUpperCase().includes(selectedCategory));
            if (searchTerm) { 
                const q = searchTerm.toLowerCase(); 
                list = list.filter((c) => 
                    (c.enrollmentId || '').toLowerCase().includes(q) || 
                    (c.name || '').toLowerCase().includes(q)
                ); 
            }
        }
        return list;
    }, [cadets, userRole, userEnrollmentId, searchTerm, selectedCertificate, selectedCategory]);

    const activeCadet = relevantCadets[0];
    const activeGrandTotal = activeCadet ? calculateGrandTotal(activeCadet) : 0;
    const dueAmount = activeCadet ? calculateDue(activeGrandTotal, activeCadet.feePaid || 0) : 0;

    const handleConfirmPayment = async (cadetObj, amount) => {
        if (!receiptFile) {
            toast.warning('Please upload a payment screenshot first.');
            return;
        }

        const regimentalNo = cadetObj.enrollmentId || cadetObj.regimentalNo;
        if (!regimentalNo) {
            toast.error('Regimental Number missing from your profile. Please contact Admin.');
            return;
        }

        // Size check for Firestore (1MB limit for entire doc, so keep image < 800KB)
        if (receiptFile.size > 800 * 1024) {
            toast.error('Screenshot is too large. Please use a smaller file or compress it.');
            return;
        }

        setPaymentStatus('verifying');
        try {
            const reader = new FileReader();
            reader.readAsDataURL(receiptFile);
            reader.onloadend = async () => {
                const base64 = reader.result;
                await requestPaymentVerification(
                    cadetObj.id, 
                    amount, 
                    cadetObj.name, 
                    regimentalNo, 
                    base64,
                    cadetObj.institutionId
                );
                setPaymentStatus('success');
                toast.success('Payment evidence submitted! Admin will verify soon.');
            };
        } catch (err) {
            setPaymentStatus('idle');
            toast.error('Failed to submit evidence.');
        }
    };

    const handleApprove = async (tx) => {
        setIsVerifying(true);
        try {
            // Robust lookup: ensure we have the actual Firestore document ID
            const cadetInRoster = cadets.find(c => c.enrollmentId === tx.enrollmentId);
            const actualCadetId = cadetInRoster?.id || tx.cadetId;
            
            console.log('Payment Approval Context:', {
                transactionId: tx.id,
                txCadetId: tx.cadetId,
                foundInRoster: !!cadetInRoster,
                actualCadetId: actualCadetId,
                enrollmentId: tx.enrollmentId
            });

            if (!actualCadetId) {
                toast.error(`Verification Failed: Cadet ${tx.enrollmentId} not found in roster.`);
                return;
            }

            await approveTransaction(tx.id, tx.amount, actualCadetId, user?.uid);
            
            // Automatic Notification
            await addNotification(
                actualCadetId,
                'Payment Approved',
                `Congratulations! Your payment of ${formatCurrency(tx.amount)} has been verified and credited.`,
                'success',
                tx.institutionId
            );

            toast.success('Payment approved and credited!');
            sendPushToUser(
                tx.enrollmentId,
                '💳 Payment Approved!',
                `Your payment of ${formatCurrency(tx.amount)} has been verified and credited to your account.`
            );
        } catch (err) {
            console.error('Approval error:', err);
            toast.error(`Approval failed: ${err.message || 'Unknown error'}`);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleReject = async (tx) => {
        const reason = prompt('Reason for rejection:');
        if (!reason) return;
        setIsVerifying(true);
        try {
            await rejectTransaction(tx.id, reason);

            // Automatic Notification
            await addNotification(
                tx.cadetId,
                'Payment Rejected',
                `Your payment of ${formatCurrency(tx.amount)} was rejected. Reason: ${reason}`,
                'error',
                tx.institutionId
            );

            toast.success('Payment rejected.');
            sendPushToUser(
                tx.enrollmentId,
                '❌ Payment Rejected',
                `Your payment of ${formatCurrency(tx.amount)} was rejected. Reason: ${reason}`
            );
        } catch (err) {
            toast.error('Failed to reject payment.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleDeleteTransaction = async (txId) => {
        if (!window.confirm('Delete this transaction record?')) return;
        try {
            await deleteTransaction(txId);
            toast.success('Transaction record deleted.');
        } catch (err) {
            toast.error('Failed to delete.');
        }
    };

    const handlePdfDownload = async () => {
        if (!tableRef.current) return;
        setIsDownloadingPdf(true);
        try {
            const canvas = await html2canvas(tableRef.current, { scale: 2, useCORS: true });
            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            pdf.setFontSize(14); pdf.text('14(A) BN NCC Srikakulam - Fee Report', 10, 15);
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
        if (!cadet) return <div className="p-8 text-center text-gray-400 dark:text-white/80 italic text-sm">Fee record missing. Contact Admin.</div>;
        const grandTotal = calculateGrandTotal(cadet);
        const paidAmount = Number(cadet.feePaid || 0);
        const currentDue = calculateDue(grandTotal, paidAmount);
        return (
            <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                    {[{ title: 'Enrollment', amount: cadet.enrollmentFee || DEFAULT_ENROLLMENT_FEE, icon: FileText }, { title: 'Track & Suit', amount: cadet.uniformFee || DEFAULT_UNIFORM_FEE, icon: Briefcase }, { title: 'Camp', amount: cadet.campFee || DEFAULT_CAMP_FEE, icon: TrendingUp }].map((item) => (
                        <Tilt key={item.title} perspective={1000} scale={1.05} transitionSpeed={1000}>
                            <div className="p-3 ncc-card text-center h-full">
                                <item.icon className="w-4 h-4 text-ncc-gold mx-auto mb-1" />
                                <p className="text-xs font-bold text-gray-400 dark:text-white/80 uppercase leading-tight mb-1">{item.title}</p>
                                <p className="text-sm font-bold text-ncc-navy dark:text-white">
                                    ₹<CountUp end={item.amount} duration={2} />
                                </p>
                            </div>
                        </Tilt>
                    ))}
                </div>
                <div className="bg-ncc-navy rounded-2xl p-4 text-white">
                    <p className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Financial Summary</p>
                    <div className="grid grid-cols-3 gap-2 text-center mb-4">
                        <div>
                            <p className="text-base sm:text-xl font-bold">₹<CountUp end={grandTotal} duration={2} /></p>
                            <p className="text-xs text-white/50 font-medium">Total</p>
                        </div>
                        <div>
                            <p className="text-base sm:text-xl font-bold text-emerald-400">₹<CountUp end={paidAmount} duration={2} /></p>
                            <p className="text-xs text-white/50 font-medium">Paid</p>
                        </div>
                        <div>
                            <p className={`text-base sm:text-xl font-bold ${currentDue > 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                ₹<CountUp end={currentDue} duration={2} />
                            </p>
                            <p className="text-xs text-white/50 font-medium">Due</p>
                        </div>
                    </div>
                    {paidAmount > 0 ? (
                        <div className="flex flex-col gap-2">
                            {currentDue > 0 ? (
                                <button onClick={() => { setCustomAmount(''); setPaymentStatus('idle'); setShowScanner(true); }} className="w-full py-3 bg-ncc-gold text-ncc-navy dark:text-white font-bold rounded-xl uppercase tracking-widest shadow-lg hover:brightness-110 transition active:scale-95 flex items-center justify-center text-sm">
                                    <CreditCard className="w-4 h-4 mr-2" /> Pay {formatCurrency(currentDue)}
                                </button>
                            ) : (
                                <div className="w-full py-3 bg-emerald-800/30 text-emerald-300 rounded-xl flex items-center justify-center font-bold uppercase tracking-widest text-xs">
                                    <ShieldCheck className="w-4 h-4 mr-2" /> Dues Cleared
                                </div>
                            )}
                            <button 
                                onClick={() => generatePaymentReceipt({
                                    id: `TOTAL-${cadet.enrollmentId}`,
                                    cadetName: cadet.name,
                                    enrollmentId: cadet.enrollmentId,
                                    amount: paidAmount,
                                    status: 'approved',
                                    approvedAt: { toDate: () => new Date() }
                                })}
                                className="w-full py-2.5 bg-white/10 text-white hover:bg-white/20 rounded-xl flex items-center justify-center font-bold uppercase tracking-widest text-[10px] transition border border-white/10"
                            >
                                <Download className="w-3.5 h-3.5 mr-2" /> Download Full Receipt
                            </button>
                        </div>
                    ) : (
                        <button onClick={() => { setCustomAmount(''); setPaymentStatus('idle'); setShowScanner(true); }} className="w-full py-3 bg-ncc-gold text-ncc-navy dark:text-white font-bold rounded-xl uppercase tracking-widest shadow-lg hover:brightness-110 transition active:scale-95 flex items-center justify-center text-sm">
                            <CreditCard className="w-4 h-4 mr-2" /> Pay {formatCurrency(currentDue)}
                        </button>
                    )}
                </div>

                {/* Payment History */}
                <div className="mt-8">
                    <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Payment History</p>
                    <div className="space-y-3">
                        {transactions?.filter(t => t.cadetId === cadet.id).length === 0 ? (
                            <div className="p-8 text-center bg-gray-50 dark:bg-white/5 rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                                <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                <p className="text-xs italic text-gray-400">No payment history found</p>
                            </div>
                        ) : (
                            transactions
                                .filter(t => t.cadetId === cadet.id)
                                .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                                .map(tx => (
                                    <div key={tx.id} className="bg-white dark:bg-white/5 p-4 rounded-xl border border-[#ddd8cc] dark:border-white/10 flex items-center justify-between gap-4 group hover:border-ncc-gold transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${
                                                tx.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 
                                                tx.status === 'rejected' ? 'bg-red-50 text-red-600' : 
                                                'bg-amber-50 text-amber-600'
                                            }`}>
                                                <CreditCard className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-black text-ncc-navy dark:text-white uppercase leading-none">₹{tx.amount.toLocaleString()}</p>
                                                    {tx.status === 'approved' && (
                                                        <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[8px] font-black uppercase">
                                                            <ShieldCheck className="w-2 h-2" /> Verified
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {tx.status === 'approved' ? 'Transaction Success' : tx.status === 'rejected' ? 'Verification Failed' : 'Pending Verification'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {tx.status === 'approved' && (
                                                <button 
                                                    onClick={() => generatePaymentReceipt(tx)}
                                                    className="flex items-center gap-2 px-3 py-1.5 bg-ncc-gold text-ncc-navy dark:text-white hover:brightness-110 rounded-lg transition font-black uppercase text-[10px] shadow-sm"
                                                    title="Download Receipt"
                                                >
                                                    <Download className="w-3.5 h-3.5" /> Receipt
                                                </button>
                                            )}
                                            {tx.status === 'rejected' && tx.rejectionReason && (
                                                <button 
                                                    onClick={() => toast.info(`Reason: ${tx.rejectionReason}`)}
                                                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg transition"
                                                    title="View Reason"
                                                >
                                                    <AlertCircle className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <>
            {isScannerModalOpen && <PaymentSettingsModal currentUrl={paymentSettings?.paymentQRUrl} onClose={() => setIsScannerModalOpen(false)} />}
            {showScanner && (
                <ModalOverlay onClose={() => setShowScanner(false)}>
                    <div className="bg-white dark:bg-[#050b14] rounded-2xl p-5 max-w-sm w-full text-center shadow-2xl border border-[#ddd8cc] relative">
                        {paymentStatus === 'idle' && (<>
                            <div className="flex justify-between items-center mb-5">
                                <div className="text-left"><h3 className="text-lg font-bold uppercase tracking-tight text-ncc-navy dark:text-white">Secure Payment</h3><p className="text-xs font-semibold text-ncc-gold uppercase tracking-widest">PhonePe Merchant</p></div>
                                <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-gray-100 dark:bg-[#0d2137] rounded-full"><X className="w-5 h-5 text-gray-400 dark:text-white/80" /></button>
                            </div>

                            <div className="mb-6">
                                <label className="block text-left text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Amount to Pay (₹)</label>
                                <div className="relative">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₹</div>
                                    <input 
                                        type="number"
                                        placeholder={dueAmount.toString()}
                                        value={customAmount}
                                        onChange={(e) => setCustomAmount(e.target.value)}
                                        className="w-full pl-10 pr-4 py-4 bg-gray-50 dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-ncc-gold outline-none font-bold text-gray-700 dark:text-white transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-left mt-2 px-1 text-gray-400 font-bold uppercase">Remaining Balance: {formatCurrency(dueAmount - (Number(customAmount) || 0))}</p>
                            </div>
                            <div className="p-4 bg-[#f5f0e8] dark:bg-[#0a1628] rounded-2xl border-2 border-dashed border-[#ddd8cc] mb-4">
                                {paymentSettings?.paymentQRUrl ? <img src={paymentSettings.paymentQRUrl} alt="QR" className="w-full h-auto rounded-xl shadow-lg" /> : <div className="py-12 flex flex-col items-center text-gray-400 dark:text-white/80"><AlertCircle className="w-10 h-10 mb-2 opacity-20" /><p className="text-xs italic uppercase font-bold tracking-widest">Scanner Unset</p></div>}
                            </div>
                            <div className="bg-ncc-cream dark:bg-white/5 p-3 rounded-xl mb-4 text-left border border-transparent dark:border-white/10">
                                <p className="text-xs text-ncc-navy dark:text-ncc-gold font-bold leading-relaxed">
                                    Step 1: Scan with any UPI App<br />
                                    Step 2: Pay the amount entered above<br />
                                    Step 3: Upload Screenshot below
                                </p>
                            </div>
                            
                            <div className="mb-4">
                                <label className="block w-full border-2 border-dashed border-[#ddd8cc] rounded-xl p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-white/5 transition group">
                                    {receiptFile ? (
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                                                <ImageIcon className="w-5 h-5 text-emerald-600" />
                                            </div>
                                            <div className="text-left overflow-hidden">
                                                <p className="text-xs font-bold truncate text-ncc-navy dark:text-white">{receiptFile.name}</p>
                                                <p className="text-[10px] text-emerald-600 font-bold uppercase">Ready to submit</p>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <Upload className="w-6 h-6 text-gray-300 mb-2 group-hover:text-ncc-gold transition" />
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Upload Success Screenshot</p>
                                        </div>
                                    )}
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*" 
                                        onChange={(e) => setReceiptFile(e.target.files[0])} 
                                    />
                                </label>
                            </div>

                            <button 
                                onClick={() => handleConfirmPayment(activeCadet, Number(customAmount) || dueAmount)} 
                                className="ncc-btn ncc-btn-primary w-full justify-center py-3 text-sm disabled:opacity-50"
                                disabled={!receiptFile || (Number(customAmount) || 0) <= 0 && dueAmount > 0}
                            >
                                Submit Proof of Payment
                            </button>
                        </>)}
                        {paymentStatus === 'verifying' && <div className="py-16 flex flex-col items-center"><Loader className="animate-spin h-12 w-12 text-ncc-navy dark:text-white mb-4" /><p className="font-bold text-ncc-navy dark:text-white uppercase tracking-widest animate-pulse text-sm">Sending Message...</p></div>}
                        {paymentStatus === 'success' && (<div className="py-10">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-green-600" /></div>
                            <h3 className="text-xl font-bold text-ncc-navy dark:text-white uppercase tracking-tight">Message Sent!</h3>
                            <p className="text-xs text-gray-500 dark:text-white/70 mt-2 px-4 leading-relaxed">Admin has been notified and will verify shortly.</p>
                            <button onClick={() => setShowScanner(false)} className="mt-6 w-full py-3 ncc-btn ncc-btn-ghost justify-center">Close</button>
                        </div>)}
                    </div>
                </ModalOverlay>
            )}

            <div className="ncc-card overflow-hidden">
                <div className="p-4 border-b border-[#ddd8cc] bg-gray-50/30 dark:bg-transparent">
                    {/* Top Row: Title + Action Buttons */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-ncc-navy dark:bg-[#1b3a6b] rounded-lg shadow-inner">
                                <Briefcase className="w-5 h-5 text-ncc-gold" />
                            </div>
                            <div>
                                <h2 className="text-lg font-black text-ncc-navy dark:text-white uppercase tracking-tight leading-none">Financial Registry</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">GMRIT NCC Unit Management</p>
                            </div>
                        </div>
                        {userRole === 'admin' && (
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsScannerModalOpen(true)} className="ncc-btn ncc-btn-ghost ncc-btn-sm h-8 px-3 text-[10px] bg-white dark:bg-[#0a1628]">
                                    <ImageIcon className="w-3 h-3" /> Scanner Settings
                                </button>
                                <button onClick={() => setIsBulkModalOpen(true)} className="ncc-btn ncc-btn-primary ncc-btn-sm h-8 px-3 text-[10px]">
                                    <Plus className="w-3 h-3" /> Bulk Fee Update
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Bottom Row: Unified Nav & Filters */}
                    {userRole === 'admin' && (
                        <div className="flex flex-col xl:flex-row gap-4 items-stretch xl:items-center justify-between p-3 bg-white dark:bg-white/5 rounded-xl border border-[#ddd8cc] dark:border-white/10 shadow-sm">
                            {/* Status Tabs */}
                            <div className="flex bg-gray-100 dark:bg-[#0a1628] p-1 rounded-lg">
                                {[
                                    { id: 'registry', label: 'Registry' },
                                    { id: 'pending', label: 'Pending', count: transactions?.filter(t => t.status === 'pending').length },
                                    { id: 'approved', label: 'Approved' },
                                    { id: 'rejected', label: 'Rejected' }
                                ].map(tab => (
                                    <button 
                                        key={tab.id}
                                        onClick={() => setActiveFeeTab(tab.id)}
                                        className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded-md transition flex items-center gap-2 ${activeFeeTab === tab.id ? 'bg-white dark:bg-[#1b3a6b] text-ncc-gold shadow-md' : 'text-gray-400 hover:text-ncc-navy dark:hover:text-white'}`}
                                    >
                                        {tab.label}
                                        {tab.count > 0 && (
                                            <span className="min-w-[16px] h-4 px-1 bg-ncc-red text-white flex items-center justify-center rounded-full text-[8px] font-black">
                                                {tab.count}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Filters (Visible only in Registry) */}
                            {activeFeeTab === 'registry' && (
                                <div className="flex flex-wrap items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Division</span>
                                        <div className="flex p-0.5 bg-gray-100 dark:bg-[#0a1628] rounded-md border border-transparent dark:border-white/5">
                                            {['All','SD','SW'].map((o) => (
                                                <button key={o} onClick={() => setSelectedCategory(o)} className={`px-3 py-1 text-[9px] font-bold rounded-sm transition ${selectedCategory === o ? 'bg-white dark:bg-[#1b3a6b] text-ncc-navy dark:text-white shadow-sm' : 'text-gray-400'}`}>{o}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Certificate</span>
                                        <div className="flex p-0.5 bg-gray-100 dark:bg-[#0a1628] rounded-md border border-transparent dark:border-white/5">
                                            {['All','B1','B2','C'].map((o) => (
                                                <button key={o} onClick={() => setSelectedCertificate(o)} className={`px-3 py-1 text-[9px] font-bold rounded-sm transition ${selectedCertificate === o ? 'bg-white dark:bg-[#1b3a6b] text-ncc-navy dark:text-white shadow-sm' : 'text-gray-400'}`}>{o}</button>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-5">
                    {userRole === 'admin' && (
                        <div className="mb-4 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/80" />
                            <input type="text" placeholder="Search cadet name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="ncc-input pl-9 text-xs" />
                        </div>
                    )}

                    {dataLoading ? (
                        <div className="space-y-4">
                            <SkeletonTheme baseColor="var(--bg-card)" highlightColor="var(--bg-hover)">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="p-4 ncc-card border border-[#ddd8cc] dark:border-white/10">
                                            <Skeleton height={20} width="60%" className="mb-2" />
                                            <Skeleton height={40} className="mb-4" />
                                            <div className="flex gap-2">
                                                <Skeleton height={32} className="flex-1" />
                                                <Skeleton height={32} className="flex-1" />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </SkeletonTheme>
                        </div>
                    ) : relevantCadets.length === 0 ? (
                        <div className="py-16 text-center border-2 border-dashed border-[#ddd8cc] rounded-2xl">
                            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                            <p className="text-gray-400 dark:text-white/80 font-semibold uppercase text-xs">No records found</p>
                        </div>
                    ) : userRole === 'admin' ? (
                        activeFeeTab === 'registry' ? (
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
                                                        <td className="ncc-td text-gray-400 dark:text-white/80">{String(index + 1).padStart(2, '0')}</td>
                                                        <td className="ncc-td font-bold text-ncc-navy dark:text-white">{c.name}</td>
                                                        <td className="ncc-td font-mono text-xs text-gray-500 dark:text-white/70">{c.enrollmentId}</td>
                                                        <td className="ncc-td text-right font-bold text-gray-900 dark:text-white">{formatCurrency(total)}</td>
                                                        <td className="ncc-td text-right text-emerald-600 font-bold">{formatCurrency(c.feePaid || 0)}</td>
                                                        <td className={`ncc-td text-right font-bold ${due > 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCurrency(due)}</td>
                                                        <td className="ncc-td text-center"><button onClick={() => setEditingFeeCadet(c)} className="p-1.5 text-ncc-navy dark:text-white hover:bg-ncc-navy/10 rounded-lg transition"><Edit className="w-3.5 h-3.5" /></button></td>
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
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {transactions?.filter(t => t.status === activeFeeTab).length === 0 ? (
                                    <div className="col-span-full py-12 text-center opacity-50 italic">No {activeFeeTab} verifications</div>
                                ) : (
                                    transactions.filter(t => t.status === activeFeeTab).map(tx => {
                                        // SMART LOOKUP: Find the cadet's regimental number if missing from the transaction record
                                        const cadetRecord = cadets.find(c => c.id === tx.cadetId || c.enrollmentId === tx.enrollmentId);
                                        const displayId = tx.enrollmentId?.length > 20 ? (cadetRecord?.enrollmentId || 'ID PENDING') : (tx.enrollmentId || cadetRecord?.enrollmentId || 'ID PENDING');
                                        
                                        return (
                                            <div key={tx.id} className="p-4 ncc-card border-2 border-ncc-gold/20 flex flex-col gap-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="text-[10px] font-bold text-ncc-gold uppercase tracking-widest leading-none mb-1">
                                                            {displayId}
                                                        </p>
                                                        <h4 className="font-black text-ncc-navy dark:text-white uppercase leading-tight">{tx.cadetName}</h4>
                                                        <p className="text-xl font-black text-emerald-600 mt-1">{formatCurrency(tx.amount)}</p>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        <div className="text-[10px] text-gray-400 font-mono">
                                                            {tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleDateString() : 'Today'}
                                                        </div>
                                                        <button onClick={() => handleDeleteTransaction(tx.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition">
                                                            <X className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                {tx.receiptImage ? (
                                                    <div className="relative group rounded-xl overflow-hidden bg-gray-100 dark:bg-white/5 border border-[#ddd8cc]">
                                                        <img src={tx.receiptImage} alt="Receipt" className="w-full h-40 object-contain cursor-zoom-in" onClick={() => window.open(tx.receiptImage)} />
                                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center pointer-events-none">
                                                            <Search className="text-white w-6 h-6" />
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="h-40 bg-gray-50 dark:bg-white/5 rounded-xl flex items-center justify-center italic text-gray-400 text-xs">No image provided</div>
                                                )}

                                                {activeFeeTab === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => handleApprove(tx)}
                                                            disabled={isVerifying}
                                                            className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-lg uppercase tracking-tighter text-[10px] hover:bg-emerald-700 transition"
                                                        >
                                                            Approve & Credit
                                                        </button>
                                                        <button 
                                                            onClick={() => handleReject(tx)}
                                                            disabled={isVerifying}
                                                            className="flex-1 py-2.5 bg-red-600 text-white font-bold rounded-lg uppercase tracking-tighter text-[10px] hover:bg-red-700 transition"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}

                                                {activeFeeTab === 'rejected' && tx.rejectionReason && (
                                                    <div className="p-2 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20">
                                                        <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Reason:</p>
                                                        <p className="text-[10px] italic text-gray-600 dark:text-gray-400">{tx.rejectionReason}</p>
                                                    </div>
                                                )}

                                                {activeFeeTab === 'approved' && (
                                                    <div className="flex flex-col gap-2">
                                                        <div className="py-2 flex items-center justify-center gap-2 text-emerald-600 font-bold uppercase text-[10px]">
                                                            <CheckCircle className="w-4 h-4" /> Verified & Credited
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        )
                    ) : renderCadetView()}
                </div>
            </div>

            {editingFeeCadet && <FeeEditModal cadet={editingFeeCadet} onClose={() => setEditingFeeCadet(null)} />}
            {isBulkModalOpen && <FeeBulkUpdateModal onClose={() => setIsBulkModalOpen(false)} />}
        </>
    );
};
