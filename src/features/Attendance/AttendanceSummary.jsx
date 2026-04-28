// src/features/Attendance/AttendanceSummary.jsx
import React, { useState, useMemo, useRef } from 'react';
import { BarChart as BarChartIcon, Loader } from '../../components/Icons.jsx';
import { CadetAttendanceModal } from './CadetAttendanceModal.jsx';
import jsPDF from 'jspdf';
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
    Cell, // For coloring bars
} from 'recharts';

export const AttendanceSummary = ({ summaryData }) => {
    const {
        totalPeriodsHeld,
        individualSummaries,
        overallAverage,
        cadetNotFound,
    } = summaryData;

    const tableRef = useRef(null);
    const [viewingCadet, setViewingCadet] = useState(null);
    const [isDownloading, setIsDownloading] = useState(false); // Used for PDF
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [isDownloadingExcel, setIsDownloadingExcel] = useState(false);

    // Prepare data for the chart
    const chartData = useMemo(() => {
        const certGroups = {
            B1: { total: 0, present: 0, count: 0 },
            B2: { total: 0, present: 0, count: 0 },
            C: { total: 0, present: 0, count: 0 },
            NA: { total: 0, present: 0, count: 0 },
        };

        // Use individualSummaries (which has all cadets for admin)
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
                const maxPossible = group.count * totalPeriodsHeld;
                const percentage =
                    maxPossible > 0 ? (group.present / maxPossible) * 100 : 0;
                return {
                    name: `${certName} Cert`,
                    Percentage: parseFloat(percentage.toFixed(2)),
                    cadets: group.count,
                };
            })
            .filter((group) => group.cadets > 0); // Only show groups that have cadets
    }, [individualSummaries, totalPeriodsHeld]);

    // Filter summaries for the table display
    const filteredSummaries = useMemo(() => {
        if (selectedCertificate === 'All') return individualSummaries;
        return individualSummaries.filter(
            (cadet) => cadet.certificate === selectedCertificate
        );
    }, [individualSummaries, selectedCertificate]);

    const handlePdfDownload = async () => {
        if (!tableRef.current) return;

        setIsDownloading(true);
        const input = tableRef.current;

        const canvas = await html2canvas(input, {
            scale: 2,
            logging: true,
            useCORS: true,
            windowWidth: input.scrollWidth,
            windowHeight: input.scrollHeight + 100,
        });

        const imgData = canvas.toDataURL('image/jpeg', 1.0);

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgHeight = (canvas.height * pdfWidth) / canvas.width;

        let position = 0;

        // Add header information
        pdf.setFontSize(14);
        pdf.text('GMRIT NCC Attendance Summary Report', 10, 15);
        pdf.setFontSize(10);
        pdf.text(
            `Generated Date: ${formatDate(new Date())}`,
            10,
            22
        );
        pdf.text(`Overall Attendance: ${overallAverage}% (All Cadets)`, 10, 27);
        pdf.text(`Filtered View: ${selectedCertificate} Certificate`, 10, 32);

        position = 40;
        let heightLeft = imgHeight;

        // Check if content fits one page
        if (imgHeight < pdfHeight) {
            pdf.addImage(
                imgData,
                'JPEG',
                10,
                position,
                pdfWidth - 20,
                imgHeight
            );
        } else {
            // Handle multi-page content
            pdf.addImage(
                imgData,
                'JPEG',
                10,
                position,
                pdfWidth - 20,
                imgHeight
            );
            heightLeft -= pdfHeight - position;
            let pageNum = 1;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(
                    imgData,
                    'JPEG',
                    10,
                    position,
                    pdfWidth - 20,
                    imgHeight
                );
                pdf.setFontSize(8);
                pdf.text(`Page ${++pageNum}`, pdfWidth - 20, pdfHeight - 10);
                heightLeft -= pdfHeight;
            }
        }

        pdf.save(
            `NCC_Summary_${selectedCertificate}_${new Date().toISOString().split('T')[0]}.pdf`
        );
        setIsDownloading(false);
    };

    const handleExcelDownload = () => {
        setIsDownloadingExcel(true);
        try {
            let csv =
                'S.No.,Name,Enrollment ID,Periods Present,Total Periods,Attendance Percentage\n';

            // Add overall summary row
            csv += `Overall,,,${overallAverage}%\n`;

            // Add data rows for filtered summaries
            filteredSummaries.forEach((cadet, index) => {
                csv += `${index + 1},"${cadet.name}",${cadet.enrollmentId},${
                    cadet.presentCount
                },${totalPeriodsHeld},${cadet.percentage}%\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');

            link.href = URL.createObjectURL(blob);
            link.setAttribute(
                'download',
                `NCC_Summary_${selectedCertificate}_${
                    new Date().toISOString().split('T')[0]
                }.csv`
            );

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Excel download failed:', e);
        } finally {
            setIsDownloadingExcel(false);
        }
    };

    if (cadetNotFound) {
        return (
            <div className="p-6 bg-white rounded-xl shadow text-center text-red-600">
                Error: Your cadet record could not be found. Please contact an
                administrator.
            </div>
        );
    }

    if (!individualSummaries || individualSummaries.length === 0) {
        return (
            <div className="p-6 bg-white rounded-xl shadow text-center text-gray-500">
                No attendance data available.
            </div>
        );
    }

    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#FF8042'];

    return (
        <>
            {viewingCadet && (
                <CadetAttendanceModal
                    cadet={viewingCadet}
                    onClose={() => setViewingCadet(null)}
                    totalPeriods={totalPeriodsHeld}
                />
            )}

            <div className="space-y-6">
                {/* --- Overall Attendance Card --- */}
                <div className="bg-indigo-600 p-6 rounded-xl shadow text-white flex justify-between items-center">
                    <div className="text-2xl font-bold">Overall Attendance</div>
                    <div className="text-4xl font-extrabold bg-white text-indigo-700 px-4 py-2 rounded-lg">
                        {overallAverage}%
                    </div>
                </div>

                {/* --- Chart Component --- */}
                <div className="bg-white p-6 rounded-xl shadow-2xl">
                    <h3 className="text-xl font-bold mb-4 border-b pb-2 flex items-center">
                        <BarChartIcon className="w-5 h-5 mr-2" /> Attendance %
                        by Certificate
                    </h3>
                    {chartData.length > 0 ? (
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <BarChart
                                    data={chartData}
                                    margin={{
                                        top: 5,
                                        right: 20,
                                        left: -10,
                                        bottom: 5,
                                    }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis
                                        label={{
                                            value: 'Avg. %',
                                            angle: -90,
                                            position: 'insideLeft',
                                        }}
                                    />
                                    <Tooltip
                                        formatter={(value) => `${value}%`}
                                    />
                                    <Legend />
                                    <Bar dataKey="Percentage" fill="#8884d8">
                                        {chartData.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={
                                                    COLORS[
                                                        index % COLORS.length
                                                    ]
                                                }
                                            />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-center text-gray-500 p-4">
                            Not enough data to display chart.
                        </p>
                    )}
                </div>
                {/* --- END Chart Component --- */}

                {/* --- Filter Bar --- */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-200 space-y-3 sm:space-y-0">
                    <h4 className="text-lg font-semibold text-gray-700">
                        Filter by Certificate:
                    </h4>
                    <div className="flex space-x-1 bg-white p-1 rounded-lg shadow border border-gray-200 w-full sm:w-auto justify-start overflow-x-auto">
                        {['All', 'B1', 'B2', 'C'].map((cert) => (
                            <button
                                key={cert}
                                onClick={() => setSelectedCertificate(cert)}
                                className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition duration-150 whitespace-nowrap ${
                                    selectedCertificate === cert
                                        ? 'bg-indigo-600 text-white shadow-md'
                                        : 'text-gray-700 hover:bg-indigo-50 hover:text-indigo-700'
                                }`}
                            >
                                {cert === 'All' ? 'All' : `${cert} Cert`}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- Individual Summary Table (Wrapped for PDF) --- */}
                <div className="bg-white p-6 rounded-xl shadow overflow-x-auto">
                    <h3 className="text-xl font-bold mb-4 border-b pb-2 flex items-center">
                        <BarChartIcon className="w-5 h-5 mr-2" />
                        Individual Summary ({totalPeriodsHeld} Periods)
                    </h3>

                    <div ref={tableRef} className="p-2">
                        <div className="hidden print:block text-xs font-semibold mb-2">
                            Individual Attendance Summary - {totalPeriodsHeld}{' '}
                            Periods Held
                        </div>

                        <table className="min-w-full divide-y">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        S.No.
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Name
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        ID
                                    </th>
                                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Present
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Attend %
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y">
                                {filteredSummaries.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="5"
                                            className="px-6 py-4 text-center text-gray-500 text-sm"
                                        >
                                            No cadets found for{' '}
                                            {selectedCertificate}
                                            Certificate.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredSummaries.map((cadet, index) => (
                                        <tr
                                            key={cadet.id}
                                            className="hover:bg-indigo-50"
                                        >
                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {index + 1}
                                            </td>

                                            <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                <button
                                                    onClick={() =>
                                                        setViewingCadet(cadet)
                                                    }
                                                    className="text-indigo-600 hover:text-indigo-800 hover:underline text-left"
                                                    title="View Full History"
                                                >
                                                    {cadet.name}
                                                </button>
                                            </td>

                                            <td className="px-6 py-4 text-sm text-gray-500">
                                                {cadet.enrollmentId}
                                            </td>
                                            <td className="px-6 py-4 text-center text-sm font-medium text-indigo-700">
                                                {cadet.presentCount}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-extrabold">
                                                <span
                                                    className={
                                                        cadet.percentage < 75
                                                            ? 'text-red-600'
                                                            : 'text-green-600'
                                                    }
                                                >
                                                    {cadet.percentage}%
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* --- Download Button Section --- */}
                <div className="flex justify-between pt-4">
                    {/* Left Button (PDF) */}
                    <button
                        onClick={handlePdfDownload}
                        disabled={
                            isDownloading || filteredSummaries.length === 0
                        }
                        className="px-6 py-3 text-lg font-medium text-white bg-red-600 rounded-lg shadow-xl hover:bg-red-700 transition duration-150 disabled:bg-gray-400 flex items-center transform hover:scale-[1.02]"
                    >
                        {isDownloading ? (
                            <>
                                <Loader className="animate-spin w-5 h-5 mr-3" />{' '}
                                Generating PDF...
                            </>
                        ) : (
                            <>Download Summary (PDF)</>
                        )}
                    </button>

                    {/* Right Button (Excel/CSV) */}
                    <button
                        onClick={handleExcelDownload}
                        disabled={
                            isDownloadingExcel || filteredSummaries.length === 0
                        }
                        className="px-6 py-3 text-lg font-medium text-white bg-green-600 rounded-lg shadow-xl hover:bg-green-700 transition duration-150 disabled:bg-gray-400 flex items-center transform hover:scale-[1.02]"
                    >
                        {isDownloadingExcel ? (
                            <>
                                <Loader className="animate-spin w-5 h-5 mr-3" />{' '}
                                Preparing Excel...
                            </>
                        ) : (
                            <>Download Summary (Excel)</>
                        )}
                    </button>
                </div>
            </div>
        </>
    );
};
