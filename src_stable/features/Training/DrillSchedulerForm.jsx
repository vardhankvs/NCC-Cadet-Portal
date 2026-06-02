import React, { useState } from 'react';
import { saveEvent } from '../../firebase/firestoreService.js';
import { sendEventReminderPush } from '../../firebase/pushNotifications.js';
import { toast } from 'react-toastify';
import { Shield, Clock, MapPin, Users, X, Calendar, Bell } from '../../components/Icons.jsx';

const DRILL_TYPES = [
    { label: 'Parade', icon: '🪖', color: 'bg-ncc-navy text-white' },
    { label: 'Exam', icon: '📋', color: 'bg-red-600 text-white' },
    { label: 'Camp', icon: '⛺', color: 'bg-emerald-600 text-white' },
    { label: 'Social Activity', icon: '🤝', color: 'bg-purple-600 text-white' },
    { label: 'NCC Day', icon: '🎖️', color: 'bg-ncc-gold text-ncc-navy dark:text-white' },
    { label: 'Shooting Practice', icon: '🎯', color: 'bg-orange-600 text-white' },
];

const PRIORITY_LEVELS = [
    { value: 'Mandatory', label: 'Mandatory', color: 'text-red-600 bg-red-50 border-red-200' },
    { value: 'High', label: 'High Priority', color: 'text-orange-600 bg-orange-50 border-orange-200' },
    { value: 'Normal', label: 'Normal', color: 'text-ncc-navy dark:text-white bg-ncc-navy/5 border-ncc-navy/20' },
];

export const DrillSchedulerForm = ({ onClose, prefilledDate }) => {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: 'Parade',
        date: prefilledDate || '',
        time: '06:00',
        endTime: '08:00',
        location: 'GMRIT Campus Ground',
        priority: 'Normal',
        reportingStrength: '',
        dresscode: 'No. 2 Dress (Training)',
        specialInstructions: '',
        description: '',
        reminderEnabled: true,
        reminderMinutes: 60,
    });

    const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name || !formData.date) {
            toast.error('Drill name and date are required.');
            return;
        }
        setLoading(true);
        try {
            await saveEvent({
                name: formData.name,
                date: formData.date,
                location: formData.location,
                time: formData.time,
                endTime: formData.endTime,
                description: `[${formData.type}] ${formData.description || ''} | Time: ${formData.time}-${formData.endTime} | Dress: ${formData.dresscode} | Strength: ${formData.reportingStrength || 'All'} | Priority: ${formData.priority} | Instructions: ${formData.specialInstructions || 'Nil'}`,
                type: formData.type,
                reminderEnabled: formData.reminderEnabled,
                reminderMinutes: Number(formData.reminderMinutes),
            });
            toast.success('Drill scheduled successfully!');
            // Send immediate reminder push if enabled
            if (formData.reminderEnabled) {
                sendEventReminderPush(
                    formData.name,
                    formData.time,
                    formData.location,
                    formData.date
                );
                toast.info(`📣 Reminder push sent to all cadets!`, { autoClose: 3000 });
            }
            onClose();
        } catch (err) {
            toast.error('Failed to schedule drill.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-ncc-navy/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in">
            <div className="bg-white dark:bg-[#050b14] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-ncc-navy/10">

                {/* Header */}
                <div className="bg-ncc-navy px-8 py-6 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-ncc-gold/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-ncc-gold" />
                        </div>
                        <div>
                            <p className="text-ncc-gold text-[10px] font-black uppercase tracking-widest">14(A) BN NCC</p>
                            <h2 className="text-white text-lg font-display font-bold leading-tight">Schedule Drill / Operation</h2>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-white dark:bg-white/10 hover:bg-white/90 dark:hover:bg-white/20 flex items-center justify-center transition-all">
                        <X className="w-4 h-4 text-ncc-navy dark:text-white" />
                    </button>
                </div>

                {/* Step indicator */}
                <div className="px-8 pt-5 pb-0 shrink-0">
                    <div className="flex items-center gap-2">
                        {[1, 2].map(s => (
                            <React.Fragment key={s}>
                                <div className={`flex items-center gap-2 cursor-pointer`} onClick={() => s < step && setStep(s)}>
                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${step >= s ? 'bg-ncc-navy text-white' : 'bg-gray-100 dark:bg-[#0d2137] text-gray-400 dark:text-white/80'}`}>{s}</div>
                                    <span className={`text-xs font-bold ${step >= s ? 'text-ncc-navy dark:text-white' : 'text-gray-400 dark:text-white/80'}`}>{s === 1 ? 'Drill Details' : 'Reporting & Orders'}</span>
                                </div>
                                {s < 2 && <div className={`flex-1 h-0.5 rounded-full ${step > s ? 'bg-ncc-navy' : 'bg-gray-100 dark:bg-[#0d2137]'}`} />}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="overflow-y-auto ncc-scrollbar">
                    {step === 1 && (
                        <div className="p-8 space-y-6">
                            {/* Drill Type */}
                            <div>
                                <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-3 tracking-widest">Drill Category</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {DRILL_TYPES.map(dt => (
                                        <button key={dt.label} type="button"
                                            onClick={() => handleChange('type', dt.label)}
                                            className={`p-3 rounded-xl border-2 text-left transition-all ${formData.type === dt.label ? 'border-ncc-navy bg-ncc-navy/5 shadow-md' : 'border-gray-100 dark:border-white/5 hover:border-ncc-navy/20'}`}
                                        >
                                            <span className="text-lg block mb-1">{dt.icon}</span>
                                            <span className="text-[10px] font-black uppercase text-ncc-navy dark:text-white">{dt.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Drill Name */}
                            <div>
                                <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest">Drill Name / Title</label>
                                <input required type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] focus:border-ncc-gold/50 outline-none font-bold text-ncc-navy dark:text-white transition-all"
                                    placeholder="e.g., Weekly Morning Parade, Annual Firing Camp..."
                                    value={formData.name} onChange={e => handleChange('name', e.target.value)} />
                            </div>

                            {/* Date & Time */}
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-span-3 sm:col-span-1">
                                    <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> Date</label>
                                    <input required type="date"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] focus:border-ncc-gold/50 outline-none font-bold text-ncc-navy dark:text-white transition-all"
                                        value={formData.date} onChange={e => handleChange('date', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest flex items-center gap-1"><Clock className="w-3 h-3" /> Fall-In</label>
                                    <input type="time"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] outline-none font-bold text-ncc-navy dark:text-white"
                                        value={formData.time} onChange={e => handleChange('time', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest">Fall-Out</label>
                                    <input type="time"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] outline-none font-bold text-ncc-navy dark:text-white"
                                        value={formData.endTime} onChange={e => handleChange('endTime', e.target.value)} />
                                </div>
                            </div>

                            {/* Location */}
                            <div>
                                <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3" /> Location / Venue</label>
                                <input type="text"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] focus:border-ncc-gold/50 outline-none font-bold text-ncc-navy dark:text-white transition-all"
                                    placeholder="e.g., GMRIT Campus Ground, NCC Office..."
                                    value={formData.location} onChange={e => handleChange('location', e.target.value)} />
                            </div>

                            <button type="button" onClick={() => setStep(2)}
                                className="w-full ncc-btn ncc-btn-primary py-3.5">
                                Next: Reporting Orders →
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="p-8 space-y-6">
                            {/* Priority */}
                            <div>
                                <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-3 tracking-widest flex items-center gap-1"><Shield className="w-3 h-3" /> Priority Level</label>
                                <div className="flex gap-3">
                                    {PRIORITY_LEVELS.map(p => (
                                        <button key={p.value} type="button"
                                            onClick={() => handleChange('priority', p.value)}
                                            className={`flex-1 py-2.5 rounded-xl border-2 text-xs font-black uppercase tracking-widest transition-all ${formData.priority === p.value ? p.color + ' border-current' : 'border-gray-100 dark:border-white/5 text-gray-400 dark:text-white/80 hover:border-gray-200 dark:border-white/10'}`}
                                        >
                                            {p.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Strength & Dress Code */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest flex items-center gap-1"><Users className="w-3 h-3" /> Reporting Strength</label>
                                    <input type="number" min="1"
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] outline-none font-bold text-ncc-navy dark:text-white"
                                        placeholder="e.g. 45 (blank = All)"
                                        value={formData.reportingStrength} onChange={e => handleChange('reportingStrength', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest">Dress Code</label>
                                    <select className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] outline-none font-bold text-ncc-navy dark:text-white"
                                        value={formData.dresscode} onChange={e => handleChange('dresscode', e.target.value)}>
                                        <option>No. 2 Dress (Training)</option>
                                        <option>No. 1 Dress (Ceremonial)</option>
                                        <option>No. 3 Dress (PT)</option>
                                        <option>Civilian / Semi-formal</option>
                                    </select>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest">Training Objective</label>
                                <textarea rows="2"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] outline-none font-bold text-ncc-navy dark:text-white resize-none"
                                    placeholder="What is the objective of this drill?"
                                    value={formData.description} onChange={e => handleChange('description', e.target.value)} />
                            </div>

                            {/* Reminder Notification */}
                            <div className={`rounded-2xl border-2 p-4 transition-all ${formData.reminderEnabled ? 'border-ncc-gold/40 bg-ncc-gold/5' : 'border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-[#0a1628]'}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <label className="flex items-center gap-2 text-xs font-black uppercase text-ncc-navy dark:text-white tracking-widest cursor-pointer">
                                        <Bell className={`w-3.5 h-3.5 ${formData.reminderEnabled ? 'text-ncc-gold' : 'text-gray-400'}`} />
                                        Push Reminder
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => handleChange('reminderEnabled', !formData.reminderEnabled)}
                                        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${formData.reminderEnabled ? 'bg-ncc-gold' : 'bg-gray-200 dark:bg-white/10'}`}
                                    >
                                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-300 ${formData.reminderEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                                {formData.reminderEnabled && (
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-500 dark:text-white/50 uppercase mb-2">Notify cadets how early?</label>
                                        <select
                                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#050b14] text-ncc-navy dark:text-white font-bold text-sm focus:outline-none focus:border-ncc-gold/50"
                                            value={formData.reminderMinutes}
                                            onChange={e => handleChange('reminderMinutes', e.target.value)}
                                        >
                                            <option value={15}>15 minutes before</option>
                                            <option value={30}>30 minutes before</option>
                                            <option value={60}>1 hour before</option>
                                            <option value={120}>2 hours before</option>
                                            <option value={1440}>1 day before</option>
                                        </select>
                                        <p className="text-[10px] text-gray-400 dark:text-white/40 mt-1.5">A push notification will also be sent immediately to all cadets on save.</p>
                                    </div>
                                )}
                            </div>

                            {/* Special Instructions */}
                            <div>
                                <label className="block text-xs font-black uppercase text-ncc-navy dark:text-white/50 mb-2 tracking-widest">Special Instructions / Orders</label>
                                <textarea rows="2"
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-[#0a1628] focus:bg-white dark:bg-[#050b14] outline-none font-bold text-ncc-navy dark:text-white resize-none"
                                    placeholder="e.g. Carry personal water bottle, Medical kit mandatory..."
                                    value={formData.specialInstructions} onChange={e => handleChange('specialInstructions', e.target.value)} />
                            </div>

                            {/* Preview card */}
                            <div className="bg-ncc-navy/5 rounded-2xl p-5 border border-ncc-navy/10">
                                <p className="text-[9px] font-black uppercase tracking-widest text-ncc-navy dark:text-white/40 mb-3">Preview</p>
                                <div className="flex gap-3 items-start">
                                    <div className="w-12 h-12 rounded-xl bg-ncc-navy flex flex-col items-center justify-center shrink-0">
                                        <span className="text-[9px] font-black text-ncc-gold uppercase leading-none">
                                            {formData.date ? new Date(formData.date).toLocaleString('en-US', { month: 'short' }) : 'MON'}
                                        </span>
                                        <span className="text-white font-bold text-sm leading-none">
                                            {formData.date ? new Date(formData.date).getDate() : '--'}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-ncc-navy dark:text-white text-sm">{formData.name || 'Drill Name'}</h4>
                                        <p className="text-xs text-gray-500 dark:text-white/70 mt-0.5">{formData.time} – {formData.endTime} · {formData.location}</p>
                                        <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${formData.priority === 'Mandatory' ? 'bg-red-100 text-red-600' : formData.priority === 'High' ? 'bg-orange-100 text-orange-600' : 'bg-ncc-navy/5 text-ncc-navy dark:text-white'}`}>
                                            {formData.priority}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <button type="button" onClick={() => setStep(1)} className="flex-1 py-3.5 rounded-xl border border-gray-200 dark:border-white/10 font-bold text-gray-500 dark:text-white/70 hover:bg-gray-50 dark:bg-[#0a1628] transition-all text-sm">
                                    ← Back
                                </button>
                                <button type="submit" disabled={loading} className="flex-1 ncc-btn ncc-btn-primary py-3.5">
                                    {loading ? 'Scheduling...' : '✓ Confirm & Schedule'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
};
