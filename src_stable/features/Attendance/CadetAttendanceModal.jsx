// src/features/Attendance/CadetAttendanceModal.jsx
import React from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { X, Calendar, User, CheckCircle, XCircle } from '../../components/Icons.jsx';
import { formatDate, normalizeDate } from '../../utils/dateUtils.js';

const isPresentStatus = (status) => {
    if (!status) return false;
    const s = String(status).trim().toUpperCase();
    return s === 'PRESENT' || s === 'P' || s === 'VERIFIED' || s === 'LATE' || s === 'ATTENDED' || s === 'EXEMPT' || s === 'TRUE' || s === '1';
};

const formatHistoryDate = (dateInput) => {
    if (!dateInput) return { date: 'N/A', day: 'N/A' };
    
    let year, month, day;
    let str = String(dateInput).trim();

    // Match YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/);
    if (ymdMatch) {
        year = parseInt(ymdMatch[1], 10);
        month = parseInt(ymdMatch[2], 10) - 1;
        day = parseInt(ymdMatch[3], 10);
    } else {
        // Match DD-MM-YYYY or DD/MM/YYYY
        const dmyMatch = str.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
        if (dmyMatch) {
            day = parseInt(dmyMatch[1], 10);
            month = parseInt(dmyMatch[2], 10) - 1;
            year = parseInt(dmyMatch[3], 10);
        }
    }

    let dateObj;
    if (year !== undefined && month !== undefined && day !== undefined) {
        dateObj = new Date(year, month, day);
    } else {
        dateObj = new Date(dateInput);
    }

    if (isNaN(dateObj.getTime())) {
        return { date: str, day: 'N/A' };
    }

    const formattedDate = formatDate(dateObj);
    const dayName = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
    return { date: formattedDate, day: dayName };
};

export const CadetAttendanceModal = ({ cadet, onClose, totalPeriods }) => {
    const attendanceHistory = Object.entries(cadet.attendance || {})
        .filter(([dateKey]) => {
            if (!dateKey) return false;
            const norm = normalizeDate(dateKey);
            if (norm === '2026-08-26' || String(dateKey).includes('26-08-2026') || String(dateKey).includes('26/08/2026')) return false;
            return true;
        })
        .sort(([dateA], [dateB]) => dateB.localeCompare(dateA));

    const presentCount = cadet.presentCount !== undefined
        ? cadet.presentCount
        : attendanceHistory.filter(([, status]) => isPresentStatus(status)).length;
    
    const actualTotalPeriods = totalPeriods || cadet.totalPeriods || attendanceHistory.length;
    const percentage = cadet.percentage !== undefined
        ? cadet.percentage
        : (actualTotalPeriods > 0 ? ((presentCount / actualTotalPeriods) * 100).toFixed(2) : 0);

    return (
        <ModalOverlay>
            <div className="bg-[#fcfaf7] dark:bg-[#0a1628] rounded-[2rem] shadow-2xl w-full max-w-xl mx-auto flex flex-col border border-[#ddd8cc] dark:border-white/10 overflow-hidden max-h-[90vh]">
                {/* ── Header ── */}
                <div className="bg-ncc-navy p-5 flex justify-between items-center relative overflow-hidden flex-shrink-0">
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                                <User className="w-5 h-5 text-ncc-gold" />
                            </div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight">
                                {cadet.name}
                            </h2>
                        </div>
                        <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] ml-12">Attendance Intelligence</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full transition-colors relative z-10 group">
                        <X className="w-5 h-5 text-white/40" />
                    </button>
                    <Calendar className="absolute -right-6 -top-6 w-24 h-24 text-white/5" />
                </div>

                <div className="p-6 flex flex-col overflow-hidden flex-grow">
                    {/* ── Stats ── */}
                    <div className="grid grid-cols-3 gap-3 mb-6 flex-shrink-0">
                        <div className="bg-white dark:bg-[#050b14] p-3 rounded-2xl border border-[#ddd8cc] text-center shadow-sm">
                            <p className="text-[8px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-0.5">Total</p>
                            <p className="text-xl font-black text-ncc-navy dark:text-white">{actualTotalPeriods}</p>
                        </div>
                        <div className="bg-white dark:bg-[#050b14] p-3 rounded-2xl border border-[#ddd8cc] text-center shadow-sm">
                            <p className="text-[8px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-0.5">Present</p>
                            <p className="text-xl font-black text-ncc-gold">{presentCount}</p>
                        </div>
                        <div className="bg-white dark:bg-[#050b14] p-3 rounded-2xl border border-[#ddd8cc] text-center shadow-sm">
                            <p className="text-[8px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest mb-0.5">Status</p>
                            <p className={`text-xl font-black ${percentage < 75 ? 'text-red-600' : 'text-emerald-600'}`}>
                                {percentage}%
                            </p>
                        </div>
                    </div>

                    {/* ── Table ── */}
                    <div className="bg-white dark:bg-[#050b14] rounded-2xl border border-[#ddd8cc] overflow-hidden shadow-sm flex-grow flex flex-col min-h-0">
                        <div className="overflow-y-auto ncc-scrollbar">
                            <table className="min-w-full">
                                <thead className="bg-[#f5f0e8] dark:bg-[#0a1628] sticky top-0 z-20 border-b border-[#ddd8cc]">
                                    <tr>
                                        <th className="px-5 py-2.5 text-left text-[9px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Day</th>
                                        <th className="px-5 py-2.5 text-center text-[9px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Date</th>
                                        <th className="px-5 py-2.5 text-right text-[9px] font-black text-gray-400 dark:text-white/80 uppercase tracking-widest">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#eee]">
                                    {attendanceHistory.length === 0 ? (
                                        <tr><td colSpan="3" className="px-5 py-8 text-center text-gray-400 dark:text-white/80 text-sm italic">No history available.</td></tr>
                                    ) : (
                                        attendanceHistory.map(([dateKey, status]) => {
                                            const { date, day } = formatHistoryDate(dateKey);
                                            const isPresent = isPresentStatus(status);
                                            return (
                                                <tr key={dateKey} className="transition-colors">
                                                    <td className="px-5 py-3 text-[11px] font-bold text-ncc-navy dark:text-white">{day}</td>
                                                    <td className="px-5 py-3 text-[11px] text-gray-500 dark:text-white/70 text-center">{date}</td>
                                                    <td className="px-5 py-3 text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <span className={`text-[10px] font-black uppercase ${isPresent ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {String(status).toUpperCase() === 'ABSENT' ? 'ABSENT' : String(status).toUpperCase()}
                                                            </span>
                                                            {isPresent ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> : <XCircle className="w-3.5 h-3.5 text-red-600" />}
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

                    {/* ── Footer ── */}
                    <div className="mt-6 flex justify-end flex-shrink-0">
                        <button onClick={onClose} className="ncc-btn ncc-btn-primary px-8 py-2.5 shadow-xl text-xs">
                            Acknowledge Records
                        </button>
                    </div>
                </div>
            </div>
        </ModalOverlay>
    );
};
