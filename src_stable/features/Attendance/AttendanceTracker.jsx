// src/features/Attendance/AttendanceTracker.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { recordAttendance, addNotification, checkAndSendLowAttendanceAlert } from '../../firebase/firestoreService.js';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { Calendar } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { sendPushToAll, sendPushToCadets } from '../../firebase/pushNotifications.js';


const getTodayDateString = () => new Date().toISOString().split('T')[0];

const formatHistoryDate = (dateString) => {
    const dateObj = new Date(dateString + 'T00:00:00');
    if (isNaN(dateObj.getTime())) return { date: dateString, day: 'N/A' };
    const datePart = formatDate(dateObj);
    const dayPart = dateObj.toLocaleDateString('en-IN', { weekday: 'long' });
    return { date: datePart, day: dayPart.replace(/,/g, '') };
};

export const AttendanceTracker = ({ cadets }) => {
    const { userRole, userEnrollmentId, userInstitutionId } = useAuthContext();
    const { attendanceData } = useDataContext();
    const [selectedDate, setSelectedDate] = useState(getTodayDateString());
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [cadetHistorySearch, setCadetHistorySearch] = useState('');
    const [error, setError] = useState(null);
    const today = getTodayDateString();

    const relevantCadets = useMemo(() => {
        const activeCadets = cadets.filter(c => c.status !== 'alumni');
        let list = [];
        if (userRole === 'admin') {
            list = selectedCertificate === 'All' ? [...activeCadets] : activeCadets.filter((c) => c.certificate === selectedCertificate);
            if (selectedCategory !== 'All') list = list.filter((c) => (c.enrollmentId || '').toUpperCase().includes(selectedCategory));
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                list = list.filter((c) => c.name.toLowerCase().includes(q) || c.enrollmentId.toLowerCase().includes(q));
            }
        } else if (userRole === 'cadet' && userEnrollmentId) {
            list = cadets.filter((c) => c.enrollmentId === userEnrollmentId); // Keep all for self view
        }
        return list;
    }, [cadets, selectedCertificate, selectedCategory, searchQuery, userRole, userEnrollmentId]);

    const getStatus = useCallback((cadet) => cadet.attendance?.[selectedDate] || 'Absent', [selectedDate]);

    const toggleStatus = async (cadetId) => {
        if (userRole !== 'admin') return;
        const cadet = cadets.find((c) => c.id === cadetId);
        if (!cadet) return;
        const newStatus = getStatus(cadet) === 'Present' ? 'Absent' : 'Present';
        setError(null);
        try { 
            await recordAttendance(cadetId, selectedDate, newStatus, 'ANO (Manual Grid)', userInstitutionId);
            try {
                if (newStatus === 'Absent') {
                    const title = "⚠️ Attendance Alert: Marked Absent";
                    const body = `You were marked ABSENT for today's scheduled class (${formatDate(selectedDate)}). Please contact your ANO if you have a valid leave or reason.`;
                    sendPushToCadets([cadet.id], title, body, 'attendance');
                    addNotification(cadet.id, title, body, 'warning', cadet.institutionId || 'gmrit', cadet.enrollmentId);
                } else {
                    const title = "✅ Attendance Marked: Present";
                    const body = `Your attendance was marked as PRESENT for today's class (${formatDate(selectedDate)}).`;
                    sendPushToCadets([cadet.id], title, body, 'attendance');
                    addNotification(cadet.id, title, body, 'success', cadet.institutionId || 'gmrit', cadet.enrollmentId);
                }

                // Calculate updated attendance percentage immediately
                const cadetAtt = { ...(cadet.attendance || {}), [selectedDate]: newStatus };
                let presentCount = 0;
                Object.values(cadetAtt).forEach(s => {
                    const str = String(s).trim().toUpperCase();
                    if (str === 'PRESENT' || str === 'P' || str === 'VERIFIED' || str === 'LATE' || str === 'ATTENDED' || str === '1') {
                        presentCount++;
                    }
                });
                const totalPeriods = Object.keys(cadetAtt).length;
                const updatedPercentage = totalPeriods > 0 ? (presentCount / totalPeriods) * 100 : 0;
                const certLevel = cadet.certificate || cadet.currentCertificate || cadet.B || 'B1';
                
                checkAndSendLowAttendanceAlert(cadet.id, updatedPercentage, certLevel, null, cadet.institutionId || 'gmrit', cadet.enrollmentId);
            } catch (e) { console.error(e); }
        }
        catch (e) { setError(`Attendance update failed: ${e.message}`); }
    };

    const mySummary = useMemo(() => {
        if (userRole === 'cadet' && attendanceData?.personalSummary) return attendanceData.personalSummary;
        return null;
    }, [userRole, attendanceData]);

    return (
        <div className="ncc-card overflow-hidden">
            {/* Header */}
            <div className="flex justify-between items-center p-5 border-b border-[#ddd8cc]">
                <h2 className="ncc-section-title">
                    <Calendar className="w-5 h-5 text-ncc-gold" />
                    {userRole === 'admin' ? 'Attendance Register' : 'My Attendance'}
                </h2>
                {userRole === 'cadet' && mySummary && (
                    <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-white/80">Overall</p>
                        <p className={`text-3xl font-bold font-display ${mySummary.percentage < 75 ? 'text-red-600' : 'text-emerald-600'}`}>
                            {mySummary.percentage}%
                        </p>
                        <p className="text-xs text-gray-400 dark:text-white/80">({mySummary.presentCount}/{mySummary.totalPeriods})</p>
                    </div>
                )}
            </div>

            <div className="p-5">
                {error && <div className="mb-4"><ErrorDisplay message={error} /></div>}

                {/* Admin Filters */}
                {userRole === 'admin' && (
                    <div className="space-y-3 mb-5">
                        <div className="flex flex-col sm:flex-row gap-2">
                            <div className="flex items-center gap-2 flex-1">
                                <label htmlFor="attendance-date" className="ncc-label whitespace-nowrap">Date:</label>
                                <input id="attendance-date" type="date" value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)} max={today}
                                    className="ncc-input flex-1 text-xs" />
                            </div>
                            <input type="text" placeholder="Search name or ID..." value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)} className="ncc-input flex-1 text-xs" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <div className="ncc-filter-group">
                                {['All', 'SD', 'SW'].map((cat) => (
                                    <button key={cat} onClick={() => setSelectedCategory(cat)}
                                        className={`ncc-filter-btn ${selectedCategory === cat ? 'active' : ''}`}>{cat}</button>
                                ))}
                            </div>
                            <div className="ncc-filter-group">
                                {['All', 'B1', 'B2', 'C'].map((cert) => (
                                    <button key={cert} onClick={() => setSelectedCertificate(cert)}
                                        className={`ncc-filter-btn ${selectedCertificate === cert ? 'active' : ''}`}>{cert}</button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {relevantCadets.length === 0 ? (
                    <p className="text-center text-gray-400 dark:text-white/80 py-8 text-sm">
                        {userRole === 'admin' ? 'No cadets match the filter.' : 'No attendance record yet.'}
                    </p>
                ) : (
                    <div className="overflow-x-auto ncc-scrollbar rounded-lg border border-[#ddd8cc]">
                        <table className="min-w-full">
                            <thead>
                                <tr>
                                    {userRole === 'admin' && <th className="ncc-th">#</th>}
                                    <th className="ncc-th">Name</th>
                                    <th className="ncc-th">ID</th>
                                    {userRole === 'admin' && <th className="ncc-th">Cert</th>}
                                    <th className="ncc-th text-center">Status</th>
                                    {userRole === 'admin' && <th className="ncc-th text-center">Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {relevantCadets.map((cadet, index) => {
                                    const status = getStatus(cadet);
                                    return (
                                        <tr key={cadet.id} className="ncc-tr">
                                            {userRole === 'admin' && <td className="ncc-td text-gray-400 dark:text-white/80">{index + 1}</td>}
                                            <td className="ncc-td font-semibold text-ncc-navy dark:text-white">{cadet.name}</td>
                                            <td className="ncc-td font-mono text-xs text-gray-500 dark:text-white/70">{cadet.enrollmentId}</td>
                                            {userRole === 'admin' && (
                                                <td className="ncc-td">
                                                    {cadet.certificate
                                                        ? <span className={cadet.certificate === 'C' ? 'cert-c' : cadet.certificate === 'B2' ? 'cert-b2' : 'cert-b1'}>{cadet.certificate}</span>
                                                        : '—'}
                                                </td>
                                            )}
                                            <td className="ncc-td text-center">
                                                <span className={status === 'Present' ? 'pill-present' : 'pill-absent'}>{status}</span>
                                            </td>
                                            {userRole === 'admin' && (
                                                <td className="ncc-td text-center">
                                                    <button onClick={() => toggleStatus(cadet.id)}
                                                        className={`ncc-btn ncc-btn-sm ${status === 'Present' ? 'ncc-btn-danger' : 'ncc-btn-success'}`}>
                                                        {status === 'Present' ? 'Mark Absent' : 'Mark Present'}
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Cadet History */}
                {userRole === 'cadet' && relevantCadets.length > 0 && (
                    <div className="mt-5 pt-5 border-t border-[#ddd8cc]">
                        <div className="flex justify-between items-center mb-3 gap-3">
                            <p className="ncc-label m-0">Attendance History</p>
                            <input 
                                type="text" 
                                placeholder="Search date, day, or status..." 
                                value={cadetHistorySearch}
                                onChange={(e) => setCadetHistorySearch(e.target.value)} 
                                className="ncc-input text-xs w-48 sm:w-64" 
                            />
                        </div>
                        <div className="max-h-52 overflow-y-auto ncc-scrollbar rounded-lg border border-[#ddd8cc]">
                            <table className="min-w-full">
                                <thead>
                                    <tr>
                                        <th className="ncc-th">Day</th>
                                        <th className="ncc-th text-center">Date</th>
                                        <th className="ncc-th text-right">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {Object.entries(relevantCadets[0].attendance || {})
                                        .filter(([dateKey, status]) => {
                                            if (!cadetHistorySearch.trim()) return true;
                                            const { date, day } = formatHistoryDate(dateKey);
                                            const q = cadetHistorySearch.toLowerCase();
                                            return date.toLowerCase().includes(q) || 
                                                   day.toLowerCase().includes(q) || 
                                                   status.toLowerCase().includes(q);
                                        })
                                        .sort(([a], [b]) => b.localeCompare(a))
                                        .map(([dateKey, status]) => {
                                            const { date, day } = formatHistoryDate(dateKey);
                                            return (
                                                <tr key={dateKey} className={`ncc-tr ${dateKey === selectedDate ? 'ncc-tr-selected' : ''}`}>
                                                    <td className="ncc-td text-xs">{day}</td>
                                                    <td className="ncc-td text-xs text-center">{date}</td>
                                                    <td className="ncc-td text-right">
                                                        <span className={status === 'Present' ? 'pill-present' : 'pill-absent'}>{status}</span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
