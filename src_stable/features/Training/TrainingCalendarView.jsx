
import React, { useState } from 'react';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useDataContext } from '../../context/DataContext.jsx';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Plus, Users, Shield } from '../../components/Icons.jsx';
import { formatDate } from '../../utils/dateUtils.js';
import { DrillSchedulerForm } from './DrillSchedulerForm.jsx';

export const TrainingCalendarView = () => {
    const { userRole } = useAuthContext();
    const { events = [], cadets = [] } = useDataContext();
    const isAdmin = userRole === 'admin' || userRole === 'officer';
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isAddingEvent, setIsAddingEvent] = useState(false);
    const [selectedDate, setSelectedDate] = useState(null);

    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const year = currentDate.getFullYear();
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
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return eventDate >= today;
        })
        .sort((a, b) => new Date(a.date || a.startDate) - new Date(b.date || b.startDate))
        .slice(0, 4);

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
                <div className="lg:col-span-2 bg-white dark:bg-[#050b14] rounded-[2rem] border border-ncc-navy/5 shadow-xl overflow-hidden flex flex-col">
                    <div className="p-8 border-b border-ncc-navy/5 flex justify-between items-center bg-ncc-navy text-white">
                        <h3 className="text-xl font-display font-bold">
                            {new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate)}
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-white dark:bg-[#050b14]/10 rounded-xl transition-all"><ChevronLeft className="w-5 h-5" /></button>
                            <button onClick={nextMonth} className="p-2 hover:bg-white dark:bg-[#050b14]/10 rounded-xl transition-all"><ChevronRight className="w-5 h-5" /></button>
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
                                <div key={i} onClick={() => handleDayClick(day)} className={`min-h-[60px] p-1 border-r border-b border-ncc-navy/5 transition-all flex flex-col ${!day ? 'bg-ncc-navy/[0.01]' : isAdmin ? 'cursor-pointer hover:bg-ncc-gold/10' : 'hover:bg-ncc-navy/[0.02]'}`}>
                                    {day && (
                                        <>
                                            <span className={`text-[10px] font-black p-1 w-6 h-6 flex items-center justify-center rounded-md mb-1 ${isToday ? 'bg-ncc-gold text-ncc-navy dark:text-white' : 'text-ncc-navy dark:text-white/30'}`}>
                                                {day}
                                            </span>
                                            <div className="space-y-1 overflow-y-auto ncc-scrollbar pr-0.5">
                                                {dayEvents.map((e, idx) => (
                                                    <div key={idx} className={`p-2 rounded-lg text-[9px] font-bold leading-tight border ${
                                                        e.type === 'Parade' ? 'bg-ncc-navy/5 text-ncc-navy dark:text-white border-ncc-navy/10' :
                                                        e.type === 'Exam' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-ncc-gold/10 text-ncc-navy dark:text-white border-ncc-gold/20'
                                                    }`}>
                                                        {e.name}
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

                <div className="space-y-6">
                    <div className="ncc-card p-6">
                        <h4 className="text-[10px] font-black text-ncc-navy dark:text-white uppercase tracking-widest mb-5 flex items-center gap-2 whitespace-nowrap overflow-hidden">
                            <Shield className="w-4 h-4 text-ncc-gold shrink-0" /> Upcoming Operations
                        </h4>
                        <div className="space-y-4">
                            {upcomingOperations.length === 0 ? (
                                <p className="text-[10px] text-gray-400 dark:text-white/80 font-bold uppercase tracking-widest italic py-4">No upcoming operations.</p>
                            ) : (
                                upcomingOperations.map((e, idx) => (
                                    <div key={idx} className="flex gap-3 group min-w-0">
                                    <div className="flex flex-col items-center shrink-0">
                                        <div className="w-11 h-11 rounded-xl bg-ncc-navy text-white flex flex-col items-center justify-center shadow-lg group-hover:bg-ncc-gold group-hover:text-ncc-navy dark:text-white transition-all">
                                            <span className="text-[8px] font-black uppercase leading-none mb-0.5">
                                                {new Date(e.date || e.startDate).toLocaleString('en-US', { month: 'short' })}
                                            </span>
                                            <span className="text-sm font-bold leading-none">
                                                {new Date(e.date || e.startDate).getDate()}
                                            </span>
                                        </div>
                                        {idx < upcomingOperations.length - 1 && <div className="w-0.5 flex-1 bg-ncc-navy/5 mt-1" />}
                                    </div>
                                    <div className="flex-1 pb-4 min-w-0">
                                        <h5 className="text-xs font-bold text-ncc-navy dark:text-white mb-1 line-clamp-2 leading-snug">{e.name}</h5>
                                        <div className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase">
                                            <Clock className="w-3 h-3 shrink-0" /> {e.time || '06:00'}
                                        </div>
                                        <div className="flex items-start gap-1 text-[10px] font-bold text-gray-400 dark:text-white/80 uppercase mt-0.5">
                                            <MapPin className="w-3 h-3 shrink-0 mt-0.5" /> <span className="break-words">{e.location || 'Unit Ground'}</span>
                                        </div>
                                    </div>
                                </div>
                                ))
                            )}
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-ncc-navy to-blue-950 p-8 rounded-[2rem] text-white shadow-xl relative overflow-hidden">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-ncc-gold mb-2">Unit Status</p>
                        <h4 className="text-xl font-display font-bold leading-tight">Weekly Parade Attendance at <span className="text-ncc-gold">88%</span></h4>
                        <div className="mt-6 flex items-center gap-2">
                            <Users className="w-4 h-4 text-ncc-gold" />
                            <span className="text-xs font-bold text-white/60 uppercase">{cadets.length} Cadets Indexed Active</span>
                        </div>
                        <CalendarIcon className="absolute -right-8 -bottom-8 w-40 h-40 opacity-5 rotate-12" />
                    </div>
                </div>
            </div>
            
            {isAddingEvent && (
                <DrillSchedulerForm 
                    prefilledDate={selectedDate} 
                    onClose={() => { setIsAddingEvent(false); setSelectedDate(null); }} 
                />
            )}
        </div>
    );
};
