
import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Plus, Users, Shield, Bell, Download } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { DrillSchedulerForm } from './DrillSchedulerForm.jsx';
import { downloadICalFile } from '../../utils/icalExport.js';
import { sendEventReminderPush } from '../../firebase/pushNotifications.js';
import { toast } from 'react-toastify';

// Event type color map
const TYPE_COLORS = {
    Parade:           'bg-ncc-navy/5 text-ncc-navy dark:text-white border-ncc-navy/10',
    Exam:             'bg-red-50 text-red-700 border-red-100',
    Camp:             'bg-emerald-50 text-emerald-700 border-emerald-100',
    'Social Activity':'bg-purple-50 text-purple-700 border-purple-100',
    'NCC Day':        'bg-ncc-gold/10 text-ncc-navy dark:text-white border-ncc-gold/20',
    'Shooting Practice': 'bg-orange-50 text-orange-700 border-orange-100',
};

export const TrainingCalendarView = () => {
    const { userRole } = useAuthContext();
    const { events = [], cadets = [] } = useDataContext();
    const isAdmin = Boolean(userRole && userRole.toLowerCase() !== 'cadet');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedEvent, setSelectedEvent] = useState(null);

    const daysInMonth  = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year  = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    const calendarDays = [];
    for (let i = 0; i < firstDayOfMonth(year, month); i++) calendarDays.push(null);
    for (let i = 1; i <= daysInMonth(year, month); i++) calendarDays.push(i);

    const getEventsForDay = (day) => {
        if (!day) return [];
        return events.filter(e => {
            const d = e.date instanceof Date ? e.date : new Date(e.date || e.startDate);
            return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
        });
    };

    const handleDayClick = (day) => {
        if (!day || !isAdmin) return;
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        setSelectedDate(dateStr);
        setIsAddingEvent(true);
    };

    const upcomingOperations = events
        .filter(e => {
            const eventDate = new Date(e.date || e.startDate);
            const today = new Date(); today.setHours(0, 0, 0, 0);
            return eventDate >= today;
        })
        .sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate))
        .slice(0, 6);

    const handleExportIcal = (e, event) => {
        e.stopPropagation();
        downloadICalFile(event, { reminderMinutes: event.reminderMinutes || 60 });
        toast.success(`📅 "${event.name}" exported as .ics file!`, { autoClose: 2500 });
    };

    const handleSendReminder = async (e, event) => {
        e.stopPropagation();
        try {
            const time = event.time || (event.description?.match(/Time:\s*(\d{2}:\d{2})/)?.[1]) || '06:00';
            await sendEventReminderPush(event.name, time, event.location || 'Unit Ground', event.date);
            toast.success(`📣 Reminder sent to all cadets for "${event.name}"!`, { autoClose: 3000 });
        } catch (err) {
            toast.error('Failed to send reminder.');
        }
    };

    return (
        <div className="space-y-8 fade-in">
            <header className="bg-white dark:bg-[#050b14] p-8 rounded-3xl border border-ncc-navy/5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-display font-bold text-ncc-navy dark:text-white mb-2">Master Training Calendar</h2>
                    <p className="text-gray-500 dark:text-white/70">Unit-wide coordination for parades, exams, and deployments.</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => setIsAddingEvent(true)}
                        className="ncc-btn ncc-btn-primary flex items-center gap-2 px-6 py-4 shadow-xl shadow-ncc-navy/20"
                    >
                        <Plus className="w-4 h-4" /> Schedule Drill
                    </button>
                )}
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Calendar Grid */}
                <div className="lg:col-span-2 bg-white dark:bg-[#050b14] rounded-[2rem] border border-ncc-navy/5 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-ncc-navy/5 flex justify-between items-center bg-ncc-navy text-white">
                        <h3 className="text-xl font-display font-bold">
                            {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 text-center border-b border-ncc-navy/5 bg-ncc-navy/5">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="py-4 text-[10px] font-black uppercase tracking-widest text-ncc-navy dark:text-white/40">{d}</div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 flex-1">
                        {calendarDays.map((day, i) => {
                            const dayEvents = getEventsForDay(day);
                            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();

                            return (
                                <div
                                    key={i}
                                    onClick={() => handleDayClick(day)}
                                    className={`min-h-[64px] p-1 border-r border-b border-ncc-navy/5 transition-all flex flex-col ${!day ? 'bg-ncc-navy/[0.01]' : isAdmin ? 'cursor-pointer hover:bg-ncc-gold/10' : 'hover:bg-ncc-navy/[0.02]'}`}
                                >
                                    {day && (
                                        <>
                                            <span className={`text-[10px] font-black p-1 w-6 h-6 flex items-center justify-center rounded-md mb-1 ${isToday ? 'bg-ncc-gold text-ncc-navy' : 'text-ncc-navy dark:text-white/30'}`}>
                                                {day}
                                            </span>
                                            <div className="space-y-0.5 overflow-y-auto ncc-scrollbar pr-0.5">
                                                {dayEvents.map((e, idx) => (
                                                    <div
                                                        key={idx}
                                                        onClick={ev => { ev.stopPropagation(); setSelectedEvent(e); }}
                                                        className={`p-1.5 rounded-lg text-[9px] font-bold leading-tight border cursor-pointer hover:opacity-80 ${TYPE_COLORS[e.type] || TYPE_COLORS.Parade}`}
                                                    >
                                                        {e.name}
                                                        {e.reminderEnabled && <Bell className="w-2 h-2 inline ml-0.5 text-ncc-gold" />}
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Sidebar */}
                <div className="space-y-6">
                    {/* Upcoming Operations */}
                    <div className="ncc-card p-6">
                        <h4 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-5 flex items-center gap-2">
                            <Shield className="w-4 h-4 text-ncc-gold shrink-0" /> Upcoming Operations
                        </h4>
                        <div className="space-y-3">
                            {upcomingOperations.length === 0 ? (
                                <p className="text-[10px] text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest italic py-4">No upcoming operations.</p>
                            ) : (
                                upcomingOperations.map((e, idx) => (
                                    <div key={idx} className="group">
                                        <div className="flex gap-3 items-start">
                                            <div className="flex flex-col items-center shrink-0">
                                                <div className="w-11 h-11 rounded-xl bg-ncc-navy text-white flex flex-col items-center justify-center shadow-lg group-hover:bg-ncc-gold group-hover:text-ncc-navy dark:text-white transition-all">
                                                    <span className="text-[8px] font-black uppercase leading-none mb-0.5">
                                                        {new Date(e.date || e.startDate).toLocaleString('en-US', { month: 'short' })}
                                                    </span>
                                                    <span className="text-sm font-bold leading-none">
                                                        {new Date(e.date || e.startDate).getDate()}
                                                    </span>
                                                </div>
                                                {idx < upcomingOperations.length - 1 && <div className="w-0.5 flex-1 bg-ncc-navy/5 mt-1 h-4" />}
                                            </div>
                                            <div className="flex-1 pb-2 min-w-0">
                                                <h5 className="text-xs font-bold text-ncc-navy dark:text-white mb-0.5 line-clamp-1">{e.name}</h5>
                                                <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase">
                                                    <Clock className="w-3 h-3 shrink-0" /> {e.time || '06:00'}
                                                </div>
                                                <div className="flex items-start gap-1 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase mt-0.5">
                                                    <MapPin className="w-3 h-3 shrink-0 mt-0.5" />
                                                    <span className="break-words line-clamp-1">{e.location || 'Unit Ground'}</span>
                                                </div>
                                                {/* Action buttons */}
                                                <div className="flex items-center gap-2 mt-2">
                                                    <button
                                                        onClick={ev => handleExportIcal(ev, e)}
                                                        className="flex items-center gap-1 text-[10px] font-black text-ncc-navy dark:text-white/60 hover:text-ncc-gold transition-colors px-2 py-1 rounded-lg hover:bg-ncc-gold/10"
                                                        title="Export to Calendar"
                                                    >
                                                        <Download className="w-3 h-3" /> .ics
                                                    </button>
                                                    {isAdmin && (
                                                        <button
                                                            onClick={ev => handleSendReminder(ev, e)}
                                                            className="flex items-center gap-1 text-[10px] font-black text-ncc-navy dark:text-white/60 hover:text-ncc-gold transition-colors px-2 py-1 rounded-lg hover:bg-ncc-gold/10"
                                                            title="Send Reminder Push"
                                                        >
                                                            <Bell className="w-3 h-3" /> Remind
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-ncc-navy to-blue-950 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ncc-gold mb-2">Unit Status</p>
                        <h4 className="text-xl font-display font-bold leading-tight">
                            {upcomingOperations.length} Upcoming <span className="text-ncc-gold">Operations</span>
                        </h4>
                        <div className="mt-4 flex items-center gap-2">
                            <Users className="w-4 h-4 text-ncc-gold" />
                            <span className="text-xs font-bold text-white/60 uppercase">{cadets.length} Cadets Indexed Active</span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <Bell className="w-4 h-4 text-ncc-gold" />
                            <span className="text-xs font-bold text-white/60 uppercase">
                                {upcomingOperations.filter(e => e.reminderEnabled).length} Events with Reminders
                            </span>
                        </div>
                        <CalendarIcon className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 rotate-12" />
                    </div>
                </div>
            </div>

            {/* Event Detail Modal */}
            {selectedEvent && (
                <div className="fixed inset-0 bg-ncc-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white dark:bg-[#050b14] rounded-3xl max-w-md w-full shadow-2xl border border-ncc-navy/10 overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="bg-ncc-navy px-6 py-5 flex items-center justify-between">
                            <div>
                                <p className="text-ncc-gold text-[10px] font-black uppercase tracking-widest">{selectedEvent.type || 'Event'}</p>
                                <h3 className="text-white font-display font-bold text-lg">{selectedEvent.name}</h3>
                            </div>
                            <button onClick={() => setSelectedEvent(null)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all">
                                <span className="text-white text-lg font-bold">×</span>
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-50 dark:bg-[#0a1628] rounded-xl p-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 dark:text-white/40 mb-1">Date</p>
                                    <p className="text-sm font-bold text-ncc-navy dark:text-white">
                                        {new Date(selectedEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                                <div className="bg-gray-50 dark:bg-[#0a1628] rounded-xl p-3">
                                    <p className="text-[10px] font-black uppercase text-gray-400 dark:text-white/40 mb-1">Time</p>
                                    <p className="text-sm font-bold text-ncc-navy dark:text-white">{selectedEvent.time || '06:00'} – {selectedEvent.endTime || '08:00'}</p>
                                </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-[#0a1628] rounded-xl p-3">
                                <p className="text-[10px] font-black uppercase text-gray-400 dark:text-white/40 mb-1">Location</p>
                                <p className="text-sm font-bold text-ncc-navy dark:text-white">{selectedEvent.location || 'Unit Ground'}</p>
                            </div>
                            {selectedEvent.reminderEnabled && (
                                <div className="flex items-center gap-2 bg-ncc-gold/10 rounded-xl p-3">
                                    <Bell className="w-4 h-4 text-ncc-gold shrink-0" />
                                    <p className="text-xs font-bold text-ncc-navy dark:text-white">
                                        Reminder set: {selectedEvent.reminderMinutes || 60} min before
                                    </p>
                                </div>
                            )}
                            <div className="flex gap-3">
                                <button
                                    onClick={e => handleExportIcal(e, selectedEvent)}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 dark:border-white/10 text-ncc-navy dark:text-white font-bold text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    <Download className="w-4 h-4" /> Export .ics
                                </button>
                                {isAdmin && (
                                    <button
                                        onClick={e => { handleSendReminder(e, selectedEvent); setSelectedEvent(null); }}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-ncc-gold to-amber-500 text-ncc-navy font-black text-sm hover:opacity-90 transition-opacity shadow-lg"
                                    >
                                        <Bell className="w-4 h-4" /> Send Reminder
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isAddingEvent && (
                <DrillSchedulerForm
                    prefilledDate={selectedDate}
                    onClose={() => { setIsAddingEvent(false); setSelectedDate(null); }}
                />
            )}
        </div>
    );
};
