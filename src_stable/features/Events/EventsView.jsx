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
import { Megaphone, Plus, ImageIcon, Edit, Trash2, List, Clock } from '../../components/Icons.jsx';
import { formatDate, isEventPast, getEventEndDateTime, getEventDisplayDate, parseEventDetails } from '../../utils/dateUtils.js';
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

    const now = new Date();
    const upcomingEvents = useMemo(() => {
        return (events || [])
            .filter((e) => !isEventPast(e, now))
            .sort((a, b) => getEventEndDateTime(a).getTime() - getEventEndDateTime(b).getTime());
    }, [events]);

    const pastEvents = useMemo(() => {
        return (events || [])
            .filter((e) => isEventPast(e, now))
            .sort((a, b) => getEventEndDateTime(b).getTime() - getEventEndDateTime(a).getTime());
    }, [events]);

    const handleModalClose = () => { setIsAddingEvent(false); setEditingEvent(null); setItemToDelete(null); setViewingGalleryEvent(null); setManagingRosterEventId(null); setError(null); };
    const handleDeleteConfirm = async () => {
        setError(null);
        if (!itemToDelete) return;
        try { await deleteItem(itemToDelete.type, itemToDelete.id); handleModalClose(); toast.success('Event deleted successfully.'); }
        catch (e) { setError(e.message); toast.error(`Delete failed: ${e.message}`); }
    };

    const EventList = ({ eventList }) => (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-4">
            {eventList.length === 0 ? (
                <div className="col-span-full text-center py-20 text-gray-400 dark:text-white/80 italic">No events found.</div>
            ) : eventList.map((event) => {
                const myStatus = event.attendeeStatus?.[currentCadetId];
                const isPast = isEventPast(event, now);
                const confirmedCount = Object.values(event.attendeeStatus || {}).filter((s) => s === 'confirmed').length;
                const eventDate = getEventDisplayDate(event.date || event.startDate);
                const month = eventDate.toLocaleString('default', { month: 'short' }).toUpperCase();
                const day = eventDate.getDate();
                const details = parseEventDetails(event);

                return (
                    <div key={event.id} className="ncc-card group hover:border-ncc-gold transition-all relative overflow-hidden flex flex-col min-h-[350px] bg-white dark:bg-[#050b14] border border-[#ddd8cc] dark:border-white/10 rounded-[1.75rem] shadow-sm hover:shadow-xl p-6 sm:p-7">
                        {userRole === 'cadet' && !isPast && myStatus === 'confirmed' && (
                            <div className="absolute top-0 right-0 bg-emerald-500 text-white text-[9px] font-black px-3 py-1 rounded-bl-xl shadow-md z-10 uppercase tracking-widest">
                                ✓ Registered
                            </div>
                        )}
                        
                        <div className="flex-1 flex flex-col">
                            {/* Card Header: Date & Title */}
                            <div className="flex gap-4 mb-3 items-start">
                                <div className="flex-shrink-0 w-14 h-14 bg-ncc-navy/5 dark:bg-white/5 rounded-2xl flex flex-col items-center justify-center border border-ncc-navy/10 dark:border-white/10 group-hover:bg-ncc-navy group-hover:border-ncc-navy transition-colors duration-300">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-ncc-gold mb-[-2px]">{month}</span>
                                    <span className="text-xl font-display font-bold text-ncc-navy dark:text-white group-hover:text-white">{day}</span>
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-bold text-ncc-navy dark:text-white text-lg leading-tight font-display mb-1 truncate" title={event.name}>
                                        {event.name}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-bold text-ncc-gold/80 uppercase tracking-widest">
                                        <span className="flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-ncc-gold"></span>
                                            {event.location || 'GMRIT NCC Office'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Tactical Parameters Strip: Activity | Time | Dress | Strength | Priority | Instructions */}
                            <div className="bg-gray-50 dark:bg-white/[0.03] border border-gray-200/70 dark:border-white/10 rounded-xl p-3 my-3 text-[11px] leading-relaxed text-gray-700 dark:text-white/80 font-medium">
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span className="font-black text-ncc-navy dark:text-ncc-gold uppercase tracking-wider">
                                        [{details.activityType}]
                                    </span>
                                    <span className="text-gray-300 dark:text-white/20">|</span>
                                    <span>
                                        <span className="text-gray-400 dark:text-white/50 font-bold uppercase text-[9px]">Time:</span> {details.time}
                                    </span>
                                    <span className="text-gray-300 dark:text-white/20">|</span>
                                    <span>
                                        <span className="text-gray-400 dark:text-white/50 font-bold uppercase text-[9px]">Dress:</span> {details.dress}
                                    </span>
                                    <span className="text-gray-300 dark:text-white/20">|</span>
                                    <span>
                                        <span className="text-gray-400 dark:text-white/50 font-bold uppercase text-[9px]">Strength:</span> {details.strength}
                                    </span>
                                    <span className="text-gray-300 dark:text-white/20">|</span>
                                    <span>
                                        <span className="text-gray-400 dark:text-white/50 font-bold uppercase text-[9px]">Priority:</span>{' '}
                                        <span className={details.priority === 'Mandatory' ? 'text-red-500 font-bold' : details.priority === 'High' ? 'text-amber-500 font-bold' : 'font-bold'}>
                                            {details.priority}
                                        </span>
                                    </span>
                                    <span className="text-gray-300 dark:text-white/20">|</span>
                                    <span>
                                        <span className="text-gray-400 dark:text-white/50 font-bold uppercase text-[9px]">Instructions:</span> {details.instructions}
                                    </span>
                                </div>
                            </div>

                            {/* Description of the particular event */}
                            {details.description ? (
                                <p className="text-xs text-gray-600 dark:text-white/70 mb-4 line-clamp-3 leading-relaxed whitespace-pre-line">
                                    {details.description}
                                </p>
                            ) : (
                                <p className="text-[11px] italic text-gray-400 dark:text-white/40 mb-4">
                                    No specific description entered for this event.
                                </p>
                            )}
                            
                            <div className="mt-auto pt-4 border-t border-gray-100 dark:border-white/10 flex flex-wrap gap-2 items-center justify-between">
                                <div className="flex gap-2">
                                    <button onClick={() => setViewingGalleryEvent(event)} className="p-2 rounded-xl bg-ncc-navy/5 text-ncc-navy hover:bg-ncc-navy/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 transition flex items-center justify-center relative group/btn" title="Gallery">
                                        <ImageIcon className="w-4 h-4" />
                                        {event.imageUrls?.length > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ncc-gold text-white text-[8px] font-black flex items-center justify-center">{event.imageUrls.length}</span>
                                        )}
                                    </button>
                                    {userRole === 'admin' && (
                                        <button onClick={() => setManagingRosterEventId(event.id)} className="p-2 rounded-xl bg-ncc-navy/5 text-ncc-navy hover:bg-ncc-navy/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10 transition flex items-center justify-center relative" title="Roster">
                                            <List className="w-4 h-4" />
                                            {confirmedCount > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ncc-navy text-white text-[8px] font-black flex items-center justify-center">{confirmedCount}</span>
                                            )}
                                        </button>
                                    )}
                                </div>
                                
                                {userRole === 'admin' && (
                                    <div className="flex gap-1">
                                        <button onClick={() => setEditingEvent(event)} className="p-2 text-gray-400 dark:text-white/80 hover:text-ncc-navy dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition" title="Edit Event Details">
                                            <Edit className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => setItemToDelete({ type: 'events', id: event.id, name: event.name })} className="p-2 text-gray-400 dark:text-white/80 hover:text-ncc-red hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition" title="Delete Event">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );

    return (
        <>
            {(isAddingEvent || editingEvent) && (
                <ModalOverlay>
                    <EventForm 
                        currentEvent={editingEvent} 
                        onSaveSuccess={handleModalClose} 
                        onCancel={handleModalClose} 
                        onManageGallery={() => { setViewingGalleryEvent(editingEvent); setEditingEvent(null); setIsAddingEvent(false); }}
                        onManageRoster={() => { setManagingRosterEventId(editingEvent.id); setEditingEvent(null); setIsAddingEvent(false); }}
                    />
                </ModalOverlay>
            )}
            {viewingGalleryEvent && <GalleryModal event={viewingGalleryEvent} onClose={handleModalClose} />}
            {managingRosterEventId && <EventRosterModal eventId={managingRosterEventId} onClose={handleModalClose} />}
            {itemToDelete && <ConfirmationModal itemType={itemToDelete.type} itemName={itemToDelete.name} onConfirm={handleDeleteConfirm} onCancel={handleModalClose} />}

            <div className="space-y-6 fade-in">
                <header className="bg-white dark:bg-[#050b14] p-6 rounded-2xl border border-[#ddd8cc] shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <h2 className="text-2xl font-display font-bold text-ncc-navy dark:text-white flex items-center gap-3">
                                <Megaphone className="w-8 h-8 text-ncc-gold" /> Unit Events
                            </h2>
                            <p className="text-gray-500 dark:text-white/70 text-sm">Manage upcoming activities, parades, and view past galleries.</p>
                        </div>
                        {userRole === 'admin' && (
                            <button onClick={() => setIsAddingEvent(true)} className="ncc-btn ncc-btn-primary px-4 py-3 text-xs font-black uppercase tracking-widest shadow-xl">
                                <Plus className="w-4 h-4 mr-2" /> Add Event
                            </button>
                        )}
                    </div>

                    <div className="flex bg-ncc-navy/5 dark:bg-white/5 p-1 rounded-xl mt-6 border border-ncc-navy/5 dark:border-white/5">
                        <button onClick={() => setEventTab('upcoming')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${eventTab === 'upcoming' ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-md' : 'text-ncc-navy dark:text-white/40 dark:hover:text-white hover:text-ncc-navy'}`}>
                            Upcoming ({upcomingEvents.length})
                        </button>
                        <button onClick={() => setEventTab('past')} className={`flex-1 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-lg transition-all ${eventTab === 'past' ? 'bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white shadow-md' : 'text-ncc-navy dark:text-white/40 dark:hover:text-white hover:text-ncc-navy'}`}>
                            Past ({pastEvents.length})
                        </button>
                    </div>
                </header>

                {error && <div className="mb-3"><ErrorDisplay message={error} /></div>}
                
                {eventTab === 'upcoming' ? <EventList eventList={upcomingEvents} /> : <EventList eventList={pastEvents} />}
            </div>
        </>
    );
};
