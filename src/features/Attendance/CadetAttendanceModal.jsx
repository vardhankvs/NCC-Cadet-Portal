// src/features/Attendance/CadetAttendanceModal.jsx
import React from 'react';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { XCircle, Calendar } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';

const formatHistoryDate = (dateString) => {
    const dateObj = new Date(dateString + 'T00:00:00');
    if (isNaN(dateObj.getTime())) return { date: dateString, day: 'N/A' };
    const datePart = formatDate(dateObj);
    const dayPart = dateObj.toLocaleDateString('en-IN', {
        weekday: 'long',
    });
    return { date: datePart, day: dayPart.replace(/,/g, '') };
};

export const CadetAttendanceModal = ({ cadet, onClose, totalPeriods }) => {
    // Get and sort the cadet's attendance history
    const attendanceHistory = Object.entries(cadet.attendance || {}).sort(
        ([dateA], [dateB]) => dateB.localeCompare(dateA)
    ); // Sort descending by date

    // Re-calculate stats just for this modal
    const presentCount = attendanceHistory.filter(
        ([, status]) => status === 'Present'
    ).length;
    const percentage =
        totalPeriods > 0 ? ((presentCount / totalPeriods) * 100).toFixed(2) : 0;

    // Removed unused formatCurrency function

    return (
        <ModalOverlay>
            <div className="p-6 bg-white rounded-xl shadow-2xl w-full max-w-lg mx-auto max-h-[80vh] flex flex-col">
                {/* --- Header --- */}
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-indigo-600" />
                        {cadet.name}&apos;s History
                    </h2>
                    <button type="button" onClick={onClose} title="Close">
                        <XCircle className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    </button>
                </div>

                {/* --- Summary Stats --- */}
                <div className="mb-4 p-4 bg-indigo-50 rounded-lg flex justify-around items-center text-center">
                    <div>
                        <div className="text-sm font-medium text-gray-500">
                            Total Periods
                        </div>
                        <div className="text-2xl font-bold text-indigo-700">
                            {totalPeriods}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-500">
                            Periods Present
                        </div>
                        <div className="text-2xl font-bold text-green-600">
                            {presentCount}
                        </div>
                    </div>
                    <div>
                        <div className="text-sm font-medium text-gray-500">
                            Percentage
                        </div>
                        <div
                            className={`text-2xl font-bold ${percentage < 75 ? 'text-red-600' : 'text-green-600'}`}
                        >
                            {percentage}%
                        </div>
                    </div>
                </div>

                {/* --- History Table --- */}
                <div className="flex-grow overflow-y-auto text-sm">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">
                                    Day
                                </th>
                                <th className="px-4 py-2 text-center font-medium text-gray-500 uppercase tracking-wider">
                                    Date
                                </th>
                                <th className="px-4 py-2 text-right font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {attendanceHistory.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="3"
                                        className="px-4 py-4 text-center text-gray-500"
                                    >
                                        No attendance recorded yet.
                                    </td>
                                </tr>
                            ) : (
                                attendanceHistory.map(([dateKey, status]) => {
                                    const { date, day } =
                                        formatHistoryDate(dateKey);
                                    return (
                                        <tr
                                            key={dateKey}
                                            className="hover:bg-gray-50"
                                        >
                                            <td className="px-4 py-2 whitespace-nowrap text-left text-gray-700">
                                                {day}
                                            </td>
                                            <td className="px-4 py-2 whitespace-nowrap text-center text-gray-700">
                                                {date}
                                            </td>
                                            <td
                                                className={`px-4 py-2 text-right font-semibold ${status === 'Present' ? 'text-green-700' : 'text-red-700'}`}
                                            >
                                                {status}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- Footer --- */}
                <div className="flex justify-end mt-6 pt-4 border-t">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Close
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};
