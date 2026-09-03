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
    AlertCircle,
    Calendar,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Filter
} from '../../components/Icons.jsx';
import { CadetAttendanceModal } from './CadetAttendanceModal.jsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    const [selectedMonth, setSelectedMonth] = useState('ALL'); // 'ALL' or 'YYYY-MM'
    const [sortBy, setSortBy] = useState('attendance_desc'); // 'attendance_desc', 'attendance_asc', 'name_asc', 'name_desc', 'reg_asc', 'reg_desc'
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const isPresentStatus = (status) => {
        if (!status) return false;
        const s = String(status).trim().toUpperCase();
        return s === 'PRESENT' || s === 'P' || s === 'VERIFIED' || s === 'LATE' || s === 'ATTENDED' || s === '1';
    };

    // Extract all unique months from attendance keys across all cadets
    const availableMonths = useMemo(() => {
        const monthSet = new Set();
        (individualSummaries || []).forEach(c => {
            if (c.attendance) {
                Object.keys(c.attendance).forEach(d => {
                    if (d && d.length >= 7 && d.includes('-')) {
                        const monthKey = d.slice(0, 7); // e.g. '2026-06'
                        monthSet.add(monthKey);
                    }
                });
            }
        });
        const sorted = Array.from(monthSet).sort().reverse();
        return sorted.map(m => {
            const [year, month] = m.split('-');
            const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
            const label = isNaN(dateObj.getTime()) 
                ? m 
                : dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
            return { key: m, label };
        });
    }, [individualSummaries]);

    // Helper to calculate monthly or overall stats for each cadet
    const getCadetStats = (cadet, monthKey) => {
        if (!cadet) return { presentCount: 0, totalPeriods: 0, percentage: 0, dates: [] };
        const att = cadet.attendance || {};
        if (monthKey === 'ALL') {
            return {
                presentCount: cadet.presentCount ?? 0,
                totalPeriods: cadet.totalPeriods || totalPeriodsHeld,
                percentage: cadet.percentage ?? 0,
                dates: Object.keys(att).sort()
            };
        }
        
        // Filter dates matching monthKey (e.g. '2026-06')
        const monthDates = Object.keys(att).filter(d => d.startsWith(monthKey)).sort();
        let present = 0;
        let total = monthDates.length;
        monthDates.forEach(d => {
            if (isPresentStatus(att[d])) present++;
        });
        const pct = total > 0 ? parseFloat(((present / total) * 100).toFixed(2)) : 0;
        return {
            presentCount: present,
            totalPeriods: total,
            percentage: pct,
            dates: monthDates
        };
    };

    const chartData = useMemo(() => {
        const certGroups = {
            B1: { totalPeriods: 0, present: 0, count: 0 },
            B2: { totalPeriods: 0, present: 0, count: 0 },
            C: { totalPeriods: 0, present: 0, count: 0 },
            NA: { totalPeriods: 0, present: 0, count: 0 },
        };

        (individualSummaries || []).forEach((cadet) => {
            const cert = cadet.currentCertificate || cadet.certificate || 'NA';
            const stats = getCadetStats(cadet, selectedMonth);
            if (certGroups[cert]) {
                certGroups[cert].present += stats.presentCount;
                certGroups[cert].count += 1;
                certGroups[cert].totalPeriods += stats.totalPeriods || 0;
            }
        });

        return Object.keys(certGroups)
            .map((certName) => {
                const group = certGroups[certName];
                const maxPossible = group.totalPeriods;
                const percentage =
                    maxPossible > 0 ? (group.present / maxPossible) * 100 : 0;
                return {
                    name: `${certName}`,
                    Percentage: parseFloat(percentage.toFixed(2)),
                    cadets: group.count,
                };
            })
            .filter((group) => group.cadets > 0);
    }, [individualSummaries, selectedMonth, totalPeriodsHeld]);

    // Compute monthly and overall summary metrics
    const currentViewMetrics = useMemo(() => {
        if (selectedMonth === 'ALL') {
            return {
                average: averages ? averages.All : overallAverage,
                totalPeriods: periodsHeld ? periodsHeld.All : totalPeriodsHeld,
                monthLabel: 'Overall Training Year'
            };
        }
        const monthObj = availableMonths.find(m => m.key === selectedMonth);
        const label = monthObj ? monthObj.label : selectedMonth;
        
        let totalPresent = 0;
        let totalMax = 0;
        let uniqueDates = new Set();

        (individualSummaries || []).forEach(c => {
            const stats = getCadetStats(c, selectedMonth);
            totalPresent += stats.presentCount;
            totalMax += stats.totalPeriods;
            stats.dates.forEach(d => uniqueDates.add(d));
        });

        const avg = totalMax > 0 ? parseFloat(((totalPresent / totalMax) * 100).toFixed(2)) : 0;
        return {
            average: avg,
            totalPeriods: uniqueDates.size,
            monthLabel: label
        };
    }, [selectedMonth, averages, overallAverage, periodsHeld, totalPeriodsHeld, individualSummaries, availableMonths]);

    const filteredSummaries = useMemo(() => {
        let list = (individualSummaries || []).map(cadet => {
            const stats = getCadetStats(cadet, selectedMonth);
            return {
                ...cadet,
                displayPresent: stats.presentCount,
                displayTotal: stats.totalPeriods,
                displayPercentage: stats.percentage,
                displayDates: stats.dates
            };
        });

        if (selectedCertificate !== 'All') {
            list = list.filter((cadet) => (cadet.currentCertificate || cadet.certificate) === selectedCertificate);
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

        // Apply sorted order based on Attendance % / Name / Reg No.
        list.sort((a, b) => {
            if (sortBy === 'attendance_desc') {
                if (b.displayPercentage !== a.displayPercentage) {
                    return b.displayPercentage - a.displayPercentage;
                }
                if (b.displayPresent !== a.displayPresent) {
                    return b.displayPresent - a.displayPresent;
                }
                return (a.enrollmentId || '').localeCompare(b.enrollmentId || '');
            }
            if (sortBy === 'attendance_asc') {
                if (a.displayPercentage !== b.displayPercentage) {
                    return a.displayPercentage - b.displayPercentage;
                }
                return (a.enrollmentId || '').localeCompare(b.enrollmentId || '');
            }
            if (sortBy === 'name_asc') {
                return (a.name || '').localeCompare(b.name || '');
            }
            if (sortBy === 'name_desc') {
                return (b.name || '').localeCompare(a.name || '');
            }
            if (sortBy === 'reg_asc') {
                const numA = parseInt(a.enrollmentId?.match(/\d+$/)?.[0] || '0', 10);
                const numB = parseInt(b.enrollmentId?.match(/\d+$/)?.[0] || '0', 10);
                if (numA !== numB) return numA - numB;
                return (a.enrollmentId || '').localeCompare(b.enrollmentId || '');
            }
            if (sortBy === 'reg_desc') {
                const numA = parseInt(a.enrollmentId?.match(/\d+$/)?.[0] || '0', 10);
                const numB = parseInt(b.enrollmentId?.match(/\d+$/)?.[0] || '0', 10);
                if (numA !== numB) return numB - numA;
                return (b.enrollmentId || '').localeCompare(a.enrollmentId || '');
            }
            return 0;
        });

        return list;
    }, [individualSummaries, selectedMonth, selectedCertificate, selectedDivision, searchTerm, sortBy, totalPeriodsHeld]);

    const handleSortToggle = (field) => {
        if (field === 'attendance') {
            setSortBy(prev => prev === 'attendance_desc' ? 'attendance_asc' : 'attendance_desc');
        } else if (field === 'name') {
            setSortBy(prev => prev === 'name_asc' ? 'name_desc' : 'name_asc');
        } else if (field === 'reg') {
            setSortBy(prev => prev === 'reg_asc' ? 'reg_desc' : 'reg_asc');
        }
    };

    const handlePdfDownload = (idType = 'regimental') => {
        setIsDownloading(true);
        try {
            const isMonthly = selectedMonth !== 'ALL';
            const selectedMonthObj = availableMonths.find(m => m.key === selectedMonth);
            const monthLabel = selectedMonthObj ? selectedMonthObj.label : 'Overall Training Period';

            // Only include dates for this scope where at least one cadet in the filtered list has a record
            const allDates = Array.from(
                new Set(
                    filteredSummaries.flatMap((c) => {
                        const dates = Object.keys(c.attendance || {});
                        return isMonthly ? dates.filter(d => d.startsWith(selectedMonth)) : dates;
                    })
                )
            ).filter((d) => 
                filteredSummaries.some((c) => c.attendance && (d in c.attendance) && String(c.attendance[d]).trim() !== '-')
            ).sort((a, b) => a.localeCompare(b));

            const pdf = new jsPDF('l', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();

            if (idType === 'jntu') {
                // GMRIT Specific Header
                pdf.setFontSize(16);
                pdf.setTextColor(40, 70, 150);
                pdf.setFont('helvetica', 'bold');
                pdf.text('GMR INSTITUTE OF TECHNOLOGY', pdfWidth / 2, 13, { align: 'center' });
                
                pdf.setFontSize(9);
                pdf.setTextColor(80, 80, 80);
                pdf.setFont('helvetica', 'normal');
                pdf.text('(An Autonomous Institution, Accredited by NBA of AICTE, NAAC of UGC & an ISO 9001:2008 Institution)', pdfWidth / 2, 18, { align: 'center' });
                
                pdf.setLineWidth(0.4);
                pdf.line(10, 21, pdfWidth - 10, 21);

                pdf.setFontSize(13);
                pdf.setTextColor(10, 22, 40);
                pdf.setFont('helvetica', 'bold');
                const titleText = isMonthly ? `MONTHLY ATTENDANCE REGISTER - ${monthLabel.toUpperCase()}` : 'ATTENDANCE REGISTER SUMMARY (OVERALL)';
                pdf.text(titleText, pdfWidth / 2, 28, { align: 'center' });
                
                pdf.setFontSize(9);
                pdf.setFont('helvetica', 'bold');
                pdf.text(`Register Average: ${currentViewMetrics.average}% | Parades: ${allDates.length} | Cadets: ${filteredSummaries.length}`, 10, 36);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Date: ${formatDate(new Date())}`, pdfWidth - 10, 36, { align: 'right' });
            } else {
                // Standard NCC Header
                pdf.setFontSize(15);
                pdf.setTextColor(10, 22, 40);
                pdf.setFont('helvetica', 'bold');
                pdf.text('14(A) BN NCC Srikakulam', pdfWidth / 2, 14, { align: 'center' });
                
                pdf.setFontSize(12);
                pdf.setTextColor(197, 160, 89);
                const title = isMonthly ? `Monthly Attendance Register (${monthLabel})` : 'Regimental Attendance Register (Overall Summary)';
                pdf.text(title, pdfWidth / 2, 21, { align: 'center' });
                
                pdf.setFontSize(9);
                pdf.setTextColor(100, 100, 100);
                pdf.setFont('helvetica', 'normal');
                pdf.text(`Cadets: ${filteredSummaries.length} | Parades: ${allDates.length} | Register Average: ${currentViewMetrics.average}%`, 10, 29);
                pdf.text(`Generated: ${formatDate(new Date())}`, pdfWidth - 10, 29, { align: 'right' });
            }

            const idLabel = idType === 'jntu' ? 'JNTU NO' : 'ENROLLMENT NO';
            const dateHeaders = allDates.map((d) => formatDate(d));

            const tableColumn = ['S.No', 'CADET NAME', idLabel, ...dateHeaders, 'PRESENT', 'TOTAL', 'ATTENDANCE %'];

            const tableRows = filteredSummaries.map((cadet, index) => {
                const dateStatuses = allDates.map((d) => {
                    if (cadet.attendance && d in cadet.attendance) {
                        const status = cadet.attendance[d];
                        return isPresentStatus(status) ? 'P' : 'A';
                    }
                    return '-';
                });
                return [
                    index + 1,
                    cadet.name?.toUpperCase() || '-',
                    idType === 'jntu' ? (cadet.jntuNo || '-') : (cadet.enrollmentId || cadet.regimentalNumber || '-'),
                    ...dateStatuses,
                    cadet.displayPresent,
                    cadet.displayTotal,
                    `${cadet.displayPercentage}%`
                ];
            });

            const columnStyles = {
                0: { halign: 'center', cellWidth: 10 },
                1: { halign: 'left', cellWidth: 46 },
                2: { halign: 'center', cellWidth: 36 },
            };
            
            const numDates = allDates.length;
            for (let i = 0; i < numDates; i++) {
                columnStyles[3 + i] = { halign: 'center' };
            }
            columnStyles[3 + numDates] = { halign: 'center', cellWidth: 16 };
            columnStyles[3 + numDates + 1] = { halign: 'center', cellWidth: 14 };
            columnStyles[3 + numDates + 2] = { halign: 'center', cellWidth: 22 };

            const totalCols = tableColumn.length;
            const dynamicFontSize = totalCols > 20 ? 6 : totalCols > 14 ? 7 : 8;
            const dynamicCellPadding = totalCols > 20 ? 1 : 1.5;

            autoTable(pdf, {
                head: [tableColumn],
                body: tableRows,
                startY: idType === 'jntu' ? 42 : 34,
                theme: 'grid',
                styles: { 
                    fontSize: dynamicFontSize, 
                    cellPadding: dynamicCellPadding,
                    valign: 'middle' 
                },
                headStyles: { 
                    fillColor: [10, 22, 40], 
                    textColor: [255, 255, 255], 
                    fontStyle: 'bold',
                    lineWidth: 0.1,
                    lineColor: [200, 200, 200],
                    halign: 'center'
                },
                columnStyles: columnStyles,
                alternateRowStyles: { fillColor: [250, 250, 250] },
                didParseCell: (data) => {
                    if (data.section === 'body' && data.column.index >= 3 && data.column.index < 3 + numDates) {
                        if (data.cell.raw === 'P') {
                            data.cell.styles.textColor = [16, 185, 129];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (data.cell.raw === 'A') {
                            data.cell.styles.textColor = [220, 38, 38];
                            data.cell.styles.fontStyle = 'bold';
                        } else if (data.cell.raw === '-') {
                            data.cell.styles.textColor = [156, 163, 175];
                            data.cell.styles.fontStyle = 'normal';
                        }
                    }
                }
            });

            const filenameSuffix = isMonthly ? `_${selectedMonth}` : '_Overall';
            pdf.save(`NCC_Attendance_Register${filenameSuffix}_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (e) {
            console.error("PDF generation error:", e);
        } finally {
            setIsDownloading(false);
        }
    };

    const handleExcelDownload = () => {
        setIsDownloadingExcel(true);
        try {
            const isMonthly = selectedMonth !== 'ALL';
            const selectedMonthObj = availableMonths.find(m => m.key === selectedMonth);
            const monthLabel = selectedMonthObj ? selectedMonthObj.label : 'Overall';

            const allDates = Array.from(
                new Set(
                    filteredSummaries.flatMap((c) => {
                        const dates = Object.keys(c.attendance || {});
                        return isMonthly ? dates.filter(d => d.startsWith(selectedMonth)) : dates;
                    })
                )
            ).filter((d) => 
                filteredSummaries.some((c) => c.attendance && (d in c.attendance) && String(c.attendance[d]).trim() !== '-')
            ).sort((a, b) => a.localeCompare(b));

            const dateHeaders = allDates.map((d) => `"${formatDate(d)}"`).join(',');

            let csv = 'S.No,CADET NAME,ENROLLMENT NO,';
            if (dateHeaders) {
                csv += `${dateHeaders},`;
            }
            csv += 'PRESENT,TOTAL,ATTENDANCE %\n';

            filteredSummaries.forEach((cadet, index) => {
                const dateStatuses = allDates.map((d) => {
                    if (cadet.attendance && d in cadet.attendance) {
                        const status = cadet.attendance[d];
                        return isPresentStatus(status) ? 'P' : 'A';
                    }
                    return '-';
                }).join(',');

                const name = `"${(cadet.name || '').replace(/"/g, '""')}"`;
                const enrollmentId = `"${(cadet.enrollmentId || cadet.regimentalNumber || '').replace(/"/g, '""')}"`;
                const present = cadet.displayPresent;
                const total = cadet.displayTotal;
                const pct = `${cadet.displayPercentage}%`;

                csv += `${index + 1},${name},${enrollmentId},`;
                if (dateStatuses) {
                    csv += `${dateStatuses},`;
                }
                csv += `${present},${total},${pct}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            const fileSuffix = isMonthly ? `_${selectedMonth}` : '_Overall';
            link.setAttribute('download', `NCC_Attendance_${fileSuffix}_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error("Excel generation error:", e);
        } finally {
            setIsDownloadingExcel(false);
        }
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
                            <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-1">
                                {selectedMonth === 'ALL' ? 'Overall Avg.' : `${currentViewMetrics.monthLabel} Avg.`}
                            </p>
                            <h3 className="text-3xl font-black text-ncc-navy dark:text-white">{currentViewMetrics.average}%</h3>
                        </div>
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                            <div className="text-[11px] text-gray-500 dark:text-white/60">
                                <span className="font-bold text-gray-800 dark:text-white/90">{currentViewMetrics.totalPeriods}</span> Parades
                            </div>
                            <div className="text-[11px] text-gray-500 dark:text-white/60">
                                <span className="font-bold text-gray-800 dark:text-white/90">{individualSummaries.length}</span> Cadets
                            </div>
                        </div>
                    </div>
                    {['B1', 'B2', 'C'].map(cert => {
                        const count = individualSummaries.filter(c => c.certificate === cert || c.currentCertificate === cert).length;
                        const certCadets = filteredSummaries.filter(c => c.certificate === cert || c.currentCertificate === cert);
                        const certPresentSum = certCadets.reduce((sum, c) => sum + (c.displayPresent || 0), 0);
                        const certTotalSum = certCadets.reduce((sum, c) => sum + (c.displayTotal || 0), 0);
                        const certAvg = certTotalSum > 0 ? parseFloat(((certPresentSum / certTotalSum) * 100).toFixed(2)) : 0;
                        
                        return (
                            <div key={cert} className={`ncc-card p-5 sm:p-6 flex flex-col justify-between border-t-4 ${cert === 'C' ? 'border-ncc-gold' : 'border-gray-400'}`}>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-1">{cert} Avg.</p>
                                    <h3 className="text-3xl font-black text-ncc-navy dark:text-white">{certAvg}%</h3>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-white/10 flex flex-col sm:flex-row justify-between sm:items-center gap-1">
                                    <div className="text-[11px] text-gray-500 dark:text-white/60">
                                        <span className="font-bold text-gray-800 dark:text-white/90">{currentViewMetrics.totalPeriods}</span> Periods
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-white/60">
                                        <span className="font-bold text-gray-800 dark:text-white/90">{count}</span> Cadets
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── Analytics & Export Intelligence ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 ncc-card p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
                            <h3 className="ncc-section-title">
                                <BarChartIcon className="w-5 h-5 text-ncc-gold" />
                                Certificate-wise Attendance {selectedMonth !== 'ALL' && <span className="text-xs font-normal text-gray-400">({currentViewMetrics.monthLabel})</span>}
                            </h3>
                        </div>
                        <div className="h-[280px] w-full">
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

                    <div className="ncc-card p-6 flex flex-col justify-center bg-ncc-navy text-white relative overflow-hidden shadow-xl">
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-2">
                                <h4 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Export Intelligence</h4>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-ncc-gold/20 text-ncc-gold border border-ncc-gold/30">
                                    {selectedMonth === 'ALL' ? 'Overall' : currentViewMetrics.monthLabel}
                                </span>
                            </div>
                            <p className="text-xs text-white/70 mb-5 leading-relaxed">
                                Generate and download official attendance reports with calculated percentages, dates, and regimental records.
                            </p>
                            <div className="flex flex-col gap-2.5">
                                <button 
                                    onClick={() => handlePdfDownload('regimental')} 
                                    disabled={isDownloading} 
                                    className="ncc-btn bg-white/10 hover:bg-white/20 text-white border-white/10 w-full justify-center py-2.5 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                                >
                                    {isDownloading ? <Loader className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4 text-ncc-gold" />}
                                    {selectedMonth === 'ALL' ? 'Export Overall PDF' : `Export ${currentViewMetrics.monthLabel} PDF`}
                                </button>
                                <button 
                                    onClick={handleExcelDownload} 
                                    disabled={isDownloadingExcel} 
                                    className="ncc-btn bg-ncc-gold hover:bg-ncc-gold/90 text-ncc-navy w-full justify-center py-2.5 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                                >
                                    {isDownloadingExcel ? <Loader className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                                    {selectedMonth === 'ALL' ? 'Export Overall Excel' : `Export ${currentViewMetrics.monthLabel} Excel`}
                                </button>
                            </div>
                        </div>
                        <Award className="absolute -right-8 -bottom-8 w-48 h-48 text-white/5 pointer-events-none" />
                    </div>
                </div>

                {/* ── Main Data Roster ── */}
                <div className="ncc-card overflow-hidden">
                    {/* Header Controls & Filters */}
                    <div className="p-5 border-b border-[#ddd8cc] dark:border-white/10 space-y-4">
                        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                            <div className="flex flex-wrap items-center gap-3">
                                <h2 className="ncc-section-title">
                                    <Users className="w-5 h-5 text-ncc-gold" />
                                    Individual Summary
                                </h2>
                                
                                {/* Month Filter Selector */}
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#0a1628] p-1 rounded-xl border border-gray-200 dark:border-white/10">
                                    <Calendar className="w-4 h-4 text-ncc-gold ml-2" />
                                    <select 
                                        value={selectedMonth}
                                        onChange={(e) => setSelectedMonth(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-ncc-navy dark:text-white outline-none cursor-pointer pr-2 py-1"
                                    >
                                        <option value="ALL" className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">📅 Overall Attendance</option>
                                        {availableMonths.map(m => (
                                            <option key={m.key} value={m.key} className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">
                                                🗓️ {m.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Sort Order Selector */}
                                <div className="flex items-center gap-2 bg-gray-100 dark:bg-[#0a1628] p-1 rounded-xl border border-gray-200 dark:border-white/10">
                                    <ArrowUpDown className="w-4 h-4 text-ncc-gold ml-2" />
                                    <select 
                                        value={sortBy}
                                        onChange={(e) => setSortBy(e.target.value)}
                                        className="bg-transparent text-xs font-bold text-ncc-navy dark:text-white outline-none cursor-pointer pr-2 py-1"
                                    >
                                        <option value="attendance_desc" className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">⬇️ Highest Attendance %</option>
                                        <option value="attendance_asc" className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">⬆️ Lowest Attendance %</option>
                                        <option value="reg_asc" className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">🔢 Enrollment ID (Ascending)</option>
                                        <option value="reg_desc" className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">🔢 Enrollment ID (Descending)</option>
                                        <option value="name_asc" className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">🔤 Cadet Name (A-Z)</option>
                                        <option value="name_desc" className="dark:bg-[#0a1628] text-ncc-navy dark:text-white">🔤 Cadet Name (Z-A)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Search Box */}
                            <div className="relative w-full lg:w-72">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-white/80" />
                                <input 
                                    type="text" 
                                    placeholder="Search cadet name or ID..." 
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                    className="ncc-input pl-9 text-xs w-full" 
                                />
                            </div>
                        </div>

                        {/* Certificate & Division Badges */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/60 mr-1">Certificate:</span>
                                <div className="ncc-filter-group">
                                    {['All', 'B1', 'B2', 'C'].map((cert) => (
                                        <button key={cert} onClick={() => setSelectedCertificate(cert)} className={`ncc-filter-btn ${selectedCertificate === cert ? 'active' : ''}`}>
                                            {cert === 'All' ? 'All Certs' : cert}
                                        </button>
                                    ))}
                                </div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-white/60 mx-1">Division:</span>
                                <div className="ncc-filter-group">
                                    {['All', 'SD', 'SW'].map((div) => (
                                        <button key={div} onClick={() => setSelectedDivision(div)} className={`ncc-filter-btn ${selectedDivision === div ? 'active' : ''}`}>
                                            {div === 'All' ? 'All Div' : div}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Quick Export Actions */}
                            <div className="flex items-center gap-2">
                                <button 
                                    onClick={() => handlePdfDownload('regimental')}
                                    disabled={isDownloading}
                                    title="Export PDF Report"
                                    className="px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-white/10 dark:hover:bg-white/20 text-xs font-bold text-ncc-navy dark:text-white flex items-center gap-1.5 transition-colors border border-gray-200 dark:border-white/10 cursor-pointer"
                                >
                                    <FileText className="w-3.5 h-3.5 text-red-500" />
                                    <span>PDF</span>
                                </button>
                                <button 
                                    onClick={handleExcelDownload}
                                    disabled={isDownloadingExcel}
                                    title="Export Excel Spreadsheet"
                                    className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 transition-colors border border-emerald-200 dark:border-emerald-800/40 cursor-pointer"
                                >
                                    <Download className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Excel</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto ncc-scrollbar" ref={tableRef}>
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">
                                        S.No
                                    </th>
                                    <th 
                                        onClick={() => handleSortToggle('name')}
                                        className="px-5 py-3 text-left text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc] cursor-pointer hover:bg-ncc-navy-mid transition-colors select-none"
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Cadet Name</span>
                                            {sortBy === 'name_asc' && <ArrowUp className="w-3 h-3 text-ncc-gold" />}
                                            {sortBy === 'name_desc' && <ArrowDown className="w-3 h-3 text-ncc-gold" />}
                                        </div>
                                    </th>
                                    <th 
                                        onClick={() => handleSortToggle('reg')}
                                        className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc] cursor-pointer hover:bg-ncc-navy-mid transition-colors select-none"
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span>Enrollment ID</span>
                                            {sortBy === 'reg_asc' && <ArrowUp className="w-3 h-3 text-ncc-gold" />}
                                            {sortBy === 'reg_desc' && <ArrowDown className="w-3 h-3 text-ncc-gold" />}
                                        </div>
                                    </th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">
                                        {selectedMonth === 'ALL' ? 'Present' : 'Month Present'}
                                    </th>
                                    <th className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc]">
                                        {selectedMonth === 'ALL' ? 'Total' : 'Month Total'}
                                    </th>
                                    <th 
                                        onClick={() => handleSortToggle('attendance')}
                                        className="px-5 py-3 text-center text-[10px] font-black text-white uppercase tracking-widest bg-ncc-navy border-b border-[#ddd8cc] cursor-pointer hover:bg-ncc-navy-mid transition-colors select-none"
                                    >
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span>{selectedMonth === 'ALL' ? 'Attendance %' : 'Monthly %'}</span>
                                            {sortBy === 'attendance_desc' && <ArrowDown className="w-3 h-3 text-ncc-gold" />}
                                            {sortBy === 'attendance_asc' && <ArrowUp className="w-3 h-3 text-ncc-gold" />}
                                        </div>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredSummaries.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-gray-400 dark:text-white/70 text-sm italic">
                                            No records found matching the selected month and filter criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSummaries.map((cadet, index) => {
                                        const pct = cadet.displayPercentage;
                                        const isLow = pct < 60;
                                        const isModerate = pct >= 60 && pct < 75;
                                        const isGood = pct >= 75;

                                        return (
                                            <tr key={cadet.id} className="ncc-tr">
                                                <td className="ncc-td text-center text-gray-400 dark:text-white/80 font-mono text-xs">
                                                    {index + 1}
                                                </td>
                                                <td className="ncc-td font-bold text-ncc-navy dark:text-white">
                                                    <button 
                                                        onClick={() => setViewingCadet(cadet)} 
                                                        className="hover:text-ncc-gold transition-colors text-left uppercase tracking-tight"
                                                    >
                                                        {cadet.name}
                                                    </button>
                                                </td>
                                                <td className="ncc-td text-center font-mono text-xs text-gray-600 dark:text-white/80">
                                                    {cadet.enrollmentId || cadet.regimentalNumber}
                                                </td>
                                                <td className="ncc-td text-center font-black text-ncc-navy dark:text-white">
                                                    {cadet.displayPresent}
                                                </td>
                                                <td className="ncc-td text-center text-gray-500 dark:text-white/70 font-bold">
                                                    {cadet.displayTotal}
                                                </td>
                                                <td className="ncc-td text-center">
                                                    <div className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-black">
                                                        <span className={`px-2.5 py-0.5 rounded-full font-black text-xs ${
                                                            isGood 
                                                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40' 
                                                                : isModerate 
                                                                ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40' 
                                                                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800/40'
                                                        }`}>
                                                            {pct}%
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

export default AttendanceSummary;

