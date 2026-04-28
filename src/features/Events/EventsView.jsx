// src/features/Events/EventsView.jsx
import React, { useState, useMemo } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { EventForm } from './EventForm.jsx';
import { GalleryModal } from './GalleryModal.jsx';
import { EventRosterModal } from './EventRosterModal.jsx';
import { ModalOverlay } from '../../components/ui/ModalOverlay.jsx';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal.jsx';
import { ErrorDisplay } from '../../components/ui/ErrorDisplay.jsx';
import { deleteItem } from '../../firebase/firestoreService.js';
import { Megaphone, Plus, Image, Edit, Trash2, List } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { toast } from 'react-toastify';


export const EventsView = ({ events }) => {
    const { userRole, userEnrollmentId } = useAuthContext();
    const { cadets } = useDataContext();
    const currentCadet = useMemo(() => userRole === 'cadet' && userEnrollmentId ? cadets.find((c) => c.enrollmentId === userEnrollmentId) : null, [cadets, userRole, userEnrollmentId]);
    const currentCadetId = currentCadet?.id;

    const [eventTab, setEventTab] = useState('upcoming');
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [editingEvent, setEditingEvent] = useState(null);
    const [viewingGalleryEvent, setViewingGalleryEvent] = useState(null);
    const [managingRosterEventId, setManagingRosterEventId] = useState(null);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [error, setError] = useState(null);

    const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
    const upcomingEvents = useMemo(() => events.filter((e) => e.date && e.date >= today).sort((a, b) => (a.date?.getTime() || 0) - (b.date?.getTime() || 0)), [events, today]);
    const pastEvents = useMemo(() => events.filter((e) => e.date && e.date < today).sort((a, b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0)), [events, today]);

    const handleModalClose = () => { setIsAddingEvent(false); setEditingEvent(null); setItemToDelete(null); setViewingGalleryEvent(null); setManagingRosterEventId(null); setError(null); };
    const handleDeleteConfirm = async () => {
        setError(null);
        if (!itemToDelete) return;
        try { await deleteItem(itemToDelete.type, itemToDelete.id); handleModalClose(); toast.success('Event deleted successfully.'); }
        catch (e) { setError(e.message); toast.error(`Delete failed: ${e.message}`); }
    };

    const EventList = ({ eventList }) => (
        <div className="space-y-3 mt-3">
            {eventList.length === 0 ? (
                <p className="text-gray-400 text-center py-6 text-sm italic">No events found.</p>
            ) : eventList.map((event) => {
                const myStatus = event.attendeeStatus?.[currentCadetId];
                const isPast = event.date < today;
                const confirmedCount = Object.values(event.attendeeStatus || {}).filter((s) => s === 'confirmed').length;
                return (
                    <div key={event.id} className="ncc-card p-4 hover:shadow-md transition">
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0 pr-2">
                                <h4 className="font-bold text-ncc-navy text-sm leading-tight font-display">{event.name}</h4>
                                <p className="text-xs text-gray-400 mt-0.5">{formatDate(event.date)}{event.location ? ` · ${event.location}` : ''}</p>
                            </div>
                            {userRole === 'cadet' && !isPast && myStatus === 'confirmed' && (
                                <span className="flex-shrink-0 pill-present">✓ Registered</span>
                            )}
                        </div>
                        {event.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{event.description}</p>}
                        <div className="flex flex-wrap gap-1.5 mt-2">
                            <button onClick={() => setViewingGalleryEvent(event)} className="ncc-btn ncc-btn-ghost ncc-btn-sm">
                                <Image className="w-3 h-3" /> Gallery ({event.imageUrls?.length || 0})
                            </button>
                            {userRole === 'admin' && (
                                <>
                                    <button onClick={() => setManagingRosterEventId(event.id)} className="ncc-btn ncc-btn-primary ncc-btn-sm">
                                        <List className="w-3 h-3" /> Roster ({confirmedCount})
                                    </button>
                                    <button onClick={() => setEditingEvent(event)} className="p-1.5 text-ncc-navy hover:bg-ncc-navy/10 rounded-lg transition">
                                        <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => setItemToDelete({ type: 'events', id: event.id, name: event.name })} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition">
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            {(isAddingEvent || editingEvent) && (<ModalOverlay><EventForm currentEvent={editingEvent} onSaveSuccess={handleModalClose} onCancel={handleModalClose} /></ModalOverlay>)}
            {viewingGalleryEvent && <GalleryModal event={viewingGalleryEvent} onClose={handleModalClose} />}
            {managingRosterEventId && <EventRosterModal eventId={managingRosterEventId} onClose={handleModalClose} />}
            {itemToDelete && <ConfirmationModal itemType={itemToDelete.type} itemName={itemToDelete.name} onConfirm={handleDeleteConfirm} onCancel={handleModalClose} />}

            <div className="ncc-card overflow-hidden">
                <div className="flex justify-between items-center p-5 border-b border-[#ddd8cc]">
                    <h2 className="ncc-section-title"><Megaphone className="w-5 h-5 text-ncc-gold" /> Events</h2>
                    {userRole === 'admin' && (
                        <button onClick={() => setIsAddingEvent(true)} className="ncc-btn ncc-btn-primary ncc-btn-sm">
                            <Plus className="w-3.5 h-3.5" /> Add Event
                        </button>
                    )}
                </div>
                <div className="p-5">
                    {error && <div className="mb-3"><ErrorDisplay message={error} /></div>}
                    <div className="ncc-filter-group mb-4 w-full">
                        <button onClick={() => setEventTab('upcoming')} className={`ncc-filter-btn flex-1 justify-center ${eventTab === 'upcoming' ? 'active' : ''}`}>Upcoming ({upcomingEvents.length})</button>
                        <button onClick={() => setEventTab('past')} className={`ncc-filter-btn flex-1 justify-center ${eventTab === 'past' ? 'active' : ''}`}>Past ({pastEvents.length})</button>
                    </div>
                    {eventTab === 'upcoming' ? <EventList eventList={upcomingEvents} /> : <EventList eventList={pastEvents} />}
                </div>
            </div>
        </>
    );
};
