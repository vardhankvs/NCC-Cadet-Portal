// src/features/Attendance/AttendanceSummary.jsx
import React, { useState, useMemo, useRef } from 'react';
import { 
    BarChart as BarChartIcon, 
    Loader, 
    Award, 
    FileText, 
    Download, 
    Search, 
    Users,
    CheckCircle,
    AlertCircle
} from '../../components/Icons.jsx';
import { CadetAttendanceModal } from './CadetAttendanceModal.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import html2canvas from 'html2canvas';
import { formatDate } from '../../utils/dateUtils.js';

// Import Recharts components
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    Cell,
} from 'recharts';

export const AttendanceSummary = ({ summaryData }) => {
    const {
        totalPeriodsHeld,
        periodsHeld,
        averages,
        individualSummaries,
        overallAverage,
        cadetNotFound,
    } = summaryData;

    const tableRef = useRef(null);
    const [viewingCadet, setViewingCadet] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedDivision, setSelectedDivision] = useState('All');
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const chartData = useMemo(() => {
        const certGroups = {
            B1: { total: 0, present: 0, count: 0 },
            B2: { total: 0, present: 0, count: 0 },
            C: { total: 0, present: 0, count: 0 },
            NA: { total: 0, present: 0, count: 0 },
        };

        individualSummaries.forEach((cadet) => {
            const cert = cadet.certificate || 'NA';
            if (certGroups[cert]) {
                certGroups[cert].present += cadet.presentCount;
                certGroups[cert].count += 1;
            }
        });

        return Object.keys(certGroups)
            .map((certName) => {
                const group = certGroups[certName];
                const certPeriods = periodsHeld?.[certName] || totalPeriodsHeld;
                const maxPossible = group.count * certPeriods;
                const percentage =
                    maxPossible > 0 ? (group.present / maxPossible) * 100 : 0;
                return {
                    name: `${certName}`,
                    Percentage: parseFloat(percentage.toFixed(2)),
                    cadets: group.count,
                };
            })
            .filter((group) => group.cadets > 0);
    }, [individualSummaries, totalPeriodsHeld]);

    const filteredSummaries = useMemo(() => {
        let list = [...individualSummaries];
        if (selectedCertificate !== 'All') {
            list = list.filter((cadet) => cadet.certificate === selectedCertificate);
        }
        if (selectedDivision !== 'All') {
            list = list.filter((cadet) => {
                const reg = (cadet.enrollmentId || cadet.regimentalNumber || '').toUpperCase();
                return reg.includes(selectedDivision);
            });
        }
        if (searchTerm) {
            const q = searchTerm.toLowerCase();
            list = list.filter(c => 
                c.name?.toLowerCase().includes(q) || 
                c.enrollmentId?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [individualSummaries, selectedCertificate, selectedDivision, searchTerm]);

    const handlePdfDownload = (idType = 'regimental') => {
        setIsDownloading(true);
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();

        if (idType === 'jntu') {
            // GMRIT Specific Header
            pdf.setFontSize(16);
            pdf.setTextColor(40, 70, 150); // Blue-ish
            pdf.setFont('helvetica', 'bold');
            pdf.text('GMR INSTITUTE OF TECHNOLOGY', pdfWidth / 2, 15, { align: 'center' });
            
            pdf.setFontSize(10);
            pdf.setTextColor(0, 0, 0);
            pdf.setFont('helvetica', 'normal');
            pdf.text('(An Autonomous Institution, Accredited by NBA of AICTE, NAAC of UGC & an ISO 9001:2008 Institution)', pdfWidth / 2, 21, { align: 'center' });
            
            pdf.setLineWidth(0.5);
            pdf.line(10, 25, pdfWidth - 10, 25);

            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text('ATTENDANCE SUMMARY', pdfWidth / 2, 35, { align: 'center' });
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            // Date on Right, Overall Avg on Left
            pdf.text(`Overall Average: ${overallAverage}%`, 10, 45);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Date: ${formatDate(new Date())}`, pdfWidth - 10, 45, { align: 'right' });
        } else {
            // Standard NCC Header (Centered)
            pdf.setFontSize(14);
            pdf.setTextColor(10, 22, 40);
            pdf.setFont('helvetica', 'bold');
            pdf.text('14(A) BN NCC Srikakulam', pdfWidth / 2, 15, { align: 'center' });
            
            pdf.setFontSize(12);
            pdf.text('Attendance Summary', pdfWidth / 2, 22, { align: 'center' });
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            // Consistent layout: Overall Avg on Left, Date on Right
            pdf.text(`Overall Average: ${overallAverage}%`, 10, 32);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Date: ${formatDate(new Date())}`, pdfWidth - 10, 32, { align: 'right' });
        }

        const tableColumn = idType === 'jntu' 
            ? ['S.No', 'Cadet Name', 'JNTU NO', 'Present', 'Total', 'Attend %']
            : ['S.No', 'Cadet Name', 'Regimental No', 'Present', 'Total', 'Attend %'];

        const tableRows = filteredSummaries.map((cadet, index) => [
            index + 1,
            cadet.name?.toUpperCase() || '-',
            idType === 'jntu' ? (cadet.jntuNo || '-') : (cadet.enrollmentId || cadet.regimentalNumber || '-'),
            cadet.presentCount,
            cadet.totalPeriods || totalPeriodsHeld,
            `${cadet.percentage}%`
        ]);

        autoTable(pdf, {
            head: [tableColumn],
            body: tableRows,
            startY: idType === 'jntu' ? 55 : 42,
            theme: 'grid',
            styles: { 
                fontSize: 8, 
                cellPadding: 2,
                valign: 'middle' 
            },
            headStyles: { 
                fillColor: [255, 255, 255], 
                textColor: [10, 22, 40], 
                fontStyle: 'bold',
                lineWidth: 0.1,
                lineColor: [200, 200, 200],
                halign: 'center' // Default headers to center
            },
            columnStyles: {
                0: { halign: 'center' }, // S.No
                1: { halign: 'left' },   // Name
                2: { halign: 'center' }, // ID
                3: { halign: 'center' }, // Present
                4: { halign: 'center' }, // Total
                5: { halign: 'center' }  // %
            },
            alternateRowStyles: { fillColor: [250, 250, 250] }
        });

        pdf.save(`NCC_Attendance_${idType.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`);
        setIsDownloading(false);
    };

    const handleExcelDownload = () => {
        setIsDownloadingExcel(true);
        try {
            let csv = 'S.No.,Name,Enrollment ID,Present,Total,Percentage\n';
            filteredSummaries.forEach((cadet, index) => {
                csv += `${index + 1},"${cadet.name}",${cadet.enrollmentId},${cadet.presentCount},${cadet.totalPeriods || totalPeriodsHeld},${cadet.percentage}%\n`;
            });
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.setAttribute('download', `NCC_Attendance_Summary_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) { console.error(e); }
        finally { setIsDownloadingExcel(false); }
    };

    if (cadetNotFound) return <div className="ncc-error-card">Cadet record not found. Please contact admin.</div>;

    const COLORS = ['#10b981', '#c5a059', '#3b82f6', '#f43f5e'];

    return (
        <>
            {viewingCadet && (
                <CadetAttendanceModal
                    cadet={viewingCadet}
                    onClose={() => setViewingCadet(null)}
                    totalPeriods={viewingCadet.totalPeriods || totalPeriodsHeld}
                />
            )}

            <div className="space-y-6">
                {/* ── Stats Row ── */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="ncc-card p-5 sm:p-6 flex flex-col justify-between border-t-4 border-ncc-navy">
                        <div>
                            <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-1">Overall Avg.</p>
                            <h3 className="text-3xl font-black text-ncc-navy dark:text-white">{averages ? averages.All : overallAverage}%</h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                            <div className="text-[11px] text-gray-500 dark:text-white/60">
                                <span className="font-bold text-gray-800 dark:text-white/90">{periodsHeld ? periodsHeld.All : totalPeriodsHeld}</span> Periods
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-white/60">
                                <span className="font-bold text-gray-800 dark:text-white/90">{individualSummaries.length}</span> Cadets
                            </div>
                        </div>
                    </div>
                    {['B1', 'B2', 'C'].map(cert => {
                        const count = individualSummaries.filter(c => c.certificate === cert || c.currentCertificate === cert).length;
                        return (
                            <div key={cert} className={`ncc-card p-5 sm:p-6 flex flex-col justify-between border-t-4 ${cert === 'C' ? 'border-ncc-gold' : 'border-gray-400'}`}>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-1">{cert} Avg.</p>
                                    <h3 className="text-3xl font-black text-ncc-navy dark:text-white">{averages ? averages[cert] : 0}%</h3>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                    <div className="text-[11px] text-gray-500 dark:text-white/60">
                                        <span className="font-bold text-gray-800 dark:text-white/90">{periodsHeld ? periodsHeld[cert] : 0}</span> Periods
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-white/60">
                                        <span className="font-bold text-gray-800 dark:text-white/90">{count}</span> Cadets
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Analytics & Filters ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 ncc-card p-6">
                        <h3 className="ncc-section-title mb-6">
                            <BarChartIcon className="w-5 h-5 text-ncc-gold" />
                            Certificate-wise Attendance
                        </h3>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-white/5" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'currentColor' }} className="text-gray-400 dark:text-white/60" />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'currentColor' }} className="text-gray-400 dark:text-white/60" />
                                    <Tooltip 
                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', backgroundColor: 'var(--bg-card)', color: 'var(--text-main)' }}
                                        cursor={{ fill: 'currentColor', className: 'text-gray-50 dark:text-white/5' }}
                                    />
                                    <Bar dataKey="Percentage" radius={[4, 4, 0, 0]} barSize={40}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="ncc-card p-6 flex flex-col justify-center bg-ncc-navy text-white relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-2">Export Intelligence</h4>
                            <p className="text-sm text-white/70 mb-6">Generate and download official attendance reports for unit documentation.</p>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => handlePdfDownload('regimental')} disabled={isDownloading} className="ncc-btn bg-white/10 hover:bg-white/20 text-white border-white/10 w-full justify-center py-2.5 text-[10px]">
                                    {isDownloading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-ncc-gold" />}
                                    Export Regimental PDF
                                </button>
                                <button onClick={() => handlePdfDownload('jntu')} disabled={isDownloading} className="ncc-btn bg-white/10 hover:bg-white/20 text-white border-white/10 w-full justify-center py-2.5 text-[10px]">
                                    {isDownloading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-ncc-gold" />}
                                    Export JNTU NO PDF
                                </button>
                                <button onClick={handleExcelDownload} disabled={isDownloadingExcel} className="ncc-btn bg-ncc-gold hover:bg-ncc-gold/90 text-ncc-navy dark:text-white w-full justify-center py-2.5 text-[10px]">
                                    {isDownloadingExcel ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    Export Excel Data
                                </button>
                            </div>
                        </div>
                        <Award className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5" />
                    </div>
                </div>

                {/* ── Main Data Roster ── */}
                <div className="ncc-card overflow-hidden">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 p-5 border-b border-[#ddd8cc]">
                        <div className="flex items-center gap-4">
                            <h2 className="ncc-section-title">
                                <Users className="w-5 h-5 text-ncc-gold" />
                                Individual Summary
                            </h2>
                            <div className="flex flex-wrap gap-2">
                                <div className="ncc-filter-group">
                                    {['All', 'B1', 'B2', 'C'].map((cert) => (
                                        <button key={cert} onClick={() => setSelectedCertificate(cert)} className={`ncc-filter-btn ${selectedCertificate === cert ? 'active' : ''}`}>
                                            {cert === 'All' ? 'All Certs' : cert}
                                        </button>
                                    ))}
                                </div>
                                <div className="ncc-filter-group">
                                    {['All', 'SD', 'SW'].map((div) => (
                                        <button key={div} onClick={() => setSelectedDivision(div)} className={`ncc-filter-btn ${selectedDivision === div ? 'active' : ''}`}>
                                            {div === 'All' ? 'All Div' : div}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/80" />
                            <input type="text" placeholder="Search cadet name or ID..." value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)} className="ncc-input pl-9 text-xs" />
                        </div>
                    </div>

                    <div className="overflow-x-auto ncc-scrollbar" ref={tableRef}>
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">S.No</th>
                                    <th className="px-5 py-3 text-left text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">Cadet Name</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">Enrollment ID</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">Present</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">Total</th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">Attendance %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSummaries.length === 0 ? (
                                    <tr><td colSpan="6" className="py-10 text-center text-gray-400 dark:text-white/80 text-sm italic">No records found matching criteria.</td></tr>
                                ) : (
                                    filteredSummaries.map((cadet, index) => {
                                        const isLow = cadet.percentage < 75;
                                        return (
                                            <tr key={cadet.id} className="ncc-tr">
                                                <td className="ncc-td text-center text-gray-400 dark:text-white/80">{index + 1}</td>
                                                <td className="ncc-td font-semibold text-ncc-navy dark:text-white">
                                                    <button onClick={() => setViewingCadet(cadet)} className="hover:text-ncc-gold transition-colors text-left uppercase tracking-tight">
                                                        {cadet.name}
                                                    </button>
                                                </td>
                                                <td className="ncc-td text-center font-mono text-xs">{cadet.enrollmentId}</td>
                                                <td className="ncc-td text-center font-bold text-ncc-navy dark:text-white">{cadet.presentCount}</td>
                                                <td className="ncc-td text-center text-gray-500 dark:text-white/70">{cadet.totalPeriods || totalPeriodsHeld}</td>
                                                <td className="ncc-td text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <span className="font-black text-black dark:text-white">
                                                            {cadet.percentage}%
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </>
    );
};
