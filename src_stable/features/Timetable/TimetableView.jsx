// src/features/Timetable/TimetableView.jsx
import React, { useState, useMemo, useCallback } from 'react';
import { db, appId } from '../../firebase/config.js';
import {
    collection, doc, addDoc, updateDoc, deleteDoc,
    serverTimestamp, query, orderBy, onSnapshot
} from 'firebase/firestore';
import { useDataContext } from '../../context/DataContext.jsx';
import { useAuthContext } from '../../context/AuthContext.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { toast } from 'react-toastify';
import { sendPushToCollegeANO } from '../../firebase/pushNotifications.js';
import {
    Plus, Edit2, Trash2, X, Save, ChevronLeft, ChevronRight,
    Calendar, Clock, Users, GraduationCap, Check, Eye, Filter,
    BookOpen
} from '../../components/Icons.jsx';

// ── Constants ─────────────────────────────────────────────────────────────
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_LABELS  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const ACTIVITY_COLORS = [
    'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 border-blue-200 dark:border-blue-700',
    'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300 border-purple-200 dark:border-purple-700',
    'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-700',
    'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 border-amber-200 dark:border-amber-700',
    'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300 border-rose-200 dark:border-rose-700',
    'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/40 dark:text-cyan-300 border-cyan-200 dark:border-cyan-700',
];

function getDaysInMonth(year, month) { // month: 1-12
    return new Date(year, month, 0).getDate();
}
function getFirstDayOfWeek(year, month) { // 0=Sun
    return new Date(year, month - 1, 1).getDay();
}

const emptyActivity = () => ({ activity: '', instructor: '', startTime: '08:00', endTime: '09:00', notes: '' });

// ── Day Activity Editor Modal ─────────────────────────────────────────────
function DayEditModal({ day, month, year, activities, onSave, onClose }) {
    const [list, setList] = useState(activities.map(a => ({ ...a })));

    const handleChange = (i, field, val) => {
        const upd = [...list];
        upd[i] = { ...upd[i], [field]: val };
        setList(upd);
    };
    const handleAdd    = () => setList(l => [...l, emptyActivity()]);
    const handleRemove = (i) => setList(l => l.filter((_, idx) => idx !== i));
    const handleSave   = () => onSave(day, list.filter(a => a.activity.trim()));

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center px-4" style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(6px)' }}>
            <div className="w-full max-w-lg bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border dark:border-white/10">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b dark:border-white/10">
                    <div>
                        <h3 className="font-black text-ncc-navy dark:text-white text-sm">
                            {day} {MONTH_NAMES[month - 1]} {year}
                        </h3>
                        <p className="text-[10px] text-gray-400 mt-0.5">Add training activities for this day</p>
                    </div>
                    <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
                    {list.length === 0 && (
                        <p className="text-xs text-gray-400 text-center py-4">No activities. Click "+ Add Activity" to begin.</p>
                    )}
                    {list.map((a, i) => (
                        <div key={i} className={`rounded-xl border p-3 space-y-2 ${ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]}`}>
                            <div className="flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest opacity-70">Activity {i + 1}</span>
                                <button type="button" onClick={() => handleRemove(i)} className="w-5 h-5 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 transition">
                                    <X className="w-3 h-3" />
                                </button>
                            </div>
                            <input
                                type="text"
                                placeholder="Activity / Subject name *"
                                value={a.activity}
                                onChange={e => handleChange(i, 'activity', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-current/20 bg-white/60 dark:bg-black/20 text-xs font-medium outline-none focus:ring-1 focus:ring-current/40 placeholder:text-current/40"
                            />
                            <div className="grid grid-cols-2 gap-2">
                                <input
                                    type="time"
                                    value={a.startTime}
                                    onChange={e => handleChange(i, 'startTime', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-lg border border-current/20 bg-white/60 dark:bg-black/20 text-xs outline-none focus:ring-1 focus:ring-current/40"
                                />
                                <input
                                    type="time"
                                    value={a.endTime}
                                    onChange={e => handleChange(i, 'endTime', e.target.value)}
                                    className="px-2.5 py-1.5 rounded-lg border border-current/20 bg-white/60 dark:bg-black/20 text-xs outline-none focus:ring-1 focus:ring-current/40"
                                />
                            </div>
                            <input
                                type="text"
                                placeholder="Instructor (optional)"
                                value={a.instructor}
                                onChange={e => handleChange(i, 'instructor', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-current/20 bg-white/60 dark:bg-black/20 text-xs outline-none focus:ring-1 focus:ring-current/40 placeholder:text-current/40"
                            />
                            <input
                                type="text"
                                placeholder="Notes (optional)"
                                value={a.notes}
                                onChange={e => handleChange(i, 'notes', e.target.value)}
                                className="w-full px-2.5 py-1.5 rounded-lg border border-current/20 bg-white/60 dark:bg-black/20 text-xs outline-none focus:ring-1 focus:ring-current/40 placeholder:text-current/40"
                            />
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={handleAdd}
                        className="w-full flex items-center justify-center gap-1.5 py-2 border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl text-xs font-bold text-gray-500 dark:text-gray-400 hover:border-ncc-gold hover:text-ncc-gold transition"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Activity
                    </button>
                </div>

                <div className="flex gap-3 px-5 pb-5 pt-2 border-t dark:border-white/10">
                    <button onClick={onClose} className="flex-1 py-2.5 rounded-lg border dark:border-white/10 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition">
                        Cancel
                    </button>
                    <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy text-sm font-black hover:opacity-90 transition flex items-center justify-center gap-2">
                        <Check className="w-4 h-4" /> Save Day
                    </button>
                </div>
            </div>
        </div>
    );
}

// ── Monthly Calendar Grid ────────────────────────────────────────────────
function MonthCalendar({ year, month, schedule, editable, onDayClick }) {
    const daysInMonth  = getDaysInMonth(year, month);
    const firstDay     = getFirstDayOfWeek(year, month);
    const today        = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;

    const cells = [];
    for (let i = 0; i < firstDay; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);

    return (
        <div>
            {/* Day-of-week header */}
            <div className="grid grid-cols-7 mb-1">
                {DAY_LABELS.map(dl => (
                    <div key={dl} className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400 py-2">
                        {dl}
                    </div>
                ))}
            </div>
            {/* Cells */}
            <div className="grid grid-cols-7 gap-1">
                {cells.map((day, idx) => {
                    if (!day) return <div key={`e-${idx}`} className="aspect-square sm:aspect-auto sm:min-h-[80px] rounded-xl" />;
                    const acts = schedule?.[String(day)] || [];
                    const isToday = isCurrentMonth && today.getDate() === day;
                    const dayOfWeek = (firstDay + day - 1) % 7;
                    const isSunday  = dayOfWeek === 0;
                    return (
                        <button
                            key={day}
                            type="button"
                            onClick={() => onDayClick && onDayClick(day)}
                            className={`
                                rounded-xl p-1.5 sm:p-2 text-left border transition-all
                                ${isToday
                                    ? 'border-ncc-gold bg-ncc-gold/10 dark:bg-ncc-gold/10'
                                    : 'border-gray-100 dark:border-white/10 bg-white dark:bg-slate-900'}
                                ${onDayClick ? 'hover:border-ncc-gold/50 hover:shadow-sm cursor-pointer' : 'cursor-default'}
                                ${isSunday ? 'opacity-60' : ''}
                            `}
                        >
                            {/* Date number */}
                            <span className={`
                                inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] font-black mb-1
                                ${isToday
                                    ? 'bg-ncc-gold text-ncc-navy'
                                    : isSunday
                                        ? 'text-red-400 dark:text-red-400'
                                        : 'text-ncc-navy dark:text-white'}
                            `}>
                                {day}
                            </span>
                            {/* Activities */}
                            <div className="space-y-0.5 hidden sm:block">
                                {acts.slice(0, 2).map((a, ai) => (
                                    <div
                                        key={ai}
                                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate border ${ACTIVITY_COLORS[ai % ACTIVITY_COLORS.length]}`}
                                        title={a.activity}
                                    >
                                        {a.activity}
                                    </div>
                                ))}
                                {acts.length > 2 && (
                                    <div className="text-[9px] text-gray-400 pl-1">+{acts.length - 2} more</div>
                                )}
                            </div>
                            {/* Mobile: just a dot indicator */}
                            {acts.length > 0 && (
                                <div className="flex gap-0.5 sm:hidden mt-0.5">
                                    {acts.slice(0, 3).map((_, ai) => (
                                        <span key={ai} className="w-1 h-1 rounded-full bg-ncc-gold" />
                                    ))}
                                </div>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

// ── Timetable Card ────────────────────────────────────────────────────────
function TimetableCard({ tt, colleges, onEdit, onDelete, onView, isAdmin }) {
    const totalActivities = Object.values(tt.schedule || {}).reduce((s, a) => s + a.length, 0);
    const activeDays      = Object.values(tt.schedule || {}).filter(a => a.length > 0).length;

    const targetLabel = useMemo(() => {
        if (!tt.targetColleges || tt.targetColleges.includes('all')) return 'All Colleges';
        return tt.targetColleges
            .map(sub => colleges.find(c => c.subdomain === sub)?.collegeName || sub)
            .join(', ');
    }, [tt.targetColleges, colleges]);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-100 dark:border-white/10 shadow-sm hover:shadow-md transition-all overflow-hidden">
            {/* Gradient header bar */}
            <div className="h-2 bg-gradient-to-r from-ncc-navy via-blue-600 to-ncc-gold" />

            <div className="px-5 pt-4 pb-4 space-y-4">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ncc-navy to-blue-600 flex items-center justify-center flex-shrink-0 shadow">
                        <Calendar className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-ncc-navy dark:text-white text-sm leading-tight truncate">{tt.title}</h3>
                        <p className="text-[11px] text-ncc-gold font-black uppercase tracking-wider mt-0.5">
                            {MONTH_NAMES[tt.month - 1]} {tt.year}
                        </p>
                    </div>
                    <span className={`flex-shrink-0 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${tt.isActive ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-white/10 dark:text-gray-400'}`}>
                        {tt.isActive ? 'Active' : 'Draft'}
                    </span>
                </div>

                {tt.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{tt.description}</p>
                )}

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                    <div className="text-center bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Training Days</p>
                        <p className="font-black text-ncc-navy dark:text-white text-base mt-0.5">{activeDays}</p>
                    </div>
                    <div className="text-center bg-gray-50 dark:bg-white/5 rounded-lg p-2">
                        <p className="text-[9px] font-black text-gray-400 uppercase">Activities</p>
                        <p className="font-black text-ncc-navy dark:text-white text-base mt-0.5">{totalActivities}</p>
                    </div>
                </div>

                {/* Target */}
                <div className="flex items-center gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    <GraduationCap className="w-3.5 h-3.5 text-ncc-gold flex-shrink-0" />
                    <span className="truncate">{targetLabel}</span>
                </div>
            </div>

            {/* Actions */}
            <div className="px-4 pb-4 flex gap-2">
                <button
                    onClick={() => onView(tt)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-ncc-navy text-white text-xs font-bold rounded-lg hover:bg-ncc-navy-mid transition"
                >
                    <Eye className="w-3.5 h-3.5" /> View Calendar
                </button>
                {isAdmin && (
                    <>
                        <button onClick={() => onEdit(tt)} className="w-9 flex items-center justify-center border dark:border-white/10 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                            <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => onDelete(tt)} className="w-9 flex items-center justify-center border border-red-100 dark:border-red-900/30 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition">
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    </>
                )}
            </div>
        </div>
    );
}

// ── Full Timetable Form Modal ─────────────────────────────────────────────
function TimetableFormModal({ initial, colleges, onClose, onSave, saving }) {
    const isEdit = !!initial?.id;
    const now    = new Date();

    const [title,      setTitle      ] = useState(initial?.title       || '');
    const [description,setDescription] = useState(initial?.description || '');
    const [month,      setMonth      ] = useState(initial?.month       || (now.getMonth() + 1));
    const [year,       setYear       ] = useState(initial?.year        || now.getFullYear());
    const [isActive,   setIsActive   ] = useState(initial?.isActive    ?? true);
    const [targetAll,  setTargetAll  ] = useState(() => !initial?.targetColleges || initial.targetColleges.includes('all'));
    const [selColleges,setSelColleges] = useState(initial?.targetColleges?.filter(s => s !== 'all') || []);
    const [schedule,   setSchedule   ] = useState(() => {
        const base = {};
        if (initial?.schedule) Object.assign(base, initial.schedule);
        return base;
    });
    const [editingDay, setEditingDay] = useState(null);

    const toggleCollege = (sub) =>
        setSelColleges(prev => prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]);

    const handleDayClick = (day) => setEditingDay(day);

    const handleDaySave  = (day, acts) => {
        setSchedule(s => ({ ...s, [String(day)]: acts }));
        setEditingDay(null);
    };

    const handleSubmit   = (e) => {
        e.preventDefault();
        if (!title.trim()) { toast.error('Title is required.'); return; }
        const targetColleges = targetAll ? ['all'] : selColleges.length > 0 ? selColleges : ['all'];
        onSave({ title: title.trim(), description: description.trim(), month, year, isActive, targetColleges, schedule });
    };

    const yearOptions = [];
    for (let y = now.getFullYear() - 1; y <= now.getFullYear() + 2; y++) yearOptions.push(y);

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4" style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(6px)' }}>
                <div className="w-full max-w-4xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border dark:border-white/10 my-auto">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b dark:border-white/10">
                        <div>
                            <h2 className="font-black text-ncc-navy dark:text-white text-base">{isEdit ? 'Edit Monthly Timetable' : 'New Monthly Timetable'}</h2>
                            <p className="text-xs text-gray-400 mt-0.5">Set month, assign colleges, then click each day to add activities</p>
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {/* Basic info row */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="sm:col-span-3">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Timetable Title *</label>
                                <input
                                    required type="text" value={title} onChange={e => setTitle(e.target.value)}
                                    placeholder="e.g. June 2026 NCC Training Schedule"
                                    className="w-full px-3 py-2.5 border dark:border-white/10 bg-transparent rounded-lg text-sm text-ncc-navy dark:text-white outline-none focus:ring-2 focus:ring-ncc-gold/50"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Month</label>
                                <select value={month} onChange={e => setMonth(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 border dark:border-white/10 bg-transparent rounded-lg text-sm text-ncc-navy dark:text-white outline-none focus:ring-2 focus:ring-ncc-gold/50">
                                    {MONTH_NAMES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Year</label>
                                <select value={year} onChange={e => setYear(Number(e.target.value))}
                                    className="w-full px-3 py-2.5 border dark:border-white/10 bg-transparent rounded-lg text-sm text-ncc-navy dark:text-white outline-none focus:ring-2 focus:ring-ncc-gold/50">
                                    {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Status</label>
                                <div className="flex gap-2 mt-1">
                                    {[{v:true,l:'Active'},{v:false,l:'Draft'}].map(({v,l}) => (
                                        <button key={l} type="button" onClick={() => setIsActive(v)}
                                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${isActive === v ? 'bg-ncc-navy text-white border-ncc-navy dark:border-transparent' : 'bg-transparent border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="sm:col-span-3">
                                <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-1">Description (optional)</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2}
                                    placeholder="Brief description..."
                                    className="w-full px-3 py-2.5 border dark:border-white/10 bg-transparent rounded-lg text-sm text-ncc-navy dark:text-white outline-none focus:ring-2 focus:ring-ncc-gold/50 resize-none" />
                            </div>
                        </div>

                        {/* Assign To */}
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-wider text-gray-400 mb-2">Assign To</label>
                            <div className="flex gap-2 mb-3">
                                <button type="button" onClick={() => setTargetAll(true)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${targetAll ? 'bg-ncc-gold text-ncc-navy border-ncc-gold' : 'border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>All Colleges</button>
                                <button type="button" onClick={() => setTargetAll(false)} className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${!targetAll ? 'bg-ncc-navy text-white border-ncc-navy dark:border-transparent' : 'border-gray-200 dark:border-white/10 text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'}`}>Specific Colleges</button>
                            </div>
                            {!targetAll && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {colleges.map(c => (
                                        <button key={c.subdomain} type="button" onClick={() => toggleCollege(c.subdomain)}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition text-left ${selColleges.includes(c.subdomain) ? 'bg-ncc-navy/5 dark:bg-ncc-navy/30 border-ncc-navy dark:border-ncc-gold text-ncc-navy dark:text-white' : 'border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5'}`}>
                                            <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${selColleges.includes(c.subdomain) ? 'bg-ncc-navy dark:bg-ncc-gold' : 'border border-gray-300 dark:border-white/20'}`}>
                                                {selColleges.includes(c.subdomain) && <Check className="w-2.5 h-2.5 text-white dark:text-ncc-navy" />}
                                            </div>
                                            <span className="truncate">{c.collegeName}</span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Calendar Editor */}
                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                    Monthly Schedule — click any day to add activities
                                </label>
                                <span className="text-[10px] text-ncc-gold font-bold">
                                    {Object.values(schedule).filter(a => a.length > 0).length} days planned
                                </span>
                            </div>
                            <div className="border dark:border-white/10 rounded-xl p-4 bg-gray-50 dark:bg-white/5">
                                <MonthCalendar
                                    year={year} month={month}
                                    schedule={schedule}
                                    editable={true}
                                    onDayClick={handleDayClick}
                                />
                            </div>
                        </div>

                        {/* Submit */}
                        <div className="flex gap-3 pt-2 border-t dark:border-white/10">
                            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg border dark:border-white/10 text-sm font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5 transition">Cancel</button>
                            <button type="submit" disabled={saving} className="flex-1 py-2.5 rounded-lg bg-ncc-navy dark:bg-ncc-gold text-white dark:text-ncc-navy text-sm font-black uppercase tracking-wider hover:opacity-90 transition flex items-center justify-center gap-2 disabled:opacity-60">
                                {saving ? <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'Saving...' : isEdit ? 'Update Timetable' : 'Publish Timetable'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Day edit modal stacked on top */}
            {editingDay !== null && (
                <DayEditModal
                    day={editingDay} month={month} year={year}
                    activities={schedule[String(editingDay)] || []}
                    onSave={handleDaySave}
                    onClose={() => setEditingDay(null)}
                />
            )}
        </>
    );
}

// ── Detail View Modal ─────────────────────────────────────────────────────
function TimetableDetailModal({ tt, colleges, onClose, isAdmin, onEdit }) {
    const [viewMonth, setViewMonth] = useState({ month: tt.month, year: tt.year });
    const [selectedDay, setSelectedDay] = useState(null);

    const targetLabel = useMemo(() => {
        if (!tt.targetColleges || tt.targetColleges.includes('all')) return 'All Colleges';
        return tt.targetColleges
            .map(sub => colleges.find(c => c.subdomain === sub)?.collegeName || sub)
            .join(', ');
    }, [tt.targetColleges, colleges]);

    const dayActivities = selectedDay ? (tt.schedule?.[String(selectedDay)] || []) : [];

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto py-6 px-4" style={{ background: 'rgba(10,22,40,0.75)', backdropFilter: 'blur(6px)' }}>
            <div className="w-full max-w-3xl bg-white dark:bg-[#0f172a] rounded-2xl shadow-2xl border dark:border-white/10 my-auto">
                {/* Header */}
                <div className="px-6 py-4 border-b dark:border-white/10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="font-black text-ncc-navy dark:text-white text-base">{tt.title}</h2>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                                <span className="text-xs font-black text-ncc-gold">{MONTH_NAMES[tt.month - 1]} {tt.year}</span>
                                <span className="text-gray-300 dark:text-white/20">·</span>
                                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3" /> {targetLabel}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <button onClick={() => { onClose(); onEdit(tt); }} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold border dark:border-white/10 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/10 transition">
                                    <Edit2 className="w-3 h-3" /> Edit
                                </button>
                            )}
                            <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    {tt.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">{tt.description}</p>}
                </div>

                <div className="p-6 space-y-5">
                    {/* Calendar */}
                    <MonthCalendar
                        year={tt.year} month={tt.month}
                        schedule={tt.schedule || {}}
                        editable={false}
                        onDayClick={setSelectedDay}
                    />

                    {/* Day detail panel */}
                    {selectedDay && (
                        <div className="border dark:border-white/10 rounded-xl overflow-hidden">
                            <div className="flex items-center justify-between px-4 py-3 bg-ncc-navy/5 dark:bg-white/5 border-b dark:border-white/10">
                                <span className="font-black text-sm text-ncc-navy dark:text-white">
                                    {selectedDay} {MONTH_NAMES[tt.month - 1]}
                                </span>
                                <button onClick={() => setSelectedDay(null)} className="text-gray-400 hover:text-gray-600 transition">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            {dayActivities.length === 0 ? (
                                <p className="text-xs text-gray-400 text-center py-6">No activities scheduled for this day.</p>
                            ) : (
                                <div className="divide-y dark:divide-white/10">
                                    {dayActivities.map((a, i) => (
                                        <div key={i} className="px-4 py-3 flex items-start gap-3">
                                            <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${['bg-blue-500','bg-purple-500','bg-emerald-500','bg-amber-500','bg-rose-500'][i % 5]}`} />
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-sm text-ncc-navy dark:text-white">{a.activity}</p>
                                                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                                    <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                        <Clock className="w-3 h-3" /> {a.startTime} – {a.endTime}
                                                    </span>
                                                    {a.instructor && (
                                                        <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                                            <Users className="w-3 h-3" /> {a.instructor}
                                                        </span>
                                                    )}
                                                </div>
                                                {a.notes && <p className="text-xs text-gray-400 mt-1 italic">{a.notes}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Main Export ────────────────────────────────────────────────────────────
export function TimetableView() {
    const { units }                     = useDataContext();
    const { userRole, userInstitutionId } = useAuthContext();
    const { tenant }                    = useTenant();

    const isBattalionAdmin = userRole === 'superadmin' || userRole === 'battalion_admin';
    const isAdmin          = userRole === 'admin' || userRole === 'officer' || isBattalionAdmin;

    const colleges = useMemo(() => units.filter(u => !u.isBattalion), [units]);

    // Live subscription
    const [timetables, setTimetables] = useState([]);
    const [loadingTT,  setLoadingTT ] = useState(true);

    React.useEffect(() => {
        if (!db || !appId) return;
        const ref = collection(db, 'artifacts', appId, 'public', 'data', 'timetables');
        const q   = query(ref, orderBy('createdAt', 'desc'));
        const unsub = onSnapshot(q, snap => {
            setTimetables(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoadingTT(false);
        }, err => { console.error(err); setLoadingTT(false); });
        return unsub;
    }, []);

    // Visibility filter for non-battalion users
    const visible = useMemo(() => {
        if (isBattalionAdmin) return timetables;
        return timetables.filter(tt => {
            if (!tt.isActive) return false;
            if (!tt.targetColleges || tt.targetColleges.includes('all')) return true;
            return tt.targetColleges.includes(userInstitutionId || tenant?.subdomain);
        });
    }, [timetables, isBattalionAdmin, userInstitutionId, tenant]);

    // Filters
    const [filterCollege, setFilterCollege] = useState('all');
    const [filterMonth,   setFilterMonth  ] = useState('all');

    const filtered = useMemo(() => visible.filter(tt => {
        const mc = filterCollege === 'all' || !tt.targetColleges || tt.targetColleges.includes('all') || tt.targetColleges.includes(filterCollege);
        const mm = filterMonth   === 'all' || String(tt.month) === filterMonth;
        return mc && mm;
    }), [visible, filterCollege, filterMonth]);

    // Modal state
    const [showForm,    setShowForm   ] = useState(false);
    const [editTarget,  setEditTarget ] = useState(null);
    const [viewTarget,  setViewTarget ] = useState(null);
    const [saving,      setSaving     ] = useState(false);

    const handleOpenCreate = () => { setEditTarget(null); setShowForm(true); };
    const handleOpenEdit   = (tt) => { setEditTarget(tt); setShowForm(true); };
    const handleCloseForm  = () => { setShowForm(false); setEditTarget(null); };

    const handleSave = useCallback(async (data) => {
        setSaving(true);
        try {
            const ref = collection(db, 'artifacts', appId, 'public', 'data', 'timetables');
            if (editTarget?.id) {
                await updateDoc(doc(ref, editTarget.id), { ...data, updatedAt: serverTimestamp() });
                toast.success('Timetable updated!');
            } else {
                await addDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                toast.success('Timetable published to colleges!');
                
                // Dispatch real-time push notification to target college ANOs
                try {
                    const targets = data.targetColleges || [];
                    const isAll = targets.includes('all');
                    let subdomainsToNotify = [];
                    if (isAll) {
                        subdomainsToNotify = colleges.map(c => c.subdomain);
                    } else {
                        subdomainsToNotify = targets;
                    }

                    for (const subdomain of subdomainsToNotify) {
                        await sendPushToCollegeANO(
                            subdomain,
                            '📅 New Monthly Timetable Published',
                            `Battalion HQ has published a new training timetable: "${data.title}". Please review it.`,
                            'timetable'
                        );
                    }
                } catch (pushErr) {
                    console.warn('Real-time push notification failed (non-critical):', pushErr);
                }
            }
            handleCloseForm();
        } catch (err) {
            toast.error('Failed to save: ' + err.message);
        } finally {
            setSaving(false);
        }
    }, [editTarget, colleges]);

    const handleDelete = useCallback(async (tt) => {
        if (!window.confirm(`Delete "${tt.title}"?`)) return;
        try {
            await deleteDoc(doc(collection(db, 'artifacts', appId, 'public', 'data', 'timetables'), tt.id));
            toast.success('Timetable deleted.');
        } catch (err) {
            toast.error('Failed to delete.');
        }
    }, []);

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-black tracking-tight text-ncc-navy dark:text-white font-display">
                        MONTHLY TIMETABLE
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isBattalionAdmin
                            ? 'Create and publish monthly training schedules for colleges under 14(A) BN NCC.'
                            : 'Monthly training schedule assigned by 14(A) BN NCC.'}
                    </p>
                </div>
                {isBattalionAdmin && (
                    <button onClick={handleOpenCreate} className="flex items-center justify-center gap-2 px-4 py-2 bg-ncc-navy hover:bg-ncc-navy-mid dark:bg-ncc-gold dark:hover:bg-ncc-gold/80 text-white dark:text-ncc-navy font-bold text-xs uppercase tracking-widest rounded-lg transition-all shadow-md">
                        <Plus className="w-4 h-4" /> New Monthly Timetable
                    </button>
                )}
            </div>

            {/* Filters */}
            {(isBattalionAdmin || colleges.length > 0) && visible.length > 0 && (
                <div className="flex flex-wrap gap-2 items-center">
                    <Filter className="w-3.5 h-3.5 text-gray-400" />
                    {isBattalionAdmin && (
                        <select value={filterCollege} onChange={e => setFilterCollege(e.target.value)}
                            className="px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-transparent text-ncc-navy dark:text-white outline-none">
                            <option value="all">All Colleges</option>
                            {colleges.map(c => <option key={c.subdomain} value={c.subdomain}>{c.collegeName}</option>)}
                        </select>
                    )}
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                        className="px-3 py-1.5 text-xs border dark:border-white/10 rounded-lg bg-transparent text-ncc-navy dark:text-white outline-none">
                        <option value="all">All Months</option>
                        {MONTH_NAMES.map((m, i) => <option key={i} value={String(i + 1)}>{m}</option>)}
                    </select>
                    <span className="ml-auto text-[11px] text-gray-400">{filtered.length} timetable{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            )}

            {/* Content */}
            {loadingTT ? (
                <div className="flex justify-center py-20">
                    <div className="w-8 h-8 border-2 border-ncc-gold border-t-transparent rounded-full animate-spin" />
                </div>
            ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-white/5 flex items-center justify-center mb-4">
                        <BookOpen className="w-8 h-8 text-gray-300 dark:text-gray-600" />
                    </div>
                    <h3 className="font-bold text-gray-700 dark:text-white text-sm">No timetables yet</h3>
                    <p className="text-xs text-gray-400 mt-1 max-w-xs">
                        {isBattalionAdmin
                            ? 'Create a monthly timetable and assign it to colleges in the battalion.'
                            : 'No timetable has been assigned to your college yet. Check back later.'}
                    </p>
                    {isBattalionAdmin && (
                        <button onClick={handleOpenCreate} className="mt-5 flex items-center gap-2 px-4 py-2 bg-ncc-navy text-white text-xs font-bold rounded-lg hover:bg-ncc-navy-mid transition">
                            <Plus className="w-3.5 h-3.5" /> Create First Timetable
                        </button>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filtered.map(tt => (
                        <TimetableCard
                            key={tt.id}
                            tt={tt}
                            colleges={colleges}
                            isAdmin={isBattalionAdmin}
                            onView={setViewTarget}
                            onEdit={handleOpenEdit}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {/* Form Modal */}
            {showForm && (
                <TimetableFormModal
                    initial={editTarget}
                    colleges={colleges}
                    onClose={handleCloseForm}
                    onSave={handleSave}
                    saving={saving}
                />
            )}

            {/* Detail View Modal */}
            {viewTarget && (
                <TimetableDetailModal
                    tt={viewTarget}
                    colleges={colleges}
                    onClose={() => setViewTarget(null)}
                    isAdmin={isBattalionAdmin}
                    onEdit={(tt) => { setViewTarget(null); handleOpenEdit(tt); }}
                />
            )}
        </div>
    );
}

export default TimetableView;
