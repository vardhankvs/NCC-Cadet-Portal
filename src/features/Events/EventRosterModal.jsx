// src/features/Events/EventRosterModal.jsx
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
// Removed FileWord from imports
import {
    XCircle,
    UserCheck,
    UserX,
    Printer,
    Loader,
    Search,
} from '../../components/Icons.jsx';
import { setEventAttendeeStatus } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
// Removed html-to-docx and file-saver imports

// Helper component for a single cadet row (no change)
const CadetRow = ({ cadet, event }) => {
    // ... (This component's code remains exactly the same) ...
    const status = event.attendeeStatus?.[cadet.id] || null;
    let statusText = 'Not Invited';
    let button = null;
    if (status === 'confirmed') {
        statusText = 'Registered (Confirmed)';
        button = (
            <button
                onClick={() => handleSetStatus(null)}
                title="Remove from List"
            >
                {' '}
                <UserX className="w-4 h-4" />{' '}
            </button>
        );
    } else {
        statusText = 'Not Invited';
        button = (
            <button
                onClick={() => handleSetStatus('confirmed')}
                title="Add to Event List"
            >
                {' '}
                <UserCheck className="w-4 h-4" />{' '}
            </button>
        );
    }
    const handleSetStatus = async (newStatus) => {
        try {
            await setEventAttendeeStatus(event.id, cadet.id, newStatus);
            const action =
                newStatus === 'confirmed'
                    ? 'Added to list'
                    : 'Removed from list';
            toast.success(`${action}: ${cadet.name}`);
        } catch (e) {
            toast.error(`Failed to update: ${e.message}`);
        }
    };
    return (
        <tr className="hover:bg-gray-50">
            <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                {cadet.name}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                {cadet.enrollmentId}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700">
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        status === 'confirmed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-600'
                    }`}
                >
                    {statusText}
                </span>
            </td>
            <td className="px-4 py-3 text-center">{button}</td>
        </tr>
    );
};

export const EventRosterModal = ({ eventId, onClose }) => {
    const { cadets, events } = useDataContext();
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    // Removed isDownloadingWord state

    const event = useMemo(
        () => events.find((e) => e.id === eventId),
        [events, eventId]
    );

    const sortedCadets = cadets;

    const filteredCadets = useMemo(() => {
        let list = [...sortedCadets];
        if (selectedCertificate !== 'All') {
            list = list.filter(
                (cadet) => cadet.certificate === selectedCertificate
            );
        }
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            list = list.filter(
                (cadet) =>
                    cadet.name.toLowerCase().includes(lowerSearch) ||
                    cadet.enrollmentId.toLowerCase().includes(lowerSearch)
            );
        }
        return list;
    }, [sortedCadets, selectedCertificate, searchTerm]);

    const confirmedCadets = useMemo(() => {
        if (!event) return [];
        return sortedCadets.filter(
            (cadet) => event.attendeeStatus?.[cadet.id] === 'confirmed'
        );
    }, [sortedCadets, event]);

    // This function generates the HTML for the print page
    const generatePrintHtml = () => {
        const eventName = event.name || 'Event';
        const eventVenue = event.location || 'GMRIT, Rajam';
        const eventDate = event.date ? format(event.date, 'dd-MM-yyyy') : 'N/A';
        const confirmedCount =
            confirmedCadets.length > 0 ? confirmedCadets.length : 1;

        const cadetRows =
            confirmedCadets.length > 0
                ? confirmedCadets
                      .map((cadet, index) => {
                          const jntuNo = cadet.jntuNo || '';
                          const branch = cadet.branch || '';
                          if (index === 0) {
                              return `
                    <tr>
                        <td style="border: 1px solid #000; padding: 8px;">${
                            index + 1
                        }</td>
                        <td style="border: 1px solid #000; padding: 8px;">${jntuNo}</td>
                        <td style="border: 1px solid #000; padding: 8px;">${
                            cadet.name
                        }</td>
                        <td style="border: 1px solid #000; padding: 8px;">${branch}</td>
                        <td style="border: 1px solid #000; padding: 8px; vertical-align: middle; text-align: center;" rowspan="${confirmedCount}">
                            ${eventVenue}
                        </td>
                        <td style="border: 1px solid #000; padding: 8px; vertical-align: middle; text-align: center;" rowspan="${confirmedCount}">
                            ${eventDate}
                        </td>
                    </tr>
                `;
                          }
                          return `
                <tr>
                    <td style="border: 1px solid #000; padding: 8px;">${
                        index + 1
                    }</td>
                    <td style="border: 1px solid #000; padding: 8px;">${jntuNo}</td>
                    <td style="border: 1px solid #000; padding: 8px;">${
                        cadet.name
                    }</td>
                    <td style="border: 1px solid #000; padding: 8px;">${branch}</td>
                </tr>
            `;
                      })
                      .join('')
                : '<tr><td colspan="6" style="text-align: center;">No cadets have confirmed registration.</td></tr>';

        return `
            <html>
            <head>
                <title>Event Roster - ${eventName}</title>
                <style>
                    @page { size: auto; margin: 0; }
                    body { font-family: Arial, sans-serif; }
                    .print-container { padding: 20px; }
                    h1 { text-align: center; color: #333; font-size: 20px; }
                    h2 { text-align: center; color: #555; font-size: 16px; }
                    p { font-size: 14px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
                    th, td { border: 1px solid #000; padding: 8px; text-align: left; vertical-align: top; }
                    th { background-color: #f2f2f2; }
                    .signature-block { display: flex; justify-content: space-between; margin-top: 70px; font-weight: bold; font-size: 14px; }
                    @media print { .no-print { display: none; } }
                </style>
            </head>
            <body>
                <div class="print-container">
                    <h1>GMR INSTITUTE OF TECHNOLOGY</h1>
                    <h2 style="text-align: center;">Note Submitted to The Principal</h2>
                    <p><b>Sub:</b> Requested for Attendance Consideration for students Representing NCC (${eventName})</p>
                    <p>The following students will represent the NCC for the event:</p>
                    <table>
                        <thead>
                            <tr>
                                <th>S.No.</th>
                                <th>JNTU No.</th>
                                <th>Name of the Cadet</th>
                                <th>Branch</th>
                                <th>Venue</th>
                                <th>Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${cadetRows}
                        </tbody>
                    </table>
                    <br/><br/>
                    <div class="signature-block">
                        <span>Care Taker</span>
                        <span>Associative Dean (Students Affairs)</span>
                        <span>Principal</span>
                    </div>
                    <button class="no-print" onclick="window.print()" style="margin-top: 20px; padding: 10px 15px; font-size: 16px; cursor: pointer;">
                        Download (as PDF)
                    </button>
                </div>
            </body>
            </html>
        `;
    };

    // Handle Print (PDF) Function
    const handlePrint = () => {
        const printHtml = generatePrintHtml();
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(printHtml);
            printWindow.document.close();
        } else {
            toast.error(
                'Could not open print window. Please check your pop-up blocker.'
            );
        }
    };

    // --- Removed handleWordDownload function ---

    // Safety check
    if (!event) {
        return (
            <ModalOverlay wide={true}>
                <div className="p-6 bg-white rounded-xl shadow-2xl max-h-[80vh] flex flex-col items-center justify-center">
                    <Loader className="animate-spin h-8 w-8 text-indigo-600" />
                    <p className="mt-4 text-gray-600">Loading Event Data...</p>
                </div>
            </ModalOverlay>
        );
    }

    return (
        <ModalOverlay wide={true}>
            <div className="p-6 bg-white rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <h2 className="text-2xl font-bold text-gray-900">
                        Manage Roster: {event.name}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg shadow-inner border border-gray-200 flex-shrink-0 mb-4">
                    {['All', 'B1', 'B2', 'C'].map((cert) => (
                        <button
                            key={cert}
                            onClick={() => setSelectedCertificate(cert)}
                            className={`px-3 py-1 text-xs sm:text-sm font-medium rounded-md transition duration-150 whitespace-nowrap ${
                                selectedCertificate === cert
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'text-gray-700 hover:bg-gray-200 hover:text-indigo-700'
                            }`}
                        >
                            {cert === 'All' ? 'All' : `${cert} Cert`}
                        </button>
                    ))}
                </div>

                {/* Search Bar */}
                <div className="mb-4">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Name or Enrollment ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        />
                    </div>
                </div>

                {/* Table container */}
                <div className="flex-grow overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Enrollment ID
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredCadets.length > 0 ? (
                                filteredCadets.map((cadet) => (
                                    <CadetRow
                                        key={cadet.id}
                                        cadet={cadet}
                                        event={event}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="4"
                                        className="px-4 py-4 text-center text-gray-500"
                                    >
                                        No cadets match your filters.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- MODIFIED FOOTER (Word button removed) --- */}
                <div className="flex justify-between items-center mt-6 pt-4 border-t">
                    <button
                        onClick={handlePrint}
                        disabled={confirmedCadets.length === 0}
                        className="flex items-center px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-gray-400"
                        title="Generate printable list (PDF)"
                    >
                        <Printer className="w-4 h-4 mr-2" />
                        Print List ({confirmedCadets.length} Confirmed)
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm bg-gray-200 rounded hover:bg-gray-300"
                    >
                        Done
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};
