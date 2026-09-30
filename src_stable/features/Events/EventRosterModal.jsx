// src/features/Events/EventRosterModal.jsx
import React, { useState, useMemo } from 'react';
import { useDataContext } from '../../context/DataContext.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
// Removed FileWord from imports
import {
    XCircle,
    UserCheck,
    UserX,
    Loader,
    Search,
    Users,
    CheckCircle,
    Download,
    Filter,
} from '../../components/Icons.jsx';
import { setEventAttendeeStatus, setEventAttendeeBulk } from '../../firebase/firestoreService.js';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import { sendPushToUser } from '../../firebase/pushNotifications.js';

// Helper component for a single cadet row
const CadetRow = ({ cadet, event, isSelected, onToggleSelection }) => {
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
                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition"
            >
                <UserX className="w-4 h-4 text-red-500" />
            </button>
        );
    } else {
        statusText = 'Not Invited';
        button = (
            <button
                onClick={() => handleSetStatus('confirmed')}
                title="Add to Event List"
                className="p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition"
            >
                <UserCheck className="w-4 h-4 text-emerald-600" />
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
            
            if (newStatus === 'confirmed') {
                try {
                    const enrollId = cadet.enrollmentId || cadet.regimentalNumber;
                    if (enrollId) {
                        sendPushToUser(enrollId, 'Event Roster', `You have been selected for the upcoming event: ${event.name}`, 'events');
                    }
                } catch (e) { console.error(e); }
            }
        } catch (e) {
            toast.error(`Failed to update: ${e.message}`);
        }
    };
    return (
        <tr className="hover:bg-gray-50 dark:hover:bg-[#0d2137] dark:bg-transparent transition-colors">
            <td className="px-4 py-3">
                <input 
                    type="checkbox" 
                    checked={isSelected} 
                    onChange={() => onToggleSelection(cadet.id)}
                    className="w-4 h-4 text-ncc-navy bg-gray-100 border-gray-300 rounded focus:ring-ncc-navy dark:focus:ring-ncc-navy dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
            </td>
            <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white whitespace-nowrap">
                {cadet.name}
            </td>
            <td className="px-4 py-3 text-sm text-gray-500 dark:text-white/70 whitespace-nowrap">
                {cadet.enrollmentId || cadet.regimentalNumber || 'N/A'}
            </td>
            <td className="px-4 py-3 text-sm text-gray-700 dark:text-white/90">
                <span
                    className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                            : 'bg-gray-100 dark:bg-[#0d2137] text-gray-600 dark:text-white/80'
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
    const [statusTab, setStatusTab] = useState('all'); // 'all', 'confirmed', 'unselected'
    const [selectedCertificate, setSelectedCertificate] = useState('All');
    const [selectedDivision, setSelectedDivision] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCadets, setSelectedCadets] = useState(new Set());
    const [isBulkProcessing, setIsBulkProcessing] = useState(false);

    const event = useMemo(
        () => events.find((e) => e.id === eventId),
        [events, eventId]
    );

    const sortedCadets = cadets;

    const confirmedCadets = useMemo(() => {
        if (!event) return [];
        return sortedCadets.filter(
            (cadet) => event.attendeeStatus?.[cadet.id] === 'confirmed'
        );
    }, [sortedCadets, event]);

    const filteredCadets = useMemo(() => {
        let list = [...sortedCadets];
        
        // Status filter: All, Confirmed (Selected), or Unselected
        if (statusTab === 'confirmed') {
            list = list.filter((cadet) => event?.attendeeStatus?.[cadet.id] === 'confirmed');
        } else if (statusTab === 'unselected') {
            list = list.filter((cadet) => event?.attendeeStatus?.[cadet.id] !== 'confirmed');
        }

        if (selectedCertificate !== 'All') {
            list = list.filter(
                (cadet) => (cadet.currentCertificate || cadet.certificate) === selectedCertificate
            );
        }
        if (selectedDivision !== 'All') {
            list = list.filter((cadet) => {
                const regNo = cadet.enrollmentId || cadet.regimentalNumber || '';
                return regNo.includes(selectedDivision);
            });
        }
        if (searchTerm) {
            const lowerSearch = searchTerm.toLowerCase();
            list = list.filter(
                (cadet) =>
                    (cadet.name || '').toLowerCase().includes(lowerSearch) ||
                    (cadet.enrollmentId || cadet.regimentalNumber || '').toLowerCase().includes(lowerSearch) ||
                    (cadet.jntuNo || '').toLowerCase().includes(lowerSearch)
            );
        }
        return list;
    }, [sortedCadets, event, statusTab, selectedCertificate, selectedDivision, searchTerm]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedCadets(new Set(filteredCadets.map(c => c.id)));
        } else {
            setSelectedCadets(new Set());
        }
    };

    const handleToggleSelection = (cadetId) => {
        const newSet = new Set(selectedCadets);
        if (newSet.has(cadetId)) {
            newSet.delete(cadetId);
        } else {
            newSet.add(cadetId);
        }
        setSelectedCadets(newSet);
    };

    const handleBulkAction = async (status) => {
        if (selectedCadets.size === 0) {
            toast.warn('No cadets selected');
            return;
        }
        setIsBulkProcessing(true);
        try {
            const cadetIdsArray = Array.from(selectedCadets);
            // Assuming setEventAttendeeBulk is implemented in firestoreService
            // If not, we can loop over them. Since we added it, let's use it.
            try {
                await setEventAttendeeBulk(event.id, cadetIdsArray, status);
                toast.success(`Successfully ${status === 'confirmed' ? 'added to list' : 'removed from list'}`);
                
                if (status === 'confirmed') {
                    try {
                        cadetIdsArray.forEach(id => {
                            const cadet = cadets.find(c => c.id === id);
                            const enrollId = cadet?.enrollmentId || cadet?.regimentalNumber;
                            if (enrollId) {
                                sendPushToUser(enrollId, 'Event Roster', `You have been selected for the upcoming event: ${event.name}`, 'events');
                            }
                        });
                    } catch (e) { console.error(e); }
                }

                setSelectedCadets(new Set());
                setIsBulkProcessing(false);
            } catch (fallbackError) {
                // Fallback if bulk import fails
                for (const cadetId of cadetIdsArray) {
                    await setEventAttendeeStatus(event.id, cadetId, status);
                }
                toast.success(`Successfully processed ${cadetIdsArray.length} cadets`);
                
                if (status === 'confirmed') {
                    try {
                        cadetIdsArray.forEach(id => {
                            const cadet = cadets.find(c => c.id === id);
                            const enrollId = cadet?.enrollmentId || cadet?.regimentalNumber;
                            if (enrollId) {
                                sendPushToUser(enrollId, 'Event Roster', `You have been selected for the upcoming event: ${event.name}`, 'events');
                            }
                        });
                    } catch (e) { console.error(e); }
                }

                setSelectedCadets(new Set());
                setIsBulkProcessing(false);
            }
        } catch (error) {
            toast.error(`Failed to process: ${error.message}`);
            setIsBulkProcessing(false);
        }
    };

    const getFormattedEventDate = (dateVal) => {
        if (!dateVal) return 'N/A';
        try {
            if (dateVal.toDate && typeof dateVal.toDate === 'function') {
                return format(dateVal.toDate(), 'dd-MM-yyyy');
            }
            if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
                return format(dateVal, 'dd-MM-yyyy');
            }
            const d = new Date(dateVal);
            if (!isNaN(d.getTime())) {
                return format(d, 'dd-MM-yyyy');
            }
        } catch (e) {
            console.error('Error formatting event date:', e);
        }
        return String(dateVal);
    };

    const exportCadets = useMemo(() => {
        if (!confirmedCadets) return [];
        if (selectedCertificate === 'All') return confirmedCadets;
        return confirmedCadets.filter((cadet) => {
            const cert = (cadet.currentCertificate || cadet.certificate || cadet.B || '').trim().toUpperCase();
            return cert === selectedCertificate.toUpperCase();
        });
    }, [confirmedCadets, selectedCertificate]);

    // Download Excel list for cadets selected only for this event (filtered by certificate)
    const handleDownloadExcel = (type) => {
        if (!exportCadets || exportCadets.length === 0) {
            toast.warn(`No selected cadets${selectedCertificate !== 'All' ? ` with ${selectedCertificate} Certificate` : ''} to export.`);
            return;
        }

        const eventVenue = event.location || event.venue || 'GMRIT, Rajam';
        const eventDate = getFormattedEventDate(event.date);

        // Sort in branch-wise order (primary: Branch, secondary: JNTU No. / Regimental No.)
        const sortedCadets = [...exportCadets].sort((a, b) => {
            const branchA = (a.branch || '').trim().toUpperCase();
            const branchB = (b.branch || '').trim().toUpperCase();
            const branchCompare = branchA.localeCompare(branchB);
            if (branchCompare !== 0) return branchCompare;

            if (type === 'jntu') {
                const idA = (a.jntuNo || a.jntuNumber || a.name || '').trim().toUpperCase();
                const idB = (b.jntuNo || b.jntuNumber || b.name || '').trim().toUpperCase();
                return idA.localeCompare(idB);
            } else {
                const idA = (a.regimentalNumber || a.enrollmentId || a.name || '').trim().toUpperCase();
                const idB = (b.regimentalNumber || b.enrollmentId || b.name || '').trim().toUpperCase();
                return idA.localeCompare(idB);
            }
        });

        const rows = sortedCadets.map((cadet, index) => {
            if (type === 'jntu') {
                return {
                    'S.No.': index + 1,
                    'JNTU No.': cadet.jntuNo || cadet.jntuNumber || '',
                    'Name of the Cadet': cadet.name || '',
                    'Branch': cadet.branch || '',
                    'Venue': eventVenue,
                    'Date': eventDate,
                };
            } else {
                return {
                    'S.No.': index + 1,
                    'Regimental No.': cadet.regimentalNumber || cadet.enrollmentId || '',
                    'Name of the Cadet': cadet.name || '',
                    'Branch': cadet.branch || '',
                    'Venue': eventVenue,
                    'Date': eventDate,
                };
            }
        });

        const worksheet = XLSX.utils.json_to_sheet(rows);

        // Adjust column widths for clean readability
        worksheet['!cols'] = [
            { wch: 8 },  // S.No.
            { wch: type === 'jntu' ? 18 : 22 }, // JNTU No. / Regimental No.
            { wch: 28 }, // Name of the Cadet
            { wch: 14 }, // Branch
            { wch: 24 }, // Venue
            { wch: 14 }, // Date
        ];

        const workbook = XLSX.utils.book_new();
        const certTag = selectedCertificate !== 'All' ? `_${selectedCertificate}` : '';
        const sheetName = type === 'jntu' ? `Cadets_JNTU${certTag}` : `Cadets_Regimental${certTag}`;
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName.substring(0, 31));

        const sanitizedEventName = (event.name || 'Event')
            .replace(/[/\\?%*:|"<>]/g, '_')
            .trim();
        const fileName = `${sanitizedEventName}${certTag}_${type === 'jntu' ? 'JNTU' : 'Regimental_No'}.xlsx`;

        XLSX.writeFile(workbook, fileName);
        toast.success(`Excel downloaded: ${exportCadets.length} cadet(s) (${selectedCertificate === 'All' ? 'All Certs' : `${selectedCertificate} Cert`}).`);
    };

    // --- Removed handleWordDownload function ---

    // Safety check
    if (!event) {
        return (
            <ModalOverlay wide={true}>
                <div className="p-6 bg-white dark:bg-[#050b14] rounded-xl shadow-2xl max-h-[80vh] flex flex-col items-center justify-center">
                    <Loader className="animate-spin h-8 w-8 text-indigo-600" />
                    <p className="mt-4 text-gray-600 dark:text-white/80">Loading Event Data...</p>
                </div>
            </ModalOverlay>
        );
    }

    return (
        <ModalOverlay wide={true}>
            <div className="p-6 bg-white dark:bg-[#050b14] rounded-xl shadow-2xl max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex justify-between items-center mb-4 border-b pb-3">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Manage Roster: {event.name}
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-white/60 mt-0.5">
                            Select, review, and manage cadets registered for this event
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        title="Close"
                        className="text-gray-400 dark:text-white/80 hover:text-gray-600 dark:text-white/80 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition"
                    >
                        <XCircle className="w-6 h-6" />
                    </button>
                </div>

                {/* Primary Status Tabs (All vs Selected vs Unselected) */}
                <div className="flex bg-gray-100 dark:bg-[#0d2137] p-1.5 rounded-2xl mb-4 border border-gray-200 dark:border-white/10 shadow-inner gap-1">
                    <button
                        type="button"
                        onClick={() => { setStatusTab('all'); setSelectedCadets(new Set()); }}
                        className={`flex-1 py-2.5 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                            statusTab === 'all'
                                ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-white/60 hover:text-ncc-navy dark:hover:text-white'
                        }`}
                    >
                        <Users className="w-4 h-4" />
                        <span>All Cadets</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            statusTab === 'all'
                                ? 'bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white'
                                : 'bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-white/60'
                        }`}>
                            {sortedCadets.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setStatusTab('confirmed'); setSelectedCadets(new Set()); }}
                        className={`flex-1 py-2.5 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                            statusTab === 'confirmed'
                                ? 'bg-emerald-600 text-white shadow-md'
                                : 'text-gray-600 dark:text-white/60 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                    >
                        <UserCheck className="w-4 h-4" />
                        <span>Selected Cadets</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            statusTab === 'confirmed'
                                ? 'bg-white/20 text-white'
                                : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300'
                        }`}>
                            {confirmedCadets.length}
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={() => { setStatusTab('unselected'); setSelectedCadets(new Set()); }}
                        className={`flex-1 py-2.5 px-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all flex items-center justify-center gap-2 ${
                            statusTab === 'unselected'
                                ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-md'
                                : 'text-gray-600 dark:text-white/60 hover:text-ncc-navy dark:hover:text-white'
                        }`}
                    >
                        <UserX className="w-4 h-4" />
                        <span>Unselected</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            statusTab === 'unselected'
                                ? 'bg-ncc-navy/10 dark:bg-white/10 text-ncc-navy dark:text-white'
                                : 'bg-gray-200 dark:bg-white/5 text-gray-600 dark:text-white/60'
                        }`}>
                            {Math.max(0, sortedCadets.length - confirmedCadets.length)}
                        </span>
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex space-x-1 bg-gray-100 dark:bg-[#0d2137] p-1 rounded-lg shadow-inner border border-gray-200 dark:border-white/10 flex-1 overflow-x-auto ncc-scrollbar">
                        {['All', 'B1', 'B2', 'C'].map((cert) => (
                            <button
                                key={cert}
                                onClick={() => setSelectedCertificate(cert)}
                                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition duration-150 whitespace-nowrap ${
                                    selectedCertificate === cert
                                        ? 'bg-ncc-navy dark:bg-white text-white dark:text-ncc-navy shadow-md'
                                        : 'text-gray-700 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                            >
                                {cert === 'All' ? 'All Certs' : `${cert} Cert`}
                            </button>
                        ))}
                    </div>
                    <div className="flex space-x-1 bg-gray-100 dark:bg-[#0d2137] p-1 rounded-lg shadow-inner border border-gray-200 dark:border-white/10 flex-1 overflow-x-auto ncc-scrollbar">
                        {['All', 'SD', 'SW', 'JD', 'JW'].map((div) => (
                            <button
                                key={div}
                                onClick={() => setSelectedDivision(div)}
                                className={`px-3 py-1.5 text-xs sm:text-sm font-bold rounded-md transition duration-150 whitespace-nowrap ${
                                    selectedDivision === div
                                        ? 'bg-ncc-navy dark:bg-white text-white dark:text-ncc-navy shadow-md'
                                        : 'text-gray-700 dark:text-white/80 hover:bg-gray-200 dark:hover:bg-white/10'
                                }`}
                            >
                                {div === 'All' ? 'All Divs' : div}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search Bar & Bulk Actions */}
                <div className="mb-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="relative flex-1 w-full">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400 dark:text-white/80" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by Name or Enrollment ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-white/20 rounded-lg leading-5 bg-white dark:bg-[#050b14] dark:text-white placeholder-gray-500 focus:outline-none focus:ring-ncc-navy focus:border-ncc-navy sm:text-sm"
                        />
                    </div>
                    
                    {selectedCadets.size > 0 && (
                        <div className="flex items-center gap-2 bg-ncc-navy/5 dark:bg-white/5 p-1.5 rounded-lg border border-ncc-navy/10 dark:border-white/10 animate-fade-in w-full md:w-auto">
                            <span className="text-xs font-bold text-ncc-navy dark:text-white px-2 whitespace-nowrap">
                                {selectedCadets.size} selected
                            </span>
                            <button 
                                onClick={() => handleBulkAction('confirmed')}
                                disabled={isBulkProcessing}
                                className="px-3 py-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 text-xs font-bold flex items-center transition disabled:opacity-50"
                            >
                                {isBulkProcessing ? <Loader className="w-3 h-3 animate-spin mr-1"/> : <UserCheck className="w-3 h-3 mr-1" />}
                                Add to Event
                            </button>
                            <button 
                                onClick={() => handleBulkAction(null)}
                                disabled={isBulkProcessing}
                                className="px-3 py-1.5 bg-gray-200 text-gray-700 dark:bg-white/10 dark:text-white dark:hover:bg-white/20 rounded hover:bg-gray-300 text-xs font-bold flex items-center transition disabled:opacity-50"
                            >
                                {isBulkProcessing ? <Loader className="w-3 h-3 animate-spin mr-1"/> : <UserX className="w-3 h-3 mr-1" />}
                                Remove
                            </button>
                        </div>
                    )}
                </div>

                {/* Table container */}
                <div className="flex-grow overflow-y-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-white/10">
                        <thead className="bg-gray-50 dark:bg-[#0a1628] sticky top-0 border-b border-gray-200 dark:border-white/10">
                            <tr>
                                <th className="px-4 py-3 text-left w-10">
                                    <input 
                                        type="checkbox" 
                                        checked={filteredCadets.length > 0 && selectedCadets.size === filteredCadets.length}
                                        onChange={handleSelectAll}
                                        className="w-4 h-4 text-ncc-navy bg-gray-100 border-gray-300 rounded focus:ring-ncc-navy dark:focus:ring-ncc-navy dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-black text-gray-500 dark:text-white/70 uppercase tracking-wider">
                                    Name
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-white/70 uppercase tracking-wider">
                                    Enrollment ID
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-white/70 uppercase tracking-wider">
                                    Status
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 dark:text-white/70 uppercase tracking-wider">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-[#050b14] divide-y divide-gray-200 dark:divide-white/10">
                            {filteredCadets.length > 0 ? (
                                filteredCadets.map((cadet) => (
                                    <CadetRow
                                        key={cadet.id}
                                        cadet={cadet}
                                        event={event}
                                        isSelected={selectedCadets.has(cadet.id)}
                                        onToggleSelection={handleToggleSelection}
                                    />
                                ))
                            ) : (
                                <tr>
                                    <td
                                        colSpan="5"
                                        className="px-4 py-12 text-center text-gray-500 dark:text-white/70"
                                    >
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            {statusTab === 'confirmed' ? (
                                                <>
                                                    <UserCheck className="w-8 h-8 text-emerald-500/50" />
                                                    <p className="font-bold text-sm text-gray-700 dark:text-white">No Cadets Selected Yet</p>
                                                    <p className="text-xs text-gray-400 dark:text-white/60">Switch to the "All Cadets" or "Unselected" tab to select cadets for this event.</p>
                                                </>
                                            ) : statusTab === 'unselected' ? (
                                                <>
                                                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                                                    <p className="font-bold text-sm text-gray-700 dark:text-white">All Cadets Selected</p>
                                                    <p className="text-xs text-gray-400 dark:text-white/60">All cadets matching your filters are already added to this event roster.</p>
                                                </>
                                            ) : (
                                                <>
                                                    <Users className="w-8 h-8 text-gray-400" />
                                                    <p className="font-bold text-sm text-gray-700 dark:text-white">No Cadets Found</p>
                                                    <p className="text-xs text-gray-400 dark:text-white/60">No cadets match the selected certificates or search criteria.</p>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* --- MODIFIED FOOTER (Download Excel Buttons & Done) --- */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-white/10">
                    <div className="flex flex-wrap items-center gap-2">
                        {/* Certificate Filter for Excel */}
                        <div className="flex items-center gap-1.5 bg-gray-100 dark:bg-white/5 px-2.5 py-2 rounded-xl border border-gray-200 dark:border-white/10">
                            <Filter className="w-3.5 h-3.5 text-ncc-gold flex-shrink-0" />
                            <span className="text-[11px] font-bold text-gray-500 dark:text-white/60">Cert:</span>
                            <select
                                value={selectedCertificate}
                                onChange={(e) => setSelectedCertificate(e.target.value)}
                                className="bg-transparent text-xs font-bold text-ncc-navy dark:text-white focus:outline-none cursor-pointer"
                            >
                                <option value="All" className="dark:bg-[#050b14]">All Certs</option>
                                <option value="B1" className="dark:bg-[#050b14]">B1 Cert</option>
                                <option value="B2" className="dark:bg-[#050b14]">B2 Cert</option>
                                <option value="C" className="dark:bg-[#050b14]">C Cert</option>
                            </select>
                        </div>

                        <button
                            type="button"
                            onClick={() => handleDownloadExcel('jntu')}
                            disabled={statusTab !== 'confirmed' || exportCadets.length === 0}
                            title={
                                statusTab !== 'confirmed'
                                    ? "Switch to 'Selected Cadets' tab to enable download"
                                    : exportCadets.length === 0
                                    ? `No selected cadets with ${selectedCertificate === 'All' ? '' : selectedCertificate + ' '}certificate to export`
                                    : `Download Excel with JNTU Numbers (${exportCadets.length} ${selectedCertificate === 'All' ? 'selected' : selectedCertificate} cadets)`
                            }
                            className={`flex items-center px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm ${
                                statusTab === 'confirmed' && exportCadets.length > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-emerald-500/20'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 border border-gray-200 dark:border-white/10 cursor-not-allowed'
                            }`}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Excel(JNTU) {selectedCertificate !== 'All' ? `(${selectedCertificate})` : ''}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleDownloadExcel('regimental')}
                            disabled={statusTab !== 'confirmed' || exportCadets.length === 0}
                            title={
                                statusTab !== 'confirmed'
                                    ? "Switch to 'Selected Cadets' tab to enable download"
                                    : exportCadets.length === 0
                                    ? `No selected cadets with ${selectedCertificate === 'All' ? '' : selectedCertificate + ' '}certificate to export`
                                    : `Download Excel with Regimental Numbers (${exportCadets.length} ${selectedCertificate === 'All' ? 'selected' : selectedCertificate} cadets)`
                            }
                            className={`flex items-center px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all shadow-sm ${
                                statusTab === 'confirmed' && exportCadets.length > 0
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-95 shadow-emerald-500/20'
                                    : 'bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/30 border border-gray-200 dark:border-white/10 cursor-not-allowed'
                            }`}
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Excel(Regimental number) {selectedCertificate !== 'All' ? `(${selectedCertificate})` : ''}
                        </button>
                        {statusTab !== 'confirmed' && (
                            <span className="text-[11px] font-medium text-gray-400 dark:text-white/40 italic ml-1">
                                (Enable in Selected Cadets)
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 text-sm font-bold bg-ncc-navy text-white hover:bg-ncc-navy/90 dark:bg-white dark:text-ncc-navy dark:hover:bg-gray-100 rounded-xl shadow-sm transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </ModalOverlay>
    );
};
